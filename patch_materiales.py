import sys

with open("frontend/src/Contratos.jsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """                   <div style={{ padding:'0.75rem 0.9rem', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'0.65rem' }}>
                     {sec.fields.map(f => renderField(f, sec.key))}
                   </div>"""

replacement = """                   <div style={{ padding:'0.75rem 0.9rem' }}>
                     {sec.key === 'materiales' ? (
                       <div style={{ background:'#fffbeb', padding:'0.8rem', borderRadius:'8px', border:'1px dashed #fcd34d', display:'flex', flexWrap:'wrap', gap:'1rem' }}>
                         <div style={{ flex:'1 1 140px' }}>
                           <label style={{ fontSize:'0.65rem', fontWeight:'800', color:'#b45309', textTransform:'uppercase', letterSpacing:'0.04em' }}>Material Principal</label>
                           <div style={{ fontSize:'0.85rem', fontWeight:'700', color:'#78350f', marginTop:'2px' }}>{prospect.material_type || 'N/A'}</div>
                         </div>
                         <div style={{ flex:'1 1 140px' }}>
                           <label style={{ fontSize:'0.65rem', fontWeight:'800', color:'#b45309', textTransform:'uppercase', letterSpacing:'0.04em' }}>Material Secundario</label>
                           <div style={{ fontSize:'0.85rem', fontWeight:'700', color:'#78350f', marginTop:'2px' }}>{prospect.material_type_2 || 'N/A'}</div>
                         </div>
                         <div style={{ flex:'1 1 140px' }}>
                           <label style={{ fontSize:'0.65rem', fontWeight:'800', color:'#b45309', textTransform:'uppercase', letterSpacing:'0.04em' }}>Color Interior</label>
                           <div style={{ fontSize:'0.85rem', fontWeight:'700', color:'#78350f', marginTop:'2px' }}>{prospect.interior_color_type ? ${prospect.interior_color_type} ·  : 'N/A'}</div>
                         </div>
                         <div style={{ flex:'1 1 140px' }}>
                           <label style={{ fontSize:'0.65rem', fontWeight:'800', color:'#b45309', textTransform:'uppercase', letterSpacing:'0.04em' }}>Color Ext. Inferior</label>
                           <div style={{ fontSize:'0.85rem', fontWeight:'700', color:'#78350f', marginTop:'2px' }}>{prospect.exterior_inf_color_type ? ${prospect.exterior_inf_color_type} ·  : 'N/A'}</div>
                         </div>
                         <div style={{ flex:'1 1 140px' }}>
                           <label style={{ fontSize:'0.65rem', fontWeight:'800', color:'#b45309', textTransform:'uppercase', letterSpacing:'0.04em' }}>Color Ext. Superior</label>
                           <div style={{ fontSize:'0.85rem', fontWeight:'700', color:'#78350f', marginTop:'2px' }}>{prospect.exterior_sup_color_type ? ${prospect.exterior_sup_color_type} ·  : 'N/A'}</div>
                         </div>
                         <div style={{ flex:'1 1 140px' }}>
                           <label style={{ fontSize:'0.65rem', fontWeight:'800', color:'#b45309', textTransform:'uppercase', letterSpacing:'0.04em' }}>Encimera</label>
                           <div style={{ fontSize:'0.85rem', fontWeight:'700', color:'#78350f', marginTop:'2px' }}>{prospect.countertop_type || 'N/A'}</div>
                         </div>
                         <div style={{ flex:'1 1 140px' }}>
                           <label style={{ fontSize:'0.65rem', fontWeight:'800', color:'#b45309', textTransform:'uppercase', letterSpacing:'0.04em' }}>Herrajes</label>
                           <div style={{ fontSize:'0.85rem', fontWeight:'700', color:'#78350f', marginTop:'2px' }}>{prospect.hardware_details || 'N/A'}</div>
                         </div>
                       </div>
                     ) : (
                       <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'0.65rem' }}>
                         {sec.fields.map(f => renderField(f, sec.key))}
                       </div>
                     )}
                   </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open("frontend/src/Contratos.jsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Patch aplicado con éxito.")
else:
    print("Target no encontrado.")
