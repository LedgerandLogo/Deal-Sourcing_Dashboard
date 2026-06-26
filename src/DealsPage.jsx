import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';

function maskPostcode(postcode) {
  if (!postcode) return 'Area undisclosed';
  return postcode.split(' ')[0] + ' ***';
}

function BMVBadge({ pct }) {
  if (!pct) return null;
  const color = pct >= 25 ? '#c0392b' : pct >= 20 ? '#e67e22' : '#27ae60';
  return <span style={{ background: color, color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{pct.toFixed(1)}% BMV</span>;
}

export default function DealsPage() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('deals').select('id,postcode,asking_price,est_market_value,notes,stage,created_at')
      .in('stage', ['lead','offer']).order('created_at', { ascending: false })
      .then(({ data }) => { setDeals(data || []); setLoading(false); });
  }, []);

  const getBMV = (a, m) => (!a || !m || m <= 0) ? null : ((m - a) / m) * 100;

  const s = {
    wrap: { fontFamily: "Segoe UI,Arial,sans-serif", background: '#f7f8fa', minHeight: '100vh' },
    hero: { background: 'linear-gradient(135deg,#1a3c5e,#2e75b6)', color: '#fff', padding: '3rem 1.5rem 2.5rem', textAlign: 'center' },
    grid: { maxWidth: 900, margin: '2rem auto', padding: '0 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '1.5rem' },
    card: { background: '#fff', borderRadius: 14, padding: '1.5rem', boxShadow: '0 2px 16px rgba(0,0,0,0.08)', borderTop: '4px solid #2e75b6' },
    cta: { display: 'block', textAlign: 'center', background: '#1a3c5e', color: '#fff', padding: 10, borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14, marginTop: 12 },
  };

  return (
    <div style={s.wrap}>
      <div style={s.hero}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px' }}>Live BMV Deals</h1>
        <p style={{ opacity: 0.85, margin: '0 0 1.5rem' }}>Register free to receive full details and be first in line.</p>
        <a href="/register" style={{ background: '#fff', color: '#1a3c5e', padding: '12px 28px', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}>Register as a Cash Buyer</a>
      </div>
      {loading ? <p style={{ textAlign: 'center', padding: '3rem' }}>Loading...</p> : (
        <div style={s.grid}>
          {deals.map(deal => {
            const bmv = getBMV(deal.asking_price, deal.est_market_value);
            return (
              <div key={deal.id} style={s.card}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1a3c5e' }}>📍 {maskPostcode(deal.postcode)}</div>
                <div style={{ fontSize: 26, fontWeight: 800, margin: '8px 0 4px' }}>£{deal.asking_price?.toLocaleString()}</div>
                {deal.est_market_value && <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Est. market value: £{deal.est_market_value?.toLocaleString()}</div>}
                <BMVBadge pct={bmv} />
                <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '12px 0' }} />
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{deal.notes ? deal.notes.substring(0,120) + '...' : 'Contact us for full details.'}</div>
                <a href="/register" style={s.cta}>Get Full Details</a>
              </div>
            );
          })}
        </div>
      )}
      <p style={{ textAlign: 'center', fontSize: 12, color: '#bbb', padding: '2rem' }}>Postcode districts only. Full address for registered buyers. © 2026 Ledger & Lot</p>
    </div>
  );
}
