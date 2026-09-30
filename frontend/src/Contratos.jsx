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
  const [filterStatus, setFilterStatus] = useState('');
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
    if (filterStatus && (c.status || 'APROBADO') !== filterStatus) return false;
    return true;
  });
  const typeOptions = [...new Set(contratos.map(c => c.project_type).filter(Boolean))];

  const fmtDate = (d) => d ? new Date(d + (d.endsWith('Z') ? '' : 'Z')).toLocaleDateString('es-MX', { timeZone:'America/Tijuana', day:'2-digit', month:'2-digit', year:'numeric' }) : '-';

  const statusBadge = (s) => {
    const isAprobado   = s === 'APROBADO';
    const isRender     = s === 'RENDER SI/NO';
    const isEstimacion = s === 'ESTIMACIÓN';
    const isContrato   = s === 'CONTRATO';
    let label = s || 'APROBADO';
    let bg = '#dcfce7'; let color = '#166534'; let dot = '#22c55e';
    if (isRender)     { bg = '#fef3c7'; color = '#92400e'; dot = '#f59e0b'; }
    else if (isEstimacion) { bg = '#e0e7ff'; color = '#3730a3'; dot = '#4f46e5'; }
    else if (isContrato)   { bg = '#fce7f3'; color = '#9d174d'; dot = '#ec4899'; }
    return (
      <span style={{ background:bg, color, padding:'0.2rem 0.65rem', borderRadius:'12px', fontSize:'0.8rem', fontWeight:'700', display:'inline-flex', alignItems:'center', gap:'5px', whiteSpace:'nowrap' }}>
        <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:dot, display:'inline-block' }} />
        {label}
      </span>
    );
  };

  const handleApprove = async (p) => {
    await fetch(`${API}/api/prospects/${p.id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ is_contract:true, contract_date:new Date().toISOString(), status:'APROBADO' })
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
          <h2 style={{ margin:0, color:'#1e293b', fontSize:'1.4rem', fontWeight:'800' }}>📄 Clientes</h2>
          <p style={{ margin:'0.2rem 0 0', color:'#64748b', fontSize:'0.88rem' }}>Proyectos aprobados y en proceso</p>
        </div>
        <div style={{ background:'#1e293b', color:'white', borderRadius:'10px', padding:'0.5rem 1.2rem', fontWeight:'700', fontSize:'1.1rem' }}>
          {contratos.length} contrato{contratos.length !== 1 ? 's' : ''}
        </div>
      </div>

      
      {/* ── ETAPAS PIPELINE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.8rem', marginBottom: '1.2rem' }}>
        {[
          { key: '', label: 'Todos', count: contratos.length, color: '#475569', bg: '#f1f5f9', icon: '📋' },
          { key: 'APROBADO',  label: 'Aprobado',  count: contratos.filter(c => (c.status || 'APROBADO') === 'APROBADO').length,  color: '#166534', bg: '#dcfce7', icon: '✅' },
          { key: 'RENDER SI/NO', label: 'Render SI/NO', count: contratos.filter(c => c.status === 'RENDER SI/NO').length, color: '#92400e', bg: '#fef3c7', icon: '🎨' },
          { key: 'ESTIMACIÓN', label: 'Estimación', count: contratos.filter(c => c.status === 'ESTIMACIÓN').length,  color: '#3730a3', bg: '#e0e7ff', icon: '📐' },
          { key: 'CONTRATO', label: 'Contrato', count: contratos.filter(c => c.status === 'CONTRATO').length,  color: '#9d174d', bg: '#fce7f3', icon: '📝' },
        ].map(({ key, label, count, color, bg, icon }) => {
          const isActive = filterStatus === key;
          return (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              style={{
                background: isActive ? bg : 'white',
                border: `2px solid ${isActive ? color : '#e2e8f0'}`,
                borderRadius: '10px',
                padding: '0.7rem 0.6rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.3rem',
                transition: 'all 0.2s',
                boxShadow: isActive ? `0 4px 12px ${color}33` : '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ fontSize: '1.2rem' }}>{icon}</div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: isActive ? color : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '900', color: isActive ? color : '#1e293b' }}>{count}</div>
            </button>
          );
        })}
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
                    <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap', alignItems:'center' }}>
                      { (c.status || 'APROBADO') === 'APROBADO' && (
                        <button onClick={async () => {
                          await fetch(`${API}/api/prospects/${c.id}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: 'RENDER SI/NO' }) });
                          fetchContratos();
                        }} style={{ padding:'0.3rem 0.7rem', background:'#f59e0b', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.8rem' }}>
                          Avanzar a Render
                        </button>
                      )}
                      { c.status === 'RENDER SI/NO' && (
                        <button onClick={async () => {
                          await fetch(`${API}/api/prospects/${c.id}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: 'ESTIMACIÓN' }) });
                          fetchContratos();
                        }} style={{ padding:'0.3rem 0.7rem', background:'#4f46e5', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.8rem' }}>
                          Avanzar a Estimación
                        </button>
                      )}
                      { c.status === 'ESTIMACIÓN' && (
                        <button onClick={async () => {
                          await fetch(`${API}/api/prospects/${c.id}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: 'CONTRATO' }) });
                          fetchContratos();
                        }} style={{ padding:'0.3rem 0.7rem', background:'#ec4899', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.8rem' }}>
                          Avanzar a Contrato
                        </button>
                      )}
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


