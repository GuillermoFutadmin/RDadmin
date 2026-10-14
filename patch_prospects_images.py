import re

path = r'd:\RDadmin\frontend\src\Prospects.jsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

# 1. Update space_image_path image style
old_space = "style={{ flex: '1 1 45%', maxHeight: '160px', objectFit: 'cover', borderRadius: '4px', minWidth: '80px' }}"
new_space = "style={{ flex: '1 1 45%', width: '100%', height: 'auto', borderRadius: '4px', minWidth: '80px' }}"
content = content.replace(old_space, new_space)

# 2. Add Render blocks and update reference_image_path styling
old_render_block = """            {(prospect.reference_image_path || prospect.design_image_path) && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white' }}>
                <div style={{ padding: '4px 8px', fontSize: '0.72rem', fontWeight: '700', color: '#7c2d12', backgroundColor: '#fff7ed' }}>
                  💡 Foto de Referencia
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '4px' }}>
                  {(prospect.reference_image_path || prospect.design_image_path).split(',').map((imgPath, idx) => (
                    <img key={idx} src={imgPath.trim().startsWith('http') ? imgPath.trim() : `${API}${imgPath.trim()}`} alt={`Referencia ${idx + 1}`} style={{ flex: '1 1 45%', maxHeight: '160px', objectFit: 'cover', borderRadius: '4px', minWidth: '80px' }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>"""

new_render_block = """            {(prospect.reference_image_path || prospect.design_image_path) && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white' }}>
                <div style={{ padding: '4px 8px', fontSize: '0.72rem', fontWeight: '700', color: '#7c2d12', backgroundColor: '#fff7ed' }}>
                  💡 Foto de Referencia
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '4px' }}>
                  {(prospect.reference_image_path || prospect.design_image_path).split(',').map((imgPath, idx) => (
                    <img key={idx} src={imgPath.trim().startsWith('http') ? imgPath.trim() : `${API}${imgPath.trim()}`} alt={`Referencia ${idx + 1}`} style={{ flex: '1 1 45%', width: '100%', height: 'auto', borderRadius: '4px', minWidth: '80px' }} />
                  ))}
                </div>
              </div>
            )}
            
            {prospect.render_image_path && (
              <div style={{ border:'1px solid #e2e8f0', borderRadius:'8px', overflow:'hidden', backgroundColor:'white' }}>
                <div style={{ padding:'4px 8px', fontSize:'0.72rem', fontWeight:'700', color:'#047857', backgroundColor:'#ecfdf5' }}>🎨 Imágenes de Render</div>
                <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', padding:'4px' }}>
                  {prospect.render_image_path.split(',').map((imgPath, idx) => (
                    <img key={idx} src={imgPath.trim().startsWith('http') ? imgPath.trim() : `${API}${imgPath.trim()}`}
                      alt={`Render ${idx + 1}`} style={{ flex:'1 1 45%', width: '100%', height: 'auto', borderRadius:'4px' }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {prospect.render_pdf_path && (
        <div style={{ marginTop:'0.8rem', padding:'0.6rem 0.75rem', backgroundColor:'#f0fdf4', border: '1px solid #bbf7d0', borderRadius:'8px' }}>
          <p style={{ fontSize:'0.68rem', color:'#166534', margin:'0 0 0.4rem', textTransform:'uppercase', fontWeight:'700' }}>📄 Cotización de Render (PDF)</p>
          <a href={prospect.render_pdf_path.startsWith('http') ? prospect.render_pdf_path : `${API}${prospect.render_pdf_path}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', backgroundColor: '#22c55e', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem' }}>
            <span>📄</span> Ver Documento PDF
          </a>
        </div>
      )}
    </div>"""

content = content.replace(old_render_block, new_render_block)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Prospects.jsx")
