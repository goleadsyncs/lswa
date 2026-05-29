import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api.js';

const s = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 40, width: '100%', maxWidth: 480, textAlign: 'center' },
  back: { alignSelf: 'flex-start', color: 'var(--muted)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 32, background: 'none', border: 'none', fontFamily: 'inherit' },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  sub: { color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 32 },
  qrBox: { width: 220, height: 220, margin: '0 auto 28px', borderRadius: 12, overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  qrImg: { width: '100%', height: '100%', objectFit: 'contain' },
  spinner: { width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  step: { display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left', marginBottom: 12 },
  stepNum: { width: 24, height: 24, borderRadius: '50%', background: 'var(--green)', color: '#000', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  stepText: { fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 },
  statusBadge: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 500, marginBottom: 20 },
  btnPrimary: { padding: '12px 28px', background: 'var(--green)', color: '#000', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  successIcon: { fontSize: 56, marginBottom: 16 },
};

const POLL_MS = 2000;

export default function Connect() {
  const { locationId } = useParams();
  const [params] = useSearchParams();
  const existingSessionId = params.get('session');
  const nav = useNavigate();

  const [sessionId, setSessionId] = useState(existingSessionId || null);
  const [status, setStatus] = useState('initializing');
  const [qr, setQr] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!sessionId) {
      startSession();
    } else {
      pollStatus(sessionId);
    }
    return () => clearInterval(pollRef.current);
  }, []);

  const startSession = async () => {
    try {
      const { data } = await api.post('/whatsapp/sessions', { locationId });
      setSessionId(data.session.id);
      pollStatus(data.session.id);
    } catch (err) {
      setStatus('error');
      console.error(err);
    }
  };

  const pollStatus = (id) => {
    const fetch = async () => {
      try {
        const { data } = await api.get(`/whatsapp/sessions/${id}/qr`);
        setStatus(data.status);
        if (data.qr) setQr(data.qr);
        if (data.status === 'connected') clearInterval(pollRef.current);
      } catch { clearInterval(pollRef.current); }
    };
    fetch();
    pollRef.current = setInterval(fetch, POLL_MS);
  };

  if (status === 'connected') {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.successIcon}>✅</div>
          <div style={s.title}>WhatsApp connected!</div>
          <p style={s.sub}>Your number is now live. Go back to the dashboard to map it to a GHL phone number.</p>
          <button style={s.btnPrimary} onClick={() => nav('/dashboard')}>Go to dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <button style={s.back} onClick={() => nav('/dashboard')}>← Back</button>

      <div style={s.card}>
        <div style={s.title}>Connect WhatsApp</div>
        <p style={s.sub}>Scan the QR code with your WhatsApp app to connect this number to LSWA.</p>

        <div style={s.qrBox}>
          {qr
            ? <img src={qr} alt="WhatsApp QR" style={s.qrImg} />
            : <div style={s.spinner} />
          }
        </div>

        {status === 'qr_pending' && (
          <div style={{ ...s.statusBadge, background: 'rgba(210,153,34,0.15)', color: 'var(--warning)' }}>
            Waiting for scan...
          </div>
        )}
        {status === 'connecting' && (
          <div style={{ ...s.statusBadge, background: 'var(--surface2)', color: 'var(--muted)' }}>
            Initializing...
          </div>
        )}

        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--muted)' }}>How to scan:</div>
          {[
            'Open WhatsApp on your phone',
            'Tap Menu (⋮) → Linked Devices → Link a Device',
            'Point your camera at the QR code above',
          ].map((t, i) => (
            <div key={i} style={s.step}>
              <div style={s.stepNum}>{i + 1}</div>
              <div style={s.stepText}>{t}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
