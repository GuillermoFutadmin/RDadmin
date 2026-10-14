import sys

with open("frontend/src/Contratos.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove measurements from header
header_target = """        {prospect.measurements && (
          <div style={{ flex:'1 1 100%' }}>
            <div style={{ fontSize:'0.65rem', fontWeight:'700', letterSpacing:'0.08em', color:'#94a3b8', textTransform:'uppercase', marginBottom:'2px' }}>Medidas del Prospecto</div>
            <div style={{ fontSize:'0.82rem', color:'#e2e8f0', lineHeight:'1.5', background:'rgba(255,255,255,0.07)', padding:'0.5rem 0.75rem', borderRadius:'8px' }}>{prospect.measurements}</div>
          </div>
        )}"""
if header_target in content:
    content = content.replace(header_target, "")
    print("Header target removido.")

# 2. Add helper function and inject into mapping
loop_target = """               {group._groupLabel && (
                 <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.6rem', padding:'0.45rem 0.8rem', background:'linear-gradient(90deg,#1e293b,#334155)', borderRadius:'8px' }}>
                   <span style={{ fontSize:'0.85rem', fontWeight:'800', color:'#f8fafc', letterSpacing:'0.04em' }}>{group._groupLabel}</span>
                 </div>
               )}"""

injection = """               {group._groupLabel && (
                 <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.6rem', padding:'0.45rem 0.8rem', background:'linear-gradient(90deg,#1e293b,#334155)', borderRadius:'8px' }}>
                   <span style={{ fontSize:'0.85rem', fontWeight:'800', color:'#f8fafc', letterSpacing:'0.04em' }}>{group._groupLabel}</span>
                 </div>
               )}
               {(() => {
                 if (!prospect.measurements) return null;
                 const parts = prospect.measurements.split(' | ');
                 const labelLower = group._groupLabel ? group._groupLabel.toLowerCase() : '';
                 const filtered = parts.filter(part => {
                   const p = part.toLowerCase();
                   if (labelLower.includes('cocina')) return p.includes('cocina');
                   if (labelLower.includes('clóset') || labelLower.includes('closet')) return p.includes('clóset') || p.includes('closet') || p.includes('vestidor');
                   if (labelLower.includes('sólida')) return p.includes('sólida') || p.includes('solida');
                   if (labelLower.includes('tambor')) return p.includes('tambor');
                   if (labelLower.includes('restauraci')) return p.includes('restauración') || p.includes('restauracion');
                   if (labelLower.includes('otros')) return p.includes('otros') || (!p.includes('cocina') && !p.includes('closet') && !p.includes('puerta'));
                   return false;
                 });
                 if (filtered.length > 0) {
                   return (
                     <div style={{ marginBottom:'1rem', background:'#f8fafc', border:'1px solid #cbd5e1', borderRadius:'8px', padding:'0.8rem' }}>
                       <div style={{ fontSize:'0.65rem', fontWeight:'800', color:'#475569', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'4px' }}>
                         📝 Notas previas del prospecto para esta área
                       </div>
                       <div style={{ fontSize:'0.85rem', color:'#1e293b', fontWeight:'500' }}>
                         {filtered.map((msg, i) => <div key={i}>• {msg}</div>)}
                       </div>
                     </div>
                   );
                 }
                 return null;
               })()}"""

if loop_target in content:
    content = content.replace(loop_target, injection)
    print("Injected into loop.")

with open("frontend/src/Contratos.jsx", "w", encoding="utf-8") as f:
    f.write(content)
