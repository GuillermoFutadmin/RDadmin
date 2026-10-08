import React, { useState, useEffect, useRef } from 'react';
import { ContratoPDFView } from './ContratoPDF';
import { CotizacionView } from './Cotizacion';
import { IconUsers, IconCheckCircle, IconPalette, IconPenTool, IconFileText, IconSearch, IconXCircle } from './icons';
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
export function ContratoDetail({ prospect: _prospectProp, onBack, onEstimacion, onReturnToProspect, onDownloadCotizacion, onRefresh, onStartProduction, onReturnToClients, productionMode = false }) {
  const [localProspect, setLocalProspect] = React.useState(_prospectProp);
  const [showPhotos, setShowPhotos] = React.useState(false);

  React.useEffect(() => { setLocalProspect(_prospectProp); }, [_prospectProp]);

  // Alias para que el resto del JSX no cambie
  const prospect = localProspect;

  const chip = (label, value) => value !== null && value !== undefined && value !== '' ? (
    <div style={{ minWidth:0, padding:'0.8rem 0.9rem', background:'#fff', border:'1px solid #edf0f3', borderRadius:'10px' }}>
      <p style={{ fontSize:'0.68rem', color:'#2563a8', margin:'0 0 0.35rem', textTransform:'uppercase', letterSpacing:'0.055em', fontWeight:800 }}>{label}</p>
      <p style={{ fontWeight:550, fontSize:'0.88rem', color:'#202938', margin:0, lineHeight:'1.5', whiteSpace:'pre-wrap', overflowWrap:'anywhere' }}>{value}</p>
    </div>
  ) : null;

  const fmtDate = (d) => d ? new Date(d + (d.endsWith('Z') ? '' : 'Z'))
    .toLocaleString('es-MX', { timeZone:'America/Tijuana', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:false }) : null;

  const parseStoredJson = (value, fallback = null) => {
    if (!value) return fallback;
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return fallback; }
  };
  const displayValue = (value) => {
    if (value === true) return 'Sí';
    if (value === false) return 'No';
    if (value === null || value === undefined || value === '') return null;
    if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join(', ');
    if (typeof value === 'object') return null;
    return value;
  };
  const stageSection = (title, subtitle, items, tint = '#64748b', countLabel = 'datos') => {
    const hiddenInProduction = /precio|total|margen|anticipo|importe|cotizad|valoración inicial/i;
    const visibleItems = items.filter(([label, value]) =>
      (!productionMode || !hiddenInProduction.test(label)) && displayValue(value) !== null
    );
    if (!visibleItems.length) return null;
    return (
      <details style={{ marginTop:'0.7rem', background:'#fff', border:'1px solid #e6e9ee', borderRadius:'14px', overflow:'hidden' }}>
        <summary style={{ display:'flex', alignItems:'center', gap:'0.85rem', padding:'1rem 1.1rem', cursor:'pointer', listStyle:'none' }}>
          <span aria-hidden="true" style={{ width:'4px', alignSelf:'stretch', minHeight:'34px', borderRadius:'10px', background:tint }} />
          <span style={{ minWidth:0, flex:1 }}>
            <span style={{ display:'block', color:'#1d4f91', fontWeight:750, fontSize:'0.97rem' }}>{title}</span>
            <span style={{ display:'block', marginTop:'0.22rem', color:'#536b87', fontSize:'0.76rem' }}>{subtitle}</span>
          </span>
          <span style={{ flex:'none', padding:'0.28rem 0.55rem', borderRadius:'20px', background:'#eaf2ff', color:'#1d4f91', fontSize:'0.7rem', fontWeight:750 }}>{visibleItems.length} {countLabel}</span>
          <span aria-hidden="true" style={{ color:'#7a8492', fontSize:'1rem' }}>⌄</span>
        </summary>
        <div style={{ padding:'0 1.1rem 1.1rem', borderTop:'1px solid #f0f2f5' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 235px), 1fr))', gap:'0.6rem', paddingTop:'0.85rem' }}>
            {visibleItems.map(([label, value]) => chip(label, displayValue(value)))}
          </div>
        </div>
      </details>
    );
  };

  const estimationData = parseStoredJson(prospect.estimation_data, {}) || {};
  const restorationRows = parseStoredJson(prospect.restoration_details, []);
  const restorations = Array.isArray(restorationRows)
    ? restorationRows.map((item) => [item.type || 'Restauración', item.measurements || item.details]).filter(([, value]) => value)
    : [];
  const valuationData = parseStoredJson(prospect.valuation_data, {});
  const valuationIsStructured = typeof prospect.valuation_data === 'string'
    && /^[\s]*[\[{]/.test(prospect.valuation_data);
  const restorationIsStructured = typeof prospect.restoration_details === 'string'
    && /^[\s]*[\[{]/.test(prospect.restoration_details);
  const valuationSheets = Array.isArray(valuationData?.sheets)
    ? valuationData.sheets
    : valuationData && (valuationData.materials || valuationData.labor || valuationData.concepts)
      ? [{ type: valuationData.projectType || 'Proyecto', materials: valuationData.materials || [], labor: valuationData.labor || [], concepts: valuationData.concepts || [] }]
      : [];
  const valuationSummary = valuationSheets.map((sheet) => ({
    type: sheet.type || 'Proyecto',
    groups: [
      ['Materiales', sheet.materials || []],
      ['Mano de obra', sheet.labor || []],
      ['Conceptos', sheet.concepts || []]
    ].map(([label, rows]) => ({
      label,
      rows: rows.filter((row) => Number(row.qty) > 0).map((row) => ({
        description: row.desc || 'Concepto',
        qty: Number(row.qty) || 0,
        unit: row.unit || 'pza',
        amount: (Number(row.qty) || 0) * (Number(row.price) || 0)
      }))
    })).filter((group) => group.rows.length)
  }));
  const valuationGrandTotal = Number(valuationData?.grandTotal ?? valuationData?.totalToPay) || 0;
  const projectDetails = estimationData.projectDetails || {};
  const estimationSheets = Array.isArray(estimationData.sheets) ? estimationData.sheets : [];
  const imageList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap(imageList);
    if (typeof value === 'object') {
      return Object.values(value).flatMap(imageList);
    }
    if (typeof value !== 'string') return [];
    if (value.startsWith('data:')) return [value];
    return value.split(',').map(image => image.trim()).filter(Boolean);
  };
  const countFiles = (value) => imageList(value).length;
  const estimationImages = imageList(estimationData.photos);
  const quotationImages = [
    prospect.quote_image_1, prospect.quote_image_2, prospect.quote_image_3, prospect.quote_image_4
  ].flatMap(imageList);
  const estimationPhotoCount = countFiles(estimationData.croquisPhotos) + estimationImages.length + (estimationData.croquis_data ? 1 : 0);
  const photosCount = [
    prospect.space_image_path,
    prospect.reference_image_path || prospect.design_image_path,
    prospect.render_image_path,
    prospect.contract_photo_client,
    prospect.contract_photo_rep,
    prospect.contract_signature_client,
    prospect.contract_signature_rep
  ].reduce((total, files) => total + countFiles(files), 0) + estimationPhotoCount + quotationImages.length;
  const estimationSheetItems = estimationSheets.map((sheet, index) => {
    const sections = productionMode ? ['materials'] : ['materials', 'labor', 'concepts'];
    const rows = sections.flatMap((section) => sheet[section] || []);
    const breakdown = rows.map((row) => {
      const quantity = row.qty ? ` × ${row.qty}` : '';
      const unit = row.unit ? ` ${row.unit}` : '';
      const price = !productionMode && row.price !== null && row.price !== undefined && row.price !== ''
        ? ` (${formatCurrency(Number(row.price))})`
        : '';
      return `${row.desc || 'Concepto'}${quantity}${unit}${price}`;
    }).join('; ');
    return [`Proyecto ${index + 1} · ${sheet.type || 'Sin nombre'}`, breakdown || 'Sin conceptos capturados'];
  });
  const prospectItems = [
    ['Fecha de registro', prospect.capture_date ? fmtDate(prospect.capture_date) : null],
    ['Cliente', prospect.name],
    ['Contacto', prospect.contact_info],
    ['Ubicación / domicilio', prospect.location],
    ['Tipo de proyecto', prospect.project_type],
    ['Otro tipo de proyecto', prospect.project_type_other],
    ['Casa habitada', prospect.inhabited_house],
    ['Cómo nos encontró', prospect.how_found],
    ['Prioridades', prospect.project_priorities],
    ['Expectativas', prospect.expectations],
    ['Diseño existente', prospect.has_design],
    ['Detalles de diseño', prospect.design_details],
    ['Estado al pasar a contrato', prospect.status],
    ['Material principal', prospect.material_type],
    ['Material secundario', prospect.material_type_2],
    ['Color de mobiliario', prospect.furniture_color],
    ['Color interior', [prospect.interior_color_type, prospect.interior_color_code].filter(Boolean).join(' · ')],
    ['Color inferior exterior', [prospect.exterior_inf_color_type, prospect.exterior_inf_color_code].filter(Boolean).join(' · ')],
    ['Color superior exterior', [prospect.exterior_sup_color_type, prospect.exterior_sup_color_code].filter(Boolean).join(' · ')],
    ['Encimera', prospect.countertop_type],
    ['Herrajes', prospect.hardware_details],
    ['Inicio solicitado', prospect.start_date],
    ['Entrega solicitada', prospect.delivery_date],
    ['Plazo solicitado', prospect.project_timeline],
    ['Días de producción', prospect.production_days],
    ['Precio de valoración', prospect.estimated_price],
    ['Medidas generales', prospect.measurements],
    ['Distribución de cocina', prospect.kitchen_layout],
    ['Complementos de cocina', prospect.kitchen_addons],
    ['Medidas de cocina', prospect.kitchen_measurements],
    ['Medidas de isla', prospect.kitchen_island_measurements],
    ['Medidas de península', prospect.kitchen_peninsula_measurements],
    ['Distribución de clóset', prospect.closet_layout],
    ['Complementos de clóset', prospect.closet_addons],
    ['Medidas de clóset', prospect.closet_measurements],
    ['Medidas de isla de clóset', prospect.closet_island_measurements],
    ['Medidas de tocador', prospect.closet_vanity_measurements],
    ['Medidas de puertas sólidas', prospect.door_solid_measurements],
    ['Medidas de puertas tambor', prospect.door_tambor_measurements],
    ['Restauraciones capturadas', restorations.length ? restorations.map(([type, measurements]) => `${type}: ${measurements}`).join('\n') : null],
    ['Medidas de restauración', prospect.restoration_measurements],
    ['Otras medidas', prospect.other_measurements],
    ['Notas originales', prospect.valuation_data && !valuationIsStructured && valuationSheets.length === 0 ? prospect.valuation_data : null],
    ['Detalles de restauración', prospect.restoration_details && !restorationIsStructured && restorations.length === 0 ? prospect.restoration_details : null]
  ];

  const generatePassword = async () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let pwd = '';
    for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    try {
      await fetch(`${API}/api/prospects/${prospect.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_password: pwd })
      });
      // Actualizar estado local inmediatamente para reflejar en UI
      setLocalProspect(prev => ({ ...prev, contract_password: pwd }));
      if (onRefresh) onRefresh();
      alert(`Nueva contraseña guardada: ${pwd}`);
    } catch (e) {
      alert('Error al generar contraseña');
    }
  };

  return (
    <div style={{ marginBottom:'2rem', padding:'1.1rem', background:'#f4f6f8', border:'1px solid #e8ebef', borderRadius:'18px', color:'#202938' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem', flexWrap:'wrap', gap:'0.5rem' }}>
        <h3 style={{ color:'var(--accent)', margin:0, fontSize:'1.15rem' }}>{prospect.name}</h3>
        <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
          <button onClick={onBack} style={{ padding:'0.3rem 0.75rem', fontSize:'0.8rem', backgroundColor:'#eee', border:'none', borderRadius:'6px', cursor:'pointer' }}>Volver</button>
          {productionMode && <button onClick={onReturnToClients} style={{ padding:'0.3rem 0.75rem', fontSize:'0.8rem', backgroundColor:'#fff7ed', color:'#c2410c', border:'1px solid #fed7aa', borderRadius:'6px', cursor:'pointer', fontWeight:'700' }}>↩ Regresar a Clientes y reabrir contrato</button>}
          {!productionMode && <button onClick={onEstimacion} style={{ padding:'0.3rem 0.75rem', fontSize:'0.8rem', backgroundColor:'#3b82f6', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', display:'flex', alignItems:'center', gap:'0.35rem' }}>
            <IconPenTool style={{ width:'14px', height:'14px', marginRight:0 }} /> Estimación
          </button>}
          {!productionMode && <button onClick={onDownloadCotizacion} style={{ padding:'0.3rem 0.75rem', fontSize:'0.8rem', backgroundColor:'#10b981', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', display:'flex', alignItems:'center', gap:'0.35rem' }}>
            <IconFileText style={{ width:'14px', height:'14px', marginRight:0 }} /> Descargar Cotización
          </button>}
          {!productionMode && <button onClick={() => onStartProduction(prospect)} style={{ padding:'0.3rem 0.75rem', fontSize:'0.8rem', backgroundColor:'#1d4ed8', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold' }}>
            🏭 {prospect.production_data ? 'Ver Producción' : 'Enviar a Producción'}
          </button>}
          {!productionMode && <button onClick={onReturnToProspect} style={{ padding:'0.3rem 0.75rem', fontSize:'0.8rem', backgroundColor:'#dc2626', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold' }}>↩️ Regresar a Prospecto</button>}
        </div>
      </div>

      {/* ── Contraseña del contrato ── */}
      <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'0.85rem', padding:'0.9rem 1rem', backgroundColor:'#fff', border:'1px solid #e6e9ee', borderRadius:'14px', flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:'1.5rem', alignItems:'center', flex:1, flexWrap:'wrap' }}>
          <div>
            <p style={{ fontSize:'0.65rem', color:'#8993a1', margin:'0 0 0.2rem', textTransform:'uppercase', fontWeight:'700', letterSpacing:'0.06em' }}>ID del contrato</p>
            <p style={{ fontWeight:700, fontSize:'0.96rem', color:'#202938', margin:0, letterSpacing:'0.04em' }}>{prospect.public_id}</p>
          </div>
          <div style={{ width:'1px', height:'32px', background:'#bbf7d0' }} />
          <div>
            <p style={{ fontSize:'0.65rem', color:'#8993a1', margin:'0 0 0.2rem', textTransform:'uppercase', fontWeight:'700', letterSpacing:'0.06em' }}>Contraseña de acceso</p>
            <p style={{ fontWeight:700, fontSize:'1rem', color: prospect.contract_password ? '#202938' : '#94a3b8', margin:0, letterSpacing:'0.1em', fontFamily:'monospace' }}>
              {prospect.contract_password || '— Sin contraseña —'}
            </p>
          </div>
        </div>
        {!productionMode && <button onClick={generatePassword}
          style={{ padding:'0.4rem 0.9rem', background:'#16a34a', color:'white', border:'none', borderRadius:'7px', cursor:'pointer', fontWeight:'800', fontSize:'0.8rem', whiteSpace:'nowrap' }}>
          🔄 Nueva Contraseña
        </button>}
      </div>

      {stageSection('Prospecto', 'Captura inicial y valoración', prospectItems, '#3973c6')}
      {!productionMode && valuationSummary.length > 0 && (
        <details style={{ marginTop:'0.7rem', background:'#fff', border:'1px solid #e6e9ee', borderRadius:'14px', overflow:'hidden' }}>
          <summary style={{ display:'flex', alignItems:'center', gap:'0.85rem', padding:'1rem 1.1rem', cursor:'pointer', listStyle:'none', background:'#f5f9ff' }}>
            <span aria-hidden="true" style={{ width:'4px', alignSelf:'stretch', minHeight:'34px', borderRadius:'10px', background:'#2563a8' }} />
            <span style={{ minWidth:0, flex:1 }}>
              <span style={{ display:'block', color:'#1d4f91', fontWeight:750, fontSize:'0.97rem' }}>Valoración inicial</span>
              <span style={{ display:'block', marginTop:'0.22rem', color:'#536b87', fontSize:'0.76rem' }}>Desglose capturado en Prospectos</span>
            </span>
            <span style={{ flex:'none', padding:'0.28rem 0.55rem', borderRadius:'20px', background:'#eaf2ff', color:'#1d4f91', fontSize:'0.7rem', fontWeight:750 }}>
              {valuationSummary.length} {valuationSummary.length === 1 ? 'proyecto' : 'proyectos'}
            </span>
            <span aria-hidden="true" style={{ color:'#7a8492', fontSize:'1rem' }}>⌄</span>
          </summary>
          <div style={{ padding:'0.2rem 1.1rem 1.1rem', borderTop:'1px solid #f0f2f5' }}>
            {valuationSummary.map((sheet, index) => {
              const sheetTotal = sheet.groups.flatMap(group => group.rows).reduce((total, row) => total + row.amount, 0);
              return (
                <section key={`${sheet.type}-${index}`} style={{ marginTop:'0.8rem', padding:'0.9rem', background:'#fbfcfe', border:'1px solid #e4ebf3', borderRadius:'12px' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.75rem', flexWrap:'wrap', marginBottom:'0.6rem' }}>
                    <h5 style={{ margin:0, color:'#1d4f91', fontSize:'0.92rem' }}>{sheet.type}</h5>
                    <span style={{ color:'#1d4f91', fontSize:'0.82rem', fontWeight:750 }}>{formatCurrency(sheetTotal)}</span>
                  </div>
                  {sheet.groups.map((group) => (
                    <div key={group.label} style={{ marginTop:'0.65rem' }}>
                      <h6 style={{ margin:'0 0 0.4rem', color:'#315f96', fontSize:'0.69rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>{group.label}</h6>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(100%, 215px), 1fr))', gap:'0.45rem' }}>
                        {group.rows.map((row, rowIndex) => (
                          <div key={`${row.description}-${rowIndex}`} style={{ minWidth:0, display:'flex', flexDirection:'column', justifyContent:'space-between', gap:'0.6rem', padding:'0.65rem 0.75rem', background:'#fff', border:'1px solid #e5ebf2', borderRadius:'9px', fontSize:'0.8rem' }}>
                            <span style={{ color:'#354052', fontWeight:600, lineHeight:1.4, overflowWrap:'anywhere' }}>{row.description}</span>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.5rem' }}>
                              <span style={{ color:'#315f96', whiteSpace:'nowrap', fontSize:'0.74rem', fontWeight:650 }}>{row.qty} {row.unit}</span>
                              <span style={{ color:'#1d4f91', fontWeight:750, whiteSpace:'nowrap' }}>{formatCurrency(row.amount)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              );
            })}
            {valuationGrandTotal > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', gap:'1rem', marginTop:'0.8rem', padding:'0.75rem 0.2rem 0', borderTop:'1px solid #e6e9ee', color:'#202938', fontSize:'0.86rem', fontWeight:700 }}>
                <span>Total de valoración</span>
                <span>{formatCurrency(valuationGrandTotal)}</span>
              </div>
            )}
          </div>
        </details>
      )}
      {prospect.papelera_reason && (
        <div style={{ marginTop:'0.6rem', padding:'0.75rem 1rem', backgroundColor:'#fef2f2', border:'1px solid #fca5a5', borderRadius:'8px' }}>
          <p style={{ fontSize:'0.7rem', color:'#dc2626', margin:'0 0 0.3rem', textTransform:'uppercase', fontWeight:'800', letterSpacing:'0.06em' }}>❌ Motivo de Rechazo</p>
          <p style={{ fontSize:'0.88rem', color:'#7f1d1d', margin:0, lineHeight:'1.5' }}>{prospect.papelera_reason}</p>
        </div>
      )}
      {stageSection('Cotización', 'Información del cotizador', [
        ['Saludo', prospect.quote_saludo],
        ['Título', prospect.quote_title],
        ['Descripción / observaciones', prospect.quote_description],
        ['Total cotizado', prospect.quote_total_price],
        ['Anticipo acordado', prospect.quote_anticipo],
        ['Tiempo de entrega cotizado', prospect.quote_delivery_time],
        ['Vigencia de cotización', prospect.quote_validez],
        ['Precio de valoración inicial', prospect.estimated_price]
      ], '#168b8b')}
      {stageSection('Estimación', 'Proyectos, importes y ajustes guardados', [
        ['Plazo rectificado', projectDetails.project_timeline],
        ['Días de producción rectificados', projectDetails.production_days],
        ['Inicio rectificado', projectDetails.start_date],
        ['Entrega rectificada', projectDetails.delivery_date],
        ['Precio rectificado', projectDetails.estimated_price],
        ['Margen', estimationData.margin],
        ['Anticipo configurado', estimationData.anticipoPct ? `${estimationData.anticipoPct}%` : null],
        ['Total calculado', estimationData.totalWithMargin ? formatCurrency(Number(estimationData.totalWithMargin)) : null],
        ['Unidad de cotización', estimationData.unit],
        ['Fecha de entrega calculada', estimationData.estimatedDeliveryDate],
        ['Medidas de estimación', estimationData.measures],
        ['Observaciones de estimación', estimationData.obsText],
        ['Hojas / proyectos cotizados', estimationSheets.length || null],
        ...estimationSheetItems
      ], '#7762b3')}
      {stageSection('Contrato', 'Acuerdos de la etapa de cliente', [
        ['Fecha de contrato', prospect.contract_date ? fmtDate(prospect.contract_date) : null],
        ['Estado actual', prospect.status],
        ['Render incluido', prospect.render_applies],
        ['Precio del render', prospect.render_price],
        ['Total con render', prospect.render_total_price],
        ['Entrega del render', prospect.render_delivery_time],
        ['Observaciones del render', prospect.render_comments]
      ], '#478365')}
      {photosCount > 0 && (
        <button type="button" onClick={() => setShowPhotos(value => !value)}
          aria-expanded={showPhotos}
          style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', marginTop:'0.8rem', padding:'0.7rem 0.9rem', background:'#f8fafc', border:'1px solid #cbd5e1', borderRadius:'10px', color:'#334155', cursor:'pointer', fontWeight:700, textAlign:'left' }}>
          <span>{showPhotos ? 'Ocultar fotos y evidencias' : 'Ver fotos y evidencias'} <span style={{ color:'#64748b', fontWeight:500 }}>({photosCount})</span></span>
          <span aria-hidden="true">{showPhotos ? '−' : '+'}</span>
        </button>
      )}
      {photosCount > 0 && (
        <div style={{ marginTop:'0.6rem' }}>

          {/* ── FOTOS ─── */}
          {showPhotos && <div style={{ padding:'0.6rem 0.75rem', backgroundColor:'#f8f9fa', borderRadius:'12px', border:'1px solid #e2e8f0' }}>
            {/* Encabezado que diferencia el origen de datos */}
            <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.6rem', flexWrap:'wrap' }}>
              <span style={{ fontSize:'0.68rem', color:'#94a3b8', textTransform:'uppercase', fontWeight:'700' }}>Diseño y Fotos del Proyecto</span>
              <span style={{ fontSize:'0.6rem', padding:'2px 8px', borderRadius:'20px', background:'#dbeafe', color:'#1d4ed8', fontWeight:'700' }}>📋 Captura Prospecto</span>
              {prospect.render_image_path && <span style={{ fontSize:'0.6rem', padding:'2px 8px', borderRadius:'20px', background:'#dcfce7', color:'#166534', fontWeight:'700' }}>🎨 Render — Etapa Contrato</span>}
            </div>

            {prospect.design_details && <p style={{ marginBottom:'0.6rem', fontSize:'0.82rem', color:'#334155' }}>{prospect.design_details}</p>}

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1rem' }}>
              
              {/* Foto del Espacio */}
              {prospect.space_image_path && (
                <div style={{ border:'2px solid #bfdbfe', borderRadius:'10px', overflow:'hidden', backgroundColor:'white' }}>
                  <div style={{ padding:'10px 12px', fontSize:'0.85rem', fontWeight:'800', color:'#1d4ed8', backgroundColor:'#dbeafe', textAlign:'center', letterSpacing:'0.02em' }}>
                    🏠 Foto del Espacio
                  </div>
                  <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', padding:'6px' }}>
                    {imageList(prospect.space_image_path).map((imgPath, idx) => (
                      <img key={idx} src={imgPath.trim().startsWith('http') ? imgPath.trim() : `${API}${imgPath.trim()}`}
                        alt={`Espacio ${idx + 1}`} style={{ flex:'1 1 45%', width:'100%', height:'auto', borderRadius:'6px', objectFit:'cover' }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Foto de Referencia */}
              {(prospect.reference_image_path || prospect.design_image_path) && (
                <div style={{ border:'2px solid #fed7aa', borderRadius:'10px', overflow:'hidden', backgroundColor:'white' }}>
                  <div style={{ padding:'10px 12px', fontSize:'0.85rem', fontWeight:'800', color:'#c2410c', backgroundColor:'#fff7ed', textAlign:'center', letterSpacing:'0.02em' }}>
                    💡 Foto de Referencia
                  </div>
                  <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', padding:'6px' }}>
                    {imageList(prospect.reference_image_path || prospect.design_image_path).map((imgPath, idx) => (
                      <img key={idx} src={imgPath.trim().startsWith('http') ? imgPath.trim() : `${API}${imgPath.trim()}`}
                        alt={`Referencia ${idx + 1}`} style={{ flex:'1 1 45%', width:'100%', height:'auto', borderRadius:'6px', objectFit:'cover' }} />
                    ))}
                  </div>
                </div>
              )}

              {estimationImages.length > 0 && (
                <div style={{ border:'1px solid #ddd6fe', borderRadius:'10px', overflow:'hidden', backgroundColor:'white' }}>
                  <div style={{ padding:'10px 12px', fontSize:'0.82rem', fontWeight:700, color:'#6d28d9', backgroundColor:'#f5f3ff', textAlign:'center' }}>
                    Fotos de estimación
                  </div>
                  <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', padding:'8px' }}>
                    {estimationImages.map((image, idx) => (
                      <img key={idx} src={image.startsWith('http') || image.startsWith('data:') ? image : `${API}${image}`}
                        alt={`Estimación ${idx + 1}`} style={{ flex:'1 1 45%', width:'100%', height:'auto', borderRadius:'6px', objectFit:'cover' }} />
                    ))}
                  </div>
                </div>
              )}

              {quotationImages.length > 0 && (
                <div style={{ border:'1px solid #a5f3fc', borderRadius:'10px', overflow:'hidden', backgroundColor:'white' }}>
                  <div style={{ padding:'10px 12px', fontSize:'0.82rem', fontWeight:700, color:'#0e7490', backgroundColor:'#ecfeff', textAlign:'center' }}>
                    Imágenes de cotización
                  </div>
                  <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', padding:'8px' }}>
                    {quotationImages.map((image, idx) => (
                      <img key={idx} src={image.startsWith('http') || image.startsWith('data:') ? image : `${API}${image}`}
                        alt={`Cotización ${idx + 1}`} style={{ flex:'1 1 45%', width:'100%', height:'auto', borderRadius:'6px', objectFit:'cover' }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Imágenes de Render */}
              {prospect.render_image_path && (
                <div style={{ border:'2px solid #86efac', borderRadius:'10px', overflow:'hidden', backgroundColor:'white' }}>
                  <div style={{ padding:'10px 12px', fontSize:'0.85rem', fontWeight:'800', color:'#166534', backgroundColor:'#dcfce7', textAlign:'center', letterSpacing:'0.02em' }}>
                    🎨 Imágenes de Render
                  </div>
                  <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', padding:'6px' }}>
                    {imageList(prospect.render_image_path).map((imgPath, idx) => {
                      let url = imgPath.trim().startsWith('http') ? imgPath.trim() : `${API}${imgPath.trim()}`;
                      if (url.includes('res.cloudinary.com') && url.toLowerCase().endsWith('.pdf')) {
                        url = url.substring(0, url.length - 4) + '.jpg';
                      }
                      return (
                        <img key={idx} src={url}
                          alt={`Render ${idx + 1}`} style={{ flex:'1 1 45%', width:'100%', height:'auto', borderRadius:'6px', objectFit:'cover' }} />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fotos y Firmas de Contrato */}
              {(prospect.contract_photo_client || prospect.contract_photo_rep || prospect.contract_signature_client || prospect.contract_signature_rep) && (
                <div style={{ border:'2px solid #a855f7', borderRadius:'10px', overflow:'hidden', backgroundColor:'white' }}>
                  <div style={{ padding:'10px 12px', fontSize:'0.85rem', fontWeight:'800', color:'#7e22ce', backgroundColor:'#f3e8ff', textAlign:'center', letterSpacing:'0.02em' }}>
                    📝 Evidencias y Firmas de Contrato
                  </div>
                  <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', padding:'6px' }}>
                    {prospect.contract_photo_rep && <img src={prospect.contract_photo_rep} alt="Evidencia RD Carpintería" style={{ flex:'1 1 45%', width:'100%', height:'auto', borderRadius:'6px', objectFit:'cover' }} />}
                    {prospect.contract_photo_client && <img src={prospect.contract_photo_client} alt="Evidencia Cliente" style={{ flex:'1 1 45%', width:'100%', height:'auto', borderRadius:'6px', objectFit:'cover' }} />}
                    {prospect.contract_signature_rep && <img src={prospect.contract_signature_rep} alt="Firma RD Carpintería" style={{ flex:'1 1 45%', width:'100%', height:'auto', borderRadius:'6px', objectFit:'contain', backgroundColor:'#f8fafc' }} />}
                    {prospect.contract_signature_client && <img src={prospect.contract_signature_client} alt="Firma Cliente" style={{ flex:'1 1 45%', width:'100%', height:'auto', borderRadius:'6px', objectFit:'contain', backgroundColor:'#f8fafc' }} />}
                  </div>
                </div>
              )}
            </div>
          </div>}
        </div>
      )}

      {/* ── CROQUIS DIBUJADOS ── */}
      {showPhotos && (() => {
        if (!prospect.estimation_data) return null;
        try {
          const d = typeof prospect.estimation_data === 'string' ? JSON.parse(prospect.estimation_data) : prospect.estimation_data;
          const hasPhotos = d.croquisPhotos && d.croquisPhotos.length > 0;
          const hasData = !!d.croquis_data;
          if (!hasPhotos && !hasData) return null;
          return (
            <div style={{ padding:'0.6rem 0.75rem', backgroundColor:'#f8f9fa', borderRadius:'12px', border:'1px solid #e2e8f0', marginTop: '0.8rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.6rem' }}>
                <span style={{ fontSize:'0.68rem', color:'#94a3b8', textTransform:'uppercase', fontWeight:'700' }}>✏️ Croquis de Estimación</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1rem' }}>
                {hasPhotos && (
                  <div style={{ border:'2px solid #cbd5e1', borderRadius:'10px', overflow:'hidden', backgroundColor:'white' }}>
                    <div style={{ padding:'8px', fontSize:'0.85rem', fontWeight:'800', color:'#475569', backgroundColor:'#f1f5f9', textAlign:'center' }}>
                      📸 Dibujos Capturados
                    </div>
                    <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', padding:'6px' }}>
                      {d.croquisPhotos.map((img, idx) => (
                        <img key={idx} src={img} alt={`Croquis ${idx+1}`} style={{ flex:'1 1 45%', width:'100%', height:'auto', borderRadius:'6px', objectFit:'cover', border:'1px solid #e2e8f0' }} />
                      ))}
                    </div>
                  </div>
                )}
                {hasData && (
                  <div style={{ border:'2px solid #cbd5e1', borderRadius:'10px', overflow:'hidden', backgroundColor:'white' }}>
                    <div style={{ padding:'8px', fontSize:'0.85rem', fontWeight:'800', color:'#475569', backgroundColor:'#f1f5f9', textAlign:'center' }}>
                      ✏️ Lienzo Actual
                    </div>
                    <div style={{ padding:'6px' }}>
                      <img src={d.croquis_data} alt="Lienzo" style={{ width:'100%', height:'auto', borderRadius:'6px', objectFit:'contain', border:'1px solid #e2e8f0', background:'#fff' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        } catch { return null; }
      })()}


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
export default function Contratos({ startView = 'list', onProductionStarted = () => {} }) {
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
      setContratos(data.filter(p => p.is_contract && !['PRODUCCION', 'ENTREGADO'].includes(p.status)));
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
      body: JSON.stringify({ is_contract:false, contract_date:null, has_quote:false, status:'Valoración' })
    });
    fetchContratos();
    setView('list');
    setSelected(null);
  };

  const handleStartProduction = async (p) => {
    let productionData = p.production_data;
    if (!productionData) {
      const now = new Date().toISOString();
      productionData = JSON.stringify({
        current_stage: 0,
        started_at: now,
        stages: [
          'Producción / Generando información',
          'Preparación de materiales',
          'Producción iniciada',
          'Avance 1',
          'Avance 2 / revisión',
          'Entrega del proyecto'
        ].map((name, index) => ({
          name,
          entered_at: index === 0 ? now : null,
          note: '',
          photos: []
        }))
      });
    }
    try {
      const response = await fetch(`${API}/api/prospects/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ production_data: productionData, status: 'PRODUCCION' })
      });
      if (!response.ok) throw new Error(`No se pudo enviar a Producción (${response.status})`);
      const updated = await response.json();
      setContratos(current => current.map(item => item.id === updated.id ? updated : item));
      setSelected(updated);
      onProductionStarted();
    } catch (error) {
      console.error(error);
      window.alert(error.message || 'No se pudo iniciar Producción.');
    }
  };

  // ── Views ──
  if (view === 'contrato_pdf' && selected) {
    return (
      <ContratoPDFView 
        prospect={selected} 
        onBack={() => { setView('list'); setSelected(null); }} 
        onSaveStatus={async () => {
          const response = await fetch(`${API}/api/prospects/${selected.id}`, {
            method: 'PUT', headers:{'Content-Type':'application/json'}, 
            body: JSON.stringify({ status: 'CONTRATO' }) 
          });
          if (!response.ok) throw new Error(`No se pudo guardar el contrato (${response.status})`);
          fetchContratos();
        }} 
      />
    );
  }

  if (view === 'cotizacion_view' && selected) {
    return (
      <div style={{ padding:'1rem' }}>
        <CotizacionView prospect={selected} onBack={() => { setView('detail'); fetchContratos(); }} />
      </div>
    );
  }

  if (view === 'detail' && selected) {
    return (
      <div style={{ padding:'1rem' }}>
        <ContratoDetail
          prospect={selected}
          onBack={() => { setView('list'); setSelected(null); }}
          onEstimacion={() => setView('estimacion')}
          onDownloadCotizacion={() => setView('cotizacion_view')}
          onReturnToProspect={() => handleReturnToProspect(selected)}
          onStartProduction={handleStartProduction}
          onRefresh={async () => {
            // Recargar lista de contratos y actualizar el selected con datos frescos del servidor
            const res = await fetch(`${API}/api/prospects`);
            const data = await res.json();
            const freshContratos = data.filter(p => p.is_contract && !['PRODUCCION', 'ENTREGADO'].includes(p.status));
            setContratos(freshContratos);
            const freshSelected = freshContratos.find(p => p.id === selected.id);
            if (freshSelected) setSelected(freshSelected);
          }}
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
    }} onSaveSuccess={() => {
      setView('list');
      setSelected(null);
      fetchContratos();
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

  const getStatus = (c) => {
    const validStates = ['APROBADO', 'RENDER SI/NO', 'ESTIMACIÓN', 'CONTRATO', 'CONTRATO PENDIENTE'];
    if (c.status && validStates.includes(c.status)) return c.status;
    return 'APROBADO';
  };

  const filtered = contratos.filter(c => {
    if (txt && !((c.name||'').toLowerCase().includes(txt) || (c.public_id||'').toLowerCase().includes(txt) || (c.contact_info||'').toLowerCase().includes(txt) || (c.project_type||'').toLowerCase().includes(txt))) return false;
    if (filterType && c.project_type !== filterType) return false;
    if (filterStatus === 'CONTRATO') return ['CONTRATO', 'CONTRATO PENDIENTE'].includes(getStatus(c));
    if (filterStatus && getStatus(c) !== filterStatus) return false;
    return true;
  });
  const typeOptions = [...new Set(contratos.map(c => c.project_type).filter(Boolean))];
  const fmtDate = (d) => d ? new Date(d + (d.endsWith('Z') ? '' : 'Z')).toLocaleDateString('es-MX', { timeZone:'America/Tijuana', day:'2-digit', month:'2-digit', year:'numeric' }) : '-';

  const statusBadge = (s) => {
    const isAprobado   = s === 'APROBADO';
    const isRender     = s === 'RENDER SI/NO';
    const isEstimacion = s === 'ESTIMACIÓN';
    const isContrato   = s === 'CONTRATO';
    const isContractPending = s === 'CONTRATO PENDIENTE';
    const isProduction = s === 'PRODUCCION';
    const isDelivered  = s === 'ENTREGADO';
    let label = s || 'APROBADO';
    let bg = '#dcfce7'; let color = '#166534'; let dot = '#22c55e';
    if (isRender)     { bg = '#fef3c7'; color = '#92400e'; dot = '#f59e0b'; }
    else if (isEstimacion) { bg = '#e0e7ff'; color = '#3730a3'; dot = '#4f46e5'; }
    else if (isContrato)   { bg = '#fce7f3'; color = '#9d174d'; dot = '#ec4899'; }
    else if (isContractPending) { label = 'CONTRATO PENDIENTE'; bg = '#fff7ed'; color = '#c2410c'; dot = '#f97316'; }
    else if (isProduction) { label = 'PRODUCCIÓN'; bg = '#dbeafe'; color = '#1d4ed8'; dot = '#2563eb'; }
    else if (isDelivered)  { label = 'ENTREGADO'; bg = '#dcfce7'; color = '#166534'; dot = '#16a34a'; }
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
            <h3 style={{ margin:'0 0 0.4rem', color:'#1e293b', fontSize:'1.15rem', display:'flex', alignItems:'center', gap:'0.45rem' }}>
              <IconPalette style={{ width:'20px', height:'20px', marginRight:0 }} /> ¿Aplica Render?
            </h3>
            <p style={{ color:'#64748b', fontSize:'0.88rem', margin:'0 0 1.4rem' }}>
              <strong>{renderModalFor.name}</strong> · {renderModalFor.project_type}
            </p>

            {/* SI / NO buttons */}
            <div style={{ display:'flex', gap:'1rem', marginBottom:'1.4rem' }}>
              {[{val: true, label:'SÍ — Aplica Render', bg:'#10b981', Icon:IconCheckCircle}, {val: false, label:'NO — Sin Render', bg:'#64748b', Icon:IconXCircle}].map(opt => (
                <button key={String(opt.val)}
                  onClick={() => setRenderApplies(opt.val)}
                  style={{ flex:1, padding:'0.75rem', background: renderApplies === opt.val ? opt.bg : '#f1f5f9',
                    color: renderApplies === opt.val ? 'white' : '#475569',
                    border: `2px solid ${renderApplies === opt.val ? opt.bg : '#e2e8f0'}`,
                    borderRadius:'8px', fontWeight:'700', cursor:'pointer', fontSize:'0.9rem', transition:'all 0.2s',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem' }}>
                  <opt.Icon style={{ width:'16px', height:'16px', marginRight:0 }} /> {opt.label}
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
                        render_image_path: uploadedUrl || renderModalFor.render_image_path || null,
                        render_pdf_path: uploadedPdfUrl || renderModalFor.render_pdf_path || null
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
          <h2 style={{ margin:0, color:'#1e293b', fontSize:'1.4rem', fontWeight:'800', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <IconFileText style={{ width:'22px', height:'22px', marginRight:0 }} /> Clientes
          </h2>
          <p style={{ margin:'0.2rem 0 0', color:'#64748b', fontSize:'0.88rem' }}>Proyectos aprobados y en proceso</p>
        </div>
        <div style={{ background:'#1e293b', color:'white', borderRadius:'10px', padding:'0.5rem 1.2rem', fontWeight:'700', fontSize:'1.1rem' }}>
          {contratos.length} contrato{contratos.length !== 1 ? 's' : ''}
        </div>
      </div>

      
      {/* ── ETAPAS PIPELINE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { key: '', label: 'Todos', count: contratos.length, color: '#475569', bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', icon: IconUsers },
          { key: 'APROBADO',  label: 'Aprobado',  count: contratos.filter(c => getStatus(c) === 'APROBADO').length,  color: '#16a34a', bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', icon: IconCheckCircle },
          { key: 'RENDER SI/NO', label: 'Render SI/NO', count: contratos.filter(c => getStatus(c) === 'RENDER SI/NO').length, color: '#d97706', bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', icon: IconPalette },
          { key: 'ESTIMACIÓN', label: 'Estimación', count: contratos.filter(c => getStatus(c) === 'ESTIMACIÓN').length,  color: '#2563eb', bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', icon: IconPenTool },
          { key: 'CONTRATO', label: 'Contrato', count: contratos.filter(c => ['CONTRATO', 'CONTRATO PENDIENTE'].includes(getStatus(c))).length,  color: '#7c3aed', bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', icon: IconFileText },
        ].map(({ key, label, count, color, bg, icon }) => {
          const isActive = filterStatus === key;
          const StageIcon = icon;
          return (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              style={{
                background: isActive ? bg : 'white',
                border: `1px solid ${isActive ? color : '#e2e8f0'}`,
                borderRadius: '12px',
                padding: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isActive ? `0 4px 12px ${color}22` : '0 1px 3px rgba(0,0,0,0.05)',
                transform: isActive ? 'translateY(-2px)' : 'none',
                minWidth: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <div style={{
                  width: '36px', height: '36px', flexShrink: 0, borderRadius: '10px',
                  background: isActive ? 'rgba(255,255,255,0.5)' : '#f8fafc',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                }}>
                  <StageIcon style={{ width:'20px', height:'20px', marginRight:0, opacity:1 }} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: isActive ? '700' : '600', color: isActive ? color : '#64748b', textAlign: 'left' }}>{label}</span>
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: '800', color: isActive ? color : '#1e293b' }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ background:'#f8fafc', borderRadius:'10px', padding:'1rem', marginBottom:'1.2rem', display:'flex', gap:'1rem', flexWrap:'wrap', alignItems:'flex-end' }}>
        <div style={{ flex:'1 1 220px' }}>
          <label style={{ fontSize:'0.74rem', fontWeight:'700', color:'#64748b', display:'block', marginBottom:'4px' }}>Buscar</label>
          <div style={{ position:'relative' }}>
            <IconSearch style={{ position:'absolute', left:'9px', top:'50%', transform:'translateY(-50%)', width:'15px', height:'15px', marginRight:0, color:'#94a3b8', pointerEvents:'none' }} />
            <input value={filterText} onChange={e => setFilterText(e.target.value)}
              placeholder="Nombre, ID, contacto..."
              style={{ width:'100%', padding:'7px 10px 7px 30px', borderRadius:'7px', border:'1px solid #cbd5e1', fontSize:'0.87rem', boxSizing:'border-box' }} />
          </div>
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
                  <th key={h} style={{
                    padding:'0.6rem 0.8rem', fontSize:'0.82rem', color:'#64748b', fontWeight:'700',
                    ...(h === 'Nombre' ? { position:'sticky', left:0, background:'#fafafa', zIndex:2, boxShadow:'2px 0 4px rgba(0,0,0,0.06)' } : {}),
                    ...(h === 'Acciones' ? { position:'sticky', right:0, background:'#fafafa', zIndex:2, boxShadow:'-2px 0 4px rgba(0,0,0,0.06)' } : {})
                  }}>{h}</th>
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
                  <td style={{ padding:'0.7rem 0.8rem', position:'sticky', left:0, background:'white', zIndex:1, boxShadow:'2px 0 4px rgba(0,0,0,0.06)' }}>
                    <button onClick={() => { setSelected(c); setView('detail'); }}
                      style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontWeight:'600', fontSize:'0.95rem', textDecoration:'underline', padding:0, whiteSpace:'nowrap' }}>
                      {c.name}
                    </button>
                  </td>
                  <td style={{ padding:'0.7rem 0.8rem', fontSize:'0.9rem', color:'#475569' }}>{c.project_type || '-'}</td>
                  <td style={{ padding:'0.7rem 0.8rem', fontSize:'0.9rem' }}>{c.contact_info || '-'}</td>
                  <td style={{ padding:'0.7rem 0.8rem', fontSize:'0.85rem', color:'#64748b' }}>{fmtDate(c.contract_date)}</td>
                  <td style={{ padding:'0.7rem 0.8rem', fontSize:'0.88rem' }}>{c.material_type_2 ? `${c.material_type} + ${c.material_type_2}` : (c.material_type || '-')}</td>
                  <td style={{ padding:'0.7rem 0.8rem' }}>{statusBadge(c.status)}</td>
                  <td style={{ padding:'0.7rem 0.8rem', position:'sticky', right:0, background:'white', zIndex:1, boxShadow:'-2px 0 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap', alignItems:'center' }}>
                      {getStatus(c) === 'CONTRATO' && (
                        <button onClick={() => handleStartProduction(c)} style={{
                          padding:'0.2rem 0.4rem', background:'#1d4ed8', color:'white',
                          border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'700',
                          fontSize:'0.7rem', whiteSpace:'nowrap'
                        }}>
                          🏭 {c.production_data ? 'Producción' : 'Enviar a Producción'}
                        </button>
                      )}
                      {/* Render button - shows on APROBADO, changes color when filled */}
                      { (getStatus(c) === 'APROBADO' || getStatus(c) === 'RENDER SI/NO') && (
                        <button onClick={() => {
                          setRenderModalFor(c);
                          setRenderApplies(c.render_applies ?? null);
                          setRenderPrice(c.render_price ? String(c.render_price) : '');
                        }} style={{
                          padding:'0.2rem 0.4rem',
                          background:'#10b981',
                          color:'white', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'600', fontSize:'0.7rem',
                          transition:'all 0.2s', display:'flex', alignItems:'center', gap:'0.15rem', whiteSpace:'nowrap'
                        }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#059669'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#10b981'}>
                          <><IconPalette style={{ width:'12px', height:'12px', marginRight:0 }} /> Render SI/NO</>
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
                          padding:'0.2rem 0.4rem',
                          background: getStatus(c) === 'APROBADO' ? '#f1f5f9' : '#10b981',
                          color: getStatus(c) === 'APROBADO' ? '#94a3b8' : 'white',
                          border:'none', borderRadius:'4px',
                          cursor: getStatus(c) === 'APROBADO' ? 'not-allowed' : 'pointer',
                          fontWeight:'600', fontSize:'0.7rem',
                          opacity: getStatus(c) === 'APROBADO' ? 0.6 : 1,
                          transition:'all 0.2s', display:'flex', alignItems:'center', gap:'0.15rem', whiteSpace:'nowrap'
                        }}
                        onMouseEnter={e => getStatus(c) === 'APROBADO' ? null : e.currentTarget.style.backgroundColor = '#059669'}
                        onMouseLeave={e => getStatus(c) === 'APROBADO' ? null : e.currentTarget.style.backgroundColor = '#10b981'}>
                        <><IconPenTool style={{ width:'12px', height:'12px', marginRight:0 }} /> Estimación</>
                      </button>
                      
                      {/* Contrato button - disabled until estimation_data is filled */}
                      { (getStatus(c) === 'ESTIMACIÓN' || getStatus(c) === 'CONTRATO' || getStatus(c) === 'CONTRATO PENDIENTE') && (
                        <button
                          disabled={!c.estimation_data}
                          onClick={async () => {
                            if (!c.estimation_data) return;
                            setSelected(c);
                            setView('contrato_pdf');
                          }}
                          title={!c.estimation_data ? 'Debes realizar y guardar la Estimación primero para avanzar a contrato.' : (getStatus(c) === 'CONTRATO' ? 'Ver / Imprimir Contrato' : 'Generar contrato')}
                          style={{ 
                            padding:'0.2rem 0.4rem',
                            background: !c.estimation_data ? '#f1f5f9' : '#10b981',
                            color: !c.estimation_data ? '#94a3b8' : 'white', 
                            border:'none', borderRadius:'4px',
                            cursor: !c.estimation_data ? 'not-allowed' : 'pointer', 
                            fontWeight:'600', fontSize:'0.7rem',
                            opacity: !c.estimation_data ? 0.6 : 1,
                            transition:'all 0.2s', display:'flex', alignItems:'center', gap:'0.15rem', whiteSpace:'nowrap'
                          }}
                          onMouseEnter={e => !c.estimation_data ? null : e.currentTarget.style.backgroundColor = '#059669'}
                          onMouseLeave={e => !c.estimation_data ? null : e.currentTarget.style.backgroundColor = '#10b981'}>
                          <><IconFileText style={{ width:'12px', height:'12px', marginRight:0 }} /> {getStatus(c) === 'CONTRATO PENDIENTE' ? 'Generar contrato' : 'Contrato'}</>
                        </button>
                      )}
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

// ─── Secciones detalladas de medidas por tipo de proyecto ────────

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

const MEASURE_SECTIONS = {
  'Cocina': [
    { key:'espacio', label:'📐 Medidas del Espacio', color:'#1d4ed8', bg:'#eff6ff', fields:[
      { id:'alto_plafon',  label:'Alto piso a plafón',   type:'number', suffix:'cm' },
      { id:'ancho_muro',   label:'Ancho muro principal', type:'number', suffix:'cm' },
      { id:'ancho_izq',    label:'Muro lateral izq.',    type:'number', suffix:'cm' },
      { id:'ancho_der',    label:'Muro lateral der.',    type:'number', suffix:'cm' },
      { id:'prof_bajo',    label:'Prof. mueble bajo',    type:'number', suffix:'cm' },
      { id:'prof_alto',    label:'Prof. mueble alto',    type:'number', suffix:'cm' },
      { id:'zona_trabajo', label:'Estado de muros',      type:'select', options:['Terminado / Pulido','Irregular','Obra Negra'] },
      { id:'ventana',      label:'Medidas ventana',      type:'text', placeholder:'Ej. 120×80 cm' },
      { id:'contactos',    label:'Contactos eléctricos', type:'text', placeholder:'Cant. y ubicación' },
      { id:'agua_drenaje', label:'Agua / Drenaje',       type:'text', placeholder:'Ubicación toma y drenaje' },
      { id:'encimera',     label:'Encimera',             type:'text', placeholder:'Tipo y medidas' },
      { id:'campana',      label:'Campana extractora',   type:'text', placeholder:'Marca / modelo' },
    ]},
    { key:'puertas', label:'🚪 Puertas', color:'#0f766e', bg:'#f0fdfa', fields:[
      { id:'puertas_cant',    label:'Cant. total puertas', type:'number', suffix:'pza' },
      { id:'tipo_puerta',     label:'Tipo de apertura',    type:'select', options:['Abatible','Corrediza','Batiente','Sin puerta'] },
      { id:'p1_alto',         label:'Puerta 1 — Alto',     type:'number', suffix:'cm' },
      { id:'p1_ancho',        label:'Puerta 1 — Ancho',    type:'number', suffix:'cm' },
      { id:'p2_alto',         label:'Puerta 2 — Alto',     type:'number', suffix:'cm' },
      { id:'p2_ancho',        label:'Puerta 2 — Ancho',    type:'number', suffix:'cm' },
      { id:'p3_alto',         label:'Puerta 3 — Alto',     type:'number', suffix:'cm' },
      { id:'p3_ancho',        label:'Puerta 3 — Ancho',    type:'number', suffix:'cm' },
      { id:'herrajes_puertas',label:'Herrajes / Jaladeras',type:'text', placeholder:'Tipo y acabado' },
    ]},
    { key:'cajoneras', label:'🗄️ Cajoneras', color:'#7c3aed', bg:'#faf5ff', fields:[
      { id:'caj_cantidad',    label:'Cant. cajoneras',       type:'number', suffix:'pza' },
      { id:'caj_cajones',     label:'Cajones por cajonera',  type:'number', suffix:'pza' },
      { id:'caj_alto',        label:'Alto cajón',            type:'number', suffix:'cm' },
      { id:'caj_ancho',       label:'Ancho cajón',           type:'number', suffix:'cm' },
      { id:'caj_prof',        label:'Profundidad cajón',     type:'number', suffix:'cm' },
      { id:'caj_corredera',   label:'Tipo corredera',        type:'select', options:['Normal','Cierre suave (soft close)','Sin corredera'] },
      { id:'caj_ubicacion',   label:'Ubicación',             type:'text', placeholder:'Frente, lateral, isla...' },
      { id:'caj_material_int',label:'Material interior cajón',type:'select', options:['MDF','Melamina','Madera sólida','Otro'] },
    ]},
    { key:'materiales', label:'🪵 Materiales y Acabado', color:'#b45309', bg:'#fffbeb', fields:[
      { id:'material_cuerpo', label:'Material cuerpo',   type:'select', options:['MDF','Melamina','Triplay','Madera sólida'] },
      { id:'acabado',         label:'Acabado',           type:'select', options:['Poliuretano','Laca','Natural','Pintado','Foliado'] },
      { id:'color_acabado',   label:'Color / Tono',      type:'text', placeholder:'Nombre o código de color' },
      { id:'herrajes_general',label:'Herrajes generales',type:'text', placeholder:'Bisagras, correderas, etc.' },
      { id:'incluye_zoclo',   label:'Incluye zócalo',    type:'select', options:['Sí','No'] },
      { id:'estilo',          label:'Estilo',            type:'select', options:['Moderno','Clásico','Minimalista','Rústico','Industrial'] },
    ]},
  ],
  'Clóset': [
    { key:'espacio', label:'📐 Medidas del Nicho', color:'#1d4ed8', bg:'#eff6ff', fields:[
      { id:'alto_total',   label:'Alto total',            type:'number', suffix:'cm' },
      { id:'ancho_nicho',  label:'Ancho nicho',           type:'number', suffix:'cm' },
      { id:'profundidad',  label:'Profundidad',           type:'number', suffix:'cm' },
      { id:'cond_nicho',   label:'Condición del nicho',   type:'select', options:['Escuadra perfecta','Irregular / Falsa escuadra','Obra negra'] },
      { id:'num_cuerpos',  label:'Núm. de cuerpos',       type:'number', suffix:'pza' },
      { id:'piso_tipo',    label:'Tipo de piso',          type:'select', options:['Nivelado','Con desnivel','Sin acabado'] },
    ]},
    { key:'puertas', label:'🚪 Puertas', color:'#0f766e', bg:'#f0fdfa', fields:[
      { id:'puertas_cant',    label:'Cant. total puertas', type:'number', suffix:'pza' },
      { id:'tipo_puerta',     label:'Tipo de apertura',    type:'select', options:['Corrediza','Abatible','Plegable','Sin puerta'] },
      { id:'num_hojas',       label:'Núm. de hojas',       type:'number', suffix:'pza' },
      { id:'p1_alto',         label:'Puerta 1 — Alto',     type:'number', suffix:'cm' },
      { id:'p1_ancho',        label:'Puerta 1 — Ancho',    type:'number', suffix:'cm' },
      { id:'p2_alto',         label:'Puerta 2 — Alto',     type:'number', suffix:'cm' },
      { id:'p2_ancho',        label:'Puerta 2 — Ancho',    type:'number', suffix:'cm' },
      { id:'p3_alto',         label:'Puerta 3 — Alto',     type:'number', suffix:'cm' },
      { id:'p3_ancho',        label:'Puerta 3 — Ancho',    type:'number', suffix:'cm' },
      { id:'herrajes_puertas',label:'Herrajes / Jaladeras',type:'text', placeholder:'Tipo y acabado' },
      { id:'riel_tipo',       label:'Tipo de riel',        type:'select', options:['Superior','Inferior','Ambos','N/A'] },
    ]},
    { key:'cajoneras', label:'🗄️ Cajoneras', color:'#7c3aed', bg:'#faf5ff', fields:[
      { id:'caj_cantidad',    label:'Cant. cajoneras',       type:'number', suffix:'pza' },
      { id:'caj_cajones',     label:'Cajones por cajonera',  type:'number', suffix:'pza' },
      { id:'caj_alto',        label:'Alto cajón',            type:'number', suffix:'cm' },
      { id:'caj_ancho',       label:'Ancho cajón',           type:'number', suffix:'cm' },
      { id:'caj_prof',        label:'Profundidad cajón',     type:'number', suffix:'cm' },
      { id:'caj_corredera',   label:'Tipo corredera',        type:'select', options:['Normal','Cierre suave (soft close)','Sin corredera'] },
      { id:'caj_ubicacion',   label:'Ubicación',             type:'text', placeholder:'Frente, lateral, central...' },
      { id:'caj_material_int',label:'Material interior',     type:'select', options:['MDF','Melamina','Madera sólida','Otro'] },
    ]},
    { key:'distribucion', label:'📦 Distribución Interior', color:'#0369a1', bg:'#f0f9ff', fields:[
      { id:'zarzo_cant',      label:'Cant. zarzos',         type:'number', suffix:'pza' },
      { id:'zarzo_alto',      label:'Alto zarzo',           type:'number', suffix:'cm' },
      { id:'zapatero',        label:'Zapatero',             type:'select', options:['Sí — Fijo','Sí — Abatible','No'] },
      { id:'zapatero_medidas',label:'Medidas zapatero',     type:'text', placeholder:'Alto×Ancho cm' },
      { id:'tubo_colgar',     label:'Tubo para colgar',     type:'select', options:['Sí','No'] },
      { id:'tubo_alto',       label:'Alto tubo',            type:'number', suffix:'cm' },
      { id:'espejo',          label:'Espejo',               type:'select', options:['Sí','No'] },
      { id:'luz_led',         label:'Iluminación LED',      type:'select', options:['Sí','No'] },
      { id:'entrepa_cant',    label:'Cant. entrepáños',    type:'number', suffix:'pza' },
      { id:'colgador_acces',  label:'Accesorios colgador',  type:'text', placeholder:'Gravata, cinturón, etc.' },
    ]},
    { key:'materiales', label:'🪵 Materiales y Acabado', color:'#b45309', bg:'#fffbeb', fields:[
      { id:'material_cuerpo', label:'Material cuerpo',  type:'select', options:['MDF','Melamina','Triplay','Madera sólida'] },
      { id:'acabado',         label:'Acabado exterior', type:'select', options:['Poliuretano','Laca','Natural','Pintado','Foliado'] },
      { id:'color_acabado',   label:'Color / Tono',     type:'text', placeholder:'Nombre o código de color' },
      { id:'estilo',          label:'Estilo',           type:'select', options:['Moderno','Clásico','Minimalista','Rústico'] },
    ]},
  ],
  'Puerta': [
    { key:'espacio', label:'📐 Medidas por Vano', color:'#1d4ed8', bg:'#eff6ff', fields:[
      { id:'puertas_cant',   label:'Cant. total puertas',    type:'number', suffix:'pza' },
      { id:'p1_alto',        label:'Puerta 1 — Alto vano',   type:'number', suffix:'cm' },
      { id:'p1_ancho',       label:'Puerta 1 — Ancho vano',  type:'number', suffix:'cm' },
      { id:'p1_espesor',     label:'Puerta 1 — Esp. pared',  type:'number', suffix:'cm' },
      { id:'p1_abatimiento', label:'Puerta 1 — Abatimiento', type:'select', options:['Izquierda','Derecha','Doble hoja'] },
      { id:'p2_alto',        label:'Puerta 2 — Alto vano',   type:'number', suffix:'cm' },
      { id:'p2_ancho',       label:'Puerta 2 — Ancho vano',  type:'number', suffix:'cm' },
      { id:'p2_espesor',     label:'Puerta 2 — Esp. pared',  type:'number', suffix:'cm' },
      { id:'p2_abatimiento', label:'Puerta 2 — Abatimiento', type:'select', options:['Izquierda','Derecha','Doble hoja'] },
      { id:'p3_alto',        label:'Puerta 3 — Alto vano',   type:'number', suffix:'cm' },
      { id:'p3_ancho',       label:'Puerta 3 — Ancho vano',  type:'number', suffix:'cm' },
      { id:'p3_espesor',     label:'Puerta 3 — Esp. pared',  type:'number', suffix:'cm' },
      { id:'p3_abatimiento', label:'Puerta 3 — Abatimiento', type:'select', options:['Izquierda','Derecha','Doble hoja'] },
      { id:'p4_alto',        label:'Puerta 4 — Alto vano',   type:'number', suffix:'cm' },
      { id:'p4_ancho',       label:'Puerta 4 — Ancho vano',  type:'number', suffix:'cm' },
      { id:'p4_abatimiento', label:'Puerta 4 — Abatimiento', type:'select', options:['Izquierda','Derecha','Doble hoja'] },
    ]},
    { key:'tipo', label:'🚪 Tipo y Acabado', color:'#0f766e', bg:'#f0fdfa', fields:[
      { id:'tipo_puerta',   label:'Tipo de puerta',  type:'select', options:['Sólida','Tambor','Vidrio + Marco','Corrediza','Acordeón'] },
      { id:'material',      label:'Material',        type:'select', options:['MDF','Madera sólida','Pino','Cedro','Triplay'] },
      { id:'acabado',       label:'Acabado',         type:'select', options:['Poliuretano','Laca','Barniz','Natural','Pintado'] },
      { id:'color_acabado', label:'Color / Tono',    type:'text', placeholder:'Nombre o código de color' },
      { id:'diseno',        label:'Diseño / Tabla',  type:'text', placeholder:'Lisa, ranurada, con tablero...' },
    ]},
    { key:'herrajes', label:'🔩 Herrajes', color:'#b45309', bg:'#fffbeb', fields:[
      { id:'cerradura',      label:'Cerradura',          type:'select', options:['Con llave','Pestillo','Magnética','Sin cerradura'] },
      { id:'bisagras',       label:'Bisagras',           type:'select', options:['Normales','Ocultas','Cierre suave','Pivote'] },
      { id:'jaladora',       label:'Jaladora / Manija',  type:'text', placeholder:'Tipo y acabado' },
      { id:'marco_incluido', label:'Marco incluido',     type:'select', options:['Sí','No — solo hoja'] },
      { id:'marco_medidas',  label:'Medidas del marco',  type:'text', placeholder:'Ancho × perfil' },
    ]},
  ],
  'General': [
    { key:'espacio', label:'📐 Medidas Generales', color:'#1d4ed8', bg:'#eff6ff', fields:[
      { id:'alto_total',   label:'Alto total',             type:'number', suffix:'cm' },
      { id:'ancho_total',  label:'Ancho total',            type:'number', suffix:'cm' },
      { id:'profundidad',  label:'Profundidad',            type:'number', suffix:'cm' },
      { id:'cond_espacio', label:'Condición del espacio',  type:'select', options:['Terminado','Irregular','Obra Negra'] },
    ]},
    { key:'puertas', label:'🚪 Puertas', color:'#0f766e', bg:'#f0fdfa', fields:[
      { id:'puertas_cant',    label:'Cant. puertas', type:'number', suffix:'pza' },
      { id:'tipo_puerta',     label:'Tipo apertura', type:'select', options:['Abatible','Corrediza','Sin puerta'] },
      { id:'p1_alto',         label:'Puerta 1 — Alto',  type:'number', suffix:'cm' },
      { id:'p1_ancho',        label:'Puerta 1 — Ancho', type:'number', suffix:'cm' },
      { id:'p2_alto',         label:'Puerta 2 — Alto',  type:'number', suffix:'cm' },
      { id:'p2_ancho',        label:'Puerta 2 — Ancho', type:'number', suffix:'cm' },
      { id:'p3_alto',         label:'Puerta 3 — Alto',  type:'number', suffix:'cm' },
      { id:'p3_ancho',        label:'Puerta 3 — Ancho', type:'number', suffix:'cm' },
      { id:'herrajes_puertas',label:'Herrajes',      type:'text' },
    ]},
    { key:'cajoneras', label:'🗄️ Cajoneras', color:'#7c3aed', bg:'#faf5ff', fields:[
      { id:'caj_cantidad',    label:'Cant. cajoneras',      type:'number', suffix:'pza' },
      { id:'caj_cajones',     label:'Cajones por cajonera', type:'number', suffix:'pza' },
      { id:'caj_alto',        label:'Alto cajón',           type:'number', suffix:'cm' },
      { id:'caj_ancho',       label:'Ancho cajón',          type:'number', suffix:'cm' },
      { id:'caj_prof',        label:'Profundidad cajón',    type:'number', suffix:'cm' },
      { id:'caj_corredera',   label:'Tipo corredera',       type:'select', options:['Normal','Cierre suave (soft close)','Sin corredera'] },
      { id:'caj_ubicacion',   label:'Ubicación',            type:'text' },
      { id:'caj_material_int',label:'Material interior',    type:'select', options:['MDF','Melamina','Madera sólida','Otro'] },
    ]},
    { key:'materiales', label:'🪵 Materiales y Acabado', color:'#b45309', bg:'#fffbeb', fields:[
      { id:'material_cuerpo', label:'Material cuerpo',  type:'select', options:['MDF','Melamina','Triplay','Madera sólida'] },
      { id:'acabado',         label:'Acabado',          type:'select', options:['Poliuretano','Laca','Natural','Pintado','Foliado'] },
      { id:'color_acabado',   label:'Color / Tono',     type:'text', placeholder:'Nombre o código de color' },
      { id:'herrajes_general',label:'Herrajes generales',type:'text' },
      { id:'estilo',          label:'Estilo',           type:'select', options:['Moderno','Clásico','Minimalista','Rústico','Industrial'] },
    ]},
  ],
};

export function getMeasureSections(projectType) {
  const normalize = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const pt = normalize(projectType);
  // Detectar todos los tipos seleccionados y combinar sus secciones
  const result = [];
  const addedKeys = new Set();
  const addSections = (label, secs) => {
    result.push({ _groupLabel: label, sections: secs.map(s => ({ ...s, key: label.toLowerCase().replace(/\s/g,'_') + '_' + s.key })) });
  };
  if (pt.includes('cocina')) addSections('🍳 Cocina', MEASURE_SECTIONS['Cocina']);
  if (pt.includes('closet') || pt.includes('cl') && pt.includes('set')) addSections('🚪 Clóset / Vestidor', MEASURE_SECTIONS['Cl\u00f3set']);
  if (pt.includes('puerta solida') || pt.includes('puerta s')) addSections('🚪 Puerta Sólida', MEASURE_SECTIONS['Puerta']);
  if (pt.includes('puerta de tambor') || pt.includes('tambor')) addSections('🚪 Puerta de Tambor', MEASURE_SECTIONS['Puerta']);
  if (pt.includes('restauraci')) addSections('🪵 Restauraciones', MEASURE_SECTIONS['General']);
  if (pt.includes('otros') || pt.includes('otro')) addSections('📦 Otros', MEASURE_SECTIONS['General']);
  // fallback: si no detectó nada, devolver general como grupo único
  if (result.length === 0) return [{ _groupLabel: null, sections: MEASURE_SECTIONS['General'] }];
  return result;
}

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


function Estimacion({ prospect, onBack, onSaveSuccess }) {
  const [margin, setMargin]       = useState(30);
  const [anticipoPct, setAnticipoPct] = useState(60);
  const [saving, setSaving]       = useState(false);
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [projectDetails, setProjectDetails] = useState(() => ({
    project_timeline: prospect.project_timeline || '',
    estimated_price: prospect.estimated_price || '',
    production_days: prospect.production_days || '',
    start_date: prospect.start_date || '',
    delivery_date: prospect.delivery_date || ''
  }));

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
  const [unit, setUnit] = useState('cm');

  const handleUnitChange = (newUnit) => {
    if (newUnit === unit) return;
    const updatedMeasures = { ...measures };
    for (const key in updatedMeasures) {
      const val = parseFloat(updatedMeasures[key]);
      if (!isNaN(val)) {
        if (newUnit === 'in') {
          updatedMeasures[key] = (val / 2.54).toFixed(2).replace(/\.00$/, '');
        } else {
          updatedMeasures[key] = (val * 2.54).toFixed(2).replace(/\.00$/, '');
        }
      }
    }
    setMeasures(updatedMeasures);
    setUnit(newUnit);
  };
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
        if (d.anticipoPct !== undefined) setAnticipoPct(Number(d.anticipoPct));
        if (d.measures) setMeasures(d.measures);
        if (d.unit) setUnit(d.unit);
        if (d.obsText) setObsText(d.obsText);
        if (d.photos) setPhotos(d.photos);
        if (d.croquisPhotos) setCroquisPhotos(d.croquisPhotos);
        if (d.projectDetails) {
          setProjectDetails(previous => ({ ...previous, ...d.projectDetails }));
        }
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
    if (matchedKeys.length === 0) {
      setTemplateLoaded(true);
      return;
    }

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
      .catch(() => setTemplateLoaded(true));
  }, [prospect, templateLoaded]);

  const getSheetCost = (sh) => {
    const sum = arr => (arr||[]).reduce((s, r) => s + Number(r.qty||0) * Number(r.price||0), 0);
    return sum(sh.materials) + sum(sh.labor) + sum(sh.concepts);
  };
  const totalCost = sheets.reduce((s, sh) => s + getSheetCost(sh), 0);
  const totalWithMargin = totalCost * (1 + margin / 100);
  const anticipoTotal = totalWithMargin * anticipoPct / 100;
  const restanteTotal = totalWithMargin - anticipoTotal;
  const estimatedDeliveryDate = (() => {
    const days = Number.parseInt(projectDetails.production_days, 10);
    if (!projectDetails.start_date || !Number.isInteger(days) || days < 1) return '';

    const current = new Date(`${projectDetails.start_date}T12:00:00`);
    if (Number.isNaN(current.getTime())) return '';

    let businessDays = 0;
    while (businessDays < days) {
      current.setDate(current.getDate() + 1);
      if (current.getDay() !== 0 && current.getDay() !== 6) businessDays++;
    }
    return current.toISOString().split('T')[0];
  })();
  const updateProjectDetails = (field, value) => {
    setProjectDetails(previous => ({ ...previous, [field]: value }));
  };
  const savedProjectDetails = {
    ...projectDetails,
    estimated_price: String(totalWithMargin),
    delivery_date: estimatedDeliveryDate
  };

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

  const [saveMsg, setSaveMsg] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const [activeFields, setActiveFields] = useState({});
  const [showCotizadorModal, setShowCotizadorModal] = useState(false);

  // Auto-guardado al servidor en segundo plano
  useEffect(() => {
    if (!templateLoaded) return;
    setAutoSaveStatus('⏳ Guardando borrador...');
    const timer = setTimeout(async () => {
      const data = { 
        sheets, margin, anticipoPct, measures, obsText, totalWithMargin, photos, croquisPhotos, projectDetails: savedProjectDetails,
        croquis_data: croquisRef.current?.getSketchData(), unit
      };
      try {
        const response = await fetch(`${API}/api/prospects/${prospect.id}`, {
          method:'PUT', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ estimation_data: JSON.stringify(data) }) // Guardado silencioso sin cambiar status
        });
        if (!response.ok) throw new Error(`Error ${response.status}`);
        setAutoSaveStatus('✅ Borrador auto-guardado');
        setTimeout(() => setAutoSaveStatus(''), 4000);
      } catch {
        setAutoSaveStatus('❌ Error al guardar borrador');
      }
    }, 2000); // Esperar 2 segundos después de escribir/subir foto
    return () => clearTimeout(timer);
  }, [sheets, margin, anticipoPct, measures, unit, obsText, photos, croquisPhotos, projectDetails, totalWithMargin, estimatedDeliveryDate, templateLoaded]);


  const handleSave = async () => {
    setSaving(true);
    const data = { 
      sheets, margin, anticipoPct, measures, obsText, totalWithMargin, photos, croquisPhotos, projectDetails: savedProjectDetails,
      croquis_data: croquisRef.current?.getSketchData(), unit
    };
    try {
      const response = await fetch(`${API}/api/prospects/${prospect.id}`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ estimation_data: JSON.stringify(data), status: 'ESTIMACIÓN' })
      });
      if (!response.ok) throw new Error(`Error ${response.status}`);
      setSaveMsg('✅ Guardado correctamente');
      setTimeout(() => {
        setSaveMsg('');
        if (onSaveSuccess) onSaveSuccess();
        else onBack();
      }, 800);
    } catch { setSaveMsg('❌ Error guardando'); setTimeout(() => setSaveMsg(''), 3000); }
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
          <h2 style={{ margin:0, color:'#1e293b', fontSize:'1.3rem', fontWeight:'800' }}>
            Estimación · {prospect.name}
            {autoSaveStatus && <span style={{ marginLeft: '12px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '12px', verticalAlign: 'middle' }}>{autoSaveStatus}</span>}
          </h2>
          <p style={{ margin:0, color:'#64748b', fontSize:'0.83rem' }}>{prospect.project_type} · {prospect.public_id}</p>
        </div>
      </div>

      {/* ── INFO DEL PROSPECTO ── */}
      <div style={{ background:'linear-gradient(135deg,#1e293b 0%,#334155 100%)', borderRadius:'12px', padding:'1rem 1.3rem', marginBottom:'1.2rem', color:'white', display:'flex', flexWrap:'wrap', gap:'0.8rem 2rem', alignItems:'flex-start' }}>
        <div style={{ minWidth:'200px' }}>
          <div style={{ fontSize:'0.65rem', fontWeight:'700', letterSpacing:'0.08em', color:'#94a3b8', textTransform:'uppercase', marginBottom:'2px' }}>Cliente</div>
          <div style={{ fontSize:'1rem', fontWeight:'800' }}>{prospect.name}</div>
          {prospect.contact_info && <div style={{ fontSize:'0.82rem', color:'#cbd5e1', marginTop:'2px' }}>📞 {prospect.contact_info}</div>}
        </div>
        {prospect.location && (
          <div>
            <div style={{ fontSize:'0.65rem', fontWeight:'700', letterSpacing:'0.08em', color:'#94a3b8', textTransform:'uppercase', marginBottom:'2px' }}>Ubicación</div>
            <div style={{ fontSize:'0.88rem', fontWeight:'600' }}>📍 {prospect.location}</div>
          </div>
        )}
        {prospect.project_type && (
          <div>
            <div style={{ fontSize:'0.65rem', fontWeight:'700', letterSpacing:'0.08em', color:'#94a3b8', textTransform:'uppercase', marginBottom:'2px' }}>Tipo de Proyecto</div>
            <div style={{ fontSize:'0.88rem', fontWeight:'700', color:'#fbbf24' }}>🏗️ {prospect.project_type}</div>
          </div>
        )}
        {prospect.inhabited_house && (
          <div>
            <div style={{ fontSize:'0.65rem', fontWeight:'700', letterSpacing:'0.08em', color:'#94a3b8', textTransform:'uppercase', marginBottom:'2px' }}>Casa Habitada</div>
            <div style={{ fontSize:'0.88rem', fontWeight:'600' }}>{prospect.inhabited_house}</div>
          </div>
        )}
        {prospect.material_type && (
          <div>
            <div style={{ fontSize:'0.65rem', fontWeight:'700', letterSpacing:'0.08em', color:'#94a3b8', textTransform:'uppercase', marginBottom:'2px' }}>Material</div>
            <div style={{ fontSize:'0.88rem', fontWeight:'600' }}>🪵 {prospect.material_type}{prospect.material_type_2 ? ` / ${prospect.material_type_2}` : ''}</div>
          </div>
        )}
        {prospect.estimated_price && (
          <div>
            <div style={{ fontSize:'0.65rem', fontWeight:'700', letterSpacing:'0.08em', color:'#94a3b8', textTransform:'uppercase', marginBottom:'2px' }}>Precio Est.</div>
            <div style={{ fontSize:'0.95rem', fontWeight:'800', color:'#4ade80' }}>💲{prospect.estimated_price}</div>
          </div>
        )}
        {prospect.start_date && (
          <div>
            <div style={{ fontSize:'0.65rem', fontWeight:'700', letterSpacing:'0.08em', color:'#94a3b8', textTransform:'uppercase', marginBottom:'2px' }}>Inicio</div>
            <div style={{ fontSize:'0.85rem', fontWeight:'600' }}>📅 {prospect.start_date}</div>
          </div>
        )}
        {prospect.delivery_date && (
          <div>
            <div style={{ fontSize:'0.65rem', fontWeight:'700', letterSpacing:'0.08em', color:'#94a3b8', textTransform:'uppercase', marginBottom:'2px' }}>Entrega</div>
            <div style={{ fontSize:'0.85rem', fontWeight:'600' }}>🎯 {prospect.delivery_date}</div>
          </div>
        )}

        {prospect.expectations && (
          <div style={{ flex:'1 1 100%' }}>
            <div style={{ fontSize:'0.65rem', fontWeight:'700', letterSpacing:'0.08em', color:'#94a3b8', textTransform:'uppercase', marginBottom:'2px' }}>Expectativas / Notas</div>
            <div style={{ fontSize:'0.82rem', color:'#e2e8f0', lineHeight:'1.5', background:'rgba(255,255,255,0.07)', padding:'0.5rem 0.75rem', borderRadius:'8px' }}>{prospect.expectations}</div>
          </div>
        )}
      </div>

      {/* ── 1. NOTAS Y MEDIDAS ── */}
      <div style={{ background:'white', borderRadius:'10px', border:'1px solid #e2e8f0', padding:'1.2rem', marginBottom:'1.5rem' }}>
         <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap: 'wrap', gap: '10px' }}>
           <h3 style={{ margin:0, color:'#1e293b', fontSize:'1rem', fontWeight:'700' }}>📋 Notas y Medidas de Visita</h3>
           <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'#f1f5f9', padding:'4px', borderRadius:'8px' }}>
             <button onClick={() => handleUnitChange('cm')} style={{ padding:'4px 12px', background:unit==='cm'?'white':'transparent', color:unit==='cm'?'#1e40af':'#64748b', borderRadius:'6px', border:'none', fontWeight:'700', fontSize:'0.75rem', cursor:'pointer', boxShadow:unit==='cm'?'0 1px 3px rgba(0,0,0,0.1)':'none', transition:'all 0.2s' }}>CM</button>
             <button onClick={() => handleUnitChange('in')} style={{ padding:'4px 12px', background:unit==='in'?'white':'transparent', color:unit==='in'?'#1e40af':'#64748b', borderRadius:'6px', border:'none', fontWeight:'700', fontSize:'0.75rem', cursor:'pointer', boxShadow:unit==='in'?'0 1px 3px rgba(0,0,0,0.1)':'none', transition:'all 0.2s' }}>IN (Pulgadas)</button>
           </div>
         </div>
         
         {(() => {
           const groups = getMeasureSections(prospect.project_type);
                      const renderField = (f, prefix) => {
             const fieldKey = prefix ? `${prefix}_${f.id}` : f.id;
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
                         {f.suffix && <span style={{ position:'absolute', right:'8px', fontSize:'0.72rem', color:'#94a3b8', pointerEvents:'none' }}>{f.suffix === 'cm' ? unit : f.suffix}</span>}
                       </div>
                     )}
                   </div>
                   <label style={{ cursor:'pointer', padding:'5px 7px', background:'#eff6ff', borderRadius:'6px', border:'1px solid #bfdbfe', display:'flex', alignItems:'center', gap:'3px', fontSize:'0.75rem', fontWeight:'600', color:'#1d4ed8', whiteSpace:'nowrap', flexShrink:0 }}>
                     📷
                     <input type='file' accept='image/*' capture='environment' style={{ display:'none' }}
                       onChange={e => handlePhotoUpload(fieldKey, e.target.files[0])} />
                   </label>
                   <button onClick={() => setShowCotizadorModal(true)} title="Abrir Cotizador en Vivo" style={{ cursor:'pointer', padding:'4px 7px', background:'#fffbeb', borderRadius:'6px', border:'1px solid #fcd34d', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', flexShrink:0, transition:'all 0.2s' }}>
                     💰
                   </button>
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
           };
           return groups.map((group, gi) => (
             <div key={gi} style={{ marginBottom:'1.2rem' }}>
               {group._groupLabel && (
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
               })()}

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
               
               {group.sections.map(sec => (
                 <div key={sec.key} style={{ marginBottom:'0.75rem', border:`1.5px solid ${sec.color}22`, borderRadius:'10px', overflow:'hidden' }}>
                   <div style={{ background:sec.bg, borderBottom:`1.5px solid ${sec.color}33`, padding:'0.55rem 0.9rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                     <span style={{ fontSize:'0.8rem', fontWeight:'800', color:sec.color, letterSpacing:'0.04em' }}>{sec.label}</span>
                   </div>
                   <div style={{ padding:'0.75rem 0.9rem' }}>
                     {sec.key.includes('materiales') ? (
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
                           <div style={{ fontSize:'0.85rem', fontWeight:'700', color:'#78350f', marginTop:'2px' }}>{prospect.interior_color_type ? `${prospect.interior_color_type} · ${prospect.interior_color_code}` : 'N/A'}</div>
                         </div>
                         <div style={{ flex:'1 1 140px' }}>
                           <label style={{ fontSize:'0.65rem', fontWeight:'800', color:'#b45309', textTransform:'uppercase', letterSpacing:'0.04em' }}>Color Ext. Inferior</label>
                           <div style={{ fontSize:'0.85rem', fontWeight:'700', color:'#78350f', marginTop:'2px' }}>{prospect.exterior_inf_color_type ? `${prospect.exterior_inf_color_type} · ${prospect.exterior_inf_color_code}` : 'N/A'}</div>
                         </div>
                         <div style={{ flex:'1 1 140px' }}>
                           <label style={{ fontSize:'0.65rem', fontWeight:'800', color:'#b45309', textTransform:'uppercase', letterSpacing:'0.04em' }}>Color Ext. Superior</label>
                           <div style={{ fontSize:'0.85rem', fontWeight:'700', color:'#78350f', marginTop:'2px' }}>{prospect.exterior_sup_color_type ? `${prospect.exterior_sup_color_type} · ${prospect.exterior_sup_color_code}` : 'N/A'}</div>
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
                       <div style={{ display:'flex', flexWrap:'wrap', gap:'0.65rem' }}>
                         {sec.fields.map(f => renderField(f, sec.key))}
                       </div>
                     )}
                   </div>
                 </div>
               ))}
             </div>
           ));
         })()}

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
      {showCotizadorModal && (
        <div onClick={() => setShowCotizadorModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:999 }}></div>
      )}
      <div style={
        showCotizadorModal
        ? { position:'fixed', top:'3%', left:'3%', width:'94%', height:'94%', background:'white', zIndex:1000, overflowY:'auto', borderRadius:'12px', padding:'1.5rem', boxShadow:'0 10px 40px rgba(0,0,0,0.4)' }
        : { background:'white', borderRadius:'10px', border:'1px solid #e2e8f0', padding:'1.5rem', marginTop:'1.5rem', marginBottom:'1.5rem' }
      }>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.2rem', flexWrap:'wrap', gap:'10px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'15px' }}>
            <h3 style={{ margin:0, color:'#8b5a2b', fontSize:'1.1rem', fontWeight:'800', display:'flex', alignItems:'center', gap:'10px' }}>
              💰 Cotizador en Vivo
              {showCotizadorModal && (
                <button onClick={() => setShowCotizadorModal(false)} style={{ padding:'4px 10px', fontSize:'0.75rem', background:'#f8fafc', color:'#475569', border:'1px solid #cbd5e1', borderRadius:'6px', cursor:'pointer', fontWeight:'bold' }}>✕ Cerrar modal</button>
              )}
            </h3>
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
          <div style={{ background:'#fff7ed', border:'2px dashed #fdba74', padding:'1rem 1.5rem', borderRadius:'8px', display:'flex', alignItems:'center', gap:'1.5rem', flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <label style={{ fontSize:'0.9rem', fontWeight:'700', color:'#9a3412' }}>Margen de ganancia (%):</label>
              <input type="number" value={margin} onChange={e => setMargin(Number(e.target.value))}
                style={{ width:'70px', padding:'6px 8px', borderRadius:'6px', border:'1px solid #fdba74', fontWeight:'700', fontSize:'1rem' }} />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <label style={{ fontSize:'0.9rem', fontWeight:'700', color:'#9a3412' }}>Anticipo (%):</label>
              <input type="number" min="0" max="100" value={anticipoPct}
                onChange={e => setAnticipoPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                style={{ width:'70px', padding:'6px 8px', borderRadius:'6px', border:'1px solid #fdba74', fontWeight:'700', fontSize:'1rem' }} />
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ margin:0, fontSize:'0.8rem', color:'#9a3412' }}>Costo total estimado: {formatCurrency(totalCost)}</p>
              <p style={{ margin:0, fontSize:'1.1rem', fontWeight:'900', color:'#7c2d12' }}>Precio final: {formatCurrency(totalWithMargin)}</p>
              <p style={{ margin:'0.35rem 0 0', fontSize:'0.82rem', color:'#9a3412' }}>Anticipo ({anticipoPct}%): {formatCurrency(anticipoTotal)}</p>
              <p style={{ margin:0, fontSize:'0.82rem', color:'#9a3412' }}>Restante ({100 - anticipoPct}%): {formatCurrency(restanteTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── DATOS DEL PROYECTO EN CONTRATO (se guardan dentro de estimation_data) ── */}
      <div style={{ background:'white', borderRadius:'10px', border:'1px solid #e2e8f0', padding:'1.2rem', marginTop:'1.5rem', marginBottom:'1.5rem' }}>
        <h3 style={{ margin:'0 0 1.2rem', paddingBottom:'0.5rem', borderBottom:'1px solid #ba4b24', color:'#ba4b24', textAlign:'center', fontSize:'1.1rem' }}>
          Fechas del Proyecto
        </h3>
        <div style={{ marginBottom:'1rem' }}>
          <label style={{ display:'block', fontSize:'0.82rem', fontWeight:'700', color:'#475569', marginBottom:'0.5rem' }}>Plazo del Proyecto</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'0.6rem' }}>
            {[
              { value:'corto', label:'Corto Plazo', detail:'1 semana', icon:'⚡', color:'#f97316', bg:'#fff7ed', border:'#fed7aa', badge:'🎁 ¡Bonificación!' },
              { value:'mediano', label:'Mediano Plazo', detail:'2 semanas', icon:'📅', color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe' },
              { value:'largo', label:'Largo Plazo', detail:'Más de 1 mes', icon:'🗓️', color:'#64748b', bg:'#f8fafc', border:'#e2e8f0' }
            ].map(option => {
              const selected = projectDetails.project_timeline === option.value;
              return (
                <button key={option.value} type="button"
                  onClick={() => updateProjectDetails('project_timeline', option.value)}
                  style={{
                    padding:'0.75rem', borderRadius:'9px', cursor:'pointer', textAlign:'center',
                    border:`${selected ? 2 : 1}px solid ${option.color}`,
                    background:selected ? option.bg : 'white',
                    boxShadow:selected ? `0 0 0 2px ${option.color}22` : 'none'
                  }}>
                  <div style={{ fontSize:'1.35rem' }}>{option.icon}</div>
                  <div style={{ fontWeight:'700', fontSize:'0.84rem', color:selected ? option.color : '#1e293b' }}>{option.label}</div>
                  <div style={{ fontSize:'0.74rem', color:'#64748b' }}>{option.detail}</div>
                  {option.badge && <span style={{ display:'inline-block', marginTop:'0.3rem', padding:'2px 7px', borderRadius:'12px', background:'#f97316', color:'white', fontSize:'0.68rem', fontWeight:'700' }}>{option.badge}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'1rem' }}>
          <label style={{ fontSize:'0.82rem', fontWeight:'700', color:'#475569' }}>
            Precio Estimado (Cotizador en Vivo)
            <input readOnly type="text" value={formatCurrency(totalWithMargin)}
              style={{ width:'100%', boxSizing:'border-box', padding:'0.5rem', marginTop:'0.4rem', borderRadius:'6px', border:'1px solid #cbd5e1', background:'#f1f5f9', color:'#15803d', fontWeight:'700' }} />
          </label>
          <label style={{ fontSize:'0.82rem', fontWeight:'700', color:'#475569' }}>
            Tiempo de Producción (días hábiles)
            <input type="number" min="1" value={projectDetails.production_days}
              onChange={e => updateProjectDetails('production_days', e.target.value)}
              style={{ width:'100%', boxSizing:'border-box', padding:'0.5rem', marginTop:'0.4rem', borderRadius:'6px', border:'1px solid #cbd5e1' }} />
          </label>
          <label style={{ fontSize:'0.82rem', fontWeight:'700', color:'#475569' }}>
            Fecha de Inicio
            <input type="date" value={projectDetails.start_date}
              onChange={e => updateProjectDetails('start_date', e.target.value)}
              style={{ width:'100%', boxSizing:'border-box', padding:'0.5rem', marginTop:'0.4rem', borderRadius:'6px', border:'1px solid #cbd5e1' }} />
          </label>
          <label style={{ fontSize:'0.82rem', fontWeight:'700', color:'#475569' }}>
            Fecha Estimada de Terminación
            <input readOnly type="date" value={estimatedDeliveryDate}
              style={{ width:'100%', boxSizing:'border-box', padding:'0.5rem', marginTop:'0.4rem', borderRadius:'6px', border:'1px solid #cbd5e1', background:'#f1f5f9', color:estimatedDeliveryDate ? '#15803d' : '#94a3b8', fontWeight:'700' }} />
            {estimatedDeliveryDate && (
              <span style={{ display:'block', marginTop:'0.25rem', color:'#15803d', fontSize:'0.75rem' }}>
                {new Date(`${estimatedDeliveryDate}T12:00:00`).toLocaleDateString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
              </span>
            )}
          </label>
        </div>
        <p style={{ margin:'0.8rem 0 0', color:'#64748b', fontSize:'0.76rem' }}>
          Estos datos se guardan automáticamente en la Estimación y no modifican la información original de Prospectos.
        </p>
      </div>

      {saveMsg && (
        <div style={{ padding: '0.8rem', background: saveMsg.includes('✅') ? '#dcfce7' : '#fee2e2', color: saveMsg.includes('✅') ? '#166534' : '#991b1b', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          {saveMsg}
        </div>
      )}
      <button onClick={handleSave} disabled={saving}
       style={{ width:'100%', padding:'1.2rem', background:saving?'#94a3b8':'#10b981', color:'white', border:'none', borderRadius:'10px', cursor:saving?'not-allowed':'pointer', fontWeight:'900', fontSize:'1.1rem', marginTop: '0.5rem', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)' }}>
       {saving ? 'Guardando...' : '💾 Guardar Notas y Cotización'}
      </button>
    </div>
  );
}
