import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App.jsx';
import api from '../api.js';

function StatusDot({ status }) {
  const color = status === 'connected' ? 'var(--wa)' : status === 'qr_pending' ? 'var(--warning)' : 'var(--faint)';
  const pulse = status === 'connected';
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 10, height: 10, flexShrink: 0 }}>
      {pulse && <span style={{ position: 'absolute', width: 10, height: 10, borderRadius: '50%', background: 'var(--wa)', opacity: 0.4, animation: 'pulse 2s infinite' }} />}
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'block', position: 'relative' }} />
    </span>
  );
}

function StatusPill({ status }) {
  const cfg = {
    connected:    { bg: 'var(--wa-glass)',                border: 'var(--wa-border)',               color: 'var(--wa)',      label: 'Connected' },
    qr_pending:   { bg: 'rgba(251,191,36,0.1)',            border: 'rgba(251,191,36,0.25)',           color: 'var(--warning)', label: 'Scan QR' },
    connecting:   { bg: 'rgba(139,92,246,0.1)',            border: 'rgba(139,92,246,0.25)',           color: 'var(--purple-light)', label: 'Connecting' },
    disconnected: { bg: 'rgba(148,163,184,0.07)',          border: 'rgba(148,163,184,0.15)',          color: 'var(--muted)', label: 'Disconnected' },
  };
  const c = cfg[status] || cfg.disconnected;
  return (
    <span style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color, padding: '3px 10px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 500, letterSpacing: '-0.01em' }}>
      {c.label}
    </span>
  );
}

export default function Dashboard() {
  const { user, locations, subscription, reload } = useContext(AuthContext);
  const [sessions, setSessions] = useState({});
  const nav = useNavigate();

  useEffect(() => {
    locations.forEach(async loc => {
      try {
        const { data } = await api.get('/whatsapp/sessions', { params: { locationId: loc.id } });
        setSessions(prev => ({ ...prev, [loc.id]: data.sessions }));
      } catch { /* ignore */ }
    });
  }, [locations]);

  const removeSession = async (locationId, sessionId) => {
    if (!confirm('Disconnect this WhatsApp number?')) return;
    await api.delete(`/whatsapp/sessions/${sessionId}`);
    setSessions(prev => ({ ...prev, [locationId]: prev[locationId].filter(s => s.id !== sessionId) }));
  };

  const logout = () => { localStorage.removeItem('lswa_token'); window.location.href = '/'; };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(20px)', background: 'rgba(4, 3, 14, 0.8)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--wa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>💬</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>LSWA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: 'var(--muted)', fontSize: 13, cursor: 'pointer' }} onClick={() => nav('/billing')}>Billing</span>
          <button className="btn-ghost" style={{ padding: '7px 14px', fontSize: 13 }} onClick={logout}>Sign out</button>
        </div>
      </header>

      <div style={{ flex: 1, padding: '36px 32px', maxWidth: 1100, margin: '0 auto', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>

        {/* Page title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Manage your GHL connections and WhatsApp numbers</p>
        </div>

        {/* Trial banner */}
        {subscription?.status === 'trialing' && (
          <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.22)', borderRadius: 'var(--r-md)', padding: '14px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 14 }}>🎉 Free trial — expires <strong>{new Date(subscription.trial_ends_at).toLocaleDateString()}</strong></span>
            <button className="btn-primary" style={{ padding: '8px 18px', fontSize: 13 }} onClick={() => nav('/billing')}>Upgrade plan</button>
          </div>
        )}

        {locations.length === 0 ? (
          /* Empty state */
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 52, marginBottom: 18 }}>🔗</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Connect your first GHL account</h2>
            <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: 28 }}>Link a GHL sub-account to start routing messages via WhatsApp.</p>
            <a href="/api/auth/ghl" className="btn-wa" style={{ padding: '13px 32px', fontSize: 15 }}>Connect GHL account</a>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--text-2)' }}>GHL Sub-accounts <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({locations.length})</span></h2>
              <a href="/api/auth/ghl" className="btn-ghost" style={{ padding: '7px 14px', fontSize: 13 }}>+ Add account</a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {locations.map(loc => {
                const locSessions = sessions[loc.id] || [];
                return (
                  <div key={loc.id} className="glass-card" style={{ padding: 24 }}>
                    {/* Location header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                      <div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{loc.name || 'Unnamed account'}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>{loc.ghl_location_id}</div>
                      </div>
                      <span style={{ background: 'var(--wa-glass)', border: '1px solid var(--wa-border)', color: 'var(--wa)', padding: '3px 10px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 500 }}>Active</span>
                    </div>

                    {/* Sessions list */}
                    {locSessions.length > 0 ? (
                      <div style={{ marginBottom: 4 }}>
                        {locSessions.map((sess, i) => {
                          const live = sess.liveStatus || sess.status;
                          return (
                            <div key={sess.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: i === 0 ? '1px solid var(--border)' : '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <StatusDot status={live} />
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 500 }}>{sess.phoneNumber || sess.phone_number || 'Pending scan...'}</div>
                                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>WhatsApp</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <StatusPill status={live} />
                                {live === 'qr_pending' && (
                                  <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => nav(`/connect/${loc.id}?session=${sess.id}`)}>Scan</button>
                                )}
                                <button
                                  style={{ padding: '5px 10px', fontSize: 12, borderRadius: 'var(--r-sm)', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.07)', color: 'var(--danger)', cursor: 'pointer', fontFamily: 'inherit' }}
                                  onClick={() => removeSession(loc.id, sess.id)}
                                >✕</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--faint)', fontSize: 13, padding: '8px 0', borderTop: '1px solid var(--border)' }}>No numbers connected yet</div>
                    )}

                    {/* Add number button */}
                    <button
                      onClick={() => nav(`/connect/${loc.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--wa)', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', padding: '10px 0 0', marginTop: 4 }}
                    >
                      <span style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px solid var(--wa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, lineHeight: 1 }}>+</span>
                      Add WhatsApp number
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
