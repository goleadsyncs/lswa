import pino from 'pino';
import { WhatsAppManager } from '../services/whatsapp-manager.js';
import { GHLClient } from '../services/ghl-client.js';

export const logger = pino(
  process.env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {}
);

export const waManager = new WhatsAppManager();
export const ghlClient = new GHLClient();