import Croquis3D from './Croquis3D';

// ─── Estimación with modern styling & live quotation table ────────────────────
const UNITS = ['pza','metro','ml','kilo','litro','pie','m2','par','rollo','caja','día'];
const TEMPLATE_KEYS = ['Cocina','Clóset','Puerta Sólida','Puerta Tambor'];

function mkRow(desc, price = 0) { return { id: Date.now() + Math.random(), desc, qty: 1, price: Number(price), unit: 'pza' }; }

const MEASUREMENT_FIELDS = {
  'Cocina': [
    { id: 'alto_plafon', label: 'Alto (piso a plafón)', type: 'number', suffix: 'cm' },
    { id: 'ancho_muro', label: 'Ancho muro principal', type: 'number', suffix: 'cm' },
    { id: 'ancho_izq', label: 'Muro lat. izq', type: 'number', suffix: 'cm' },
    { id: 'ancho_der', label: 'Muro lat. der', type: 'number', suffix: 'cm' },
    { id: 'zona_trabajo', label: 'Zona de trabajo', type: 'select', options: ['Terminado Pulido', 'Irregular', 'Obra Negra'] },
    { id: 'cajoneras_cant', label: 'Cant. Cajoneras', type: 'number', suffix: 'pza' },
    { id: 'cajoneras_ubic', label: 'Ubic. Cajoneras', type: 'text', placeholder: 'Ej. Debajo parrilla' },
    { id: 'puertas_cant', label: 'Cant. Puertas', type: 'number', suffix: 'pza' },
    { id: 'ventana', label: 'Medidas ventana', type: 'text', placeholder: 'Ej. 120x80cm' },
    { id: 'contactos', label: 'Contactos eléctricos', type: 'text' },
    { id: 'agua_drenaje', label: 'Agua/Drenaje', type: 'text' },
    { id: 'prof_bajo', label: 'Prof. mueble bajo', type: 'number', suffix: 'cm' },
    { id: 'encimera', label: 'Encimera', type: 'text' },
  ],
  'Clóset': [
    { id: 'alto_plafon', label: 'Alto total', type: 'number', suffix: 'cm' },
    { id: 'ancho_nicho', label: 'Ancho de nicho', type: 'number', suffix: 'cm' },
    { id: 'profundidad', label: 'Profundidad', type: 'number', suffix: 'cm' },
    { id: 'zona_trabajo', label: 'Condición del nicho', type: 'select', options: ['Escuadra Perfecta', 'Irregular / Falsa Escuadra'] },
    { id: 'cajoneras_cant', label: 'Cant. Cajoneras', type: 'number', suffix: 'pza' },
    { id: 'cajoneras_ubic', label: 'Ubic. Cajoneras', type: 'text' },
    { id: 'puertas_cant', label: 'Cant. Puertas', type: 'number', suffix: 'pza' },
    { id: 'tipo_puerta', label: 'Tipo de puerta', type: 'text', placeholder: 'Corrediza o Abatible' },
    { id: 'distribucion', label: 'Distribución interior', type: 'text' },
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
        
        const mapItem = it => ({
          id: Date.now() + Math.random(),
          desc: it.desc || '',
          qty: 1,
          price: Number(it.price) || 0,
          unit: it.unit || 'pza'
        });
        
        if (parsed?.materiales?.length) setMaterials(parsed.materiales.map(mapItem));
        if (parsed?.mano_obra?.length)  setLabor(parsed.mano_obra.map(mapItem));
        if (parsed?.conceptos?.length)  setConcepts(parsed.conceptos.map(mapItem));
        setTemplateLoaded(true);
      })
      .catch(() => {});
  }, [prospect, templateLoaded]);

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

      <div style={{ background:'white', borderRadius:'10px', border:'1px solid #e2e8f0', padding:'1.2rem' }}>
         <h3 style={{ margin:'0 0 1rem', color:'#1e293b', fontSize:'1rem', fontWeight:'700' }}>📋 Notas y Medidas de Visita</h3>
         
         {formFields.length > 0 ? (
           <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'0.8rem' }}>
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
          {saving ? 'Guardando...' : '💾 Guardar Notas y Cotización'}
         </button>
      </div>

      <Croquis3D />
    </div>
  );
}
