import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';

function maskPostcode(postcode) {
  if (!postcode) return 'Location withheld';
  // Show only district e.g. "NW10" not "NW10 8LD"
  return postcode.trim().split(' ')[0];
}

function BMVBadge({ pct }) {
  if (!pct) return null;
  const color = pct >= 25 ? '#c0392b' : pct >= 20 ? '#e67e22' : '#27ae60';
  return (
    <span style={{ background: color, color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
      {pct.toFixed(1)}% BMV
    </span>
  );
}

export default function DealsPage() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('deals')
        .select('id, address, postcode, asking_price, est_market_value, stage, notes, created_at')
        .in('stage', ['lead', 'offer', 'agreed'])
        .order('created_at', { ascending: false });
      setDeals(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = filter === 'all' ? deals : deals.filter(d => d.stage === filter);

  const bmv = (d) => {
    if (!d.asking_price || !d.est_market_value) return null;
    return ((d.est_market_value - d.asking_price) / d.est_market_value) * 100;
  };

  const s = {
    wrap: { fontFamily: "'Segoe UI', Arial, sans-serif", background: '#f7f8fa', minHeight: '100vh' },
    hero: { background: 'linear-gradient(135deg, #1a3c5e 0%, #2e75b6 100%)', color: '#fff', padding: '3rem 1.5rem 2rem', textAlign: 'center' },
    heroTitle: { fontSize: 30, fontWeight: 700, margin: '0 0 8px' },
    heroSub: { fontSize: 15, opacity: 0.85, margin: '0 0 1.5rem' },
    registerBtn: { display: 'inline-block', background: '#fff', color: '#1a3c5e', padding: '12px 28px', borderRadius: 8, fontWeight: 700, fontSize: 15, textDecoration: 'none' },
    container: { maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' },
    filters: { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
    filterBtn: (active) => ({ padding: '6px 16px', borderRadius: 20, border: '1px solid', borderColor: active ? '#1a3c5e' : '#dde', background: active ? '#1a3c5e' : '#fff', color: active ? '#fff' : '#555', fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer' }),
    card: { background: '#fff', borderRadius: 14, padding: '1.5rem', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', borderLeft: '4px solid #2e75b6' },
    cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 },
    address: { fontSize: 18, fontWeight: 700, color: '#1a3c5e', margin: '0 0 4px' },
    postcode: { fontSize: 13, color: '#888', margin: 0 },
    prices: { display: 'flex', gap: 24, margin: '1rem 0', flexWrap: 'wrap' },
    priceBox: { textAlign: 'center' },
    priceLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
    priceVal: { fontSize: 20, fontWeight: 700, color: '#1a3c5e' },
    notes: { fontSize: 13, color: '#666', lineHeight: 1.6, margin: '0.5rem 0 0' },
    stage: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
    cta: { background: '#f0f4f8', borderRadius: 12, padding: '1.5rem', textAlign: 'center', marginTop: 32 },
    ctaTitle: { fontSize: 18, fontWeight: 700, color: '#1a3c5e', margin: '0 0 8px' },
    ctaBtn: { display: 'inline-block', background: '#1a3c5e', color: '#fff', padding: '12px 28px', borderRadius: 8, fontWeight: 700, fontSize: 15, textDecoration: 'none', marginTop: 12 },
    warning: { background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#856404', marginBottom: 20 },
  };

  const stageLabel = { lead: 'New Lead', offer: 'Under Offer', agreed: 'Agreed' };

  return (
    <div style={s.wrap}>
      <div style={s.hero}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🏠</div>
        <h1 style={s.heroTitle}>Ledger & Lot — Live Deals</h1>
        <p style={s.heroSub}>Below-market-value properties available now. Register to get full details.</p>
        <a href="/register" style={s.registerBtn}>Register as a Cash Buyer →</a>
      </div>

      <div style={s.container}>
        <div style={s.warning}>
          ⚠️ <strong>Verified cash buyers only.</strong> Full addresses and legal packs shared after signing our Non-Circumvention Agreement. <a href="/register" style={{ color: '#1a3c5e' }}>Register here</a> to access full details.
        </div>

        <div style={s.filters}>
          {['all', 'lead', 'offer', 'agreed'].map(f => (
            <button key={f} style={s.filterBtn(filter === f)} onClick={() => setFilter(f)}>
              {f === 'all' ? `All Deals (${deals.length})` : stageLabel[f]}
            </button>
          ))}
        </div>

        {loading && <p style={{ color: '#888', textAlign: 'center' }}>Loading deals...</p>}

        {!loading && filtered.length === 0 && (
          <p style={{ color: '#888', textAlign: 'center' }}>No deals available in this category right now. Check back soon.</p>
        )}

        {filtered.map(deal => (
          <div key={deal.id} style={s.card}>
            <div style={s.cardTop}>
              <div>
                <p style={s.address}>{deal.address}</p>
                <p style={s.postcode}>📍 {maskPostcode(deal.postcode)} — Full address on registration</p>
              </div>
              <BMVBadge pct={bmv(deal)} />
            </div>

            <div style={s.prices}>
              <div style={s.priceBox}>
                <div style={s.priceLabel}>Guide Price</div>
                <div style={s.priceVal}>£{deal.asking_price?.toLocaleString()}</div>
              </div>
              {deal.est_market_value && (
                <div style={s.priceBox}>
                  <div style={s.priceLabel}>Est. Market Value</div>
                  <div style={s.priceVal}>£{deal.est_market_value?.toLocaleString()}</div>
                </div>
              )}
              {bmv(deal) && (
                <div style={s.priceBox}>
                  <div style={s.priceLabel}>Potential Saving</div>
                  <div style={{ ...s.priceVal, color: '#27ae60' }}>
                    £{(deal.est_market_value - deal.asking_price)?.toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {deal.notes && (
              <p style={s.notes}>📋 {deal.notes.substring(0, 150)}{deal.notes.length > 150 ? '...' : ''}</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span style={s.stage}>Stage: {stageLabel[deal.stage] || deal.stage}</span>
              <a href="/register" style={{ fontSize: 13, color: '#2e75b6', fontWeight: 600, textDecoration: 'none' }}>
                Get full details →
              </a>
            </div>
          </div>
        ))}

        <div style={s.cta}>
          <p style={s.ctaTitle}>Want to receive deals like these directly?</p>
          <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Join our verified cash buyer list. Free to register. No obligation.</p>
          <a href="/register" style={s.ctaBtn}>Register Now — It's Free</a>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#bbb', paddingTop: '2rem' }}>
          © 2026 Ledger & Lot · ledgerandlot.org · Property Sourcing · West London
        </p>
      </div>
    </div>
  );
}
