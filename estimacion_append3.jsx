
// ─── Estimación with modern styling & live quotation table ────────────────────
const UNITS = ['pza','metro','ml','kilo','litro','pie','m2','par','rollo','caja','día'];
const TEMPLATE_KEYS = ['Cocina','Clóset','Puerta Sólida','Puerta Tambor'];

function mkRow(desc) { return { id: Date.now() + Math.random(), desc, qty: 1, price: 0, unit: 'pza' }; }

const MEASUREMENT_FIELDS = {
  'Cocina': [
    { id: 'alto_plafon', label: 'Alto (piso a plafón)', type: 'number', suffix: 'cm' },
    { id: 'ancho_muro', label: 'Ancho muro principal', type: 'number', suffix: 'cm' },
    { id: 'ancho_izq', label: 'Muro lat. izq', type: 'number', suffix: 'cm' },
    { id: 'ancho_der', label: 'Muro lat. der', type: 'number', suffix: 'cm' },
    { id: 'ventana', label: 'Medidas ventana', type: 'text', placeholder: 'Ej. 120x80cm' },
    { id: 'puerta', label: 'Medidas puerta', type: 'text' },
    { id: 'contactos', label: 'Contactos eléctricos', type: 'text' },
    { id: 'agua_drenaje', label: 'Agua/Drenaje', type: 'text' },
    { id: 'prof_bajo', label: 'Prof. mueble bajo', type: 'number', suffix: 'cm' },
    { id: 'encimera', label: 'Encimera', type: 'text' },
  ],
  'Clóset': [
    { id: 'alto_plafon', label: 'Alto total', type: 'number', suffix: 'cm' },
    { id: 'ancho_nicho', label: 'Ancho de nicho', type: 'number', suffix: 'cm' },
    { id: 'profundidad', label: 'Profundidad', type: 'number', suffix: 'cm' },
    { id: 'tipo_puerta', label: 'Tipo de puerta', type: 'text' },
    { id: 'distribucion', label: 'Distribución', type: 'text' },
  ],
  'Puerta': [
    { id: 'alto_vano', label: 'Alto vano', type: 'number', suffix: 'cm' },
    { id: 'ancho_vano', label: 'Ancho vano', type: 'number', suffix: 'cm' },
    { id: 'espesor_pared', label: 'Espesor pared', type: 'number', suffix: 'cm' },
    { id: 'abatimiento', label: 'Abatimiento', type: 'select', options: ['Izquierda','Derecha'] },
    { id: 'cerradura', label: 'Cerradura/Herrajes', type: 'text' },
  ]
};

// Modal Edit Item
function EditItemModal({ item, onSave, onClose }) {
  const [desc, setDesc] = useState(item.desc);
  const [price, setPrice] = useState(item.price);
  const [unit, setUnit] = useState(item.unit || 'pza');
  
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: 'white', borderRadius: '14px', padding: '1.8rem 2rem', width: '390px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h3 style={{ margin: 0, color: '#8b5a2b', fontSize: '1rem' }}>✏️ Editar ítem</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>
            Descripción
            <input value={desc} onChange={e => setDesc(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing:'border-box', marginTop:'4px' }} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>
              Precio unit.
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop:'4px' }}>
                <span style={{ color: '#64748b' }}>$</span>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing:'border-box' }} />
              </div>
            </label>
            <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>
              Unidad
              <select value={unit} onChange={e => setUnit(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing:'border-box', marginTop:'4px' }}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
          </div>
          <button onClick={() => onSave({ desc, price: Number(price), unit })} style={{ marginTop:'10px', padding: '0.7rem', background: '#8b5a2b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
            ✔ Aplicar cambio
          </button>
        </div>
      </div>
    </div>
  );
}


