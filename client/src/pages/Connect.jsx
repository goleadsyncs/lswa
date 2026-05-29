import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api.js';

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
    if (!sessionId) startSession();
    else pollStatus(sessionId);
    return () => clearInterval(pollRef.current);
  }, []);

  const startSession = async () => {
    try {
      const { data } = await api.post('/whatsapp/sessions', { locationId });
      setSessionId(data.session.id);
      pollStatus(data.session.id);
    } catch { setStatus('error'); }
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
    pollRef.current = setInterval(fetch, 2000);
  };

  if (status === 'connected') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="glass-card" style={{ padding: 52, maxWidth: 460, width: '100%', textAlign: 'center', animation: 'fadeIn 0.4s ease-out', boxShadow: 'var(--glow-wa)', borderColor: 'var(--wa-border)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--wa-glass)', border: '2px solid var(--wa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 20px' }}>✓</div>
          <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, marginBottom: 10, letterSpacing: '-0.02em' }}>WhatsApp connected!</h2>
          <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>Your number is live and ready to receive GHL messages.</p>
          <button className="btn-wa" style={{ padding: '13px 32px', fontSize: 15 }} onClick={() => nav('/dashboard')}>Back to dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.3s ease-out' }}>
      <button
        onClick={() => nav('/dashboard')}
        style={{ alignSelf: 'flex-start', color: 'var(--muted)', fontSize: 14, cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28 }}
      >
        ← Back
      </button>

      <div className="glass-card" style={{ padding: 40, maxWidth: 460, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--wa-glass)', border: '1px solid var(--wa-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 16px' }}>📱</div>
        <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>Connect WhatsApp</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>Scan the QR code with your WhatsApp app to link this number to LSWA.</p>

        {/* QR Box */}
        <div style={{ width: 220, height: 220, margin: '0 auto 24px', borderRadius: 16, overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: qr ? 'var(--glow-wa)' : 'none', border: qr ? '2px solid var(--wa-border)' : '2px solid var(--border)', transition: 'box-shadow 0.3s, border-color 0.3s' }}>
          {qr
            ? <img src={qr} alt="WhatsApp QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <div style={{ width: 36, height: 36, border: '3px solid var(--border-2)', borderTopColor: 'var(--wa)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          }
        </div>

        {/* Status */}
        {status === 'qr_pending' && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--wa-glass)', border: '1px solid var(--wa-border)', color: 'var(--wa)', padding: '6px 14px', borderRadius: 'var(--r-full)', fontSize: 13, fontWeight: 500, marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--wa)', animation: 'pulse 1.5s infinite' }} />
            Waiting for scan...
          </div>
        )}
        {(status === 'connecting' || status === 'initializing') && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', color: 'var(--purple-light)', padding: '6px 14px', borderRadius: 'var(--r-full)', fontSize: 13, marginBottom: 24 }}>
            Initializing...
          </div>
        )}

        {/* Steps */}
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>How to scan</div>
          {[
            'Open WhatsApp on your phone',
            'Tap Menu (⋮) → Linked Devices → Link a Device',
            'Point your camera at the QR code',
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--wa-glass)', border: '1px solid var(--wa-border)', color: 'var(--wa)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>{t}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
