import re

path = r'd:\RDadmin\frontend\src\Contratos.jsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

# 1. Update state
content = content.replace("const [renderFile, setRenderFile] = useState(null);", "const [renderFiles, setRenderFiles] = useState([]);")
content = content.replace("setRenderFile(null);", "setRenderFiles([]);")

# 2. Update File Input
old_file_input = """                <div style={{ marginBottom:'1rem' }}>
                  <label style={{ fontSize:'0.82rem', fontWeight:'700', color:'#475569', display:'block', marginBottom:'6px' }}>📄 Archivo de Render (PDF)</label>
                  <input type="file" accept=".pdf,image/*" onChange={e => setRenderFile(e.target.files[0])} style={{ width:'100%', padding:'8px', background:'white', borderRadius:'8px', border:'1px dashed #cbd5e1', fontSize:'0.9rem', boxSizing:'border-box' }} />
                  <p style={{ margin:'4px 0 0', fontSize:'0.75rem', color:'#64748b' }}>Puedes cargar PDFs (incluso con múltiples hojas).</p>
                </div>"""

new_file_input = """                <div style={{ marginBottom:'1rem' }}>
                  <label style={{ fontSize:'0.82rem', fontWeight:'700', color:'#475569', display:'block', marginBottom:'6px' }}>🖼️ Archivos de Render (Máx. 4 archivos, PDFs o imágenes)</label>
                  <input type="file" multiple accept=".pdf,image/*" onChange={e => setRenderFiles(Array.from(e.target.files).slice(0, 4))} style={{ width:'100%', padding:'8px', background:'white', borderRadius:'8px', border:'1px dashed #cbd5e1', fontSize:'0.9rem', boxSizing:'border-box' }} />
                  <p style={{ margin:'4px 0 0', fontSize:'0.75rem', color:'#64748b' }}>Puedes seleccionar hasta 4 imágenes o PDFs. {renderFiles.length > 0 && <strong style={{color:'#0369a1'}}>{renderFiles.length} seleccionado(s)</strong>}</p>
                </div>"""
content = content.replace(old_file_input, new_file_input)

# 3. Add text about 60% advance
old_totals = """                    <strong style={{ fontSize:'1rem', color:'#1e293b' }}>
                      Total final: ${(Number(renderModalFor.quote_total_price || 0) + Number(renderPrice || 0)).toLocaleString('es-MX')}
                    </strong>"""

new_totals = """                    <strong style={{ fontSize:'1rem', color:'#1e293b' }}>
                      Total final: ${(Number(renderModalFor.quote_total_price || 0) + Number(renderPrice || 0)).toLocaleString('es-MX')}
                    </strong>
                    <div style={{ marginTop:'6px', fontSize:'0.75rem', color:'#0284c7', fontWeight:'600' }}>
                      * El costo del render se pagará con el 60% de anticipo.
                    </div>"""
content = content.replace(old_totals, new_totals)

# 4. Update the save logic
old_save = """                    if (renderApplies && renderFile) {
                      const fd = new FormData();
                      fd.append('file', renderFile);
                      const uploadRes = await fetch(`${API}/api/prospects/${renderModalFor.id}/upload-render`, {
                        method: 'POST', body: fd
                      });"""

new_save = """                    if (renderApplies && renderFiles.length > 0) {
                      const fd = new FormData();
                      renderFiles.forEach(f => fd.append('files', f));
                      const uploadRes = await fetch(`${API}/api/prospects/${renderModalFor.id}/upload-render`, {
                        method: 'POST', body: fd
                      });"""
content = content.replace(old_save, new_save)


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Contratos.jsx")
