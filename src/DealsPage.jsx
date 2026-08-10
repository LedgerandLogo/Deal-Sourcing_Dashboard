// Ledger & Lot Public Deals Page v4
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';

function maskPostcode(postcode) {
  if (!postcode) return 'Area undisclosed';
  const parts = postcode.trim().split(' ');
  if (parts.length < 2 || !parts[1]) return parts[0] + '**';
  return parts[0] + ' ' + parts[1][0] + '**';
}

function BMVBadge({ pct }) {
  if (!pct) return null;
  const color = pct >= 25 ? '#c0392b' : pct >= 20 ? '#e67e22' : '#27ae60';
  return (
    <span style={{ background: color, color: '#fff', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, display: 'inline-block' }}>
      {pct.toFixed(1)}% BMV
    </span>
  );
}

export default function DealsPage() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('premium_deals')
      .select('id,postcode,asking_price,market_value,notes,stage,created_at,bmv_discount_pct')
      .order('bmv_discount_pct', { ascending: false })
      .then(({ data, error }) => {
        setDeals(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ fontFamily: 'Segoe UI, Arial, sans-serif', background: '#f4f6f9', minHeight: '100vh' }}>

      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#1a3c5e', letterSpacing: '-0.3px' }}>Ledger & Lot</span>
          <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>Property Sourcing</span>
        </div>
        <a href="/register" style={{ background: '#1a3c5e', color: '#fff', padding: '8px 18px', borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
          Register as Buyer
        </a>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #1a3c5e 0%, #2e75b6 100%)', color: '#fff', padding: '3rem 1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.7, margin: '0 0 12px' }}>Cash Buyers Only</p>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.5px' }}>Live BMV Deals</h1>
        <p style={{ opacity: 0.85, margin: '0 0 24px', fontSize: 16, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          Below-market-value properties sourced across the UK. Register free to receive full addresses and details.
        </p>
        <a href="/register" style={{ background: '#fff', color: '#1a3c5e', padding: '13px 32px', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: 15, display: 'inline-block' }}>
          Register Free -&gt; Get Full Details
        </a>
      </div>

      <div style={{ background: '#1a3c5e', color: '#fff', padding: '12px 24px', display: 'flex', justifyContent: 'center', gap: '3rem', fontSize: 13 }}>
        <span>Active Deals: {deals.length}</span>
        <span>Multiple UK Locations</span>
        <span>30%+ Below Market Value</span>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '4rem', color: '#888' }}>Loading deals...</p>
      ) : deals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: '#888', fontSize: 16 }}>No active deals right now.</p>
          <p style={{ color: '#aaa', fontSize: 14 }}>Register to be first notified when new deals drop.</p>
          <a href="/register" style={{ background: '#1a3c5e', color: '#fff', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginTop: 16 }}>Register Now</a>
        </div>
      ) : (
        <div style={{ maxWidth: 960, margin: '2.5rem auto', padding: '0 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {deals.map(deal => (
            <div key={deal.id} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: '1px solid #eee' }}>
              <div style={{ background: '#1a3c5e', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{maskPostcode(deal.postcode)}</span>
                <BMVBadge pct={deal.bmv_discount_pct} />
              </div>
              <div style={{ padding: '18px' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#1a1a1a', margin: '0 0 4px' }}>
                  £{deal.asking_price?.toLocaleString() || 'POA'}
                </div>
                {deal.market_value && (
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
                    Est. market value: £{deal.market_value?.toLocaleString()}
                  </div>
                )}
                <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '12px 0' }} />
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 16 }}>
                  {deal.notes ? deal.notes.substring(0, 100) + (deal.notes.length > 100 ? '...' : '') : 'Full details available to registered buyers.'}
                </div>
                <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#795500', marginBottom: 14 }}>
                  Full address &amp; comparables for registered buyers only
                </div>
                <a href="/register" style={{ display: 'block', textAlign: 'center', background: '#1a3c5e', color: '#fff', padding: '11px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                  Get Full Details -&gt;
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ maxWidth: 960, margin: '2.5rem auto', padding: '0 1.5rem' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '1.75rem', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: '1px solid #eee' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a3c5e', margin: '0 0 12px' }}>About Ledger &amp; Lot</h3>
          <p style={{ fontSize: 14, color: '#444', lineHeight: 1.7, margin: '0 0 12px' }}>
            Ledger &amp; Lot is a UK property deal-sourcing service. We track auction listings across England, including Savills, Allsop, and BTG Eddisons, and shortlist below-market-value opportunities for registered cash buyers. We are a sourcing agent, not an estate agent, lender, or investment adviser: we identify and pass on deals in exchange for a finder's fee, agreed up front via the Property Sourcing Agreement below. We hold no client funds and do not manage property on anyone's behalf.
          </p>
          <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, margin: 0 }}>
            Estimated market values are calculated from HM Land Registry Price Paid Data comparables, matched by property type and postcode district. They are automated estimates for guidance only, not a RICS valuation or formal survey. Always carry out independent due diligence, including your own valuation, before making an offer. Ledger &amp; Lot (ledgerandlot.org) is not affiliated with, and has no connection to, any similarly-named business operating in other markets.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '2.5rem auto', padding: '0 1.5rem' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '1.5rem 1.75rem', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: '1px solid #eee' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a3c5e', margin: '0 0 12px' }}>Documents &amp; Resources</h3>
          {[
            { name: 'Property Sourcing Agreement', file: '/legal/property-sourcing-agreement.pdf' },
            { name: "Finder's Fee & Commission Agreement", file: '/legal/finders-fee-commission-agreement.pdf' },
            { name: 'Non-Circumvention Agreement', file: '/legal/non-circumvention-agreement.pdf' },
          ].map(d => (
            <a key={d.file} href={d.file} download style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f0f0f0', textDecoration: 'none', color: '#1a3c5e', fontSize: 14, fontWeight: 500 }}>
              {d.name}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888' }}>Download</span>
            </a>
          ))}
        </div>
      </div>

      <div style={{ background: '#1a3c5e', color: '#fff', textAlign: 'center', padding: '3rem 1.5rem', marginTop: '2rem' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px' }}>Want First Access to Every Deal?</h2>
        <p style={{ opacity: 0.8, margin: '0 0 24px', fontSize: 15 }}>Join our cash buyer list. Free to register, no obligation.</p>
        <a href="/register" style={{ background: '#fff', color: '#1a3c5e', padding: '13px 32px', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: 15, display: 'inline-block' }}>
          Register as a Cash Buyer
        </a>
      </div>

      <div style={{ textAlign: 'center', padding: '1.5rem', fontSize: 12, color: '#bbb', background: '#f4f6f9' }}>
        Estimated market value calculated automatically; not independently verified. Postcode districts shown only. Full address released to registered buyers. (c) 2026 Ledger &amp; Lot | ledgerandlot.org
      </div>
    </div>
  );
}
