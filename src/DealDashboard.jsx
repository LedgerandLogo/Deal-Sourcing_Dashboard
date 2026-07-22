<StatCard label="Avg BMV" value={stats.avgBmv === null ? '—' : `${stats.avgBmv.toFixed(1)}%`} />
            <StatCard label="Pipeline value" value={gbp(stats.pipelineValue)} sub="asking price, active deals" />
            <StatCard label="Est. sourcing fees" value={gbp(stats.estFees)} sub="if all active deals complete" />
            <StatCard label="Completed" value={stats.completedCount} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => setFilterStage('all')} style={{ fontSize: 13, padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: filterStage === 'all' ? '#f0f0f0' : '#fff', cursor: 'pointer' }}>All</button>
              {STAGES.map(s => (
                <button key={s.id} onClick={() => setFilterStage(s.id)} style={{ fontSize: 13, padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: filterStage === s.id ? '#f0f0f0' : '#fff', cursor: 'pointer' }}>
                  {s.label} ({dealsByStage[s.id].length})
                </button>
              ))}
            </div>
            <button onClick={() => setEditingDeal(emptyDeal())} style={{ fontSize: 13, padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>
              + Add deal
            </button>
          </div>

          {filteredDeals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#999', fontSize: 14 }}>
              No deals here yet. Add one to start tracking it.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredDeals.map((deal, index) => {
                const buyer = buyers.find(b => b.id === deal.buyer_id);
                const pct = bmvPct(deal.asking_price, deal.market_value);
                return (
                  <div key={deal.id} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <p style={{ fontWeight: 500, fontSize: 15, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {index + 1}. {deal.address || 'Untitled deal'}
                      </p>
                      <p style={{ fontSize: 13, color: '#666', margin: '2px 0 0' }}>
                        {deal.postcode ? deal.postcode.split(' ')[0] + '**' : '—'} · {deal.seller_name || 'No seller name'}
                      </p>
                    </div>
                    <div style={{ minWidth: 90 }}>
                      <p style={{ fontSize: 13, color: '#666', margin: 0 }}>Asking</p>
                      <p style={{ fontSize: 14, fontWeight: 500, margin: '2px 0 0' }}>{gbp(deal.asking_price)}</p>
                    </div>
                    <div style={{ minWidth: 90 }}>
                      <BmvBadge pct={pct} />
                    </div>
                    <div style={{ minWidth: 110, fontSize: 13, color: '#666' }}>
                      {buyer ? buyer.name : 'No buyer matched'}
                    </div>
                    <select value={deal.stage} onChange={(e) => moveStage(deal.id, e.target.value)} style={{ fontSize: 13, minWidth: 130, padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' }}>
                      {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <button onClick={() => setEditingDeal(deal)} style={{ fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === 'buyers' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setEditingBuyer(emptyBuyer())} style={{ fontSize: 13, padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>
              + Add buyer
            </button>
          </div>
          {buyers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#999', fontSize: 14 }}>
              No cash buyers logged yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {buyers.map(buyer => (
                <div key={buyer.id} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10, padding: '1rem 1.25rem' }}>
                  <p style={{ fontWeight: 500, fontSize: 15, margin: 0 }}>{buyer.name || 'Unnamed buyer'}</p>
                  <p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>{buyer.phone || 'No phone'}</p>
                  <p style={{ fontSize: 13, color: '#666', margin: '2px 0 0' }}>{buyer.areas || 'No areas set'}</p>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: '8px 0 0' }}>Max budget: {gbp(buyer.max_budget)}</p>
                  <button onClick={() => setEditingBuyer(buyer)} style={{ fontSize: 13, marginTop: 10, padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {editingDeal && (
        <DealModal deal={editingDeal} buyers={buyers} onSave={saveDeal} onDelete={deleteDeal} onClose={() => setEditingDeal(null)} isNew={!editingDeal.id} />
      )}
      {editingBuyer && (
        <BuyerModal buyer={editingBuyer} onSave={saveBuyer} onDelete={deleteBuyer} onClose={() => setEditingBuyer(null)} isNew={!editingBuyer.id} />
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#666' }}>
      {label}
      {children}
    </label>
  );
}

const inputStyle = { padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14 };

function DealModal({ deal, buyers, onSave, onDelete, onClose, isNew }) {
  const [form, setForm] = useState(deal);
  const pct = bmvPct(form.asking_price, form.market_value);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '1.5rem', width: 420, maxWidth: '90%', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>{isNew ? 'Add deal' : 'Edit deal'}</h2>
          <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
        <Field label="Address"><input style={inputStyle} value={form.address || ''} onChange={set('address')} placeholder="12 Example Road" /></Field>
        <div style={{ display: 'flex', gap: 12 }}>
          <Field label="Postcode (full)"><input style={inputStyle} value={form.postcode || ''} onChange={set('postcode')} placeholder="W12 7AB" /></Field>
          <Field label="Sourcing fee %"><input style={inputStyle} type="number" value={form.sourcing_fee_pct ?? 2} onChange={set('sourcing_fee_pct')} step="0.5" /></Field>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Field label="Asking price"><input style={inputStyle} type="number" value={form.asking_price || ''} onChange={set('asking_price')} placeholder="180000" /></Field>
          <Field label="Est. market value"><input style={inputStyle} type="number" value={form.market_value || ''} onChange={set('market_value')} placeholder="220000" /></Field>
        </div>
        <div><BmvBadge pct={pct} /></div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Field label="Seller name"><input style={inputStyle} value={form.seller_name || ''} onChange={set('seller_name')} /></Field>
          <Field label="Seller phone"><input style={inputStyle} value={form.seller_phone || ''} onChange={set('seller_phone')} /></Field>
        </div>
        <Field label="Matched buyer">
          <select style={inputStyle} value={form.buyer_id || ''} onChange={set('buyer_id')}>
            <option value="">No buyer matched</option>
            {buyers.map(b => <option key={b.id} value={b.id}>{b.name || 'Unnamed buyer'}</option>)}
          </select>
        </Field>
        <Field label="Stage">
          <select style={inputStyle} value={form.stage} onChange={set('stage')}>
            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Notes"><textarea style={{ ...inputStyle, resize: 'vertical' }} value={form.notes || ''} onChange={set('notes')} rows={3} /></Field>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {!isNew ? (
            <button onClick={() => onDelete(form.id)} style={{ color: '#c0392b', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
          ) : <span />}
          <button onClick={() => onSave(form)} style={{ fontSize: 13, fontWeight: 500, padding: '8px 14px', borderRadius: 6, border: 'none', background: '#1d1d1d', color: '#fff', cursor: 'pointer' }}>Save deal</button>
        </div>
      </div>
    </div>
  );
}

function BuyerModal({ buyer, onSave, onDelete, onClose, isNew }) {
  const [form, setForm] = useState(buyer);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '1.5rem', width: 380, maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>{isNew ? 'Add buyer' : 'Edit buyer'}</h2>
          <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
        <Field label="Name"><input style={inputStyle} value={form.name || ''} onChange={set('name')} /></Field>
        <Field label="Phone"><input style={inputStyle} value={form.phone || ''} onChange={set('phone')} /></Field>
        <Field label="Target areas"><input style={inputStyle} value={form.areas || ''} onChange={set('areas')} placeholder="West London, Zone 2-3" /></Field>
        <Field label="Max budget"><input style={inputStyle} type="number" value={form.max_budget || ''} onChange={set('max_budget')} /></Field>
        <Field label="Notes"><textarea style={{ ...inputStyle, resize: 'vertical' }} value={form.notes || ''} onChange={set('notes')} rows={3} /></Field>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {!isNew ? (
            <button onClick={() => onDelete(form.id)} style={{ color: '#c0392b', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
          ) : <span />}
          <button onClick={() => onSave(form)} style={{ fontSize: 13, fontWeight: 500, padding: '8px 14px', borderRadius: 6, border: 'none', background: '#1d1d1d', color: '#fff', cursor: 'pointer' }}>Save buyer</button>
        </div>
      </div>
    </div>
  );
}
