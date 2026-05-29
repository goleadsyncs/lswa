import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App.jsx';
import api from '../api.js';

const s = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' },
  logo: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 18 },
  logoIcon: { width: 32, height: 32, background: 'var(--green)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  link: { color: 'var(--muted)', fontSize: 14, textDecoration: 'none', cursor: 'pointer' },
  btnSm: { padding: '8px 16px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500 },
  btnPrimary: { padding: '8px 16px', borderRadius: 7, border: 'none', background: 'var(--green)', color: '#000', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 },
  body: { flex: 1, padding: '32px', maxWidth: 1100, margin: '0 auto', width: '100%' },
  pageTitle: { fontSize: 24, fontWeight: 700, marginBottom: 4 },
  pageSub: { color: 'var(--muted)', fontSize: 14, marginBottom: 32 },
  section: { marginBottom: 40 },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 },
  cardHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  locName: { fontSize: 15, fontWeight: 600, marginBottom: 3 },
  locId: { fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' },
  sessRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' },
  sessInfo: { display: 'flex', alignItems: 'center', gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  sessPhone: { fontSize: 13, fontWeight: 500 },
  sessStatus: { fontSize: 12, color: 'var(--muted)' },
  badgeGreen: { background: 'rgba(37,211,102,0.15)', color: 'var(--green)', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500 },
  badgeGray: { background: 'var(--surface2)', color: 'var(--muted)', padding: '3px 10px', borderRadius: 999, fontSize: 12 },
  badgeOrange: { background: 'rgba(210,153,34,0.15)', color: 'var(--warning)', padding: '3px 10px', borderRadius: 999, fontSize: 12 },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green)', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '8px 0', border: 'none', background: 'none', fontFamily: 'inherit' },
  emptyState: { textAlign: 'center', padding: '60px 20px' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 600, marginBottom: 8 },
  emptyText: { color: 'var(--muted)', fontSize: 14, marginBottom: 24 },
  connectBanner: { background: 'rgba(37,211,102,0.07)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  bannerText: { fontSize: 14 },
};

function statusColor(s) {
  if (s === 'connected') return '#25D366';
  if (s === 'qr_pending') return '#d29922';
  return '#8b949e';
}

function statusBadge(status) {
  if (status === 'connected') return <span style={s.badgeGreen}>Connected</span>;
  if (status === 'qr_pending') return <span style={s.badgeOrange}>Scan QR</span>;
  return <span style={s.badgeGray}>{status}</span>;
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

  const connectGHL = () => { window.location.href = '/api/auth/ghl'; };

  const addNumber = (locationId) => nav(`/connect/${locationId}`);

  const removeSession = async (locationId, sessionId) => {
    if (!confirm('Disconnect this WhatsApp number?')) return;
    await api.delete(`/whatsapp/sessions/${sessionId}`);
    setSessions(prev => ({ ...prev, [locationId]: prev[locationId].filter(s => s.id !== sessionId) }));
  };

  const logout = () => {
    localStorage.removeItem('lswa_token');
    window.location.href = '/';
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.logo}>
          <div style={s.logoIcon}>🟢</div>
          LSWA
        </div>
        <div style={s.headerRight}>
          <span style={s.link} onClick={() => nav('/billing')}>Billing</span>
          <button style={s.btnSm} onClick={logout}>Sign out</button>
        </div>
      </header>

      <div style={s.body}>
        <div style={s.pageTitle}>Dashboard</div>
        <div style={s.pageSub}>Manage your GHL connections and WhatsApp numbers</div>

        {subscription?.status === 'trialing' && (
          <div style={s.connectBanner}>
            <span style={s.bannerText}>
              🎉 You're on a free trial — expires {new Date(subscription.trial_ends_at).toLocaleDateString()}
            </span>
            <button style={s.btnPrimary} onClick={() => nav('/billing')}>Upgrade plan</button>
          </div>
        )}

        {locations.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>🔗</div>
            <div style={s.emptyTitle}>Connect your first GHL account</div>
            <div style={s.emptyText}>Connect a GHL sub-account to start routing messages via WhatsApp.</div>
            <button style={{ ...s.btnPrimary, padding: '12px 28px', fontSize: 15 }} onClick={connectGHL}>
              Connect GHL account
            </button>
          </div>
        ) : (
          <div style={s.section}>
            <div style={s.sectionHead}>
              <div style={s.sectionTitle}>GHL Sub-accounts ({locations.length})</div>
              <button style={s.btnSm} onClick={connectGHL}>+ Add account</button>
            </div>

            <div style={s.grid}>
              {locations.map(loc => {
                const locSessions = sessions[loc.id] || [];
                return (
                  <div key={loc.id} style={s.card}>
                    <div style={s.cardHeader}>
                      <div>
                        <div style={s.locName}>{loc.name || 'Unnamed account'}</div>
                        <div style={s.locId}>{loc.ghl_location_id}</div>
                      </div>
                      <span style={s.badgeGreen}>Active</span>
                    </div>

                    {locSessions.length > 0 ? (
                      <>
                        {locSessions.map(sess => (
                          <div key={sess.id} style={s.sessRow}>
                            <div style={s.sessInfo}>
                              <div style={{ ...s.statusDot, background: statusColor(sess.liveStatus || sess.status) }} />
                              <div>
                                <div style={s.sessPhone}>{sess.phoneNumber || sess.phone_number || 'Pending scan...'}</div>
                                <div style={s.sessStatus}>{sess.display_name || 'WhatsApp'}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {statusBadge(sess.liveStatus || sess.status)}
                              {(sess.liveStatus === 'qr_pending' || sess.status === 'qr_pending') && (
                                <button style={s.btnSm} onClick={() => nav(`/connect/${loc.id}?session=${sess.id}`)}>
                                  Scan QR
                                </button>
                              )}
                              <button
                                style={{ ...s.btnSm, color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                onClick={() => removeSession(loc.id, sess.id)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>No WhatsApp numbers yet</div>
                    )}

                    <button style={s.addBtn} onClick={() => addNumber(loc.id)}>
                      + Add WhatsApp number
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
