import sys

with open("frontend/src/Contratos.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Insert layout constants above MEASURE_SECTIONS
constants_code = """
const KITCHEN_LAYOUTS = [
  { id: 'LINEAL', label: 'Lineal', img: '/layouts/cocina_lineal.png', desc: 'Sobre una sola pared' },
  { id: 'EN L', label: 'En "L"', img: '/layouts/cocina_l.png', desc: 'En escuadra de dos muros' },
  { id: 'PARALELO', label: 'Paralelo', img: '/layouts/cocina_paralelo.png', desc: 'Dos frentes enfrentados' },
  { id: 'EN U', label: 'En "U"', img: '/layouts/cocina_u.png', desc: 'En tres paredes contiguas' },
];

const KITCHEN_ADDONS = [
  { id: 'CON ISLA', label: 'Con Isla', icon: '🏝️', img: '/layouts/cocina_isla.png', desc: 'Módulo central exento de trabajo o barra' },
  { id: 'CON PENÍNSULA', label: 'Con Península', icon: '🍹', img: '/layouts/cocina_peninsula.png', desc: 'Extensión fija unida a un lateral o muro' },
];

const CLOSET_LAYOUTS = [
  { id: 'LINEAL', label: 'Lineal', img: '/layouts/closet_lineal.png', desc: 'Frontal a lo largo de un muro' },
  { id: 'EN L', label: 'En "L"', img: '/layouts/closet_l.png', desc: 'Aprovechamiento en escuadra' },
  { id: 'PARALELO', label: 'Paralelo', img: '/layouts/closet_paralelo.png', desc: 'Doble frente con pasillo central' },
  { id: 'EN U', label: 'En "U"', img: '/layouts/closet_u.png', desc: 'Tres lados de almacenamiento' },
  { id: 'WALK-IN CLÓSET', label: 'Walk-in Clóset', img: '/layouts/closet_walkin.png', desc: 'Vestidor exclusivo transitable' },
];

const CLOSET_ADDONS = [
  { id: 'CON ISLA CENTRAL', label: 'Con Isla Central', icon: '🗄️', img: '/layouts/closet_isla.png', desc: 'Cajonera o mesa de accesorios al centro' },
  { id: 'CON VANITY', label: 'Con Vanity (Tocador)', icon: '🪞', img: '/layouts/closet_vanity.png', desc: 'Área de peinador, espejo y maquillaje' },
];
"""
if "const KITCHEN_LAYOUTS" not in content:
    content = content.replace("const MEASURE_SECTIONS = {", constants_code + "\nconst MEASURE_SECTIONS = {")

# 2. Insert layout renderers in Estimacion map
render_layouts_code = """
               {group._groupLabel && group._groupLabel.includes('Cocina') && prospect.kitchen_layout && (
                 <div style={{ marginBottom:'1rem', background:'#fffaf5', padding:'1rem', borderRadius:'8px', border:'1px solid #fed7aa' }}>
                   <h5 style={{ margin:'0 0 0.5rem', color:'#9a3412', fontSize:'0.85rem', fontWeight:'800' }}>🍳 Distribución de Cocina Capturada</h5>
                   <div style={{ display:'flex', gap:'1rem', overflowX:'auto' }}>
                     {[
                       KITCHEN_LAYOUTS.find(l => l.id === prospect.kitchen_layout),
                       ...(prospect.kitchen_addons ? prospect.kitchen_addons.split(', ').map(a => KITCHEN_ADDONS.find(k => k.id === a)) : [])
                     ].filter(Boolean).map((item, idx) => (
                       <div key={idx} style={{ minWidth:'120px', background:'white', border:'1px solid #fed7aa', borderRadius:'8px', padding:'0.5rem', textAlign:'center' }}>
                         {item.img && <img src={item.img} alt={item.label} style={{ width:'100%', height:'60px', objectFit:'contain', marginBottom:'4px' }} />}
                         <div style={{ fontSize:'0.75rem', fontWeight:'700', color:'#ea580c' }}>{item.icon} {item.label}</div>
                         <div style={{ fontSize:'0.65rem', color:'#64748b' }}>{item.desc}</div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
               {group._groupLabel && group._groupLabel.includes('Clóset') && prospect.closet_layout && (
                 <div style={{ marginBottom:'1rem', background:'#fbf8f5', padding:'1rem', borderRadius:'8px', border:'1px solid #e7dcd1' }}>
                   <h5 style={{ margin:'0 0 0.5rem', color:'#633b18', fontSize:'0.85rem', fontWeight:'800' }}>🚪 Distribución de Clóset Capturada</h5>
                   <div style={{ display:'flex', gap:'1rem', overflowX:'auto' }}>
                     {[
                       CLOSET_LAYOUTS.find(l => l.id === prospect.closet_layout),
                       ...(prospect.closet_addons ? prospect.closet_addons.split(', ').map(a => CLOSET_ADDONS.find(k => k.id === a)) : [])
                     ].filter(Boolean).map((item, idx) => (
                       <div key={idx} style={{ minWidth:'120px', background:'white', border:'1px solid #e7dcd1', borderRadius:'8px', padding:'0.5rem', textAlign:'center' }}>
                         {item.img && <img src={item.img} alt={item.label} style={{ width:'100%', height:'60px', objectFit:'contain', marginBottom:'4px' }} />}
                         <div style={{ fontSize:'0.75rem', fontWeight:'700', color:'#7c4a1e' }}>{item.icon} {item.label}</div>
                         <div style={{ fontSize:'0.65rem', color:'#64748b' }}>{item.desc}</div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
               """

target_code = """               {group._groupLabel && (
                 <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.6rem', padding:'0.45rem 0.8rem', background:'linear-gradient(90deg,#1e293b,#334155)', borderRadius:'8px' }}>
                   <span style={{ fontSize:'0.85rem', fontWeight:'800', color:'#f8fafc', letterSpacing:'0.04em' }}>{group._groupLabel}</span>
                 </div>
               )}"""

if "Distribución de Cocina Capturada" not in content:
    content = content.replace(target_code, target_code + "\n" + render_layouts_code)

with open("frontend/src/Contratos.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch aplicado con exito.")
