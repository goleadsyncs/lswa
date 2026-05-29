import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App.jsx';
import api from '../api.js';

const s = {
  page: { minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' },
  logo: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 18, cursor: 'pointer' },
  logoIcon: { width: 32, height: 32, background: 'var(--green)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
  body: { maxWidth: 800, margin: '0 auto', padding: '40px 24px' },
  pageTitle: { fontSize: 24, fontWeight: 700, marginBottom: 4 },
  pageSub: { color: 'var(--muted)', fontSize: 14, marginBottom: 40 },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: 600, marginBottom: 16 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' },
  rowLast: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' },
  label: { color: 'var(--muted)', fontSize: 14 },
  value: { fontSize: 14, fontWeight: 500 },
  badgeGreen: { background: 'rgba(37,211,102,0.15)', color: 'var(--green)', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500 },
  badgeOrange: { background: 'rgba(210,153,34,0.15)', color: 'var(--warning)', padding: '3px 10px', borderRadius: 999, fontSize: 12 },
  badgeRed: { background: 'rgba(248,81,73,0.15)', color: 'var(--danger)', padding: '3px 10px', borderRadius: 999, fontSize: 12 },
  btnPrimary: { padding: '10px 22px', background: 'var(--green)', color: '#000', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnSm: { padding: '8px 16px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500 },
  priceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 },
  planCard: { border: '1px solid var(--border)', borderRadius: 10, padding: 20, cursor: 'pointer', transition: 'border-color 0.15s' },
  planCardActive: { border: '2px solid var(--green)' },
  planName: { fontWeight: 600, marginBottom: 4 },
  planPrice: { fontSize: 24, fontWeight: 800, color: 'var(--green)', marginBottom: 4 },
  planDesc: { fontSize: 12, color: 'var(--muted)' },
};

const PLANS = [
  { id: 'starter', name: 'Starter', price: '$29/mo', desc: '1 account, 3 numbers' },
  { id: 'growth',  name: 'Growth',  price: '$49/mo', desc: '5 accounts, 15 numbers' },
  { id: 'agency',  name: 'Agency',  price: '$99/mo', desc: 'Unlimited everything' },
];

function statusBadge(status) {
  if (status === 'active')   return <span style={s.badgeGreen}>Active</span>;
  if (status === 'trialing') return <span style={s.badgeOrange}>Trial</span>;
  return <span style={s.badgeRed}>{status}</span>;
}

export default function Billing() {
  const { user, subscription } = useContext(AuthContext);
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(subscription?.plan || 'growth');
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('success')) setFlash({ type: 'success', msg: 'Subscription activated!' });
    if (url.searchParams.get('cancelled')) setFlash({ type: 'warn', msg: 'Checkout cancelled.' });
  }, []);

  const startCheckout = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/billing/checkout', { plan: selectedPlan });
      window.location.href = data.url;
    } catch { setLoading(false); }
  };

  const openPortal = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/billing/portal');
      window.location.href = data.url;
    } catch { setLoading(false); }
  };

  const isActive = ['active', 'trialing'].includes(subscription?.status);

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.logo} onClick={() => nav('/dashboard')}>
          <div style={s.logoIcon}>🟢</div>
          LSWA
        </div>
        <button style={s.btnSm} onClick={() => nav('/dashboard')}>← Dashboard</button>
      </header>

      <div style={s.body}>
        <div style={s.pageTitle}>Billing</div>
        <div style={s.pageSub}>Manage your LSWA subscription</div>

        {flash && (
          <div style={{ background: flash.type === 'success' ? 'rgba(37,211,102,0.1)' : 'rgba(210,153,34,0.1)', border: `1px solid ${flash.type === 'success' ? 'var(--green)' : 'var(--warning)'}`, borderRadius: 10, padding: '12px 18px', marginBottom: 24, fontSize: 14 }}>
            {flash.msg}
          </div>
        )}

        {isActive ? (
          <div style={s.card}>
            <div style={s.cardTitle}>Current subscription</div>
            <div style={s.row}>
              <div style={s.label}>Plan</div>
              <div style={s.value}>{subscription.plan?.charAt(0).toUpperCase() + subscription.plan?.slice(1)}</div>
            </div>
            <div style={s.row}>
              <div style={s.label}>Status</div>
              <div>{statusBadge(subscription.status)}</div>
            </div>
            {subscription.trial_ends_at && subscription.status === 'trialing' && (
              <div style={s.row}>
                <div style={s.label}>Trial ends</div>
                <div style={s.value}>{new Date(subscription.trial_ends_at).toLocaleDateString()}</div>
              </div>
            )}
            {subscription.current_period_ends_at && (
              <div style={s.row}>
                <div style={s.label}>Next billing date</div>
                <div style={s.value}>{new Date(subscription.current_period_ends_at).toLocaleDateString()}</div>
              </div>
            )}
            <div style={{ ...s.rowLast, marginTop: 20 }}>
              <div style={s.label}>Manage your plan, payment method, and invoices</div>
              <button style={s.btnPrimary} onClick={openPortal} disabled={loading}>
                {loading ? 'Loading...' : 'Manage subscription'}
              </button>
            </div>
          </div>
        ) : (
          <div style={s.card}>
            <div style={s.cardTitle}>Choose a plan</div>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>Start with a 14-day free trial. No credit card required.</p>

            <div style={s.priceGrid}>
              {PLANS.map(p => (
                <div
                  key={p.id}
                  style={{ ...s.planCard, ...(selectedPlan === p.id ? s.planCardActive : {}) }}
                  onClick={() => setSelectedPlan(p.id)}
                >
                  <div style={s.planName}>{p.name}</div>
                  <div style={s.planPrice}>{p.price}</div>
                  <div style={s.planDesc}>{p.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24 }}>
              <button style={{ ...s.btnPrimary, width: '100%', padding: '14px', fontSize: 15 }} onClick={startCheckout} disabled={loading}>
                {loading ? 'Loading...' : 'Start 14-day free trial'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
