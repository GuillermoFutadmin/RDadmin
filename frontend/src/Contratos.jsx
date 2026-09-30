import React, { useState, useEffect, useRef } from 'react';
import { printProspect } from './Prospects';

const API = import.meta.env.VITE_API_URL || '';

function formatCurrency(val) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ prospect, onApprove, onReject, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ background:'white', borderRadius:'16px', padding:'2rem', width:'400px', maxWidth:'95vw', boxShadow:'0 25px 60px rgba(0,0,0,0.25)' }}>
        <h3 style={{ margin:'0 0 0.4rem', color:'#1e293b', fontSize:'1.1rem' }}>¿Se aprobó el proyecto?</h3>
        <p style={{ color:'#64748b', fontSize:'0.88rem', margin:'0 0 1.5rem' }}><strong>{prospect.name}</strong> · {prospect.project_type}</p>
        <div style={{ display:'flex', gap:'0.8rem' }}>
          <button onClick={onApprove}
            style={{ flex:1, padding:'0.8rem', background:'#10b981', color:'white', border:'none', borderRadius:'8px', fontWeight:'700', cursor:'pointer', fontSize:'0.95rem' }}>
            ✅ SÍ — Pasar a Contratos
          </button>
          <button onClick={onReject}
            style={{ flex:1, padding:'0.8rem', background:'#64748b', color:'white', border:'none', borderRadius:'8px', fontWeight:'700', cursor:'pointer', fontSize:'0.95rem' }}>
            ❌ NO — Mandar a Papelera
          </button>
        </div>
        <button onClick={onClose}
          style={{ width:'100%', marginTop:'0.6rem', padding:'0.55rem', background:'#f1f5f9', border:'none', borderRadius:'8px', cursor:'pointer', color:'#64748b', fontSize:'0.85rem' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Prospect Detail Card (same style as Prospects.jsx) ──────────────────────
function ContratoDetail({ prospect, onBack, onEstimacion, onReturnToProspect }) {
  const chip = (label, value) => value ? (
    <div style={{ padding:'0.4rem 0.55rem', backgroundColor:'#f8f9fa', borderRadius:'6px' }}>
      <p style={{ fontSize:'0.64rem', color:'#94a3b8', margin:'0 0 0.1rem', textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</p>
      <p style={{ fontWeight:'600', fontSize:'0.82rem', color:'#1e293b', margin:0, lineHeight:'1.3' }}>{value}</p>
    </div>
  ) : null;

  const fmtDate = (d) => d ? new Date(d + (d.endsWith('Z') ? '' : 'Z'))
    .toLocaleString('es-MX', { timeZone:'America/Tijuana', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:false }) : null;

  const handleDownloadCotizacion = () => {
    printProspect(prospect);
  };

  return (
    <div className="card" style={{ marginBottom:'2rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem', flexWrap:'wrap', gap:'0.5rem' }}>
        <h3 style={{ color:'var(--accent)', margin:0, fontSize:'1.15rem' }}>{prospect.name}</h3>
        <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
          <button onClick={onBack} style={{ padding:'0.3rem 0.75rem', fontSize:'0.8rem', backgroundColor:'#eee', border:'none', borderRadius:'6px', cursor:'pointer' }}>Volver</button>
          <button onClick={onEstimacion} style={{ padding:'0.3rem 0.75rem', fontSize:'0.8rem', backgroundColor:'#3b82f6', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold' }}>📐 Estimación</button>
          <button onClick={handleDownloadCotizacion} style={{ padding:'0.3rem 0.75rem', fontSize:'0.8rem', backgroundColor:'#10b981', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold' }}>📄 Descargar Cotización</button>
          <button onClick={onReturnToProspect} style={{ padding:'0.3rem 0.75rem', fontSize:'0.8rem', backgroundColor:'#dc2626', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold' }}>↩️ Regresar a Prospecto</button>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'0.4rem' }}>
        {chip('ID', prospect.public_id)}
        {chip('Fecha Captura', fmtDate(prospect.capture_date))}
        {chip('Contacto', prospect.contact_info)}
        {chip('Ubicación', prospect.location)}
        {chip('Casa habitada', prospect.inhabited_house)}
        {chip('Tipo de Proyecto', prospect.project_type)}
        {chip('Inicio', prospect.start_date)}
        {chip('Entrega', prospect.delivery_date)}
        {chip('Precio Estimado', prospect.estimated_price)}
        {chip('Material 1', prospect.material_type)}
        {prospect.material_type_2 && chip('Material 2', prospect.material_type_2)}
        {chip('Encimera', prospect.countertop_type)}
        {chip('Herrajes', prospect.hardware_details)}
        {chip('Medidas', prospect.measurements)}
        {chip('Estado', prospect.status)}
        {chip('Prioridades', prospect.project_priorities)}
      </div>
      {prospect.expectations && (
        <div style={{ marginTop:'0.4rem', padding:'0.4rem 0.55rem', backgroundColor:'#f8f9fa', borderRadius:'6px' }}>
          <p style={{ fontSize:'0.64rem', color:'#94a3b8', margin:'0 0 0.1rem', textTransform:'uppercase' }}>Expectativas</p>
          <p style={{ fontSize:'0.82rem', margin:0 }}>{prospect.expectations}</p>
        </div>
      )}
      {prospect.has_design && (
        <div style={{ marginTop:'0.4rem', padding:'0.6rem 0.75rem', backgroundColor:'#f8f9fa', borderRadius:'8px' }}>
          <p style={{ fontSize:'0.68rem', color:'#94a3b8', margin:'0 0 0.4rem', textTransform:'uppercase', fontWeight:'700' }}>Diseño y Fotos del Proyecto</p>
          {prospect.design_details && <p style={{ marginBottom:'0.6rem', fontSize:'0.82rem', color:'#334155' }}>{prospect.design_details}</p>}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'0.75rem' }}>
            {prospect.space_image_path && (
              <div style={{ border:'1px solid #e2e8f0', borderRadius:'8px', overflow:'hidden', backgroundColor:'white' }}>
                <div style={{ padding:'4px 8px', fontSize:'0.72rem', fontWeight:'700', color:'#0369a1', backgroundColor:'#f0f9ff' }}>🏠 Foto del Espacio</div>
                <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', padding:'4px' }}>
                  {prospect.space_image_path.split(',').map((imgPath, idx) => (
                    <img key={idx} src={imgPath.trim().startsWith('http') ? imgPath.trim() : `${API}${imgPath.trim()}`}
                      alt={`Espacio ${idx + 1}`} style={{ flex:'1 1 45%', maxHeight:'160px', objectFit:'cover', borderRadius:'4px' }} />
                  ))}
                </div>
              </div>
            )}
            {(prospect.reference_image_path || prospect.design_image_path) && (
              <div style={{ border:'1px solid #e2e8f0', borderRadius:'8px', overflow:'hidden', backgroundColor:'white' }}>
                <div style={{ padding:'4px 8px', fontSize:'0.72rem', fontWeight:'700', color:'#7c2d12', backgroundColor:'#fff7ed' }}>💡 Foto de Referencia</div>
                <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', padding:'4px' }}>
                  {(prospect.reference_image_path || prospect.design_image_path).split(',').map((imgPath, idx) => (
                    <img key={idx} src={imgPath.trim().startsWith('http') ? imgPath.trim() : `${API}${imgPath.trim()}`}
                      alt={`Referencia ${idx + 1}`} style={{ flex:'1 1 45%', maxHeight:'160px', objectFit:'cover', borderRadius:'4px' }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Contratos component ────────────────────────────────────────────────
export default function Contratos({ startView = 'list' }) {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');         // 'list' | 'detail' | 'estimacion'
  const [selected, setSelected] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState('');
  const [confirmFor, setConfirmFor] = useState(null); // prospect to confirm approval

  const fetchContratos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/prospects`);
      const data = await res.json();
      setContratos(data.filter(p => p.is_contract));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchContratos(); }, []);
  useEffect(() => {
    if (startView === 'estimacion_list') {
      setView('estimacion_menu');
      setSelected(null);
    } else {
      setView('list');
      setSelected(null);
    }
  }, [startView]);

  const handleReturnToProspect = async (p) => {
    if (!window.confirm('¿Estás seguro de regresar este contrato a prospecto?')) return;
    await fetch(`${API}/api/prospects/${p.id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ is_contract:false, contract_date:null })
    });
    fetchContratos();
    setView('list');
    setSelected(null);
  };

  // ── Views ──
  if (view === 'detail' && selected) {
    return (
      <div style={{ padding:'1rem' }}>
        <ContratoDetail
          prospect={selected}
          onBack={() => { setView('list'); setSelected(null); }}
          onEstimacion={() => setView('estimacion')}
          onReturnToProspect={() => handleReturnToProspect(selected)}
        />
      </div>
    );
  }

  if (view === 'estimacion' && selected) {
    return <Estimacion prospect={selected} onBack={() => {
      if (startView === 'estimacion_list') {
        setView('estimacion_menu');
        setSelected(null);
      } else {
        setView('detail');
      }
    }} />;
  }

  if (view === 'estimacion_menu') {
    return (
      <div style={{ padding:'2rem', maxWidth:'700px', margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <h2 style={{ color:'#b45309', fontSize:'2rem', margin:'0 0 0.5rem' }}>Estimación de Contratos</h2>
          <p style={{ color:'#64748b', fontSize:'1rem', margin:0 }}>Selecciona un contrato para iniciar su estimación en vivo</p>
        </div>
        <div style={{ background:'white', borderRadius:'12px', padding:'2rem', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)', border:'1px solid #e2e8f0' }}>
          <h3 style={{ margin:'0 0 1rem', color:'#1e293b', fontSize:'1.1rem', fontWeight:'700' }}>Paso 1: Asignar Contrato</h3>
          <select 
            style={{ width:'100%', padding:'0.8rem', borderRadius:'8px', border:'1px solid #cbd5e1', fontSize:'1rem', outline:'none', cursor:'pointer' }}
            onChange={(e) => {
              const c = contratos.find(x => x.id === parseInt(e.target.value));
              if(c) {
                setSelected(c);
                setView('estimacion');
              }
            }}
            value=""
          >
            <option value="" disabled>-- Selecciona --</option>
            {contratos.map(c => (
              <option key={c.id} value={c.id}>{c.name} - {c.project_type}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  // ── List filters ──
  const txt = filterText.toLowerCase().trim();
  const filtered = contratos.filter(c => {
    if (txt && !((c.name||'').toLowerCase().includes(txt) || (c.public_id||'').toLowerCase().includes(txt) || (c.contact_info||'').toLowerCase().includes(txt) || (c.project_type||'').toLowerCase().includes(txt))) return false;
    if (filterType && c.project_type !== filterType) return false;
    return true;
  });
  const typeOptions = [...new Set(contratos.map(c => c.project_type).filter(Boolean))];

  const fmtDate = (d) => d ? new Date(d + (d.endsWith('Z') ? '' : 'Z')).toLocaleDateString('es-MX', { timeZone:'America/Tijuana', day:'2-digit', month:'2-digit', year:'numeric' }) : '-';

  const statusBadge = (s) => {
    const isP = !s || s === 'New' || s === 'Prospecto';
    const isV = s === 'Valoración' || s === 'Valoracion';
    const label = isP ? 'Prospecto' : isV ? 'Valoración' : 'Cotización';
    const bg    = isP ? '#eff6ff' : isV ? '#fef3c7' : '#dcfce7';
    const color = isP ? '#1e40af' : isV ? '#92400e' : '#14532d';
    const dot   = isP ? '#3b82f6' : isV ? '#f59e0b' : '#22c55e';
    return (
      <span style={{ background:bg, color, padding:'0.2rem 0.65rem', borderRadius:'12px', fontSize:'0.8rem', fontWeight:'700', display:'inline-flex', alignItems:'center', gap:'5px' }}>
        <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:dot, display:'inline-block' }} />
        {label}
      </span>
    );
  };

  const handleApprove = async (p) => {
    await fetch(`${API}/api/prospects/${p.id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ is_contract:true, contract_date:new Date().toISOString() })
    });
    setConfirmFor(null);
    fetchContratos();
  };

  const handleReject = async (p) => {
    await fetch(`${API}/api/prospects/${p.id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ is_papelera:true })
    });
    setConfirmFor(null);
    fetchContratos();
  };

  return (
    <div style={{ padding:'1rem' }}>
      {/* Confirm Modal */}
      {confirmFor && (
        <ConfirmModal
          prospect={confirmFor}
          onApprove={() => handleApprove(confirmFor)}
          onReject={() => handleReject(confirmFor)}
          onClose={() => setConfirmFor(null)}
        />
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <div>
          <h2 style={{ margin:0, color:'#1e293b', fontSize:'1.4rem', fontWeight:'800' }}>📄 Contratos</h2>
          <p style={{ margin:'0.2rem 0 0', color:'#64748b', fontSize:'0.88rem' }}>Proyectos aprobados y en proceso</p>
        </div>
        <div style={{ background:'#1e293b', color:'white', borderRadius:'10px', padding:'0.5rem 1.2rem', fontWeight:'700', fontSize:'1.1rem' }}>
          {contratos.length} contrato{contratos.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filters */}
      <div style={{ background:'#f8fafc', borderRadius:'10px', padding:'1rem', marginBottom:'1.2rem', display:'flex', gap:'1rem', flexWrap:'wrap', alignItems:'flex-end' }}>
        <div style={{ flex:'1 1 220px' }}>
          <label style={{ fontSize:'0.74rem', fontWeight:'700', color:'#64748b', display:'block', marginBottom:'4px' }}>Buscar</label>
          <input value={filterText} onChange={e => setFilterText(e.target.value)}
            placeholder="Nombre, ID, contacto..."
            style={{ width:'100%', padding:'7px 10px', borderRadius:'7px', border:'1px solid #cbd5e1', fontSize:'0.87rem' }} />
        </div>
        <div style={{ flex:'1 1 160px' }}>
          <label style={{ fontSize:'0.74rem', fontWeight:'700', color:'#64748b', display:'block', marginBottom:'4px' }}>Tipo de Proyecto</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{ width:'100%', padding:'7px 8px', borderRadius:'7px', border:'1px solid #cbd5e1', fontSize:'0.87rem' }}>
            <option value="">Todos</option>
            {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {(txt || filterType) && (
          <button onClick={() => { setFilterText(''); setFilterType(''); }}
            style={{ padding:'7px 14px', background:'#fee2e2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:'7px', cursor:'pointer', fontWeight:'700', fontSize:'0.82rem', alignSelf:'flex-end' }}>
            ✕ Limpiar
          </button>
        )}
        <div style={{ width:'100%', fontSize:'0.77rem', color:'#94a3b8' }}>
          {filtered.length} de {contratos.length} contrato{contratos.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color:'#64748b' }}>Cargando contratos...</p>
      ) : (
        <div style={{ overflowX:'auto', background:'white', borderRadius:'10px', border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'780px' }}>
            <thead>
              <tr style={{ borderBottom:'2px solid #eee', textAlign:'left', background:'#fafafa' }}>
                {['ID','Nombre','Proyecto','Contacto','F. Contrato','Material','Estado','Acciones'].map(h => (
                  <th key={h} style={{ padding:'0.6rem 0.8rem', fontSize:'0.82rem', color:'#64748b', fontWeight:'700' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}
                  style={{ borderBottom:'1px solid #f0f0f0' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fffbf7'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                  <td style={{ padding:'0.7rem 0.8rem', fontSize:'0.85rem', fontWeight:'bold', color:'#64748b' }}>{c.public_id}</td>
                  <td style={{ padding:'0.7rem 0.8rem' }}>
                    <button onClick={() => { setSelected(c); setView('detail'); }}
                      style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontWeight:'600', fontSize:'0.95rem', textDecoration:'underline', padding:0 }}>
                      {c.name}
                    </button>
                  </td>
                  <td style={{ padding:'0.7rem 0.8rem', fontSize:'0.9rem', color:'#475569' }}>{c.project_type || '-'}</td>
                  <td style={{ padding:'0.7rem 0.8rem', fontSize:'0.9rem' }}>{c.contact_info || '-'}</td>
                  <td style={{ padding:'0.7rem 0.8rem', fontSize:'0.85rem', color:'#64748b' }}>{fmtDate(c.contract_date)}</td>
                  <td style={{ padding:'0.7rem 0.8rem', fontSize:'0.88rem' }}>{c.material_type_2 ? `${c.material_type} + ${c.material_type_2}` : (c.material_type || '-')}</td>
                  <td style={{ padding:'0.7rem 0.8rem' }}>{statusBadge(c.status)}</td>
                  <td style={{ padding:'0.7rem 0.8rem' }}>
                    <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                      <button onClick={() => { setSelected(c); setView('estimacion'); }}
                        style={{ padding:'0.3rem 0.7rem', background:'#3b82f6', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.85rem' }}>
                        📐 Estimación
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="8" style={{ padding:'2rem', textAlign:'center', color:'#94a3b8', fontStyle:'italic' }}>
                  {contratos.length === 0 ? 'No hay contratos aprobados aún.' : 'Ningún contrato coincide con los filtros.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Estimación with live quotation table ────────────────────────────────────
const UNITS = ['pza','metro','ml','kilo','litro','pie','m2','par','rollo','caja','día'];

function mkRow(desc) { return { id: Date.now() + Math.random(), desc, qty: 1, price: 0, unit: 'pza' }; }

const tblSt  = { width:'100%', borderCollapse:'collapse', marginBottom:'12px', fontSize:'0.85rem' };
const thSt   = { padding:'7px 10px', background:'linear-gradient(135deg,#ba4b24,#7c2d12)', color:'white', fontWeight:'700', textAlign:'left', fontSize:'0.8rem' };
const tdSt   = { padding:'6px 8px', borderBottom:'1px solid #f0f0f0' };
const subRow = { background:'#f8fafc' };

function QuoteTable({ title, rows, onChange, onAdd, onDelete }) {
  const total = rows.reduce((s, r) => s + (Number(r.qty) * Number(r.price)), 0);
  return (
    <table style={tblSt}>
      <thead>
        <tr>
          <th style={thSt}>{title}</th>
          <th style={{ ...thSt, width:'80px' }}>Cant.</th>
          <th style={{ ...thSt, width:'70px' }}>Unidad</th>
          <th style={{ ...thSt, width:'110px' }}>Precio unit.</th>
          <th style={{ ...thSt, textAlign:'right', width:'110px' }}>Total</th>
          <th style={{ ...thSt, width:'36px' }}></th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id}>
            <td style={tdSt}>
              <input value={r.desc} onChange={e => onChange(r.id,'desc',e.target.value)}
                style={{ width:'100%', border:'none', background:'transparent', fontSize:'0.85rem', outline:'none' }} />
            </td>
            <td style={tdSt}>
              <input type="number" value={r.qty} onChange={e => onChange(r.id,'qty',e.target.value)}
                style={{ width:'70px', border:'1px solid #e2e8f0', borderRadius:'4px', padding:'3px 5px', fontSize:'0.85rem' }} />
            </td>
            <td style={tdSt}>
              <select value={r.unit} onChange={e => onChange(r.id,'unit',e.target.value)}
                style={{ border:'1px solid #e2e8f0', borderRadius:'4px', padding:'3px 4px', fontSize:'0.82rem' }}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </td>
            <td style={tdSt}>
              <input type="number" value={r.price} onChange={e => onChange(r.id,'price',e.target.value)}
                style={{ width:'100px', border:'1px solid #e2e8f0', borderRadius:'4px', padding:'3px 5px', fontSize:'0.85rem' }} />
            </td>
            <td style={{ ...tdSt, textAlign:'right', fontWeight:'700', color:'#1e293b' }}>{formatCurrency(Number(r.qty) * Number(r.price))}</td>
            <td style={tdSt}>
              <button onClick={() => onDelete(r.id)}
                style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:'1rem' }}>✕</button>
            </td>
          </tr>
        ))}
        <tr style={subRow}>
          <td colSpan="4" style={{ ...tdSt, textAlign:'right', fontWeight:'700', color:'#64748b', fontSize:'0.82rem' }}>Subtotal {title}</td>
          <td style={{ ...tdSt, textAlign:'right', fontWeight:'800', color:'#1e293b' }}>{formatCurrency(total)}</td>
          <td style={tdSt} />
        </tr>
        <tr>
          <td colSpan="6" style={{ paddingTop:'4px' }}>
            <button onClick={onAdd}
              style={{ padding:'4px 12px', background:'#f1f5f9', border:'1px dashed #cbd5e1', borderRadius:'5px', cursor:'pointer', fontSize:'0.8rem', color:'#475569' }}>
              + Agregar ítem
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function Estimacion({ prospect, onBack }) {
  const canvasRef = useRef(null);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [notes, setNotes] = useState('');
  const [margin, setMargin] = useState(30);
  const [saving, setSaving] = useState(false);

  // Quote rows
  const [materials, setMaterials] = useState([
    mkRow('Tablero de melamina'), mkRow('Ruedas y rieles'), mkRow('Bisagras'), mkRow('Jaladera')
  ]);
  const [labor, setLabor] = useState([
    mkRow('Mano de obra carpintería'), mkRow('Instalación')
  ]);
  const [concepts, setConcepts] = useState([
    mkRow('Flete / Transporte'), mkRow('Herramienta y consumibles')
  ]);

  const totalCost = [...materials, ...labor, ...concepts].reduce((s, r) => s + Number(r.qty) * Number(r.price), 0);
  const totalWithMargin = totalCost * (1 + margin / 100);

  const updateRow = (set) => (id, field, val) =>
    set(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  const deleteRow = (set) => (id) => set(prev => prev.filter(r => r.id !== id));
  const addRow = (set, desc) => () => set(prev => [...prev, mkRow(desc)]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) return { x:(e.touches[0].clientX-rect.left)*scaleX, y:(e.touches[0].clientY-rect.top)*scaleY };
    return { x:(e.clientX-rect.left)*scaleX, y:(e.clientY-rect.top)*scaleY };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };
  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = erasing ? '#ffffff' : color;
    ctx.lineWidth = erasing ? 20 : lineWidth;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke();
  };
  const stopDrawing = (e) => { if (e) e.preventDefault(); setIsDrawing(false); };
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
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
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.2rem' }}>
        <button onClick={onBack}
          style={{ padding:'0.4rem 0.9rem', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:'7px', cursor:'pointer', fontWeight:'600', fontSize:'0.87rem' }}>
          ← Volver
        </button>
        <div>
          <h2 style={{ margin:0, color:'#1e293b', fontSize:'1.3rem', fontWeight:'800' }}>📐 Estimación · {prospect.name}</h2>
          <p style={{ margin:0, color:'#64748b', fontSize:'0.83rem' }}>{prospect.project_type} · {prospect.public_id}</p>
        </div>
      </div>

      <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap' }}>
        {/* Left: quotation tables */}
        <div style={{ flex:'1 1 440px' }}>
          <div style={{ background:'white', borderRadius:'10px', border:'1px solid #e2e8f0', padding:'1rem', marginBottom:'1rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.8rem' }}>
              <h3 style={{ margin:0, color:'#1e293b', fontSize:'1rem', fontWeight:'800' }}>💰 Cotizador en Vivo</h3>
              <div style={{ background:'#f5deb3', borderRadius:'8px', padding:'6px 14px', fontWeight:'800', fontSize:'0.95rem', border:'2px solid #ba4b24', color:'#4a2c0a' }}>
                {formatCurrency(totalWithMargin)}
              </div>
            </div>

            <QuoteTable
              title="Materiales"
              rows={materials}
              onChange={updateRow(setMaterials)}
              onAdd={addRow(setMaterials,'Nuevo material')}
              onDelete={deleteRow(setMaterials)}
            />
            <QuoteTable
              title="Mano de obra"
              rows={labor}
              onChange={updateRow(setLabor)}
              onAdd={addRow(setLabor,'Mano de obra')}
              onDelete={deleteRow(setLabor)}
            />
            <QuoteTable
              title="Conceptos / Otros"
              rows={concepts}
              onChange={updateRow(setConcepts)}
              onAdd={addRow(setConcepts,'Concepto')}
              onDelete={deleteRow(setConcepts)}
            />

            {/* Margin and total */}
            <div style={{ background:'#f8fafc', borderRadius:'8px', padding:'0.75rem 1rem', marginTop:'0.5rem', display:'flex', gap:'1.5rem', flexWrap:'wrap', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <label style={{ fontSize:'0.82rem', fontWeight:'700', color:'#475569' }}>Margen (%):</label>
                <input type="number" value={margin} onChange={e => setMargin(Number(e.target.value))}
                  style={{ width:'70px', padding:'4px 8px', borderRadius:'6px', border:'1px solid #e2e8f0', fontWeight:'700' }} />
              </div>
              <div>
                <span style={{ fontSize:'0.78rem', color:'#64748b' }}>Costo base: {formatCurrency(totalCost)}</span>
              </div>
              <div style={{ marginLeft:'auto' }}>
                <div style={{ background:'#1e293b', color:'white', borderRadius:'8px', padding:'8px 16px', fontWeight:'800', fontSize:'1.05rem' }}>
                  Total: {formatCurrency(totalWithMargin)}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginTop:'0.8rem' }}>
              <label style={{ fontSize:'0.74rem', fontWeight:'700', color:'#64748b', display:'block', marginBottom:'4px' }}>Notas adicionales</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                style={{ width:'100%', padding:'8px', borderRadius:'7px', border:'1px solid #e2e8f0', fontSize:'0.88rem', resize:'vertical', boxSizing:'border-box' }}
                placeholder="Observaciones, condiciones especiales, acuerdos..." />
            </div>

            <button onClick={handleSave} disabled={saving}
              style={{ width:'100%', marginTop:'0.8rem', padding:'0.75rem', background:saving ? '#94a3b8' : '#10b981', color:'white', border:'none', borderRadius:'8px', cursor:saving?'not-allowed':'pointer', fontWeight:'700', fontSize:'0.95rem' }}>
              {saving ? 'Guardando...' : '💾 Guardar Estimación'}
            </button>
          </div>
        </div>

        {/* Right: drawing canvas */}
        <div style={{ flex:'1 1 400px' }}>
          <div style={{ background:'white', borderRadius:'10px', border:'1px solid #e2e8f0', padding:'1rem' }}>
            <h3 style={{ margin:'0 0 0.8rem', color:'#1e293b', fontSize:'1rem', fontWeight:'700' }}>✏️ Croquis y Dibujo de Guía</h3>
            <div style={{ display:'flex', gap:'0.6rem', alignItems:'center', marginBottom:'0.8rem', flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                <label style={{ fontSize:'0.76rem', fontWeight:'700', color:'#64748b' }}>Color:</label>
                <input type="color" value={color} onChange={e => { setColor(e.target.value); setErasing(false); }}
                  style={{ width:'34px', height:'28px', padding:'2px', border:'1px solid #e2e8f0', borderRadius:'5px', cursor:'pointer' }} />
              </div>
              {['#000000','#e11d48','#2563eb','#16a34a','#f59e0b','#7c3aed','#ffffff'].map(c => (
                <button key={c} onClick={() => { setColor(c); setErasing(c === '#ffffff'); }}
                  style={{ width:'22px', height:'22px', background:c, border:color===c&&!erasing ? '3px solid #0f172a' : '2px solid #e2e8f0', borderRadius:'50%', cursor:'pointer', padding:0 }} />
              ))}
              <select value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))}
                style={{ padding:'3px 6px', borderRadius:'5px', border:'1px solid #e2e8f0', fontSize:'0.82rem' }}>
                {[1,2,4,6,10].map(n => <option key={n} value={n}>{n}px</option>)}
              </select>
              <button onClick={() => setErasing(prev => !prev)}
                style={{ padding:'0.25rem 0.65rem', background:erasing?'#fef9c3':'#f1f5f9', border:`1px solid ${erasing?'#d97706':'#e2e8f0'}`, borderRadius:'6px', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600' }}>
                {erasing ? '🩹 Borrando' : '🧹 Borrador'}
              </button>
              <button onClick={clearCanvas}
                style={{ padding:'0.25rem 0.65rem', background:'#fee2e2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:'6px', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600' }}>
                🗑 Limpiar
              </button>
            </div>
            <canvas
              ref={canvasRef} width={800} height={560}
              style={{ border:'1px solid #e2e8f0', cursor:erasing?'cell':'crosshair', background:'#fff', width:'100%', borderRadius:'6px', touchAction:'none' }}
              onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing}
              onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
