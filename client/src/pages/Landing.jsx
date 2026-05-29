import React from 'react';

const s = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 48px', borderBottom: '1px solid var(--border)' },
  logo: { display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 20 },
  logoIcon: { width: 36, height: 36, background: 'var(--green)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 },
  navBtn: { padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, textDecoration: 'none', display: 'inline-block' },
  navBtnPrimary: { background: 'var(--green)', border: 'none', color: '#000', marginLeft: 12 },
  hero: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px 60px', textAlign: 'center' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', color: 'var(--green)', padding: '5px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, marginBottom: 28 },
  h1: { fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 800, lineHeight: 1.1, maxWidth: 800, marginBottom: 20 },
  sub: { fontSize: 18, color: 'var(--muted)', maxWidth: 560, lineHeight: 1.6, marginBottom: 40 },
  btnRow: { display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  btnPrimary: { padding: '14px 32px', background: 'var(--green)', color: '#000', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-block' },
  btnSecondary: { padding: '14px 32px', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-block' },
  section: { padding: '80px 24px', maxWidth: 1100, margin: '0 auto', width: '100%' },
  sectionTitle: { fontSize: 32, fontWeight: 700, textAlign: 'center', marginBottom: 12 },
  sectionSub: { textAlign: 'center', color: 'var(--muted)', fontSize: 16, marginBottom: 52 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28 },
  cardIcon: { width: 44, height: 44, borderRadius: 10, background: 'rgba(37,211,102,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 },
  cardTitle: { fontSize: 17, fontWeight: 600, marginBottom: 8 },
  cardText: { color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 },
  priceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 },
  priceCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, position: 'relative' },
  priceCardPop: { border: '2px solid var(--green)' },
  popBadge: { position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--green)', color: '#000', fontSize: 12, fontWeight: 700, padding: '3px 14px', borderRadius: 999 },
  planName: { fontSize: 14, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  planPrice: { fontSize: 42, fontWeight: 800, marginBottom: 4 },
  planPer: { color: 'var(--muted)', fontSize: 14, marginBottom: 24 },
  planFeatures: { listStyle: 'none', marginBottom: 28 },
  planFeature: { fontSize: 14, color: 'var(--muted)', padding: '5px 0', display: 'flex', alignItems: 'center', gap: 8 },
  planFeatureCheck: { color: 'var(--green)', flexShrink: 0 },
  divider: { borderTop: '1px solid var(--border)', margin: '80px 0 0' },
  footer: { padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  footerText: { color: 'var(--muted)', fontSize: 14 },
};

const features = [
  { icon: '💬', title: 'Looks like SMS to GHL', text: 'GHL thinks it\'s sending a normal SMS. Behind the scenes, every message is delivered via WhatsApp. Zero workflow changes needed.' },
  { icon: '📱', title: 'Connect in 60 seconds', text: 'Scan a QR code with any WhatsApp number. No Meta approval, no API keys, no waiting. Just scan and go.' },
  { icon: '🔄', title: 'Two-way conversations', text: 'Replies from contacts come straight back into GHL\'s Conversations tab — just like SMS, but it\'s WhatsApp.' },
  { icon: '🗺️', title: 'Multi-number routing', text: 'Map different GHL phone numbers to different WhatsApp accounts. Perfect for agencies with multiple brands.' },
  { icon: '📊', title: 'Message logs', text: 'Every outbound and inbound message is logged. See delivery status, errors, and full history per sub-account.' },
  { icon: '♾️', title: 'Unlimited messages', text: 'No per-message fees. Ever. Flat monthly pricing so your costs stay predictable as you scale.' },
];

const plans = [
  {
    name: 'Starter',
    price: '$29',
    per: '/month',
    features: ['1 GHL sub-account', '3 WhatsApp numbers', 'Unlimited messages', 'Message logs', 'Email support'],
    popular: false,
    plan: 'starter',
  },
  {
    name: 'Growth',
    price: '$49',
    per: '/month',
    features: ['5 GHL sub-accounts', '15 WhatsApp numbers', 'Unlimited messages', 'Priority support', 'Advanced logs'],
    popular: true,
    plan: 'growth',
  },
  {
    name: 'Agency',
    price: '$99',
    per: '/month',
    features: ['Unlimited sub-accounts', 'Unlimited WA numbers', 'Unlimited messages', 'Dedicated support', 'White-label ready'],
    popular: false,
    plan: 'agency',
  },
];

export default function Landing() {
  const isLoggedIn = !!localStorage.getItem('lswa_token');

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.logo}>
          <div style={s.logoIcon}>🟢</div>
          LSWA
        </div>
        <div>
          {isLoggedIn
            ? <a href="/dashboard" style={{ ...s.navBtn, ...s.navBtnPrimary }}>Dashboard</a>
            : <>
                <a href="/api/auth/ghl" style={s.navBtn}>Sign in with GHL</a>
                <a href="/api/auth/ghl" style={{ ...s.navBtn, ...s.navBtnPrimary }}>Start free trial</a>
              </>
          }
        </div>
      </nav>

      <section style={s.hero}>
        <div style={s.badge}>
          <span>💬</span> Now with GHL Telephony Provider integration
        </div>
        <h1 style={s.h1}>
          Send WhatsApp from GoHighLevel — <span style={{ color: 'var(--green)' }}>like SMS</span>
        </h1>
        <p style={s.sub}>
          LSWA appears as a Telephony Provider in your GHL settings. Your workflows fire as normal, but every "SMS" is delivered as a WhatsApp message. 98% open rate. Zero per-message fees.
        </p>
        <div style={s.btnRow}>
          <a href="/api/auth/ghl" style={s.btnPrimary}>Connect GHL — 14 days free</a>
          <a href="#pricing" style={s.btnSecondary}>See pricing</a>
        </div>
      </section>

      <section style={s.section}>
        <h2 style={s.sectionTitle}>Everything you need</h2>
        <p style={s.sectionSub}>Drop-in replacement for SMS inside GHL. No code, no API keys.</p>
        <div style={s.grid3}>
          {features.map(f => (
            <div key={f.title} style={s.card}>
              <div style={s.cardIcon}>{f.icon}</div>
              <div style={s.cardTitle}>{f.title}</div>
              <div style={s.cardText}>{f.text}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" style={{ ...s.section, paddingTop: 0 }}>
        <h2 style={s.sectionTitle}>Simple pricing</h2>
        <p style={s.sectionSub}>14-day free trial. No credit card required. Cancel anytime.</p>
        <div style={s.priceGrid}>
          {plans.map(p => (
            <div key={p.name} style={{ ...s.priceCard, ...(p.popular ? s.priceCardPop : {}) }}>
              {p.popular && <div style={s.popBadge}>MOST POPULAR</div>}
              <div style={s.planName}>{p.name}</div>
              <div style={s.planPrice}>{p.price}</div>
              <div style={s.planPer}>{p.per} per agency</div>
              <ul style={s.planFeatures}>
                {p.features.map(f => (
                  <li key={f} style={s.planFeature}>
                    <span style={s.planFeatureCheck}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="/api/auth/ghl" style={{ ...s.btnPrimary, display: 'block', textAlign: 'center', opacity: p.popular ? 1 : 0.85 }}>
                Start free trial
              </a>
            </div>
          ))}
        </div>
      </section>

      <div style={s.divider} />
      <footer style={s.footer}>
        <div style={s.logo}>
          <div style={{ ...s.logoIcon, width: 28, height: 28, fontSize: 14 }}>🟢</div>
          LSWA
        </div>
        <div style={s.footerText}>© {new Date().getFullYear()} LeadSync. All rights reserved.</div>
        <div style={{ ...s.footerText, display: 'flex', gap: 20 }}>
          <a href="mailto:support@leadsync.app" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Support</a>
          <a href="#" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Privacy</a>
        </div>
      </footer>
    </div>
  );
}
