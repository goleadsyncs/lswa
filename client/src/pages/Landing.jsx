import React from 'react';

const features = [
  { icon: '💬', title: 'GHL thinks it\'s SMS', text: 'Drop LSWA in as your Telephony Provider. Every outbound message your team sends is secretly WhatsApp. No workflow changes.' },
  { icon: '📱', title: 'Scan & go in 60s', text: 'Connect any WhatsApp number by scanning a QR code — exactly like WhatsApp Web. No Meta approval, no API keys, no waiting.' },
  { icon: '🔄', title: 'Two-way conversations', text: 'Replies land straight back in GHL\'s Conversations tab. Your team sees a normal inbox — they\'ll never know it\'s WhatsApp.' },
  { icon: '🗺️', title: 'Multi-number routing', text: 'Map different GHL phone numbers to different WhatsApp accounts. Run multiple brands from one dashboard.' },
  { icon: '📊', title: 'Full message logs', text: 'Every outbound and inbound message logged with status, timestamps, and error details per sub-account.' },
  { icon: '♾️', title: 'Unlimited messages', text: 'Flat monthly rate. No per-message fees — ever. Scale to thousands of contacts without watching a meter.' },
];

const plans = [
  { name: 'Starter', price: '$29', desc: '/month', features: ['1 GHL sub-account', '3 WhatsApp numbers', 'Unlimited messages', 'Message logs', 'Email support'], popular: false, plan: 'starter' },
  { name: 'Growth', price: '$49', desc: '/month', features: ['5 GHL sub-accounts', '15 WhatsApp numbers', 'Unlimited messages', 'Priority support', 'Advanced analytics'], popular: true, plan: 'growth' },
  { name: 'Agency', price: '$99', desc: '/month', features: ['Unlimited sub-accounts', 'Unlimited WA numbers', 'Unlimited messages', 'Dedicated support', 'White-label ready'], popular: false, plan: 'agency' },
];

export default function Landing() {
  const isLoggedIn = !!localStorage.getItem('lswa_token');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 48px', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(20px)', background: 'rgba(4, 3, 14, 0.7)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--wa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, boxShadow: 'var(--glow-wa)' }}>💬</div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>LSWA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isLoggedIn
            ? <a href="/dashboard" className="btn-primary">Dashboard</a>
            : <>
                <a href="/api/auth/ghl" className="btn-ghost">Sign in with GHL</a>
                <a href="/api/auth/ghl" className="btn-wa">Start free trial</a>
              </>
          }
        </div>
      </nav>

      {/* Hero */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 80px', textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--wa-glass)', border: '1px solid var(--wa-border)', color: 'var(--wa)', padding: '6px 16px', borderRadius: 'var(--r-full)', fontSize: 13, fontWeight: 500, marginBottom: 32, letterSpacing: '-0.01em' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--wa)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          Now live — GHL Telephony Provider integration
        </div>

        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'clamp(38px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.05, maxWidth: 820, marginBottom: 24, letterSpacing: '-0.03em' }}>
          Send WhatsApp from GHL —{' '}
          <span className="wa-text">looks like SMS_</span>
        </h1>

        <p style={{ fontSize: 18, color: 'var(--muted)', maxWidth: 560, lineHeight: 1.7, marginBottom: 44 }}>
          LSWA sits inside GHL as a Telephony Provider. Your workflows fire as normal, but every "SMS" is delivered as a WhatsApp message. <strong className="wa-text">98% open rate.</strong> Zero per-message fees.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/api/auth/ghl" className="btn-wa" style={{ padding: '14px 36px', fontSize: 15 }}>
            Connect GHL — 14 days free
          </a>
          <a href="#pricing" className="btn-ghost" style={{ padding: '14px 36px', fontSize: 15 }}>
            See pricing
          </a>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 48, marginTop: 64, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['98%', 'open rate'], ['$0', 'per message'], ['60s', 'to connect'], ['∞', 'messages/mo']].map(([val, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div className="wa-text" style={{ fontSize: 28, fontWeight: 600 }}>{val}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700, textAlign: 'center', marginBottom: 10, letterSpacing: '-0.02em' }}>Everything you need</h2>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 16, marginBottom: 52 }}>Drop-in WhatsApp for GoHighLevel. No code, no Meta approvals.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
          {features.map(f => (
            <div key={f.title} className="glass-card" style={{ padding: 28, transition: 'border-color 0.2s, transform 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.transform = 'none'; }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>{f.icon}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.01em' }}>{f.title}</div>
              <div style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.65 }}>{f.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '60px 24px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700, textAlign: 'center', marginBottom: 10, letterSpacing: '-0.02em' }}>How it works</h2>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 16, marginBottom: 52 }}>Three steps from sign-up to live WhatsApp delivery.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { n: '01', title: 'Connect your GHL account', desc: 'OAuth in one click. LSWA registers as a Telephony Provider inside your GHL instance.' },
            { n: '02', title: 'Scan a WhatsApp QR code', desc: 'Link any WhatsApp number by scanning a QR — the same way you\'d use WhatsApp Web.' },
            { n: '03', title: 'Messages route automatically', desc: 'GHL sends SMS → LSWA intercepts → WhatsApp delivered. Replies come back into GHL.' },
          ].map(s => (
            <div key={s.n} className="glass-card" style={{ padding: '24px 28px', display: 'flex', alignItems: 'flex-start', gap: 20 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 800, color: 'var(--purple-light)', letterSpacing: '0.05em', flexShrink: 0, marginTop: 3 }}>{s.n}</div>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15, marginBottom: 5 }}>{s.title}</div>
                <div style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '80px 24px', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700, textAlign: 'center', marginBottom: 10, letterSpacing: '-0.02em' }}>Simple pricing</h2>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 16, marginBottom: 52 }}>14-day free trial. No credit card required. Cancel anytime.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          {plans.map(p => (
            <div key={p.name} className="glass-card" style={{ padding: 32, position: 'relative', border: p.popular ? '1px solid var(--purple)' : '1px solid var(--border-2)', boxShadow: p.popular ? 'var(--glow)' : 'none' }}>
              {p.popular && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--grad)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 16px', borderRadius: 'var(--r-full)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  MOST POPULAR
                </div>
              )}
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{p.name}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 2, background: p.popular ? 'var(--grad-text)' : 'none', WebkitBackgroundClip: p.popular ? 'text' : 'none', WebkitTextFillColor: p.popular ? 'transparent' : 'var(--text)', backgroundClip: p.popular ? 'text' : 'none' }}>{p.price}</div>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 28 }}>{p.desc} per agency</div>
              <ul style={{ listStyle: 'none', marginBottom: 28 }}>
                {p.features.map(f => (
                  <li key={f} style={{ fontSize: 14, color: 'var(--text-2)', padding: '5px 0', display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ color: 'var(--wa)', flexShrink: 0, fontSize: 15 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <a href="/api/auth/ghl" className={p.popular ? 'btn-wa' : 'btn-ghost'} style={{ display: 'block', textAlign: 'center', padding: '12px 20px' }}>
                Start free trial
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--wa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>💬</div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15 }}>LSWA</span>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>© {new Date().getFullYear()} LeadSync. All rights reserved.</div>
        <div style={{ display: 'flex', gap: 20 }}>
          <a href="mailto:support@leadsync.app" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 13 }}>Support</a>
          <a href="#" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 13 }}>Privacy</a>
        </div>
      </footer>
    </div>
  );
}
