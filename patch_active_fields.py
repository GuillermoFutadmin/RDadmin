import sys

with open("frontend/src/Contratos.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add activeFields state
target_state = "  const [autoSaveStatus, setAutoSaveStatus] = useState('');"
replacement_state = """  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const [activeFields, setActiveFields] = useState({});"""
if target_state in content and "const [activeFields" not in content:
    content = content.replace(target_state, replacement_state)

# 2. Modify renderField
target_render = """           const renderField = (f, prefix) => {
             const fieldKey = prefix ? ${prefix}_ : f.id;
             return (
               <div key={fieldKey} style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                 <label style={{ fontSize:'0.72rem', fontWeight:'700', color:'#475569', textTransform:'uppercase', letterSpacing:'0.03em' }}>{f.label}</label>
                 <div style={{ display:'flex', gap:'6px', alignItems:'flex-start' }}>
                   <div style={{ flex:1 }}>
                     {f.type === 'select' ? (
                       <select value={measures[fieldKey]||''} onChange={e => setMeasures(p => ({...p,[fieldKey]:e.target.value}))}
                         style={{ width:'100%', padding:'6px 8px', border:'1px solid #cbd5e1', borderRadius:'6px', fontSize:'0.85rem', background:'white' }}>
                         <option value=''>Selecciona</option>
                         {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                       </select>
                     ) : (
                       <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                         <input type={f.type} placeholder={f.placeholder||''} value={measures[fieldKey]||''}
                           onChange={e => setMeasures(p => ({...p,[fieldKey]:e.target.value}))}
                           style={{ width:'100%', padding:'6px 8px', border:'1px solid #cbd5e1', borderRadius:'6px', fontSize:'0.85rem', paddingRight: f.suffix ? '32px' : '8px', boxSizing:'border-box' }} />
                         {f.suffix && <span style={{ position:'absolute', right:'8px', fontSize:'0.72rem', color:'#94a3b8', pointerEvents:'none' }}>{f.suffix}</span>}
                       </div>
                     )}
                   </div>
                   <label style={{ cursor:'pointer', padding:'5px 7px', background:'#f0f9ff', borderRadius:'6px', border:'1px solid #bae6fd', display:'flex', alignItems:'center', gap:'3px', fontSize:'0.75rem', fontWeight:'600', color:'#0369a1', whiteSpace:'nowrap', flexShrink:0 }}>
                     📷
                     <input type='file' accept='image/*' capture='environment' style={{ display:'none' }}
                       onChange={e => handlePhotoUpload(fieldKey, e.target.files[0])} />
                   </label>
                 </div>
                 {photos[fieldKey] && (
                   <div style={{ marginTop:'4px', position:'relative', display:'inline-block', alignSelf:'flex-start' }}>
                     <img src={photos[fieldKey]} onClick={() => setViewPhoto(photos[fieldKey])}
                       style={{ width:'60px', height:'60px', objectFit:'cover', borderRadius:'6px', cursor:'pointer', border:'2px solid #bae6fd' }} />
                     <button onClick={() => setPhotos(p => { const np={...p}; delete np[fieldKey]; return np; })}
                       style={{ position:'absolute', top:'-7px', right:'-7px', background:'#ef4444', color:'white', border:'none', borderRadius:'50%', width:'20px', height:'20px', fontSize:'11px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold' }}>×</button>
                   </div>
                 )}
               </div>
             );
           };"""

replacement_render = """           const renderField = (f, prefix) => {
             const fieldKey = prefix ? ${prefix}_ : f.id;
             const hasValue = measures[fieldKey] !== undefined && measures[fieldKey] !== '';
             const hasPhoto = !!photos[fieldKey];
             const isActive = activeFields[fieldKey] || hasValue || hasPhoto;

             if (!isActive) {
               return (
                 <button key={fieldKey} onClick={() => setActiveFields(p => ({...p, [fieldKey]: true}))}
                   style={{ background:'#f8fafc', border:'1px dashed #cbd5e1', padding:'6px 12px', borderRadius:'20px', cursor:'pointer', color:'#475569', fontSize:'0.75rem', fontWeight:'600', display:'flex', alignItems:'center', gap:'6px', transition:'all 0.2s', whiteSpace:'nowrap' }}>
                   <span style={{color:'#3b82f6', fontSize:'1rem', fontWeight:'800', lineHeight:'1'}}>+</span> {f.label}
                 </button>
               );
             }

             return (
               <div key={fieldKey} style={{ display:'flex', flexDirection:'column', gap:'4px', background:'#f8fafc', padding:'10px', borderRadius:'10px', border:'1px solid #e2e8f0', flex:'1 1 220px', position:'relative' }}>
                 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                   <label style={{ fontSize:'0.7rem', fontWeight:'800', color:'#475569', textTransform:'uppercase', letterSpacing:'0.03em' }}>{f.label}</label>
                   {!hasValue && !hasPhoto && (
                     <button onClick={() => setActiveFields(p => ({...p, [fieldKey]: false}))} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:'0.7rem', padding:0, fontWeight:'600' }}>✕ Ocultar</button>
                   )}
                 </div>
                 <div style={{ display:'flex', gap:'6px', alignItems:'flex-start', marginTop:'2px' }}>
                   <div style={{ flex:1 }}>
                     {f.type === 'select' ? (
                       <select value={measures[fieldKey]||''} onChange={e => setMeasures(p => ({...p,[fieldKey]:e.target.value}))}
                         style={{ width:'100%', padding:'6px 8px', border:'1px solid #cbd5e1', borderRadius:'6px', fontSize:'0.85rem', background:'white' }}>
                         <option value=''>Selecciona</option>
                         {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                       </select>
                     ) : (
                       <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                         <input type={f.type} placeholder={f.placeholder||''} value={measures[fieldKey]||''}
                           onChange={e => setMeasures(p => ({...p,[fieldKey]:e.target.value}))}
                           style={{ width:'100%', padding:'6px 8px', border:'1px solid #cbd5e1', borderRadius:'6px', fontSize:'0.85rem', paddingRight: f.suffix ? '32px' : '8px', boxSizing:'border-box' }} />
                         {f.suffix && <span style={{ position:'absolute', right:'8px', fontSize:'0.72rem', color:'#94a3b8', pointerEvents:'none' }}>{f.suffix}</span>}
                       </div>
                     )}
                   </div>
                   <label style={{ cursor:'pointer', padding:'5px 7px', background:'#eff6ff', borderRadius:'6px', border:'1px solid #bfdbfe', display:'flex', alignItems:'center', gap:'3px', fontSize:'0.75rem', fontWeight:'600', color:'#1d4ed8', whiteSpace:'nowrap', flexShrink:0 }}>
                     📷
                     <input type='file' accept='image/*' capture='environment' style={{ display:'none' }}
                       onChange={e => handlePhotoUpload(fieldKey, e.target.files[0])} />
                   </label>
                 </div>
                 {photos[fieldKey] && (
                   <div style={{ marginTop:'6px', position:'relative', display:'inline-block', alignSelf:'flex-start' }}>
                     <img src={photos[fieldKey]} onClick={() => setViewPhoto(photos[fieldKey])}
                       style={{ width:'60px', height:'60px', objectFit:'cover', borderRadius:'6px', cursor:'pointer', border:'2px solid #bae6fd' }} />
                     <button onClick={() => setPhotos(p => { const np={...p}; delete np[fieldKey]; return np; })}
                       style={{ position:'absolute', top:'-7px', right:'-7px', background:'#ef4444', color:'white', border:'none', borderRadius:'50%', width:'20px', height:'20px', fontSize:'11px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold' }}>×</button>
                   </div>
                 )}
               </div>
             );
           };"""

if target_render in content:
    content = content.replace(target_render, replacement_render)
    
# 3. Change grid to flex so pills wrap nicely
target_grid = """<div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'0.65rem' }}>"""
replacement_grid = """<div style={{ display:'flex', flexWrap:'wrap', gap:'0.65rem' }}>"""
content = content.replace(target_grid, replacement_grid)

with open("frontend/src/Contratos.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Patch activable aplicado.")
