import React, { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || '';

function formatCurrency(val) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ prospect, onApprove, onReject, onClose }) {
  const [showReason, setShowReason] = React.useState(false);
  const [reason, setReason] = React.useState('');

  const handleRejectClick = () => {
    if (!showReason) { setShowReason(true); return; }
    if (!reason.trim()) { alert('Por favor escribe el motivo de rechazo.'); return; }
    onReject(reason.trim());
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ background:'white', borderRadius:'16px', padding:'2rem', width:'440px', maxWidth:'95vw', boxShadow:'0 25px 60px rgba(0,0,0,0.25)' }}>
        <h3 style={{ margin:'0 0 0.4rem', color:'#1e293b', fontSize:'1.1rem' }}>¿Se aprobó el proyecto?</h3>
        <p style={{ color:'#64748b', fontSize:'0.88rem', margin:'0 0 1.5rem' }}><strong>{prospect.name}</strong> · {prospect.project_type}</p>

        {showReason ? (
          <div style={{ marginBottom:'1rem' }}>
            <p style={{ fontSize:'0.88rem', fontWeight:'700', color:'#dc2626', margin:'0 0 0.5rem' }}>❌ ¿Por qué no se aprobó el proyecto?</p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Ej. Presupuesto fuera de rango, cliente decidió no continuar..."
              style={{ width:'100%', padding:'8px', border:'1px solid #fca5a5', borderRadius:'8px', fontSize:'0.88rem', resize:'vertical', boxSizing:'border-box', outline:'none' }}
            />
          </div>
        ) : null}

        <div style={{ display:'flex', gap:'0.8rem' }}>
          {!showReason && (
            <button onClick={onApprove}
              style={{ flex:1, padding:'0.8rem', background:'#10b981', color:'white', border:'none', borderRadius:'8px', fontWeight:'700', cursor:'pointer', fontSize:'0.95rem' }}>
              ✅ SÍ — Pasar a Contratos
            </button>
          )}
          <button onClick={handleRejectClick}
            style={{ flex:1, padding:'0.8rem', background: showReason ? '#dc2626' : '#64748b', color:'white', border:'none', borderRadius:'8px', fontWeight:'700', cursor:'pointer', fontSize:'0.95rem' }}>
            ❌ {showReason ? 'Confirmar Rechazo' : 'NO — Mandar a Papelera'}
          </button>
        </div>
        <button onClick={() => { setShowReason(false); setReason(''); onClose(); }}
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

  const handleDownloadCotizacion = async () => {
    const { printProspect } = await import('./Prospects');
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
      {prospect.papelera_reason && (
        <div style={{ marginTop:'0.6rem', padding:'0.75rem 1rem', backgroundColor:'#fef2f2', border:'1px solid #fca5a5', borderRadius:'8px' }}>
          <p style={{ fontSize:'0.7rem', color:'#dc2626', margin:'0 0 0.3rem', textTransform:'uppercase', fontWeight:'800', letterSpacing:'0.06em' }}>❌ Motivo de Rechazo</p>
          <p style={{ fontSize:'0.88rem', color:'#7f1d1d', margin:0, lineHeight:'1.5' }}>{prospect.papelera_reason}</p>
        </div>
      )}
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
                      alt={`Espacio ${idx + 1}`} style={{ flex:'1 1 45%', width: '100%', height: 'auto', borderRadius:'4px' }} />
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
                      alt={`Referencia ${idx + 1}`} style={{ flex:'1 1 45%', width: '100%', height: 'auto', borderRadius:'4px' }} />
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
  const [renderModalFor, setRenderModalFor] = useState(null); // prospect for Render modal
  const [renderApplies, setRenderApplies] = useState(null);   // null | true | false
  const [renderPrice, setRenderPrice] = useState('');
  const [renderDelivery, setRenderDelivery] = useState('');
  const [renderComments, setRenderComments] = useState('');
  const [renderFiles, setRenderFiles] = useState([]);
  const [renderPdf, setRenderPdf] = useState(null);
  const [uploadingRender, setUploadingRender] = useState(false);

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
            {contratos
              .filter(c => ['RENDER SI/NO', 'ESTIMACIÓN', 'CONTRATO'].includes(c.status))
              .map(c => (
                <option key={c.id} value={c.id}>{c.name} – {c.project_type}{c.status ? ` [${c.status}]` : ''}</option>
              ))
            }
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
    if (filterStatus && getStatus(c) !== filterStatus) return false;
    return true;
  });
  const typeOptions = [...new Set(contratos.map(c => c.project_type).filter(Boolean))];

  const fmtDate = (d) => d ? new Date(d + (d.endsWith('Z') ? '' : 'Z')).toLocaleDateString('es-MX', { timeZone:'America/Tijuana', day:'2-digit', month:'2-digit', year:'numeric' }) : '-';

    const getStatus = (c) => {
    const validStates = ['APROBADO', 'RENDER SI/NO', 'ESTIMACIÓN', 'CONTRATO'];
    if (c.status && validStates.includes(c.status)) return c.status;
    return 'APROBADO';
  };

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

  const handleReject = async (p, reason) => {
    await fetch(`${API}/api/prospects/${p.id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ is_papelera:true, papelera_reason: reason || null })
    });
    setConfirmFor(null);
    fetchContratos();
  };

  return (
    <div style={{ padding:'1rem' }}>
      {/* Confirm Modal */}
      {/* ── RENDER MODAL ── */}
      {renderModalFor && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
          <div style={{ background:'white', borderRadius:'16px', padding:'2rem', width:'460px', maxWidth:'95vw', boxShadow:'0 25px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin:'0 0 0.4rem', color:'#1e293b', fontSize:'1.15rem' }}>🎨 ¿Aplica Render?</h3>
            <p style={{ color:'#64748b', fontSize:'0.88rem', margin:'0 0 1.4rem' }}>
              <strong>{renderModalFor.name}</strong> · {renderModalFor.project_type}
            </p>

            {/* SI / NO buttons */}
            <div style={{ display:'flex', gap:'1rem', marginBottom:'1.4rem' }}>
              {[{val: true, label:'✅ SÍ — Aplica Render', bg:'#10b981'}, {val: false, label:'❌ NO — Sin Render', bg:'#64748b'}].map(opt => (
                <button key={String(opt.val)}
                  onClick={() => setRenderApplies(opt.val)}
                  style={{ flex:1, padding:'0.75rem', background: renderApplies === opt.val ? opt.bg : '#f1f5f9',
                    color: renderApplies === opt.val ? 'white' : '#475569',
                    border: `2px solid ${renderApplies === opt.val ? opt.bg : '#e2e8f0'}`,
                    borderRadius:'8px', fontWeight:'700', cursor:'pointer', fontSize:'0.9rem', transition:'all 0.2s' }}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Render price form — only when SI */}
            {renderApplies === true && (
              <div style={{ background:'#f8fafc', borderRadius:'10px', padding:'1rem', marginBottom:'1.2rem' }}>
                <div style={{ display:'flex', gap:'1rem', marginBottom:'1rem' }}>
                  <div style={{ flex:1 }}>
                    <label style={{ fontSize:'0.82rem', fontWeight:'700', color:'#475569', display:'block', marginBottom:'6px' }}>💰 Precio del Render (MXN)</label>
                    <input type="number" min="0" step="100" value={renderPrice} onChange={e => setRenderPrice(e.target.value)} placeholder="Ej. 3500" style={{ width:'100%', padding:'10px 12px', borderRadius:'8px', border:'1px solid #cbd5e1', fontSize:'1rem', boxSizing:'border-box' }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={{ fontSize:'0.82rem', fontWeight:'700', color:'#475569', display:'block', marginBottom:'6px' }}>⏳ Tiempo de entrega</label>
                    <input type="text" value={renderDelivery} onChange={e => setRenderDelivery(e.target.value)} placeholder="Ej. 5 días hábiles" style={{ width:'100%', padding:'10px 12px', borderRadius:'8px', border:'1px solid #cbd5e1', fontSize:'1rem', boxSizing:'border-box' }} />
                  </div>
                </div>

                <div style={{ display:'flex', gap:'1rem', marginBottom:'1rem' }}>
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
                </div>

                <div style={{ marginBottom:'1rem' }}>
                  <label style={{ fontSize:'0.82rem', fontWeight:'700', color:'#475569', display:'block', marginBottom:'6px' }}>💬 Comentarios adicionales</label>
                  <textarea value={renderComments} onChange={e => setRenderComments(e.target.value)} placeholder="Notas para el equipo..." rows={2} style={{ width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1', fontSize:'0.9rem', resize:'vertical', boxSizing:'border-box' }} />
                </div>
                {renderModalFor.quote_total_price && (
                  <div style={{ marginTop:'0.8rem', padding:'0.7rem 1rem', background:'#e0f2fe', borderRadius:'8px', fontSize:'0.88rem', color:'#0369a1' }}>
                    <strong>Estimación base:</strong> ${Number(renderModalFor.quote_total_price || 0).toLocaleString('es-MX')}<br/>
                    <strong>+ Render:</strong> ${Number(renderPrice || 0).toLocaleString('es-MX')}<br/>
                    <strong style={{ fontSize:'1rem', color:'#1e293b' }}>
                      Total final: ${(Number(renderModalFor.quote_total_price || 0) + Number(renderPrice || 0)).toLocaleString('es-MX')}
                    </strong>
                    <div style={{ marginTop:'6px', fontSize:'0.75rem', color:'#0284c7', fontWeight:'600' }}>
                      * El costo del render se pagará con el 60% de anticipo.
                    </div>
                  </div>
                )}
              </div>
            )}

            {renderApplies === false && (
              <div style={{ background:'#f0fdf4', borderRadius:'10px', padding:'0.8rem 1rem', marginBottom:'1.2rem', fontSize:'0.88rem', color:'#166534' }}>
                ✅ Sin render. El cliente avanzará directamente a Estimación con el precio original.
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display:'flex', gap:'0.8rem' }}>
              <button
                disabled={renderApplies === null || (renderApplies === true && !renderPrice) || uploadingRender}
                onClick={async () => {
                  setUploadingRender(true);
                  try {
                    let uploadedUrl = null;
                    let uploadedPdfUrl = null;
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
                    });
                    
                    setRenderModalFor(null);
                    setRenderApplies(null);
                    setRenderPrice('');
                    setRenderDelivery('');
                    setRenderComments('');
                    setRenderFiles([]); setRenderPdf(null);
                    fetchContratos();
                  } catch(e) {
                    alert('Error guardando los datos del render');
                  }
                  setUploadingRender(false);
                }}
                style={{ flex:1, padding:'0.75rem', background: (renderApplies === null || (renderApplies === true && !renderPrice) || uploadingRender) ? '#94a3b8' : '#3b82f6',
                  color:'white', border:'none', borderRadius:'8px', fontWeight:'700', cursor: (renderApplies === null || (renderApplies === true && !renderPrice) || uploadingRender) ? 'not-allowed' : 'pointer', fontSize:'0.95rem' }}>
                {uploadingRender ? '⏳ Subiendo...' : '💾 Guardar y Avanzar'}
              </button>
              <button onClick={() => { setRenderModalFor(null); setRenderApplies(null); setRenderPrice(''); setRenderDelivery(''); setRenderComments(''); setRenderFiles([]); setRenderPdf(null); }}
                style={{ padding:'0.75rem 1rem', background:'#f1f5f9', border:'none', borderRadius:'8px', cursor:'pointer', color:'#64748b', fontWeight:'600', fontSize:'0.9rem' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmFor && (
        <ConfirmModal
          prospect={confirmFor}
          onApprove={() => handleApprove(confirmFor)}
          onReject={(reason) => handleReject(confirmFor, reason)}
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
          { key: 'APROBADO',  label: 'Aprobado',  count: contratos.filter(c => getStatus(c) === 'APROBADO').length,  color: '#166534', bg: '#dcfce7', icon: '✅' },
          { key: 'RENDER SI/NO', label: 'Render SI/NO', count: contratos.filter(c => getStatus(c) === 'RENDER SI/NO').length, color: '#92400e', bg: '#fef3c7', icon: '🎨' },
          { key: 'ESTIMACIÓN', label: 'Estimación', count: contratos.filter(c => getStatus(c) === 'ESTIMACIÓN').length,  color: '#3730a3', bg: '#e0e7ff', icon: '📐' },
          { key: 'CONTRATO', label: 'Contrato', count: contratos.filter(c => getStatus(c) === 'CONTRATO').length,  color: '#9d174d', bg: '#fce7f3', icon: '📝' },
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
                      {/* Render button - shows on APROBADO, changes color when filled */}
                      { (getStatus(c) === 'APROBADO' || getStatus(c) === 'RENDER SI/NO') && (
                        <button onClick={() => {
                          setRenderModalFor(c);
                          setRenderApplies(c.render_applies ?? null);
                          setRenderPrice(c.render_price ? String(c.render_price) : '');
                        }} style={{
                          padding:'0.3rem 0.7rem',
                          background: c.render_applies !== null && c.render_applies !== undefined ? '#10b981' : '#f59e0b',
                          color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.8rem'
                        }}>
                          {c.render_applies !== null && c.render_applies !== undefined ? '✅ Render SI/NO' : '🎨 Render SI/NO'}
                        </button>
                      )}
                      { getStatus(c) === 'RENDER SI/NO' && (
                        <button onClick={async () => {
                          await fetch(`${API}/api/prospects/${c.id}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: 'ESTIMACIÓN' }) });
                          fetchContratos();
                        }} style={{ padding:'0.3rem 0.7rem', background:'#4f46e5', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.8rem' }}>
                          Avanzar a Estimación
                        </button>
                      )}
                      { getStatus(c) === 'ESTIMACIÓN' && (
                        <button onClick={async () => {
                          if (!c.estimation_data) {
                            alert('⛔ Debes realizar y guardar la Estimación primero para poder avanzar a Contrato.');
                            return;
                          }
                          await fetch(`${API}/api/prospects/${c.id}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: 'CONTRATO' }) });
                          fetchContratos();
                        }} style={{ padding:'0.3rem 0.7rem', background: !c.estimation_data ? '#94a3b8' : '#ec4899', color:'white', border:'none', borderRadius:'6px', cursor: !c.estimation_data ? 'not-allowed' : 'pointer', fontWeight:'600', fontSize:'0.8rem' }}>
                          Avanzar a Contrato
                        </button>
                      )}
                      {/* Estimación button - disabled on APROBADO, green when has estimation_data */}
                      <button
                        disabled={getStatus(c) === 'APROBADO'}
                        onClick={() => {
                          if (getStatus(c) === 'APROBADO') return;
                          setSelected(c); setView('estimacion');
                        }}
                        title={getStatus(c) === 'APROBADO' ? 'Completa el paso de Render primero' : (c.estimation_data ? 'Ver/editar Estimación guardada' : 'Abrir Estimación')}
                        style={{
                          padding:'0.3rem 0.7rem',
                          background: getStatus(c) === 'APROBADO' ? '#cbd5e1' : (c.estimation_data ? '#10b981' : '#3b82f6'),
                          color: getStatus(c) === 'APROBADO' ? '#94a3b8' : 'white',
                          border:'none', borderRadius:'6px',
                          cursor: getStatus(c) === 'APROBADO' ? 'not-allowed' : 'pointer',
                          fontWeight:'600', fontSize:'0.85rem',
                          opacity: getStatus(c) === 'APROBADO' ? 0.7 : 1,
                          transition: 'all 0.2s ease'
                        }}>
                        {c.estimation_data ? '✅ Estimación' : '📐 Estimación'}
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

  const [sheets, setSheets] = useState([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  
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
  const [photos, setPhotos] = useState({});
  const [croquisPhotos, setCroquisPhotos] = useState([]);
  const [viewPhoto, setViewPhoto] = useState(null);
  const croquisRef = useRef(null);

  const handleCroquisPhotoUpload = (files) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_W = 1200;
          const scale = img.width > MAX_W ? MAX_W / img.width : 1;
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          setCroquisPhotos(prev => [...prev, canvas.toDataURL('image/jpeg', 0.8)]);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  };


  const handlePhotoUpload = (fieldId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_W = 800;
        const scale = img.width > MAX_W ? MAX_W / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        setPhotos(p => ({...p, [fieldId]: canvas.toDataURL('image/jpeg', 0.7)}));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  // Cargar info previa
  useEffect(() => {
    if (prospect.estimation_data && !templateLoaded) {
      try {
        const d = typeof prospect.estimation_data === 'string'
          ? JSON.parse(prospect.estimation_data) : prospect.estimation_data;
        if (d.sheets && d.sheets.length > 0) {
          setSheets(d.sheets);
        } else if (d.materials || d.labor || d.concepts) {
          setSheets([{ type: prospect.project_type || 'Proyecto', materials: d.materials || [], labor: d.labor || [], concepts: d.concepts || [] }]);
        }
        if (d.margin !== undefined) setMargin(d.margin);
        if (d.measures) setMeasures(d.measures);
        if (d.obsText) setObsText(d.obsText);
        if (d.photos) setPhotos(d.photos);
        if (d.croquisPhotos) setCroquisPhotos(d.croquisPhotos);
        if (d.croquis_data) {
          setTimeout(() => croquisRef.current?.loadSketchData(d.croquis_data), 200);
        }
        setTemplateLoaded(true);
      } catch {}
    }
  }, [prospect]);

  // Cargar desde valuation_data o machotes
  useEffect(() => {
    if (templateLoaded || prospect.estimation_data) return;

    if (prospect.valuation_data) {
      try {
        const rawVal = JSON.parse(prospect.valuation_data);
        if (rawVal.sheets && rawVal.sheets.length > 0) {
          setSheets(rawVal.sheets);
          if (rawVal.globalMargin) setMargin(rawVal.globalMargin);
        } else if (rawVal.materials || rawVal.labor || rawVal.concepts) {
          setSheets([{ type: rawVal.projectType || 'Proyecto', materials: rawVal.materials || [], labor: rawVal.labor || [], concepts: rawVal.concepts || [] }]);
          if (rawVal.margin) setMargin(rawVal.margin);
        }
        setTemplateLoaded(true);
        return;
      } catch(e) {}
    }

    const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const ptRaw = prospect.project_type || '';
    // Detectar todos los tipos presentes
    const matchedKeys = TEMPLATE_KEYS.filter(k => normalize(ptRaw).includes(normalize(k)));
    if (matchedKeys.length === 0) return;

    fetch(`${API}/api/templates/`)
      .then(r => r.json())
      .then(data => {
        const newSheets = [];
        matchedKeys.forEach(key => {
          const tpl = data.find(t => normalize(t.name) === normalize(key));
          if (!tpl) return;
          try {
            const parsed = JSON.parse(tpl.data);
            const mapItem = it => ({
              id: Date.now() + Math.random(),
              desc: it.desc || '',
              qty: 1, price: Number(it.price) || 0, unit: it.unit || 'pza'
            });
            newSheets.push({
              type: key,
              materials: parsed?.materiales ? parsed.materiales.map(mapItem) : [],
              labor: parsed?.mano_obra ? parsed.mano_obra.map(mapItem) : [],
              concepts: parsed?.conceptos ? parsed.conceptos.map(mapItem) : []
            });
          } catch {}
        });
        if (newSheets.length > 0) setSheets(newSheets);
        setTemplateLoaded(true);
      })
      .catch(() => {});
  }, [prospect, templateLoaded]);

  const getSheetCost = (sh) => {
    const sum = arr => (arr||[]).reduce((s, r) => s + Number(r.qty||0) * Number(r.price||0), 0);
    return sum(sh.materials) + sum(sh.labor) + sum(sh.concepts);
  };
  const totalCost = sheets.reduce((s, sh) => s + getSheetCost(sh), 0);
  const totalWithMargin = totalCost * (1 + margin / 100);

  // Tablas render helpers (estilo Valoracion)
  const tblSt  = { width: '100%', borderCollapse: 'collapse', marginBottom: '1.4rem' };
  const thSt   = { background: '#8b5a2b', color: 'white', padding: '10px', textAlign: 'left', border: '1px solid #ddd', fontSize: '0.85rem' };
  const tdSt   = { padding: '8px', border: '1px solid #ddd', verticalAlign: 'middle', fontSize:'0.85rem' };
  
  const handleEditItem = (section, item) => setEditingItem({ section, ...item });
  const saveItemEdit = (updates) => {
    const { section, id } = editingItem;
    setSheets(prev => {
      const nw = [...prev];
      const sh = {...nw[activeSheetIdx]};
      const arrKey = section === 'mat' ? 'materials' : section === 'lab' ? 'labor' : 'concepts';
      sh[arrKey] = sh[arrKey].map(r => r.id === id ? { ...r, ...updates } : r);
      nw[activeSheetIdx] = sh;
      return nw;
    });
    setEditingItem(null);
  };
  
  const addRow = (section, desc) => {
    setSheets(prev => {
      const nw = [...prev];
      const sh = {...nw[activeSheetIdx]};
      const arrKey = section === 'mat' ? 'materials' : section === 'lab' ? 'labor' : 'concepts';
      sh[arrKey] = [...(sh[arrKey]||[]), mkRow(desc)];
      nw[activeSheetIdx] = sh;
      return nw;
    });
  };
  
  const delRow = (section, id) => {
    setSheets(prev => {
      const nw = [...prev];
      const sh = {...nw[activeSheetIdx]};
      const arrKey = section === 'mat' ? 'materials' : section === 'lab' ? 'labor' : 'concepts';
      sh[arrKey] = sh[arrKey].filter(r => r.id !== id);
      nw[activeSheetIdx] = sh;
      return nw;
    });
  };

  const renderValRow = (item, section) => (
    <tr key={item.id}>
      <td style={tdSt}><strong>{item.desc}</strong></td>
      <td style={tdSt}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input type="number" value={item.qty} min="0"
            onChange={e => {
               const val = e.target.value;
               setSheets(prev => {
                 const nw = [...prev];
                 const sh = {...nw[activeSheetIdx]};
                 const arrKey = section === 'mat' ? 'materials' : section === 'lab' ? 'labor' : 'concepts';
                 sh[arrKey] = sh[arrKey].map(r => r.id === item.id ? { ...r, qty: val } : r);
                 nw[activeSheetIdx] = sh;
                 return nw;
               });
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
    const data = { 
      sheets, margin, measures, obsText, totalWithMargin, photos, croquisPhotos,
      croquis_data: croquisRef.current?.getSketchData()
    };
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

      {viewPhoto && (
        <div style={{ position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.88)', zIndex:99999, display:'flex', justifyContent:'center', alignItems:'center' }}
          onClick={() => setViewPhoto(null)}>
          <img src={viewPhoto} alt='Foto' style={{ maxWidth:'92%', maxHeight:'90vh', borderRadius:'10px', boxShadow:'0 8px 40px rgba(0,0,0,0.6)' }} />
          <button onClick={e => { e.stopPropagation(); setViewPhoto(null); }} style={{ position:'absolute', top:'20px', right:'24px', background:'white', border:'none', borderRadius:'50%', width:'42px', height:'42px', fontSize:'1.3rem', cursor:'pointer', fontWeight:'bold' }}>×</button>
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.2rem' }}>
        <button onClick={onBack} style={{ padding:'0.4rem 0.9rem', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:'7px', cursor:'pointer', fontWeight:'600', fontSize:'0.87rem' }}>
          ← Volver
        </button>
        <div>
          <h2 style={{ margin:0, color:'#1e293b', fontSize:'1.3rem', fontWeight:'800' }}>📐 Estimación · {prospect.name}</h2>
          <p style={{ margin:0, color:'#64748b', fontSize:'0.83rem' }}>{prospect.project_type} · {prospect.public_id}</p>
        </div>
      </div>

      {/* ── 1. NOTAS Y MEDIDAS ── */}
      <div style={{ background:'white', borderRadius:'10px', border:'1px solid #e2e8f0', padding:'1.2rem', marginBottom:'1.5rem' }}>
         <h3 style={{ margin:'0 0 1rem', color:'#1e293b', fontSize:'1rem', fontWeight:'700' }}>📋 Notas y Medidas de Visita</h3>
         
         {formFields.length > 0 ? (
           <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'0.8rem' }}>
             {formFields.map(f => (
                <div key={f.id} style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                  <label style={{ fontSize:'0.75rem', fontWeight:'700', color:'#475569' }}>{f.label}</label>
                  <div style={{ display:'flex', gap:'6px', alignItems:'flex-start' }}>
                    <div style={{ flex:1 }}>
                      {f.type === 'select' ? (
                        <select value={measures[f.id]||''} onChange={e => setMeasures(p => ({...p,[f.id]:e.target.value}))}
                         style={{ width:'100%', padding:'6px 8px', border:'1px solid #cbd5e1', borderRadius:'6px', fontSize:'0.85rem' }}>
                           <option value=''>Selecciona</option>
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
                    <label style={{ cursor:'pointer', padding:'5px 8px', background:'#f0f9ff', borderRadius:'6px', border:'1px solid #bae6fd', display:'flex', alignItems:'center', gap:'4px', fontSize:'0.78rem', fontWeight:'600', color:'#0369a1', whiteSpace:'nowrap', flexShrink:0 }} title='Tomar o subir foto'>
                      📷 Foto
                      <input type='file' accept='image/*' capture='environment' style={{ display:'none' }}
                        onChange={e => handlePhotoUpload(f.id, e.target.files[0])} />
                    </label>
                  </div>
                  {photos[f.id] && (
                    <div style={{ marginTop:'4px', position:'relative', display:'inline-block', alignSelf:'flex-start' }}>
                      <img src={photos[f.id]} onClick={() => setViewPhoto(photos[f.id])}
                        style={{ width:'64px', height:'64px', objectFit:'cover', borderRadius:'6px', cursor:'pointer', border:'2px solid #bae6fd', display:'block' }} />
                      <button onClick={() => setPhotos(p => { const np={...p}; delete np[f.id]; return np; })}
                        style={{ position:'absolute', top:'-7px', right:'-7px', background:'#ef4444', color:'white', border:'none', borderRadius:'50%', width:'20px', height:'20px', fontSize:'11px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold' }}>×</button>
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
      </div>

      {/* ── 2. FOTOS GUARDADAS ── */}
      <div style={{ background:'white', borderRadius:'10px', border:'1px solid #e2e8f0', padding:'1.2rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <h3 style={{ margin:0, color:'#1e293b', fontSize:'1rem', fontWeight:'700' }}>📸 Fotos Guardadas</h3>
          <div style={{ display:'flex', gap:'10px' }}>
            <label style={{ cursor:'pointer', padding:'8px 12px', background:'#3b82f6', color:'white', border:'none', borderRadius:'6px', fontWeight:'700', fontSize:'0.85rem', display:'flex', alignItems:'center', gap:'6px' }}>
              📸 Subir Foto
              <input type='file' accept='image/*' multiple capture='environment' style={{ display:'none' }}
                onChange={e => handleCroquisPhotoUpload(e.target.files)} />
            </label>
            <button onClick={(e) => {
              e.preventDefault();
              if (croquisRef.current) {
                const dataUrl = croquisRef.current.getSketchData();
                if (dataUrl) {
                  setCroquisPhotos(prev => [...prev, dataUrl]);
                  croquisRef.current.clearCanvas();
                }
              }
            }} style={{ cursor:'pointer', padding:'8px 12px', background:'#10b981', color:'white', border:'none', borderRadius:'6px', fontWeight:'700', fontSize:'0.85rem' }}>
              📐 Capturar Croquis
            </button>
          </div>
        </div>
        
        {croquisPhotos.length > 0 ? (
          <div style={{ display:'flex', flexWrap:'wrap', gap:'10px' }}>
            {croquisPhotos.map((p, idx) => (
              <div key={idx} style={{ position:'relative' }}>
                <img src={p} onClick={() => setViewPhoto(p)} style={{ width:'100px', height:'100px', objectFit:'cover', borderRadius:'8px', border:'2px solid #cbd5e1', cursor:'pointer' }} />
                <button onClick={() => setCroquisPhotos(prev => prev.filter((_, i) => i !== idx))} style={{ position:'absolute', top:'-6px', right:'-6px', background:'#ef4444', color:'white', border:'none', borderRadius:'50%', width:'24px', height:'24px', fontWeight:'bold', cursor:'pointer' }}>×</button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize:'0.85rem', color:'#64748b', margin:0 }}>No hay dibujos capturados. Dibuja en el lienzo de abajo y presiona 'Capturar Dibujo Actual' para guardar múltiples piezas o partes de tu diseño.</p>
        )}
      </div>

      <Croquis3D ref={croquisRef} />


      {/* ── 4. COTIZADOR EN VIVO ── */}
      <div style={{ background:'white', borderRadius:'10px', border:'1px solid #e2e8f0', padding:'1.5rem', marginTop:'1.5rem', marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.2rem' }}>
          <div>
            <h3 style={{ margin:0, color:'#8b5a2b', fontSize:'1.1rem', fontWeight:'800' }}>💰 Cotizador en Vivo</h3>
            {prospect.project_type && (
              <p style={{ margin:'0.2rem 0 0', fontSize:'0.78rem', color:'#64748b' }}>
                Proyectos: <strong>{prospect.project_type}</strong>
              </p>
            )}
          </div>
          <div style={{ background:'#f5deb3', borderRadius:'8px', padding:'6px 14px', fontWeight:'800', fontSize:'0.95rem', border:'2px solid #8b5a2b', color:'#4a2c0a' }}>
            {formatCurrency(totalWithMargin)}
          </div>
        </div>

        {sheets.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '1.2rem', paddingBottom: '4px' }}>
              {sheets.map((sh, idx) => {
                const sheetCost = getSheetCost(sh);
                const isActive = activeSheetIdx === idx;
                return (
                  <button key={idx} onClick={() => setActiveSheetIdx(idx)}
                    style={{
                      padding: '8px 16px', background: isActive ? '#8b5a2b' : '#f1f5f9',
                      color: isActive ? 'white' : '#475569', border: isActive ? 'none' : '1px solid #cbd5e1',
                      borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem',
                      display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap'
                    }}>
                    #{idx+1} {sh.type} <span style={{ background: isActive ? 'rgba(255,255,255,0.2)' : '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>{formatCurrency(sheetCost)}</span>
                  </button>
                );
              })}
            </div>
            {sheets[activeSheetIdx] && (
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                   <h4 style={{ margin:0, color:'#8b5a2b', fontSize:'1rem' }}>Hoja: {sheets[activeSheetIdx].type}</h4>
                   <button onClick={() => {
                     if(!window.confirm('¿Eliminar esta hoja?')) return;
                     setSheets(prev => {
                       const nw = [...prev];
                       nw.splice(activeSheetIdx, 1);
                       return nw;
                     });
                     setActiveSheetIdx(0);
                   }} style={{ background:'#ef4444', color:'white', border:'none', borderRadius:'6px', padding:'4px 8px', fontSize:'0.75rem', cursor:'pointer' }}>Eliminar hoja</button>
                </div>
                {renderQuoteTable('Materiales', sheets[activeSheetIdx].materials || [], 'mat', 'Material')}
                {renderQuoteTable('Mano de obra', sheets[activeSheetIdx].labor || [], 'lab', 'Mano de obra')}
                {renderQuoteTable('Conceptos / Otros', sheets[activeSheetIdx].concepts || [], 'con', 'Concepto')}
              </div>
            )}
          </>
        )}
        {sheets.length === 0 && <p style={{ color:'#64748b' }}>No hay hojas de cotización. Regresa el contrato a prospecto y realiza la Valoración.</p>}

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

      <button onClick={handleSave} disabled={saving}
       style={{ width:'100%', padding:'1.2rem', background:saving?'#94a3b8':'#10b981', color:'white', border:'none', borderRadius:'10px', cursor:saving?'not-allowed':'pointer', fontWeight:'900', fontSize:'1.1rem', marginTop: '0.5rem', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)' }}>
       {saving ? 'Guardando...' : '💾 Guardar Notas y Cotización'}
      </button>
    </div>
  );
}
