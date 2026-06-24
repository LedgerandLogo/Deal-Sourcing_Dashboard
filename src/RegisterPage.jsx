import React, { useState } from 'react';
import { supabase } from './supabaseClient.js';

const AREAS = ['West London', 'North London', 'South London', 'East London', 'Birmingham', 'Manchester', 'Leeds', 'Nottingham', 'Sheffield', 'Nationwide'];
const TYPES = ['Buy-to-Let', 'HMO', 'Flip / Refurb', 'Commercial', 'Development'];

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', areas: '', max_budget: '', notes: '' });
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggle = (arr, setArr, val) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.email) {
      setError('Please fill in your name, phone and email.');
      return;
    }
    setLoading(true);
    setError('');
    const payload = {
      name: form.name,
      phone: form.phone,
      areas: [...selectedAreas, ...selectedTypes].join(', ') || form.areas,
      max_budget: form.max_budget ? parseFloat(form.max_budget.replace(/[^0-9.]/g, '')) : null,
      notes: `Email: ${form.email}. ${form.notes}`.trim(),
    };
    const { error: err } = await supabase.from('buyers').insert(payload);
    if (err) { setError('Something went wrong. Please try again.'); setLoading(false); return; }
    
    // Also trigger webhook for Make.com automation
    try {
      await fetch('https://hook.eu2.make.com/REPLACE_WITH_YOUR_WEBHOOK', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, email: form.email, source: 'ledgerandlot.org' }),
      });
    } catch {}
    
    setSubmitted(true);
    setLoading(false);
  };

  const s = {
    wrap: { fontFamily: "'Segoe UI', Arial, sans-serif", background: '#f7f8fa', minHeight: '100vh', padding: '0' },
    hero: { background: 'linear-gradient(135deg, #1a3c5e 0%, #2e75b6 100%)', color: '#fff', padding: '3rem 1.5rem 2.5rem', textAlign: 'center' },
    heroTitle: { fontSize: 32, fontWeight: 700, margin: '0 0 8px' },
    heroSub: { fontSize: 16, opacity: 0.85, margin: 0 },
    card: { maxWidth: 600, margin: '-1.5rem auto 3rem', background: '#fff', borderRadius: 16, padding: '2rem 2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.10)' },
    label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 4, marginTop: 16 },
    input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', outline: 'none' },
    chip: (active) => ({ display: 'inline-block', padding: '6px 14px', borderRadius: 20, fontSize: 13, margin: '4px', cursor: 'pointer', background: active ? '#1a3c5e' : '#f0f4f8', color: active ? '#fff' : '#444', border: '1px solid', borderColor: active ? '#1a3c5e' : '#dde', fontWeight: active ? 600 : 400 }),
    btn: { width: '100%', padding: '14px', background: '#1a3c5e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 24 },
    docs: { maxWidth: 600, margin: '0 auto 3rem', background: '#fff', borderRadius: 16, padding: '1.5rem 2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
    docLink: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f0f0f0', textDecoration: 'none', color: '#1a3c5e', fontSize: 14, fontWeight: 500 },
  };

  const documents = [
    { name: 'Hot Auction Deals — July 2026', file: '/docs/LedgerAndLot_HotAuctionDeals_July2026.docx', icon: '🏠' },
    { name: 'Property Sourcing Agreement', file: '/docs/LedgerAndLot_PropertySourcingAgreement.docx', icon: '📄' },
    { name: "Finder's Fee & Commission Agreement", file: '/docs/LedgerAndLot_FindersFeeAgreement.docx', icon: '💼' },
    { name: 'Non-Circumvention Agreement', file: '/docs/LedgerAndLot_NonCircumventionAgreement.docx', icon: '🔒' },
    { name: 'Reply Templates & Automation Guide', file: '/docs/LedgerAndLot_ReplyTemplates_Automation.docx', icon: '✉️' },
  ];

  if (submitted) return (
    <div style={s.wrap}>
      <div style={s.hero}>
        <h1 style={s.heroTitle}>You're on the list! ✅</h1>
        <p style={s.heroSub}>We'll be in touch as soon as a deal matches your criteria.</p>
      </div>
      <div style={{ ...s.card, textAlign: 'center' }}>
        <p style={{ fontSize: 15, color: '#444', lineHeight: 1.7 }}>
          Thank you for registering with <strong>Ledger & Lot</strong>.<br/>
          You'll receive deal alerts by email and WhatsApp as soon as we have something that matches your criteria.<br/><br/>
          In the meantime, download our documents below.
        </p>
      </div>
      <div style={s.docs}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a3c5e', marginTop: 0 }}>Documents & Resources</h3>
        {documents.map(d => (
          <a key={d.file} href={d.file} download style={s.docLink}>
            <span style={{ fontSize: 20 }}>{d.icon}</span> {d.name}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888' }}>Download ↓</span>
          </a>
        ))}
      </div>
    </div>
  );

  return (
    <div style={s.wrap}>
      <div style={s.hero}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🏠</div>
        <h1 style={s.heroTitle}>Ledger & Lot</h1>
        <p style={s.heroSub}>Register to receive exclusive BMV property deals before they hit the market</p>
      </div>

      <div style={s.card}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3c5e', margin: '0 0 4px' }}>Buyer Registration</h2>
        <p style={{ fontSize: 13, color: '#888', margin: '0 0 8px' }}>Free to join. No obligation. Deals sent directly to you.</p>

        <label style={s.label}>Full Name *</label>
        <input style={s.input} placeholder="Your full name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />

        <label style={s.label}>Phone Number *</label>
        <input style={s.input} placeholder="07..." value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />

        <label style={s.label}>Email Address *</label>
        <input style={s.input} type="email" placeholder="you@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />

        <label style={s.label}>Preferred Areas</label>
        <div style={{ marginTop: 4 }}>
          {AREAS.map(a => <span key={a} style={s.chip(selectedAreas.includes(a))} onClick={() => toggle(selectedAreas, setSelectedAreas, a)}>{a}</span>)}
        </div>

        <label style={s.label}>Investment Type</label>
        <div style={{ marginTop: 4 }}>
          {TYPES.map(t => <span key={t} style={s.chip(selectedTypes.includes(t))} onClick={() => toggle(selectedTypes, setSelectedTypes, t)}>{t}</span>)}
        </div>

        <label style={s.label}>Maximum Budget</label>
        <input style={s.input} placeholder="e.g. £250,000" value={form.max_budget} onChange={e => setForm({...form, max_budget: e.target.value})} />

        <label style={s.label}>Anything else? (optional)</label>
        <textarea style={{ ...s.input, height: 80, resize: 'vertical' }} placeholder="e.g. cash buyer, need HMO licence, min 7% yield..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />

        {error && <p style={{ color: '#c0392b', fontSize: 13, marginTop: 8 }}>{error}</p>}

        <button style={s.btn} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Registering...' : 'Register as a Cash Buyer →'}
        </button>

        <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 12 }}>
          Your details are kept strictly confidential and never shared with third parties.
        </p>
      </div>

      <div style={s.docs}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a3c5e', marginTop: 0 }}>Documents & Resources</h3>
        {documents.map(d => (
          <a key={d.file} href={d.file} download style={s.docLink}>
            <span style={{ fontSize: 20 }}>{d.icon}</span> {d.name}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888' }}>Download ↓</span>
          </a>
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#bbb', paddingBottom: '2rem' }}>
        © 2026 Ledger & Lot · ledgerandlot.org · All rights reserved
      </p>
    </div>
  );
}
