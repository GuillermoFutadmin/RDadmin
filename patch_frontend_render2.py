import re

path = r'd:\RDadmin\frontend\src\Contratos.jsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

# 1. Update state
old_state = "  const [renderFiles, setRenderFiles] = useState([]);"
new_state = """  const [renderFiles, setRenderFiles] = useState([]);
  const [renderPdf, setRenderPdf] = useState(null);"""
content = content.replace(old_state, new_state)

content = content.replace("setRenderFiles([]);", "setRenderFiles([]); setRenderPdf(null);")

# 2. Update File Input
old_file_input = """                <div style={{ marginBottom:'1rem' }}>
                  <label style={{ fontSize:'0.82rem', fontWeight:'700', color:'#475569', display:'block', marginBottom:'6px' }}>🖼️ Archivos de Render (Máx. 4 archivos, PDFs o imágenes)</label>
                  <input type="file" multiple accept=".pdf,image/*" onChange={e => setRenderFiles(Array.from(e.target.files).slice(0, 4))} style={{ width:'100%', padding:'8px', background:'white', borderRadius:'8px', border:'1px dashed #cbd5e1', fontSize:'0.9rem', boxSizing:'border-box' }} />
                  <p style={{ margin:'4px 0 0', fontSize:'0.75rem', color:'#64748b' }}>Puedes seleccionar hasta 4 imágenes o PDFs. {renderFiles.length > 0 && <strong style={{color:'#0369a1'}}>{renderFiles.length} seleccionado(s)</strong>}</p>
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

new_file_input = """                <div style={{ display:'flex', gap:'1rem', marginBottom:'1rem' }}>
                  <div style={{ flex:1 }}>
                    <label style={{ fontSize:'0.82rem', fontWeight:'700', color:'#475569', display:'block', marginBottom:'6px' }}>🖼️ Imágenes de Render (Máx 4)</label>
                    <input type="file" multiple accept="image/*" onChange={e => setRenderFiles(Array.from(e.target.files).slice(0, 4))} style={{ width:'100%', padding:'8px', background:'white', borderRadius:'8px', border:'1px dashed #cbd5e1', fontSize:'0.85rem', boxSizing:'border-box' }} />
                    <p style={{ margin:'4px 0 0', fontSize:'0.7rem', color:'#64748b' }}>Imágenes JPG/PNG. {renderFiles.length > 0 && <strong style={{color:'#0369a1'}}>{renderFiles.length} seleccionado(s)</strong>}</p>
                    {renderFiles.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                        {Array.from(renderFiles).map((f, i) => (
                          <div key={i} style={{ width: '40px', height: '40px', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }} title={f.name}>
                            <img src={URL.createObjectURL(f)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={{ fontSize:'0.82rem', fontWeight:'700', color:'#475569', display:'block', marginBottom:'6px' }}>📄 Cotización (PDF)</label>
                    <input type="file" accept=".pdf" onChange={e => setRenderPdf(e.target.files[0])} style={{ width:'100%', padding:'8px', background:'white', borderRadius:'8px', border:'1px dashed #cbd5e1', fontSize:'0.85rem', boxSizing:'border-box' }} />
                    <p style={{ margin:'4px 0 0', fontSize:'0.7rem', color:'#64748b' }}>Sube el archivo PDF.</p>
                    {renderPdf && (
                      <div style={{ display: 'flex', alignItems:'center', gap: '8px', marginTop: '10px' }}>
                         <div style={{ width: '40px', height: '40px', border: '1px solid #cbd5e1', borderRadius: '4px', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc' }} title={renderPdf.name}>
                           <span style={{ fontSize: '18px' }}>📄</span>
                         </div>
                         <span style={{ fontSize:'0.75rem', color:'#475569', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'120px' }}>{renderPdf.name}</span>
                      </div>
                    )}
                  </div>
                </div>"""
content = content.replace(old_file_input, new_file_input)

# 3. Update the save logic
old_save = """                    if (renderApplies && renderFiles.length > 0) {
                      const fd = new FormData();
                      renderFiles.forEach(f => fd.append('files', f));
                      const uploadRes = await fetch(`${API}/api/prospects/${renderModalFor.id}/upload-render`, {
                        method: 'POST', body: fd
                      });
                      const uploadData = await uploadRes.json();
                      uploadedUrl = uploadData.image_path;
                    }

                    const totalPrice = renderApplies
                      ? (Number(renderModalFor.quote_total_price || 0) + Number(renderPrice || 0))
                      : null;
                      
                    await fetch(`${API}/api/prospects/${renderModalFor.id}`, {
                      method: 'PUT', headers:{'Content-Type':'application/json'},
                      body: JSON.stringify({
                        status: 'RENDER SI/NO',
                        render_applies: renderApplies,
                        render_price: renderApplies ? Number(renderPrice) : null,
                        render_total_price: totalPrice,
                        render_delivery_time: renderApplies ? renderDelivery : null,
                        render_comments: renderApplies ? renderComments : null
                      })
                    });"""

new_save = """                    let uploadedPdfUrl = null;
                    if (renderApplies && renderFiles.length > 0) {
                      const fd = new FormData();
                      renderFiles.forEach(f => fd.append('files', f));
                      const uploadRes = await fetch(`${API}/api/prospects/${renderModalFor.id}/upload-render`, {
                        method: 'POST', body: fd
                      });
                      const uploadData = await uploadRes.json();
                      uploadedUrl = uploadData.image_path;
                    }
                    if (renderApplies && renderPdf) {
                      const fdPdf = new FormData();
                      fdPdf.append('files', renderPdf);
                      const uploadResPdf = await fetch(`${API}/api/prospects/${renderModalFor.id}/upload-render`, {
                        method: 'POST', body: fdPdf
                      });
                      const uploadDataPdf = await uploadResPdf.json();
                      uploadedPdfUrl = uploadDataPdf.image_path;
                    }

                    const totalPrice = renderApplies
                      ? (Number(renderModalFor.quote_total_price || 0) + Number(renderPrice || 0))
                      : null;
                      
                    await fetch(`${API}/api/prospects/${renderModalFor.id}`, {
                      method: 'PUT', headers:{'Content-Type':'application/json'},
                      body: JSON.stringify({
                        status: 'RENDER SI/NO',
                        render_applies: renderApplies,
                        render_price: renderApplies ? Number(renderPrice) : null,
                        render_total_price: totalPrice,
                        render_delivery_time: renderApplies ? renderDelivery : null,
                        render_comments: renderApplies ? renderComments : null,
                        render_pdf_path: uploadedPdfUrl || null
                      })
                    });"""
content = content.replace(old_save, new_save)


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Contratos.jsx")
