
// ─── Estimación with live quotation table ─────────────────────────────────────
const UNITS = ['pza','metro','ml','kilo','litro','pie','m2','par','rollo','caja','día'];
const TEMPLATE_KEYS = ['Cocina','Clóset','Puerta Sólida','Puerta Tambor'];

function mkRow(desc) { return { id: Date.now() + Math.random(), desc, qty: 1, price: 0, unit: 'pza' }; }

const tblSt  = { width:'100%', borderCollapse:'collapse', marginBottom:'12px', fontSize:'0.85rem' };
const thSt   = { padding:'7px 10px', background:'linear-gradient(135deg,#ba4b24,#7c2d12)', color:'white', fontWeight:'700', textAlign:'left', fontSize:'0.8rem' };
const tdSt   = { padding:'6px 8px', borderBottom:'1px solid #f0f0f0' };
const subRow = { background:'#f8fafc' };

function QuoteTable({ title, rows, onChange, onAdd, onDelete }) {
  const total = rows.reduce((s, r) => s + (Number(r.qty) * Number(r.price)), 0);
  return (
    <table style={tblSt}>
      <thead><tr>
        <th style={thSt}>{title}</th>
        <th style={{ ...thSt, width:'80px' }}>Cant.</th>
        <th style={{ ...thSt, width:'70px' }}>Unidad</th>
        <th style={{ ...thSt, width:'110px' }}>Precio unit.</th>
        <th style={{ ...thSt, textAlign:'right', width:'110px' }}>Total</th>
        <th style={{ ...thSt, width:'36px' }}></th>
      </tr></thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id}>
            <td style={tdSt}><input value={r.desc} onChange={e => onChange(r.id,'desc',e.target.value)} style={{ width:'100%', border:'none', background:'transparent', fontSize:'0.85rem', outline:'none' }} /></td>
            <td style={tdSt}><input type="number" value={r.qty} onChange={e => onChange(r.id,'qty',e.target.value)} style={{ width:'70px', border:'1px solid #e2e8f0', borderRadius:'4px', padding:'3px 5px', fontSize:'0.85rem' }} /></td>
            <td style={tdSt}>
              <select value={r.unit} onChange={e => onChange(r.id,'unit',e.target.value)} style={{ border:'1px solid #e2e8f0', borderRadius:'4px', padding:'3px 4px', fontSize:'0.82rem' }}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </td>
            <td style={tdSt}><input type="number" value={r.price} onChange={e => onChange(r.id,'price',e.target.value)} style={{ width:'100px', border:'1px solid #e2e8f0', borderRadius:'4px', padding:'3px 5px', fontSize:'0.85rem' }} /></td>
            <td style={{ ...tdSt, textAlign:'right', fontWeight:'700', color:'#1e293b' }}>{formatCurrency(Number(r.qty)*Number(r.price))}</td>
            <td style={tdSt}><button onClick={() => onDelete(r.id)} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:'1rem' }}>✕</button></td>
          </tr>
        ))}
        <tr style={subRow}>
          <td colSpan="4" style={{ ...tdSt, textAlign:'right', fontWeight:'700', color:'#64748b', fontSize:'0.82rem' }}>Subtotal {title}</td>
          <td style={{ ...tdSt, textAlign:'right', fontWeight:'800', color:'#1e293b' }}>{formatCurrency(total)}</td>
          <td style={tdSt} />
        </tr>
        <tr><td colSpan="6" style={{ paddingTop:'4px' }}>
          <button onClick={onAdd} style={{ padding:'4px 12px', background:'#f1f5f9', border:'1px dashed #cbd5e1', borderRadius:'5px', cursor:'pointer', fontSize:'0.8rem', color:'#475569' }}>+ Agregar ítem</button>
        </td></tr>
      </tbody>
    </table>
  );
}

