import re

path = r'd:\RDadmin\frontend\src\Contratos.jsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

# 1. Add renderModalFor state after filterStatus
old_state = "  const [confirmFor, setConfirmFor] = useState(null); // prospect to confirm approval"
new_state = """  const [confirmFor, setConfirmFor] = useState(null); // prospect to confirm approval
  const [renderModalFor, setRenderModalFor] = useState(null); // prospect for Render modal
  const [renderApplies, setRenderApplies] = useState(null);   // null | true | false
  const [renderPrice, setRenderPrice] = useState('');"""
content = content.replace(old_state, new_state)

# 2. Replace "Avanzar a Render" button with open render modal
old_btn = """                      { getStatus(c) === 'APROBADO' && (
                        <button onClick={async () => {
                          await fetch(`${API}/api/prospects/${c.id}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: 'RENDER SI/NO' }) });
                          fetchContratos();
                        }} style={{ padding:'0.3rem 0.7rem', background:'#f59e0b', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.8rem' }}>
                          Avanzar a Render
                        </button>
                      )}"""
new_btn = """                      { getStatus(c) === 'APROBADO' && (
                        <button onClick={() => {
                          setRenderModalFor(c);
                          setRenderApplies(c.render_applies ?? null);
                          setRenderPrice(c.render_price ? String(c.render_price) : '');
                        }} style={{ padding:'0.3rem 0.7rem', background:'#f59e0b', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.8rem' }}>
                          🎨 Render SI/NO
                        </button>
                      )}"""
content = content.replace(old_btn, new_btn)

# 3. Add Render Modal JSX before the return closing </div>
render_modal = """
      {/* ── RENDER MODAL ── */}
      {renderModalFor && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
          <div style={{ background:'white', borderRadius:'16px', padding:'2rem', width:'460px', maxWidth:'95vw', boxShadow:'0 25px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin:'0 0 0.4rem', color:'#1e293b', fontSize:'1.15rem' }}>🎨 ¿Aplica Render?</h3>
            <p style={{ color:'#64748b', fontSize:'0.88rem', margin:'0 0 1.4rem' }}>
              <strong>{renderModalFor.name}</strong> · {renderModalFor.project_type}
            </p>

            {/* SI / NO buttons */}
            <div style={{ display:'flex', gap:'1rem', marginBottom:'1.4rem' }}>
              {[{val: true, label:'✅ SÍ — Aplica Render', bg:'#10b981'}, {val: false, label:'❌ NO — Sin Render', bg:'#64748b'}].map(opt => (
                <button key={String(opt.val)}
                  onClick={() => setRenderApplies(opt.val)}
                  style={{ flex:1, padding:'0.75rem', background: renderApplies === opt.val ? opt.bg : '#f1f5f9',
                    color: renderApplies === opt.val ? 'white' : '#475569',
                    border: `2px solid ${renderApplies === opt.val ? opt.bg : '#e2e8f0'}`,
                    borderRadius:'8px', fontWeight:'700', cursor:'pointer', fontSize:'0.9rem', transition:'all 0.2s' }}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Render price form — only when SI */}
            {renderApplies === true && (
              <div style={{ background:'#f8fafc', borderRadius:'10px', padding:'1rem', marginBottom:'1.2rem' }}>
                <label style={{ fontSize:'0.82rem', fontWeight:'700', color:'#475569', display:'block', marginBottom:'6px' }}>
                  💰 Precio del Render (MXN)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={renderPrice}
                  onChange={e => setRenderPrice(e.target.value)}
                  placeholder="Ej. 3500"
                  style={{ width:'100%', padding:'10px 12px', borderRadius:'8px', border:'1px solid #cbd5e1', fontSize:'1rem', boxSizing:'border-box' }}
                />
                {renderModalFor.quote_total_price && (
                  <div style={{ marginTop:'0.8rem', padding:'0.7rem 1rem', background:'#e0f2fe', borderRadius:'8px', fontSize:'0.88rem', color:'#0369a1' }}>
                    <strong>Estimación base:</strong> ${Number(renderModalFor.quote_total_price || 0).toLocaleString('es-MX')}<br/>
                    <strong>+ Render:</strong> ${Number(renderPrice || 0).toLocaleString('es-MX')}<br/>
                    <strong style={{ fontSize:'1rem', color:'#1e293b' }}>
                      Total final: ${(Number(renderModalFor.quote_total_price || 0) + Number(renderPrice || 0)).toLocaleString('es-MX')}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {renderApplies === false && (
              <div style={{ background:'#f0fdf4', borderRadius:'10px', padding:'0.8rem 1rem', marginBottom:'1.2rem', fontSize:'0.88rem', color:'#166534' }}>
                ✅ Sin render. El cliente avanzará directamente a Estimación con el precio original.
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display:'flex', gap:'0.8rem' }}>
              <button
                disabled={renderApplies === null || (renderApplies === true && !renderPrice)}
                onClick={async () => {
                  const totalPrice = renderApplies
                    ? (Number(renderModalFor.quote_total_price || 0) + Number(renderPrice || 0))
                    : null;
                  await fetch(`${API}/api/prospects/${renderModalFor.id}`, {
                    method: 'PUT', headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({
                      status: 'RENDER SI/NO',
                      render_applies: renderApplies,
                      render_price: renderApplies ? Number(renderPrice) : null,
                      render_total_price: totalPrice
                    })
                  });
                  setRenderModalFor(null);
                  setRenderApplies(null);
                  setRenderPrice('');
                  fetchContratos();
                }}
                style={{ flex:1, padding:'0.75rem', background: (renderApplies === null || (renderApplies === true && !renderPrice)) ? '#94a3b8' : '#3b82f6',
                  color:'white', border:'none', borderRadius:'8px', fontWeight:'700', cursor: (renderApplies === null || (renderApplies === true && !renderPrice)) ? 'not-allowed' : 'pointer', fontSize:'0.95rem' }}>
                💾 Guardar y Avanzar
              </button>
              <button onClick={() => { setRenderModalFor(null); setRenderApplies(null); setRenderPrice(''); }}
                style={{ padding:'0.75rem 1rem', background:'#f1f5f9', border:'none', borderRadius:'8px', cursor:'pointer', color:'#64748b', fontWeight:'600', fontSize:'0.9rem' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
"""

# Insert before closing div of the main component return
# Find "{/* Header */}" and insert render modal before the return's opening div
old_confirm = '{confirmFor && ('
# Insert render modal JSX just before {confirmFor && (
content = content.replace(
    '{confirmFor && (',
    render_modal.strip() + '\n\n      {confirmFor && ('
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done.')
