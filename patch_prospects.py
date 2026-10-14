import sys

with open('frontend/src/Prospects.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''        const filtered = prospects.filter(p => {
          const txt = filterText.toLowerCase();'''
new1 = '''        const filtered = prospects.filter(p => {
          if (p.is_contract || p.is_papelera) return false;
          const txt = filterText.toLowerCase();'''

old2 = '''                  <button onClick={() => handleDelete(p.id)} style={{ padding: '0.4rem 0.8rem', background: '#e11d48', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Eliminar</button>
                </div>'''
new2 = '''                  <button onClick={() => handleDelete(p.id)} style={{ padding: '0.4rem 0.8rem', background: '#e11d48', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Eliminar</button>
                </div>
                {p.status === 'Cotización' && !p.is_contract && !p.is_papelera && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', alignSelf: 'center' }}>¿Se aprobó el proyecto?</span>
                    <button onClick={async () => {
                      if(window.confirm('¿Mover este proyecto a CONTRATOS?')) {
                        await fetch(`${API}/api/prospects/${p.id}`, {
                          method: 'PUT', headers: {'Content-Type': 'application/json'},
                          body: JSON.stringify({ is_contract: true, contract_date: new Date().toISOString() })
                        });
                        fetchProspects();
                      }
                    }} style={{ padding: '0.4rem 0.8rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>✅ SÍ</button>
                    <button onClick={async () => {
                      if(window.confirm('¿Mover a PAPELERA?')) {
                        await fetch(`${API}/api/prospects/${p.id}`, {
                          method: 'PUT', headers: {'Content-Type': 'application/json'},
                          body: JSON.stringify({ is_papelera: true })
                        });
                        fetchProspects();
                      }
                    }} style={{ padding: '0.4rem 0.8rem', background: '#64748b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>❌ NO</button>
                  </div>
                )}'''

content = content.replace(old1, new1)
content = content.replace(old2, new2)

with open('frontend/src/Prospects.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS Prospects.jsx patched")