// Measurement notes per project type
const MEASUREMENT_NOTES = {
  'Cocina': `MEDIDAS A TOMAR EN VISITA — COCINA:\n• Alto total del espacio (piso a plafón): ___ cm\n• Ancho total del muro principal: ___ cm\n• Ancho muro lateral izq: ___ cm / Ancho muro lateral der: ___ cm\n• Ventana: Alto ___ cm × Ancho ___ cm / Posición desde piso: ___ cm\n• Puerta acceso: Alto ___ cm × Ancho ___ cm\n• Contactos eléctricos: ubicación ___\n• Toma de agua y drenaje: ubicación ___\n• Profundidad mueble bajo: ___ cm / mueble alto: ___ cm\n• Encimera tipo: ___ / Medidas: ___\n• Observaciones:`,
  'Clóset': `MEDIDAS A TOMAR EN VISITA — CLÓSET:\n• Alto total (piso a plafón): ___ cm\n• Ancho total del nicho: ___ cm\n• Profundidad disponible: ___ cm\n• Puerta(s): Ancho ___ cm × Alto ___ cm — Tipo: ___\n• Distribución interna (cajones / colgadores / repisas): ___\n• Contactos eléctricos: ___\n• Observaciones:`,
  'Puerta Sólida': `MEDIDAS A TOMAR EN VISITA — PUERTA SÓLIDA:\n• Alto del vano: ___ cm\n• Ancho del vano: ___ cm\n• Espesor de la pared: ___ cm\n• Sentido de abatimiento: Izq / Der\n• Cerradura actual: ___\n• Marco existente: Sí / No — Estado: ___\n• Observaciones:`,
  'Puerta Tambor': `MEDIDAS A TOMAR EN VISITA — PUERTA TAMBOR:\n• Alto del vano: ___ cm\n• Ancho del vano: ___ cm\n• Espesor de la pared: ___ cm\n• Sentido de abatimiento: Izq / Der\n• Cerradura actual: ___\n• Marco existente: Sí / No — Estado: ___\n• Observaciones:`,
};
const DEFAULT_NOTES = `MEDIDAS A TOMAR EN VISITA:\n• Alto del espacio: ___ cm\n• Ancho del espacio: ___ cm\n• Profundidad: ___ cm\n• Observaciones:`;

