import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App.jsx';
import api from '../api.js';

const PLANS = [
  { id: 'starter', name: 'Starter', price: '$29', desc: '1 account · 3 numbers' },
  { id: 'growth',  name: 'Growth',  price: '$49', desc: '5 accounts · 15 numbers' },
  { id: 'agency',  name: 'Agency',  price: '$99', desc: 'Unlimited everything' },
];

export default function Billing() {
  const { subscription } = useContext(AuthContext);
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(subscription?.plan || 'growth');
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    const p = new URL(window.location.href).searchParams;
    if (p.get('success'))   setFlash({ ok: true,  msg: '🎉 Subscription activated!' });
    if (p.get('cancelled')) setFlash({ ok: false, msg: 'Checkout cancelled.' });
  }, []);

  const startCheckout = async () => {
    setLoading(true);
    try { const { data } = await api.post('/billing/checkout', { plan: selected }); window.location.href = data.url; }
    catch { setLoading(false); }
  };

  const openPortal = async () => {
    setLoading(true);
    try { const { data } = await api.post('/billing/portal'); window.location.href = data.url; }
    catch { setLoading(false); }
  };

  const isActive = ['active', 'trialing'].includes(subscription?.status);

  const statusCfg = {
    active:   { bg: 'var(--wa-glass)',              border: 'var(--wa-border)',             color: 'var(--wa)',      label: 'Active' },
    trialing: { bg: 'rgba(251,191,36,0.1)',          border: 'rgba(251,191,36,0.25)',        color: 'var(--warning)', label: 'Trial' },
    past_due: { bg: 'rgba(248,113,113,0.1)',         border: 'rgba(248,113,113,0.25)',       color: 'var(--danger)',  label: 'Past due' },
    cancelled:{ bg: 'rgba(148,163,184,0.07)',        border: 'rgba(148,163,184,0.15)',       color: 'var(--muted)',   label: 'Cancelled' },
  };
  const sc = statusCfg[subscription?.status] || statusCfg.cancelled;

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(20px)', background: 'rgba(4,3,14,0.8)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }} onClick={() => nav('/dashboard')}>
          <img src="/lswa_logo.png" alt="LSWA" style={{ height: 30, width: 30, objectFit: "contain" }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>LSWA</span>
        </div>
        <button className="btn-ghost" style={{ padding: '7px 14px', fontSize: 13 }} onClick={() => nav('/dashboard')}>← Dashboard</button>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px', animation: 'fadeIn 0.3s ease-out' }}>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Billing</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32 }}>Manage your LSWA subscription</p>

        {flash && (
          <div style={{ background: flash.ok ? 'rgba(37,211,102,0.08)' : 'rgba(251,191,36,0.08)', border: `1px solid ${flash.ok ? 'var(--wa-border)' : 'rgba(251,191,36,0.25)'}`, borderRadius: 'var(--r-md)', padding: '12px 18px', marginBottom: 24, fontSize: 14 }}>
            {flash.msg}
          </div>
        )}

        {isActive ? (
          <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Current subscription</div>
            {[
              ['Plan', subscription.plan?.charAt(0).toUpperCase() + subscription.plan?.slice(1)],
              ['Status', <span style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, padding: '3px 10px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 500 }}>{sc.label}</span>],
              subscription.trial_ends_at && subscription.status === 'trialing' && ['Trial ends', new Date(subscription.trial_ends_at).toLocaleDateString()],
              subscription.current_period_ends_at && ['Next billing', new Date(subscription.current_period_ends_at).toLocaleDateString()],
            ].filter(Boolean).map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{val}</span>
              </div>
            ))}
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" style={{ padding: '10px 22px', fontSize: 14 }} onClick={openPortal} disabled={loading}>
                {loading ? 'Loading...' : 'Manage subscription'}
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 28 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Choose a plan</div>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>14-day free trial. No credit card required.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
              {PLANS.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  style={{ border: selected === p.id ? '2px solid var(--purple)' : '1px solid var(--border-2)', borderRadius: 'var(--r-md)', padding: '18px 16px', cursor: 'pointer', background: selected === p.id ? 'rgba(139,92,246,0.08)' : 'transparent', transition: 'all 0.15s', boxShadow: selected === p.id ? 'var(--glow)' : 'none' }}
                >
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 800, color: 'var(--purple-light)', marginBottom: 4 }}>{p.price}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)' }}>/mo</span></div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.desc}</div>
                </div>
              ))}
            </div>

            <button className="btn-wa" style={{ width: '100%', padding: '14px', fontSize: 15, borderRadius: 'var(--r-md)' }} onClick={startCheckout} disabled={loading}>
              {loading ? 'Loading...' : 'Start 14-day free trial'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
