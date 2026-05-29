import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { EventEmitter } from 'events';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');
const silentLogger = pino({ level: 'silent' });

export class WhatsAppManager extends EventEmitter {
  constructor() {
    super();
    // Map<sessionId, { socket, status, qrDataUrl, locationGhlId, phoneNumber }>
    this.sessions = new Map();
  }

  /**
   * Create or reconnect a Baileys session.
   * onStatusChange(status, qrDataUrl?) is called on every state change.
   */
  async createSession(sessionId, locationGhlId, onStatusChange) {
    // Clean up any existing socket for this id
    if (this.sessions.has(sessionId)) {
      await this.destroySession(sessionId);
    }

    const sessDir = path.join(SESSIONS_DIR, sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(sessDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: silentLogger,
      browser: ['LSWA', 'Chrome', '120.0'],
    });

    const session = {
      socket: sock,
      status: 'connecting',
      qrDataUrl: null,
      locationGhlId,
      phoneNumber: null,
    };
    this.sessions.set(sessionId, session);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        session.qrDataUrl = await QRCode.toDataURL(qr);
        session.status = 'qr_pending';
        await onStatusChange?.('qr_pending', session.qrDataUrl);
      }

      if (connection === 'open') {
        session.qrDataUrl = null;
        session.status = 'connected';
        session.phoneNumber = sock.user?.id?.split(':')[0] || null;
        await onStatusChange?.('connected');
      }

      if (connection === 'close') {
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          session.status = 'disconnected';
          await onStatusChange?.('disconnected');
          this.sessions.delete(sessionId);
        } else {
          // Auto-reconnect for all other reasons (network drop, timeout, etc.)
          session.status = 'connecting';
          await onStatusChange?.('connecting');
          setTimeout(() => this.createSession(sessionId, locationGhlId, onStatusChange), 3000);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        this._handleInbound(sessionId, msg);
      }
    });

    return session;
  }

  _handleInbound(sessionId, msg) {
    const jid = msg.key.remoteJid || '';
    const from = jid.replace('@s.whatsapp.net', '').replace(/[^0-9+]/g, '');
    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      '';

    if (!from || !text) return;

    this.emit('inbound', { sessionId, from, text, rawMsg: msg });
  }

  /**
   * Send a WhatsApp text message via the given session.
   */
  async sendMessage(sessionId, toPhone, text) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    if (session.status !== 'connected') throw new Error(`Session ${sessionId} not connected (status: ${session.status})`);

    const digits = toPhone.replace(/\D/g, '');
    const jid = `${digits}@s.whatsapp.net`;
    const result = await session.socket.sendMessage(jid, { text });
    return result?.key?.id;
  }

  getQR(sessionId) {
    return this.sessions.get(sessionId)?.qrDataUrl || null;
  }

  getStatus(sessionId) {
    return this.sessions.get(sessionId)?.status || 'not_found';
  }

  getPhoneNumber(sessionId) {
    return this.sessions.get(sessionId)?.phoneNumber || null;
  }

  async destroySession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session?.socket) {
      try { await session.socket.logout(); } catch { /* already closed */ }
    }
    this.sessions.delete(sessionId);
  }

  listSessions() {
    return [...this.sessions.entries()].map(([id, s]) => ({
      id,
      status: s.status,
      phoneNumber: s.phoneNumber,
      locationGhlId: s.locationGhlId,
    }));
  }
}