function Estimacion({ prospect, onBack }) {
  const canvasRef    = useRef(null);
  const snapshotRef  = useRef(null);
  const startPosRef  = useRef(null);

  const [color, setColor]         = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [erasing, setErasing]     = useState(false);
  const [lineMode, setLineMode]   = useState(false);
  const [margin, setMargin]       = useState(30);
  const [saving, setSaving]       = useState(false);
  const [templateLoaded, setTemplateLoaded] = useState(false);

  const initNotes = () => {
    const pt = prospect.project_type || '';
    const match = TEMPLATE_KEYS.find(k => pt.toLowerCase().includes(k.toLowerCase().replace('ó','o').replace('é','e')));
    const matchAlt = Object.keys(MEASUREMENT_NOTES).find(k => pt.toLowerCase().includes(k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')));
    return MEASUREMENT_NOTES[match] || MEASUREMENT_NOTES[matchAlt] || DEFAULT_NOTES;
  };
  const [notes, setNotes] = useState(initNotes);

  const [materials, setMaterials] = useState([
    mkRow('Tablero de melamina'), mkRow('Ruedas y rieles'), mkRow('Bisagras'), mkRow('Jaladera')
  ]);
  const [labor, setLabor]       = useState([mkRow('Mano de obra carpintería'), mkRow('Instalación')]);
  const [concepts, setConcepts] = useState([mkRow('Flete / Transporte'), mkRow('Herramienta y consumibles')]);

  // Load existing saved estimation
  useEffect(() => {
    if (prospect.estimation_data && !templateLoaded) {
      try {
        const d = typeof prospect.estimation_data === 'string'
          ? JSON.parse(prospect.estimation_data) : prospect.estimation_data;
        if (d.materials?.length) setMaterials(d.materials);
        if (d.labor?.length)     setLabor(d.labor);
        if (d.concepts?.length)  setConcepts(d.concepts);
        if (d.margin !== undefined) setMargin(d.margin);
        if (d.notes) setNotes(d.notes);
        setTemplateLoaded(true);
      } catch {}
    }
  }, [prospect]);

  // Fetch template from DB if no saved data
  useEffect(() => {
    if (templateLoaded || prospect.estimation_data) return;
    const pt = prospect.project_type || '';
    const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const matchKey = TEMPLATE_KEYS.find(k => normalize(pt).includes(normalize(k)));
    if (!matchKey) return;
    fetch(`${API}/api/templates/`)
      .then(r => r.json())
      .then(data => {
        const tpl = data.find(t => normalize(t.name) === normalize(matchKey));
        if (!tpl) return;
        const parsed = JSON.parse(tpl.data);
        if (parsed?.materials?.length) {
          setMaterials(parsed.materials.map(it => mkRow(it.desc || it.description || it.name || '')));
        }
        setTemplateLoaded(true);
      })
      .catch(() => {});
  }, [prospect, templateLoaded]);

  // Init canvas white
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const totalCost       = [...materials, ...labor, ...concepts].reduce((s, r) => s + Number(r.qty) * Number(r.price), 0);
  const totalWithMargin = totalCost * (1 + margin / 100);

  const updateRow = (set) => (id, field, val) =>
    set(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  const deleteRow = (set) => (id) => set(prev => prev.filter(r => r.id !== id));
  const addRow    = (set, desc) => () => set(prev => [...prev, mkRow(desc)]);

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
    if (lineMode) {
      snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      startPosRef.current = pos;
    } else {
      ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    }
    setIsDrawing(true);
  };

  const draw = (e) => {
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
      ctx.lineCap = 'round'; ctx.stroke();
    } else {
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = erasing ? '#ffffff' : color;
      ctx.lineWidth   = erasing ? 20 : lineWidth;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    }
  };

  const stopDrawing = (e) => {
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
    const data = { materials, labor, concepts, margin, notes, totalWithMargin };
    try {
      await fetch(`${API}/api/prospects/${prospect.id}`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ estimation_data: JSON.stringify(data) })
      });
      alert('✅ Estimación guardada');
    } catch { alert('Error guardando'); }
    setSaving(false);
  };

  return (
    <div style={{ padding:'1rem' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.2rem' }}>
        <button onClick={onBack} style={{ padding:'0.4rem 0.9rem', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:'7px', cursor:'pointer', fontWeight:'600', fontSize:'0.87rem' }}>
          ← Volver
        </button>
        <div>
          <h2 style={{ margin:0, color:'#1e293b', fontSize:'1.3rem', fontWeight:'800' }}>📐 Estimación · {prospect.name}</h2>
          <p style={{ margin:0, color:'#64748b', fontSize:'0.83rem' }}>{prospect.project_type} · {prospect.public_id}</p>
        </div>
      </div>

      <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap' }}>
        {/* Left: Cotizador */}
        <div style={{ flex:'1 1 440px' }}>
          <div style={{ background:'white', borderRadius:'10px', border:'1px solid #e2e8f0', padding:'1rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.8rem' }}>
              <h3 style={{ margin:0, color:'#1e293b', fontSize:'1rem', fontWeight:'800' }}>💰 Cotizador en Vivo</h3>
              <div style={{ background:'#f5deb3', borderRadius:'8px', padding:'6px 14px', fontWeight:'800', fontSize:'0.95rem', border:'2px solid #ba4b24', color:'#4a2c0a' }}>
                {formatCurrency(totalWithMargin)}
              </div>
            </div>
            <QuoteTable title="Materiales"        rows={materials} onChange={updateRow(setMaterials)} onAdd={addRow(setMaterials,'Nuevo material')} onDelete={deleteRow(setMaterials)} />
            <QuoteTable title="Mano de obra"      rows={labor}     onChange={updateRow(setLabor)}     onAdd={addRow(setLabor,'Mano de obra')}        onDelete={deleteRow(setLabor)} />
            <QuoteTable title="Conceptos / Otros" rows={concepts}  onChange={updateRow(setConcepts)}  onAdd={addRow(setConcepts,'Concepto')}          onDelete={deleteRow(setConcepts)} />
            <div style={{ background:'#f8fafc', borderRadius:'8px', padding:'0.75rem 1rem', marginTop:'0.5rem', display:'flex', gap:'1.5rem', flexWrap:'wrap', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <label style={{ fontSize:'0.82rem', fontWeight:'700', color:'#475569' }}>Margen (%):</label>
                <input type="number" value={margin} onChange={e => setMargin(Number(e.target.value))}
                  style={{ width:'70px', padding:'4px 8px', borderRadius:'6px', border:'1px solid #e2e8f0', fontWeight:'700' }} />
              </div>
              <span style={{ fontSize:'0.78rem', color:'#64748b' }}>Costo base: {formatCurrency(totalCost)}</span>
              <div style={{ marginLeft:'auto' }}>
                <div style={{ background:'#1e293b', color:'white', borderRadius:'8px', padding:'8px 16px', fontWeight:'800', fontSize:'1.05rem' }}>
                  Total: {formatCurrency(totalWithMargin)}
                </div>
              </div>
            </div>
            <div style={{ marginTop:'0.8rem' }}>
              <label style={{ fontSize:'0.74rem', fontWeight:'700', color:'#64748b', display:'block', marginBottom:'4px' }}>
                📋 Notas y Medidas de Visita
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={9}
                style={{ width:'100%', padding:'8px', borderRadius:'7px', border:'1px solid #e2e8f0', fontSize:'0.83rem', resize:'vertical', boxSizing:'border-box', fontFamily:'monospace', lineHeight:'1.7' }} />
            </div>
            <button onClick={handleSave} disabled={saving}
              style={{ width:'100%', marginTop:'0.8rem', padding:'0.75rem', background:saving?'#94a3b8':'#10b981', color:'white', border:'none', borderRadius:'8px', cursor:saving?'not-allowed':'pointer', fontWeight:'700', fontSize:'0.95rem' }}>
              {saving ? 'Guardando...' : '💾 Guardar Estimación'}
            </button>
          </div>
        </div>

        {/* Right: Drawing canvas */}
        <div style={{ flex:'1 1 400px' }}>
          <div style={{ background:'white', borderRadius:'10px', border:'1px solid #e2e8f0', padding:'1rem' }}>
            <h3 style={{ margin:'0 0 0.8rem', color:'#1e293b', fontSize:'1rem', fontWeight:'700' }}>✏️ Croquis y Dibujo de Guía</h3>
            <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', marginBottom:'0.8rem', flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                <label style={{ fontSize:'0.76rem', fontWeight:'700', color:'#64748b' }}>Color:</label>
                <input type="color" value={color} onChange={e => { setColor(e.target.value); setErasing(false); }}
                  style={{ width:'34px', height:'28px', padding:'2px', border:'1px solid #e2e8f0', borderRadius:'5px', cursor:'pointer' }} />
              </div>
              {['#000000','#e11d48','#2563eb','#16a34a','#f59e0b','#7c3aed'].map(c => (
                <button key={c} onClick={() => { setColor(c); setErasing(false); setLineMode(false); }}
                  style={{ width:'22px', height:'22px', background:c, border:color===c&&!erasing?'3px solid #0f172a':'2px solid #e2e8f0', borderRadius:'50%', cursor:'pointer', padding:0 }} />
              ))}
              <select value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))}
                style={{ padding:'3px 6px', borderRadius:'5px', border:'1px solid #e2e8f0', fontSize:'0.82rem' }}>
                {[1,2,4,6,10].map(n => <option key={n} value={n}>{n}px</option>)}
              </select>
              <button onClick={() => { setLineMode(p => !p); setErasing(false); }}
                style={{ padding:'0.25rem 0.65rem', background:lineMode?'#dbeafe':'#f1f5f9', border:`1px solid ${lineMode?'#3b82f6':'#e2e8f0'}`, borderRadius:'6px', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600', color:lineMode?'#1d4ed8':'#475569' }}>
                📏 {lineMode ? 'Recta ✓' : 'Línea Recta'}
              </button>
              <button onClick={() => { setErasing(p => !p); setLineMode(false); }}
                style={{ padding:'0.25rem 0.65rem', background:erasing?'#fef9c3':'#f1f5f9', border:`1px solid ${erasing?'#d97706':'#e2e8f0'}`, borderRadius:'6px', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600' }}>
                {erasing ? '🩹 Borrando' : '🧹 Borrador'}
              </button>
              <button onClick={clearCanvas}
                style={{ padding:'0.25rem 0.65rem', background:'#fee2e2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:'6px', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600' }}>
                🗑 Limpiar
              </button>
            </div>
            <canvas
              ref={canvasRef} width={800} height={580}
              style={{ border:'1px solid #e2e8f0', cursor: lineMode?'crosshair':(erasing?'cell':'crosshair'), background:'#fff', width:'100%', borderRadius:'6px', touchAction:'none' }}
              onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing}
              onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