function Estimacion({ prospect, onBack }) {
  const canvasRef   = useRef(null);
  const snapshotRef = useRef(null);
  const startPosRef = useRef(null);

  const [color, setColor]         = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [erasing, setErasing]     = useState(false);
  const [lineMode, setLineMode]   = useState(false);
  const [textMode, setTextMode]   = useState(false);
  
  const [margin, setMargin]       = useState(30);
  const [saving, setSaving]       = useState(false);
  const [templateLoaded, setTemplateLoaded] = useState(false);

  const [materials, setMaterials] = useState([mkRow('Tablero de melamina')]);
  const [labor, setLabor]       = useState([mkRow('Mano de obra carpintería')]);
  const [concepts, setConcepts] = useState([mkRow('Flete / Transporte')]);
  
  const [editingItem, setEditingItem] = useState(null); // { section, id }

  // Formulario medidas
  const pt = prospect.project_type || '';
  const isCocina = pt.toLowerCase().includes('cocina');
  const isCloset = pt.toLowerCase().includes('closet') || pt.toLowerCase().includes('clóset');
  const isPuerta = pt.toLowerCase().includes('puerta');
  const formFields = isCocina ? MEASUREMENT_FIELDS['Cocina'] : 
                     isCloset ? MEASUREMENT_FIELDS['Clóset'] : 
                     isPuerta ? MEASUREMENT_FIELDS['Puerta'] : [];
  
  const [measures, setMeasures] = useState({});
  const [obsText, setObsText] = useState('');

  // Cargar info previa
  useEffect(() => {
    if (prospect.estimation_data && !templateLoaded) {
      try {
        const d = typeof prospect.estimation_data === 'string'
          ? JSON.parse(prospect.estimation_data) : prospect.estimation_data;
        if (d.materials?.length) setMaterials(d.materials);
        if (d.labor?.length)     setLabor(d.labor);
        if (d.concepts?.length)  setConcepts(d.concepts);
        if (d.margin !== undefined) setMargin(d.margin);
        if (d.measures) setMeasures(d.measures);
        if (d.obsText) setObsText(d.obsText);
        setTemplateLoaded(true);
      } catch {}
    }
  }, [prospect]);

  // Cargar machote si no hay info
  useEffect(() => {
    if (templateLoaded || prospect.estimation_data) return;
    const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const matchKey = TEMPLATE_KEYS.find(k => normalize(pt).includes(normalize(k)));
    if (!matchKey) return;
    fetch(`${API}/api/templates/`)
      .then(r => r.json())
      .then(data => {
        const tpl = data.find(t => normalize(t.name) === normalize(matchKey));
        if (!tpl) return;
        const parsed = JSON.parse(tpl.data);
        if (parsed?.materiales?.length) {
          setMaterials(parsed.materiales.map(it => mkRow(it.desc || '')));
        }
        if (parsed?.mano_obra?.length) setLabor(parsed.mano_obra.map(it => mkRow(it.desc || '')));
        if (parsed?.conceptos?.length) setConcepts(parsed.conceptos.map(it => mkRow(it.desc || '')));
        setTemplateLoaded(true);
      })
      .catch(() => {});
  }, [prospect, templateLoaded]);

  // Init canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const totalCost = [...materials, ...labor, ...concepts].reduce((s, r) => s + Number(r.qty) * Number(r.price), 0);
  const totalWithMargin = totalCost * (1 + margin / 100);

  // Tablas render helpers (estilo Valoracion)
  const tblSt  = { width: '100%', borderCollapse: 'collapse', marginBottom: '1.4rem' };
  const thSt   = { background: '#8b5a2b', color: 'white', padding: '10px', textAlign: 'left', border: '1px solid #ddd', fontSize: '0.85rem' };
  const tdSt   = { padding: '8px', border: '1px solid #ddd', verticalAlign: 'middle', fontSize:'0.85rem' };
  
  const handleEditItem = (section, item) => setEditingItem({ section, ...item });
  const saveItemEdit = (updates) => {
    const { section, id } = editingItem;
    const updFn = prev => prev.map(r => r.id === id ? { ...r, ...updates } : r);
    if (section === 'mat') setMaterials(updFn);
    if (section === 'lab') setLabor(updFn);
    if (section === 'con') setConcepts(updFn);
    setEditingItem(null);
  };
  
  const addRow = (section, desc) => {
    const mk = () => [...(section==='mat'?materials:section==='lab'?labor:concepts), mkRow(desc)];
    if (section === 'mat') setMaterials(mk());
    if (section === 'lab') setLabor(mk());
    if (section === 'con') setConcepts(mk());
  };
  
  const delRow = (section, id) => {
    const flt = arr => arr.filter(r => r.id !== id);
    if (section === 'mat') setMaterials(flt(materials));
    if (section === 'lab') setLabor(flt(labor));
    if (section === 'con') setConcepts(flt(concepts));
  };

  const renderValRow = (item, section) => (
    <tr key={item.id}>
      <td style={tdSt}><strong>{item.desc}</strong></td>
      <td style={tdSt}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input type="number" value={item.qty} min="0"
            onChange={e => {
               const val = e.target.value;
               const updFn = prev => prev.map(r => r.id === item.id ? { ...r, qty: val } : r);
               if (section === 'mat') setMaterials(updFn);
               if (section === 'lab') setLabor(updFn);
               if (section === 'con') setConcepts(updFn);
            }}
            style={{ width: '72px', padding: '4px', border:'1px solid #cbd5e1', borderRadius:'4px' }}
          />
          <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '2px 7px', fontSize: '0.75rem', color: '#475569', fontWeight: '600' }}>
            {item.unit || 'pza'}
          </span>
        </div>
      </td>
      <td style={tdSt}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{formatCurrency(item.price)}</span>
          <button onClick={() => handleEditItem(section, item)} style={{ background:'white', border:'1px solid #cbd5e1', borderRadius:'5px', cursor:'pointer', padding:'3px 6px', fontSize:'0.8rem' }}>✏️</button>
        </div>
      </td>
      <td style={{ ...tdSt, textAlign: 'right', fontWeight: 'bold' }}>
        {formatCurrency(Number(item.qty)*Number(item.price))}
        <button onClick={() => delRow(section, item.id)} style={{ marginLeft:'8px', background:'none', border:'none', color:'#ef4444', cursor:'pointer' }}>✕</button>
      </td>
    </tr>
  );

  const renderQuoteTable = (title, data, section, btnLabel) => {
    const total = data.reduce((s, r) => s + (Number(r.qty) * Number(r.price)), 0);
    return (
      <table style={tblSt}>
        <thead><tr>
          <th style={thSt}>{title}</th>
          <th style={{ ...thSt, width: '130px' }}>Cant.</th>
          <th style={{ ...thSt, width: '140px' }}>Precio unit.</th>
          <th style={{ ...thSt, textAlign: 'right', width: '120px' }}>Total</th>
        </tr></thead>
        <tbody>
          {data.map(m => renderValRow(m, section))}
          <tr style={{ background: '#d18c4c', color: 'white', fontWeight: 'bold' }}>
            <td colSpan="3" style={{ ...tdSt, textAlign: 'center' }}>Subtotal {title}</td>
            <td style={{ ...tdSt, textAlign: 'right' }}>{formatCurrency(total)}</td>
          </tr>
          <tr><td colSpan="4" style={{ paddingTop:'8px' }}>
            <button onClick={() => addRow(section, btnLabel)} style={{ padding:'5px 12px', background:'#f8fafc', border:'1px dashed #94a3b8', borderRadius:'5px', cursor:'pointer', color:'#475569', fontSize:'0.85rem' }}>+ Agregar {btnLabel}</button>
          </td></tr>
        </tbody>
      </table>
    );
  };

  // Canvas Drawing Logic
  const getPos = (e, canvas) => {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) return { x:(e.touches[0].clientX-rect.left)*scaleX, y:(e.touches[0].clientY-rect.top)*scaleY };
    return { x:(e.clientX-rect.left)*scaleX, y:(e.clientY-rect.top)*scaleY };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const pos    = getPos(e, canvas);
    
    if (textMode) {
      const txt = window.prompt("Escribe el texto a insertar:");
      if (txt) {
        ctx.font = `${lineWidth * 6 + 10}px sans-serif`;
        ctx.fillStyle = color;
        ctx.fillText(txt, pos.x, pos.y);
      }
      return;
    }
    
    if (lineMode) {
      snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      startPosRef.current = pos;
    } else {
      ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    }
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (textMode) return;
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const pos    = getPos(e, canvas);

    if (lineMode && snapshotRef.current && startPosRef.current) {
      ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.beginPath();
      ctx.moveTo(startPosRef.current.x, startPosRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = erasing ? '#ffffff' : color;
      ctx.lineWidth   = erasing ? 20 : lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
    } else {
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = erasing ? '#ffffff' : color;
      ctx.lineWidth   = erasing ? 20 : lineWidth;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };

  const stopDrawing = (e) => {
    if (textMode) return;
    if (e) { try { e.preventDefault(); } catch {} }
    if (lineMode && isDrawing && snapshotRef.current && startPosRef.current) {
      try {
        const canvas = canvasRef.current;
        const ctx    = canvas.getContext('2d');
        const pos    = getPos(e, canvas);
        ctx.putImageData(snapshotRef.current, 0, 0);
        ctx.beginPath();
        ctx.moveTo(startPosRef.current.x, startPosRef.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = erasing ? '#ffffff' : color;
        ctx.lineWidth   = erasing ? 20 : lineWidth;
        ctx.lineCap = 'round'; ctx.stroke();
      } catch {}
      snapshotRef.current = null; startPosRef.current = null;
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { materials, labor, concepts, margin, measures, obsText, totalWithMargin };
    try {
      await fetch(`${API}/api/prospects/${prospect.id}`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ estimation_data: JSON.stringify(data) })
      });
      alert('✅ Estimación guardada');
    } catch { alert('Error guardando'); }
    setSaving(false);
  };

  const curStyle = textMode ? 'text' : lineMode ? 'crosshair' : (erasing ? 'cell' : 'crosshair');

  return (
    <div style={{ padding:'1rem', maxWidth:'1400px', margin:'0 auto' }}>
      {editingItem && <EditItemModal item={editingItem} onClose={() => setEditingItem(null)} onSave={saveItemEdit} />}
      
      <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.2rem' }}>
        <button onClick={onBack} style={{ padding:'0.4rem 0.9rem', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:'7px', cursor:'pointer', fontWeight:'600', fontSize:'0.87rem' }}>
          ← Volver
        </button>
        <div>
          <h2 style={{ margin:0, color:'#1e293b', fontSize:'1.3rem', fontWeight:'800' }}>📐 Estimación · {prospect.name}</h2>
          <p style={{ margin:0, color:'#64748b', fontSize:'0.83rem' }}>{prospect.project_type} · {prospect.public_id}</p>
        </div>
      </div>

      <div style={{ background:'white', borderRadius:'10px', border:'1px solid #e2e8f0', padding:'1.5rem', marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.2rem' }}>
          <h3 style={{ margin:0, color:'#8b5a2b', fontSize:'1.1rem', fontWeight:'800' }}>💰 Cotizador en Vivo</h3>
          <div style={{ background:'#f5deb3', borderRadius:'8px', padding:'6px 14px', fontWeight:'800', fontSize:'0.95rem', border:'2px solid #8b5a2b', color:'#4a2c0a' }}>
            {formatCurrency(totalWithMargin)}
          </div>
        </div>

        {renderQuoteTable('Materiales', materials, 'mat', 'Material')}
        {renderQuoteTable('Mano de obra', labor, 'lab', 'Mano de obra')}
        {renderQuoteTable('Conceptos / Otros', concepts, 'con', 'Concepto')}

        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'1rem' }}>
          <div style={{ background:'#fff7ed', border:'2px dashed #fdba74', padding:'1rem 1.5rem', borderRadius:'8px', display:'flex', alignItems:'center', gap:'1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <label style={{ fontSize:'0.9rem', fontWeight:'700', color:'#9a3412' }}>Margen de ganancia (%):</label>
              <input type="number" value={margin} onChange={e => setMargin(Number(e.target.value))}
                style={{ width:'70px', padding:'6px 8px', borderRadius:'6px', border:'1px solid #fdba74', fontWeight:'700', fontSize:'1rem' }} />
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ margin:0, fontSize:'0.8rem', color:'#9a3412' }}>Costo total estimado: {formatCurrency(totalCost)}</p>
              <p style={{ margin:0, fontSize:'1.1rem', fontWeight:'900', color:'#7c2d12' }}>Precio final: {formatCurrency(totalWithMargin)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Formulario Notas + Canvas */}
      <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap' }}>
        {/* Medidas Formulario */}
        <div style={{ flex:'1 1 340px' }}>
          <div style={{ background:'white', borderRadius:'10px', border:'1px solid #e2e8f0', padding:'1.2rem' }}>
             <h3 style={{ margin:'0 0 1rem', color:'#1e293b', fontSize:'1rem', fontWeight:'700' }}>📋 Notas y Medidas de Visita</h3>
             
             {formFields.length > 0 ? (
               <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.8rem' }}>
                 {formFields.map(f => (
                   <div key={f.id} style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                     <label style={{ fontSize:'0.75rem', fontWeight:'700', color:'#475569' }}>{f.label}</label>
                     {f.type === 'select' ? (
                       <select value={measures[f.id]||''} onChange={e => setMeasures(p => ({...p,[f.id]:e.target.value}))}
                        style={{ padding:'6px 8px', border:'1px solid #cbd5e1', borderRadius:'6px', fontSize:'0.85rem' }}>
                          <option value="">Selecciona</option>
                          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                       </select>
                     ) : (
                       <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                         <input type={f.type} placeholder={f.placeholder} value={measures[f.id]||''} 
                          onChange={e => setMeasures(p => ({...p,[f.id]:e.target.value}))}
                          style={{ width:'100%', padding:'6px 8px', border:'1px solid #cbd5e1', borderRadius:'6px', fontSize:'0.85rem', paddingRight: f.suffix ? '30px' : '8px', boxSizing:'border-box' }} />
                         {f.suffix && <span style={{ position:'absolute', right:'8px', fontSize:'0.75rem', color:'#94a3b8' }}>{f.suffix}</span>}
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             ) : (
               <p style={{ fontSize:'0.85rem', color:'#64748b' }}>No hay campos específicos para este proyecto.</p>
             )}

             <div style={{ marginTop:'1rem' }}>
               <label style={{ fontSize:'0.75rem', fontWeight:'700', color:'#475569', display:'block', marginBottom:'4px' }}>Otras Observaciones</label>
               <textarea value={obsText} onChange={e => setObsText(e.target.value)} rows={4}
                 style={{ width:'100%', padding:'8px', border:'1px solid #cbd5e1', borderRadius:'6px', fontSize:'0.85rem', resize:'vertical', boxSizing:'border-box' }} />
             </div>

             <button onClick={handleSave} disabled={saving}
              style={{ width:'100%', marginTop:'1rem', padding:'0.8rem', background:saving?'#94a3b8':'#10b981', color:'white', border:'none', borderRadius:'8px', cursor:saving?'not-allowed':'pointer', fontWeight:'800', fontSize:'0.95rem' }}>
              {saving ? 'Guardando...' : '💾 Guardar Estimación'}
             </button>
          </div>
        </div>

        {/* Croquis */}
        <div style={{ flex:'2 1 600px' }}>
          <div style={{ background:'white', borderRadius:'10px', border:'1px solid #e2e8f0', padding:'1.2rem' }}>
             <h3 style={{ margin:'0 0 0.8rem', color:'#1e293b', fontSize:'1rem', fontWeight:'700' }}>✏️ Croquis y Dibujo de Guía</h3>
             
             <div style={{ display:'flex', gap:'0.4rem', alignItems:'center', marginBottom:'0.8rem', flexWrap:'wrap', background:'#f8fafc', padding:'8px 12px', borderRadius:'8px', border:'1px solid #e2e8f0' }}>
               <input type="color" value={color} onChange={e => { setColor(e.target.value); setErasing(false); }}
                  style={{ width:'32px', height:'32px', padding:0, border:'none', borderRadius:'50%', cursor:'pointer' }} />
               <div style={{ width:'1px', height:'24px', background:'#cbd5e1', margin:'0 4px' }} />
               
               <select value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))}
                style={{ padding:'4px 8px', borderRadius:'6px', border:'1px solid #cbd5e1', fontSize:'0.82rem', outline:'none' }}>
                {[1,2,3,5,8,12].map(n => <option key={n} value={n}>{n}px</option>)}
               </select>

               <div style={{ width:'1px', height:'24px', background:'#cbd5e1', margin:'0 4px' }} />

               <button onClick={() => { setLineMode(false); setTextMode(false); setErasing(false); }}
                style={{ padding:'4px 10px', background:!lineMode&&!textMode&&!erasing?'#dbeafe':'transparent', border:`1px solid ${!lineMode&&!textMode&&!erasing?'#3b82f6':'transparent'}`, borderRadius:'6px', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600', color:!lineMode&&!textMode&&!erasing?'#1d4ed8':'#475569' }}>
                ✍️ Libre
               </button>
               <button onClick={() => { setLineMode(true); setTextMode(false); setErasing(false); }}
                style={{ padding:'4px 10px', background:lineMode?'#dbeafe':'transparent', border:`1px solid ${lineMode?'#3b82f6':'transparent'}`, borderRadius:'6px', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600', color:lineMode?'#1d4ed8':'#475569' }}>
                📏 Recta
               </button>
               <button onClick={() => { setTextMode(true); setLineMode(false); setErasing(false); }}
                style={{ padding:'4px 10px', background:textMode?'#dbeafe':'transparent', border:`1px solid ${textMode?'#3b82f6':'transparent'}`, borderRadius:'6px', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600', color:textMode?'#1d4ed8':'#475569' }}>
                🔤 Texto
               </button>
               
               <div style={{ width:'1px', height:'24px', background:'#cbd5e1', margin:'0 4px' }} />

               <button onClick={() => { setErasing(true); setLineMode(false); setTextMode(false); }}
                style={{ padding:'4px 10px', background:erasing?'#fef9c3':'transparent', border:`1px solid ${erasing?'#d97706':'transparent'}`, borderRadius:'6px', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600', color:erasing?'#b45309':'#475569' }}>
                🩹 Borrar
               </button>
               <button onClick={clearCanvas}
                style={{ padding:'4px 10px', background:'transparent', color:'#dc2626', border:'none', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600' }}>
                🗑 Limpiar Todo
               </button>
             </div>

             <canvas
              ref={canvasRef} width={800} height={550}
              style={{ border:'1px solid #cbd5e1', cursor: curStyle, background:'#fff', width:'100%', borderRadius:'8px', touchAction:'none' }}
              onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing}
              onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
