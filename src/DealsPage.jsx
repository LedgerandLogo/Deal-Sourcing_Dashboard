// Ledger & Lot Public Deals Page v5
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

function DealCard({ deal, featured }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: featured ? '0 4px 20px rgba(212,160,23,0.18)' : '0 2px 16px rgba(0,0,0,0.07)', border: featured ? '2px solid #d4a017' : '1px solid #eee', position: 'relative' }}>
      {featured && (
        <div style={{ position: 'absolute', top: 0, right: 0, background: '#d4a017', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: '0 0 0 10px', letterSpacing: 0.5 }}>
          FEATURED
        </div>
      )}
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
        <a href="/register" style={{ display: 'block', textAlign: 'center', background: '#1a3c5e', color:
