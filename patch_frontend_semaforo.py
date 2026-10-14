import re

path = r'd:\RDadmin\frontend\src\Contratos.jsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

# 1. Preview for selected files in Render Modal
old_file_input = """<p style={{ margin:'4px 0 0', fontSize:'0.75rem', color:'#64748b' }}>Puedes seleccionar hasta 4 imágenes o PDFs. {renderFiles.length > 0 && <strong style={{color:'#0369a1'}}>{renderFiles.length} seleccionado(s)</strong>}</p>
                </div>"""

new_file_input = """<p style={{ margin:'4px 0 0', fontSize:'0.75rem', color:'#64748b' }}>Puedes seleccionar hasta 4 imágenes o PDFs. {renderFiles.length > 0 && <strong style={{color:'#0369a1'}}>{renderFiles.length} seleccionado(s)</strong>}</p>
                  {renderFiles.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {Array.from(renderFiles).sort((a,b) => {
                        const aImg = a.type.startsWith('image/') ? 0 : 1;
                        const bImg = b.type.startsWith('image/') ? 0 : 1;
                        return aImg - bImg;
                      }).map((f, i) => {
                        const isImage = f.type.startsWith('image/');
                        return (
                          <div key={i} style={{ width: '50px', height: '50px', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }} title={f.name}>
                            {isImage ? (
                              <img src={URL.createObjectURL(f)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '20px' }}>📄</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>"""
content = content.replace(old_file_input, new_file_input)


# 2. Semaforo logic for "Estimación" button
old_est_btn = """<button onClick={() => { setSelected(c); setView('estimacion'); }}
                        style={{ padding:'0.3rem 0.7rem', background:'#3b82f6', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.85rem' }}>
                        📐 Estimación
                      </button>"""

new_est_btn = """<button onClick={() => {
                        if (c.render_applies === null) {
                          alert('⛔ Debes completar el formulario de "Render SI/NO" antes de realizar la estimación.');
                          return;
                        }
                        setSelected(c); setView('estimacion');
                      }}
                        style={{ padding:'0.3rem 0.7rem', background: c.render_applies === null ? '#94a3b8' : '#3b82f6', color:'white', border:'none', borderRadius:'6px', cursor: c.render_applies === null ? 'not-allowed' : 'pointer', fontWeight:'600', fontSize:'0.85rem' }}>
                        📐 Estimación
                      </button>"""
content = content.replace(old_est_btn, new_est_btn)

# 3. Semaforo logic for "Avanzar a Contrato" button
old_contrato_btn = """{ getStatus(c) === 'ESTIMACIÓN' && (
                        <button onClick={async () => {
                          await fetch(`${API}/api/prospects/${c.id}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: 'CONTRATO' }) });
                          fetchContratos();
                        }} style={{ padding:'0.3rem 0.7rem', background:'#ec4899', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.8rem' }}>
                          Avanzar a Contrato
                        </button>
                      )}"""

new_contrato_btn = """{ getStatus(c) === 'ESTIMACIÓN' && (
                        <button onClick={async () => {
                          if (!c.estimation_data) {
                            alert('⛔ Debes realizar y guardar la Estimación primero para poder avanzar a Contrato.');
                            return;
                          }
                          await fetch(`${API}/api/prospects/${c.id}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: 'CONTRATO' }) });
                          fetchContratos();
                        }} style={{ padding:'0.3rem 0.7rem', background: !c.estimation_data ? '#94a3b8' : '#ec4899', color:'white', border:'none', borderRadius:'6px', cursor: !c.estimation_data ? 'not-allowed' : 'pointer', fontWeight:'600', fontSize:'0.8rem' }}>
                          Avanzar a Contrato
                        </button>
                      )}"""
content = content.replace(old_contrato_btn, new_contrato_btn)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Contratos.jsx")
