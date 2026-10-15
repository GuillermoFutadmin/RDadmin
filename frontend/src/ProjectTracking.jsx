import React, { useEffect, useState } from 'react';
import { StageIcon } from './StageIcon';

const TRACKING_STAGES = [
  { label: 'Prospecto recibido', icon: '📥' },
  { label: 'Valoración', icon: '📐' },
  { label: 'Cotización', icon: '🧾' },
  { label: 'Contrato', icon: '✍️' },
  { label: 'Producción', icon: '🪚' },
  { label: 'Entregado', icon: '📦' }
];

const PRODUCTION_STAGES = [
  'Generando información',
  'Preparación de materiales',
  'Producción iniciada',
  'Avance 1',
  'Avance 2 / revisión',
  'Entrega del proyecto'
];

const parseJson = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const normalizeProduction = (value) => {
  const production = parseJson(value);
  if (!Array.isArray(production.stages)) return { ...production, stages: [] };
  if (production.stages.length === PRODUCTION_STAGES.length + 1) {
    const legacyStage = Number.isInteger(production.current_stage) ? production.current_stage : 0;
    const firstStage = production.stages[0] || {};
    const secondStage = production.stages[1] || {};
    return {
      ...production,
      current_stage: legacyStage <= 1 ? 0 : legacyStage - 1,
      stages: [
        {
          ...firstStage,
          name: PRODUCTION_STAGES[0],
          entered_at: firstStage.entered_at || production.started_at || null,
          note: [firstStage.note, secondStage.note].filter(Boolean).join('\n'),
          photos: [...(firstStage.photos || []), ...(secondStage.photos || [])]
        },
        ...production.stages.slice(2).map((stage, index) => ({ ...stage, name: PRODUCTION_STAGES[index + 1] }))
      ]
    };
  }
  return {
    ...production,
    stages: production.stages.map((stage, index) => ({ ...stage, name: PRODUCTION_STAGES[index] || stage.name }))
  };
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-MX', {
    timeZone: 'America/Tijuana',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export function getProjectTrackingProgress(prospect) {
  const production = normalizeProduction(prospect.production_data);
  const status = String(prospect.status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const delivered = status === 'ENTREGADO' || !!production.delivered_at;
  const inProduction = !!prospect.production_data || status === 'PRODUCCION' || delivered;
  const underContract = !!prospect.is_contract || !!prospect.contract_date || [
    'APROBADO', 'CONTRATO', 'CONTRATO PENDIENTE', 'PRODUCCION', 'ENTREGADO'
  ].includes(status);
  const quoteSent = !!prospect.has_quote || underContract || status === 'COTIZACION';
  const valuationDone = !!prospect.valuation_data || !!prospect.estimated_price || quoteSent
    || status === 'VALORACION';
  const currentIndex = delivered ? 5 : inProduction ? 4 : underContract ? 3
    : quoteSent ? 2 : valuationDone ? 1 : 0;
  const currentProductionStage = Number.isInteger(production.current_stage)
    ? Math.max(0, Math.min(production.current_stage, PRODUCTION_STAGES.length - 1))
    : 0;

  return {
    production,
    delivered,
    currentIndex,
    currentProductionStage,
    completion: delivered ? 100 : Math.round((currentIndex / (TRACKING_STAGES.length - 1)) * 100),
    stageLabel: delivered
      ? 'Proyecto entregado'
      : currentIndex === 4
        ? PRODUCTION_STAGES[currentProductionStage]
        : TRACKING_STAGES[currentIndex].label
  };
}

const safePhotoUrl = (photo) => {
  const url = typeof photo === 'string' ? photo : photo?.url;
  return typeof url === 'string' && (/^https?:\/\//i.test(url) || (url.startsWith('/') && !url.startsWith('//')))
    ? url
    : null;
};

export default function ProjectTracking({ prospect, compact = false, showEvidence = false, requestDetails = [] }) {
  const [selectedStage, setSelectedStage] = useState(null);
  const [expandedPhotoIndex, setExpandedPhotoIndex] = useState(null);
  const [dailyLightboxIndex, setDailyLightboxIndex] = useState(null);

  const progress = getProjectTrackingProgress(prospect);
  const { production, delivered, currentIndex, currentProductionStage, completion, stageLabel } = progress;
  const productionStages = production.stages;
  const stages = TRACKING_STAGES.map((stage, index) => ({
    ...stage,
    complete: delivered || index < currentIndex,
    current: !delivered && index === currentIndex,
    date: index === 0 ? prospect.capture_date
      : index === 3 ? prospect.contract_date
        : index === 4 ? production.started_at
          : index === 5 ? production.delivered_at
            : null
  }));

  const rawPdfUrl = prospect.public_id
    ? `/api/client-portal/${prospect.public_id}/render-pdf`
    : (prospect.id ? `/api/prospects/${prospect.id}/render-pdf` : null);

  const [pdfStatus, setPdfStatus] = useState(() => {
    if (prospect.render_pdf_path || prospect.has_render_pdf) return 'ready';
    if (prospect.has_render_pdf === false && !prospect.render_pdf_path) return 'not_found';
    return rawPdfUrl ? 'checking' : 'not_found';
  });

  useEffect(() => {
    if (prospect.render_pdf_path || prospect.has_render_pdf) {
      setPdfStatus('ready');
      return;
    }
    if (!rawPdfUrl) {
      setPdfStatus('not_found');
      return;
    }
    let active = true;
    fetch(rawPdfUrl, { method: 'HEAD' })
      .then(res => {
        if (!active) return;
        setPdfStatus(res.ok ? 'ready' : 'not_found');
      })
      .catch(() => {
        if (!active) return;
        setPdfStatus('not_found');
      });
    return () => { active = false; };
  }, [rawPdfUrl, prospect.has_render_pdf, prospect.render_pdf_path]);

  const renderPdfUrl = pdfStatus === 'ready' ? rawPdfUrl : null;
  const hasRender = Boolean(
    pdfStatus === 'ready' ||
    pdfStatus === 'checking' ||
    prospect.render_pdf_path ||
    prospect.has_render_pdf ||
    prospect.render_image_path ||
    prospect.render_applies
  );
  const renderImageUrl = safePhotoUrl(prospect.render_image_path);

  // Ciclo de vida y línea de tiempo para el cliente
  const parseDateKey = (val) => {
    if (!val) return null;
    const d = typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)
      ? new Date(`${val}T12:00:00`)
      : new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const pProspectDate = parseDateKey(prospect.capture_date || prospect.created_at);
  const pContractDate = parseDateKey(prospect.contract_date);
  const pProdStartDate = parseDateKey(production.started_at) || pContractDate;
  const pPlannedDays = Number.parseInt(prospect.production_days, 10) || 30;
  const pDeliveryDate = parseDateKey(prospect.delivery_date) || parseDateKey(production.delivered_at);

  let pProspectDays = 0;
  if (pProspectDate && pContractDate) {
    pProspectDays = Math.max(1, Math.round((pContractDate - pProspectDate) / (1000 * 60 * 60 * 24)));
  } else if (pProspectDate) {
    pProspectDays = Math.max(1, Math.round((new Date() - pProspectDate) / (1000 * 60 * 60 * 24)));
  }

  let pClientPrepDays = 0;
  if (pContractDate && pProdStartDate) {
    pClientPrepDays = Math.max(0, Math.round((pProdStartDate - pContractDate) / (1000 * 60 * 60 * 24)));
  }

  let pElapsedProdDays = 0;
  if (pProdStartDate) {
    pElapsedProdDays = Math.max(0, Math.round((new Date() - pProdStartDate) / (1000 * 60 * 60 * 24)));
  }
  const pRemainingProdDays = Math.max(0, pPlannedDays - pElapsedProdDays);
  const pProdPct = Math.min(100, Math.round((pElapsedProdDays / pPlannedDays) * 100));
  const pTotalDays = (pProspectDays || 0) + (pClientPrepDays || 0) + pElapsedProdDays;

  const dailyPublished = (production.daily_advances || []).filter(a => a.published !== false);

  return (
    <section style={{
      margin: '0.9rem 0',
      padding: compact ? '0.7rem' : '1rem',
      background: '#fff',
      border: '1px solid #dbe5ef',
      borderRadius: 14,
      boxShadow: '0 3px 12px rgba(15, 23, 42, 0.05)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.68rem', fontWeight: 800 }}>
            Hoja de rastreo
          </div>
          <h3 style={{ color: '#172b4d', margin: '0.2rem 0 0', fontSize: compact ? '0.95rem' : '1.1rem' }}>
            {prospect.name || 'Proyecto'}
          </h3>
          <div style={{ color: '#64748b', marginTop: 3, fontSize: '0.78rem' }}>
            Folio {prospect.public_id || `#${prospect.id}`} · {prospect.project_type || 'Proyecto de carpintería'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ display: 'inline-block', padding: '0.34rem 0.65rem', borderRadius: 999, background: delivered ? '#dcfce7' : '#eff6ff', color: delivered ? '#166534' : '#1d4ed8', fontSize: '0.75rem', fontWeight: 800 }}>
            {stageLabel}
          </span>
          {!compact && (
            <div style={{ color: '#64748b', fontSize: '0.7rem', marginTop: 5 }}>
              Etapa {delivered ? 6 : currentIndex + 1} de {TRACKING_STAGES.length}
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <>
          {/* ── LÍNEA DE TIEMPO DEL CLIENTE (PROSPECTO ➔ CLIENTE ➔ PRODUCCIÓN) ── */}
          <div style={{ marginTop: 14, padding: '0.85rem 1rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <strong style={{ color: '#0f172a', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>⏱️</span> Línea de Tiempo de tu Proyecto
              </strong>
              <span style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 800, background: '#e0f2fe', padding: '2px 8px', borderRadius: 6 }}>
                Total acumulado: {pTotalDays} días
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 10 }}>
              {/* Fase 1: Prospecto */}
              <div style={{ background: '#fff', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', borderRadius: 8, padding: '0.55rem 0.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#b45309' }}>🎯 Prospecto</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 900, background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: 4 }}>
                    {pProspectDays} {pProspectDays === 1 ? 'día' : 'días'}
                  </span>
                </div>
                <div style={{ fontSize: '0.62rem', color: '#64748b' }}>
                  {pProspectDate ? pProspectDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Captura'} ➔ {pContractDate ? pContractDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Firma'}
                </div>
              </div>

              {/* Fase 2: Cliente */}
              <div style={{ background: '#fff', border: '1px solid #bae6fd', borderLeft: '4px solid #0284c7', borderRadius: 8, padding: '0.55rem 0.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0369a1' }}>✍️ Cliente</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 900, background: '#e0f2fe', color: '#075985', padding: '1px 5px', borderRadius: 4 }}>
                    {pClientPrepDays} {pClientPrepDays === 1 ? 'día' : 'días'}
                  </span>
                </div>
                <div style={{ fontSize: '0.62rem', color: '#64748b' }}>
                  {pContractDate ? pContractDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Firma'} ➔ {pProdStartDate ? pProdStartDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Taller'}
                </div>
              </div>

              {/* Fase 3: Producción */}
              <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderLeft: '4px solid #16a34a', borderRadius: 8, padding: '0.55rem 0.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#15803d' }}>🔨 Producción</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 900, background: '#dcfce7', color: '#166534', padding: '1px 5px', borderRadius: 4 }}>
                    {pElapsedProdDays} / {pPlannedDays} días
                  </span>
                </div>
                <div style={{ fontSize: '0.62rem', color: '#64748b' }}>
                  {pRemainingProdDays > 0 ? `${pRemainingProdDays} días restantes` : 'Etapa de entrega'}
                </div>
              </div>
            </div>

            {/* Barra de progreso de producción */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: '#64748b', marginBottom: 3 }}>
                <span>Avance en taller: {pElapsedProdDays} días transcurridos</span>
                <strong style={{ color: '#16a34a' }}>{pProdPct}%</strong>
              </div>
              <div style={{ height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pProdPct}%`, background: 'linear-gradient(90deg, #3b82f6, #16a34a)', borderRadius: 999, transition: 'width 0.4s' }} />
              </div>
            </div>
          </div>



          {showEvidence && productionStages.length > 0 && (() => {
            const activeStage = selectedStage ?? currentProductionStage;
            const stageData = productionStages[activeStage] || {};
            const photos = (stageData.photos || []).map(safePhotoUrl).filter(Boolean);
            const stageName = PRODUCTION_STAGES[activeStage];
            const stageComplete = delivered || activeStage < currentProductionStage;
            return (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <strong style={{ color: '#1e3a5f', fontSize: '0.78rem' }}>Avance de producción</strong>
                  <span style={{ color: '#2563eb', fontSize: '0.72rem', fontWeight: 800 }}>
                    {delivered ? 'Entrega confirmada' : PRODUCTION_STAGES[currentProductionStage]}
                  </span>
                </div>
                <div className="production-stage-flow is-client">
                  {PRODUCTION_STAGES.map((name, index) => {
                    const complete = delivered || index < currentProductionStage;
                    const current = !delivered && index === currentProductionStage;
                    const isActive = activeStage === index;
                    const reached = complete || current;
                    const color = complete ? '#16a34a' : current ? '#2563eb' : '#cbd5e1';
                    return (
                      <React.Fragment key={name}>
                        <button type="button" aria-pressed={isActive} aria-label={`${name}, ${complete ? 'completada' : current ? 'etapa actual' : 'pendiente'}`}
                          onClick={() => { setSelectedStage(index); setExpandedPhotoIndex(null); }}
                          className={`production-stage-button${isActive ? ' is-selected' : ''}${reached ? ' has-projects' : ''}`}
                          style={{ '--stage-color': color, '--stage-surface': complete ? '#f0fdf4' : current ? '#eff6ff' : '#f8fafc', color: current ? '#1d4ed8' : complete ? '#166534' : '#334155' }}>
                          <span className="production-stage-icon"><StageIcon stage={index} /></span>
                          <span className="production-stage-name">{name}</span>
                          <span className="production-stage-count" style={{ color: current ? '#1d4ed8' : complete ? '#15803d' : '#64748b' }}>
                            {complete ? 'Completada' : current ? 'Etapa actual' : 'Pendiente'}
                          </span>
                        </button>
                        {index < PRODUCTION_STAGES.length - 1 && (
                          <span className={`production-stage-connector${index < currentProductionStage || delivered ? ' is-lit' : ''}${!delivered && index === currentProductionStage ? ' is-next' : ''}`} aria-hidden="true">
                            <span>›</span>
                          </span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                <div style={{ padding: '0.9rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <strong style={{ color: '#172b4d', fontSize: '0.92rem' }}>{stageName}</strong>
                    {formatDate(stageData.entered_at) && <span style={{ color: '#64748b', fontSize: '0.72rem' }}>{formatDate(stageData.entered_at)}</span>}
                  </div>

                  {activeStage === 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ color: '#172b4d', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lo que solicitaste</div>
                      {requestDetails.length ? (
                        <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
                          {requestDetails.map(([label, value]) => (
                            <div key={label}>
                              <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                              <div style={{ marginTop: 3, color: '#334155', fontSize: '0.86rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{value}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>Aún no hay una descripción capturada para este proyecto.</p>
                      )}
                    </div>
                  )}

                  {activeStage === 1 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{
                        padding: '1rem',
                        background: '#ffffff',
                        border: '1px solid #bfdbfe',
                        borderRadius: 12,
                        boxShadow: '0 3px 12px rgba(37, 99, 235, 0.08)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                          <div>
                            <div style={{ color: '#2563eb', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              Diseño y Planos Aprobados
                            </div>
                            <h4 style={{ margin: '3px 0 0', color: '#1e3a5f', fontSize: '1rem', fontWeight: 800 }}>
                              📐 Plano / Render Oficial del Proyecto
                            </h4>
                          </div>

                          {renderPdfUrl && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <a
                                href={renderPdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '0.48rem 0.9rem',
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: 8,
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  textDecoration: 'none'
                                }}
                              >
                                <span>👁️</span>
                                <span>Ver PDF en pantalla completa</span>
                              </a>
                              <a
                                href={renderPdfUrl}
                                download={`Plano_Render_${prospect.public_id || prospect.id}.pdf`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '0.48rem 0.9rem',
                                  background: '#1d4ed8',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: 8,
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  textDecoration: 'none'
                                }}
                              >
                                <span>⬇️</span>
                                <span>Descargar Plano PDF</span>
                              </a>
                            </div>
                          )}
                        </div>

                        {renderImageUrl ? (
                          <div style={{
                            position: 'relative',
                            width: '100%',
                            maxHeight: 520,
                            background: '#0f172a',
                            borderRadius: 10,
                            overflow: 'hidden',
                            border: '1px solid #cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: renderPdfUrl ? 10 : 0
                          }}>
                            <img
                              src={renderImageUrl}
                              alt="Plano / Render del Proyecto"
                              style={{
                                display: 'block',
                                maxWidth: '100%',
                                maxHeight: 520,
                                objectFit: 'contain'
                              }}
                            />
                          </div>
                        ) : null}

                        {renderPdfUrl ? (
                          <div style={{
                            width: '100%',
                            height: 'min(70vh, 520px)',
                            minHeight: 380,
                            borderRadius: 10,
                            overflow: 'hidden',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc'
                          }}>
                            <iframe
                              src={`${renderPdfUrl}#toolbar=1&navpanes=0`}
                              title="Plano y Render del Proyecto"
                              style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                display: 'block'
                              }}
                            />
                          </div>
                        ) : pdfStatus === 'checking' ? (
                          <div style={{
                            padding: '2rem 1.5rem',
                            textAlign: 'center',
                            background: '#f8fafc',
                            borderRadius: 8,
                            border: '1px dashed #bfdbfe',
                            color: '#2563eb'
                          }}>
                            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: 4 }}>⏳</span>
                            <strong style={{ display: 'block', fontSize: '0.88rem' }}>Cargando plano y render del proyecto...</strong>
                          </div>
                        ) : !renderImageUrl ? (
                          <div style={{
                            padding: '1.5rem',
                            textAlign: 'center',
                            background: '#f8fafc',
                            borderRadius: 8,
                            border: '1px dashed #cbd5e1',
                            color: '#64748b'
                          }}>
                            <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: 4 }}>📐</span>
                            <strong style={{ display: 'block', color: '#1e293b', fontSize: '0.9rem' }}>
                              Plano de diseño en preparación
                            </strong>
                            <span style={{ fontSize: '0.78rem', marginTop: 3, display: 'inline-block' }}>
                              El equipo de taller está preparando las especificaciones de corte y planos finales.
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {stageData.note && <div style={{ marginTop: 10, color: '#475569', fontSize: '0.84rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{stageData.note}</div>}

                  {photos.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      {expandedPhotoIndex !== null && photos[expandedPhotoIndex] ? (
                        <div style={{
                          padding: 12,
                          background: '#0f172a',
                          borderRadius: 14,
                          border: '1px solid #334155',
                          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)'
                        }}>
                          {/* Header bar */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            marginBottom: 10,
                            color: '#f8fafc'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '0.92rem', color: '#ffffff' }}>📷 {stageName}</strong>
                              {photos.length > 1 && (
                                <span style={{
                                  fontSize: '0.74rem',
                                  padding: '2px 8px',
                                  background: 'rgba(255, 255, 255, 0.16)',
                                  borderRadius: 999,
                                  color: '#e2e8f0',
                                  fontWeight: 600
                                }}>
                                  Foto {expandedPhotoIndex + 1} de {photos.length}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedPhotoIndex(null)}
                              aria-label="Cerrar vista grande"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '0.35rem 0.85rem',
                                background: 'rgba(255, 255, 255, 0.18)',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: 8,
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              ✕ Cerrar
                            </button>
                          </div>

                          {/* Main large image */}
                          <div style={{
                            position: 'relative',
                            width: '100%',
                            maxHeight: 'min(70vh, 520px)',
                            minHeight: 220,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#020617',
                            borderRadius: 10,
                            overflow: 'hidden'
                          }}>
                            <img
                              src={photos[expandedPhotoIndex]}
                              alt={`Evidencia ${expandedPhotoIndex + 1} de ${photos.length} · ${stageName}`}
                              style={{
                                display: 'block',
                                maxWidth: '100%',
                                maxHeight: 'min(70vh, 520px)',
                                width: 'auto',
                                height: 'auto',
                                objectFit: 'contain'
                              }}
                            />

                            {photos.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setExpandedPhotoIndex((expandedPhotoIndex - 1 + photos.length) % photos.length)}
                                  aria-label="Foto anterior"
                                  style={{
                                    position: 'absolute',
                                    left: 10,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: 42,
                                    height: 42,
                                    borderRadius: '50%',
                                    background: 'rgba(15, 23, 42, 0.82)',
                                    color: '#ffffff',
                                    border: '1px solid rgba(255, 255, 255, 0.35)',
                                    fontSize: '1.5rem',
                                    lineHeight: '1',
                                    display: 'grid',
                                    placeItems: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.45)'
                                  }}
                                >
                                  ‹
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpandedPhotoIndex((expandedPhotoIndex + 1) % photos.length)}
                                  aria-label="Foto siguiente"
                                  style={{
                                    position: 'absolute',
                                    right: 10,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: 42,
                                    height: 42,
                                    borderRadius: '50%',
                                    background: 'rgba(15, 23, 42, 0.82)',
                                    color: '#ffffff',
                                    border: '1px solid rgba(255, 255, 255, 0.35)',
                                    fontSize: '1.5rem',
                                    lineHeight: '1',
                                    display: 'grid',
                                    placeItems: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.45)'
                                  }}
                                >
                                  ›
                                </button>
                              </>
                            )}
                          </div>

                          {/* Miniaturas de navegación */}
                          {photos.length > 1 && (
                            <div style={{
                              display: 'flex',
                              gap: 8,
                              marginTop: 10,
                              overflowX: 'auto',
                              padding: '4px 2px'
                            }}>
                              {photos.map((url, idx) => {
                                const isCurrent = idx === expandedPhotoIndex;
                                return (
                                  <button
                                    key={`thumb-expanded-${url}-${idx}`}
                                    type="button"
                                    onClick={() => setExpandedPhotoIndex(idx)}
                                    aria-label={`Ver foto ${idx + 1}`}
                                    style={{
                                      padding: 0,
                                      border: isCurrent ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.25)',
                                      borderRadius: 7,
                                      overflow: 'hidden',
                                      background: '#000',
                                      cursor: 'pointer',
                                      opacity: isCurrent ? 1 : 0.6,
                                      transform: isCurrent ? 'scale(1.04)' : 'none',
                                      flex: 'none'
                                    }}
                                  >
                                    <img
                                      src={url}
                                      alt=""
                                      style={{
                                        display: 'block',
                                        width: 58,
                                        height: 44,
                                        objectFit: 'cover'
                                      }}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: photos.length === 1
                            ? 'minmax(0, 480px)'
                            : 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                          gap: 12
                        }}>
                          {photos.map((url, photoIndex) => (
                            <button
                              key={`${url}-${photoIndex}`}
                              type="button"
                              onClick={() => setExpandedPhotoIndex(photoIndex)}
                              aria-label={`Ver evidencia ${photoIndex + 1} de ${stageName}`}
                              style={{
                                position: 'relative',
                                display: 'block',
                                width: '100%',
                                padding: 0,
                                margin: 0,
                                border: '1px solid #cbd5e1',
                                borderRadius: 12,
                                overflow: 'hidden',
                                background: '#0f172a',
                                cursor: 'pointer',
                                boxShadow: '0 3px 10px rgba(15, 23, 42, 0.08)',
                                transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-3px)';
                                e.currentTarget.style.boxShadow = '0 8px 22px rgba(15, 23, 42, 0.16)';
                                e.currentTarget.style.borderColor = '#94a3b8';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 3px 10px rgba(15, 23, 42, 0.08)';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                              }}
                            >
                              <img
                                src={url}
                                alt={`Evidencia ${photoIndex + 1} · ${stageName}`}
                                loading="lazy"
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  aspectRatio: '4 / 3',
                                  objectFit: 'cover'
                                }}
                              />
                              <div style={{
                                position: 'absolute',
                                bottom: 10,
                                right: 10,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '5px 10px',
                                background: 'rgba(15, 23, 42, 0.78)',
                                color: '#ffffff',
                                borderRadius: 8,
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                backdropFilter: 'blur(4px)',
                                WebkitBackdropFilter: 'blur(4px)',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                                pointerEvents: 'none'
                              }}>
                                <span>🔍</span>
                                <span>Ampliar</span>
                              </div>
                              <div style={{
                                position: 'absolute',
                                top: 10,
                                left: 10,
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '3px 8px',
                                background: 'rgba(15, 23, 42, 0.65)',
                                color: '#f8fafc',
                                borderRadius: 6,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                backdropFilter: 'blur(4px)',
                                WebkitBackdropFilter: 'blur(4px)',
                                pointerEvents: 'none'
                              }}>
                                Foto {photoIndex + 1} {photos.length > 1 ? `de ${photos.length}` : ''}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeStage !== 0 && (activeStage !== 1 || !hasRender) && !photos.length && !stageData.note && (
                    <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                      {stageComplete ? 'Esta etapa no tiene fotos ni notas registradas.' : 'Esta etapa aún no tiene avances registrados.'}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {productionStages.length > 0 && !showEvidence && (
            <div style={{ marginTop: 8, padding: '0.8rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <strong style={{ color: '#1e3a5f', fontSize: '0.78rem' }}>Avance de producción</strong>
                <span style={{ color: '#2563eb', fontSize: '0.72rem', fontWeight: 800 }}>
                  {delivered ? 'Entrega confirmada' : PRODUCTION_STAGES[currentProductionStage]}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: 6 }}>
                {PRODUCTION_STAGES.map((name, index) => {
                  const stage = productionStages[index] || {};
                  const complete = delivered || index < currentProductionStage;
                  const current = !delivered && index === currentProductionStage;
                  return (
                    <div key={name} style={{ padding: '0.5rem 0.55rem', background: complete ? '#f0fdf4' : current ? '#eff6ff' : '#fff', border: `1px solid ${complete ? '#bbf7d0' : current ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: 8 }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 750, color: complete ? '#166534' : current ? '#1d4ed8' : '#64748b' }}>
                        {complete ? '✓ ' : current ? '● ' : '○ '}{name}
                      </div>
                      {formatDate(stage.entered_at) && <div style={{ marginTop: 3, fontSize: '0.62rem', color: '#64748b' }}>{formatDate(stage.entered_at)}</div>}
                      {stage.note && <div style={{ marginTop: 4, fontSize: '0.67rem', color: '#475569', whiteSpace: 'pre-wrap' }}>{stage.note}</div>}
                      {!!stage.photos?.length && <div style={{ marginTop: 4, fontSize: '0.63rem', color: '#64748b' }}>📷 {stage.photos.length} evidencia{stage.photos.length === 1 ? '' : 's'}</div>}
                    </div>
                  );
                })}
              </div>
              {production.delivered_at && (
                <div style={{ marginTop: 8, fontSize: '0.7rem', color: '#166534', fontWeight: 700 }}>
                  Entregado el {formatDate(production.delivered_at)}
                </div>
              )}
            </div>
          )}

          {/* ── BITÁCORA DE FOTOS DE AVANCE EN TALLER (PUBLICADAS AL CLIENTE) ── */}
          <div style={{
            marginTop: 18,
            padding: '1.1rem',
            background: '#ffffff',
            border: '1px solid #bbf7d0',
            borderRadius: 14,
            boxShadow: '0 4px 16px rgba(22, 101, 52, 0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              <div>
                <div style={{ color: '#166534', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Bitácora de Fabricación
                </div>
                <h3 style={{ margin: '0.2rem 0 0', color: '#14532d', fontSize: '1.05rem', fontWeight: 800 }}>
                  📸 Avances Fotográficos de tu Mueble en Taller
                </h3>
                <p style={{ margin: '3px 0 0', color: '#475569', fontSize: '0.78rem' }}>
                  Fotografías reales capturadas por el equipo de carpintería durante el corte, ensamble y acabado.
                </p>
              </div>
              {dailyPublished.length > 0 && (
                <span style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: 999,
                  background: '#dcfce7',
                  color: '#15803d',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  border: '1px solid #86efac'
                }}>
                  {dailyPublished.length} {dailyPublished.length === 1 ? 'fotografía registrada' : 'fotografías registradas'}
                </span>
              )}
            </div>

            {dailyPublished.length === 0 ? (
              <div style={{
                padding: '2rem 1.5rem',
                textAlign: 'center',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: 10,
                color: '#64748b'
              }}>
                <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: 6 }}>🪵</span>
                <strong style={{ display: 'block', color: '#1e293b', fontSize: '0.88rem' }}>
                  Fotografías en preparación
                </strong>
                <span style={{ fontSize: '0.76rem', marginTop: 4, display: 'inline-block', maxWidth: 420 }}>
                  El equipo de carpintería subirá aquí fotos del progreso real de tu mueble conforme avance en las estaciones de trabajo de taller.
                </span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))', gap: 12 }}>
                {dailyPublished.map((adv, idx) => (
                  <div
                    key={adv.id || idx}
                    style={{
                      background: '#ffffff',
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setDailyLightboxIndex(idx)}
                      style={{
                        position: 'relative',
                        padding: 0,
                        border: 'none',
                        background: '#000',
                        cursor: 'pointer',
                        width: '100%',
                        aspectRatio: '4 / 3',
                        overflow: 'hidden',
                        display: 'block'
                      }}
                      title="Clic para ampliar en alta definición"
                    >
                      <img
                        src={adv.url}
                        alt={adv.comment || 'Avance de carpintería'}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      <span style={{
                        position: 'absolute', bottom: 6, right: 6,
                        background: 'rgba(15, 23, 42, 0.75)', color: '#ffffff',
                        fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px',
                        borderRadius: 6, backdropFilter: 'blur(4px)'
                      }}>
                        🔍 Ampliar
                      </span>
                    </button>
                    <div style={{ padding: '0.55rem 0.65rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>
                          📅 {adv.date}
                        </span>
                      </div>
                      {adv.comment ? (
                        <p style={{ margin: 0, fontSize: '0.74rem', color: '#1e293b', lineHeight: 1.35, wordBreak: 'break-word' }}>
                          {adv.comment}
                        </p>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic' }}>Avance de producción</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Lightbox / Visor de pantalla completa para el cliente */}
            {dailyLightboxIndex !== null && dailyPublished[dailyLightboxIndex] && (
              <div
                style={{
                  position: 'fixed', inset: 0, zIndex: 9999,
                  background: 'rgba(2, 6, 23, 0.92)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '1rem', backdropFilter: 'blur(6px)'
                }}
                onClick={() => setDailyLightboxIndex(null)}
              >
                <div
                  style={{
                    position: 'relative', maxWidth: 'min(92vw, 900px)', maxHeight: '88vh',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    background: '#0f172a', borderRadius: 14, overflow: 'hidden',
                    border: '1px solid #334155', boxShadow: '0 12px 40px rgba(0,0,0,0.6)'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 1rem', background: '#090d16', color: '#fff', borderBottom: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.85rem' }}>📷</span>
                      <strong style={{ fontSize: '0.82rem' }}>
                        Avance · {dailyPublished[dailyLightboxIndex].date}
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        ({dailyLightboxIndex + 1} de {dailyPublished.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDailyLightboxIndex(null)}
                      style={{ background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: 6, padding: '3px 9px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 800 }}
                    >
                      ✕ Cerrar
                    </button>
                  </div>

                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617', width: '100%', maxHeight: '68vh' }}>
                    <img
                      src={dailyPublished[dailyLightboxIndex].url}
                      alt=""
                      style={{ maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain', display: 'block' }}
                    />
                    {dailyPublished.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setDailyLightboxIndex((dailyLightboxIndex - 1 + dailyPublished.length) % dailyPublished.length)}
                          style={{
                            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                            width: 38, height: 38, borderRadius: '50%', background: 'rgba(15,23,42,0.8)',
                            color: '#fff', border: '1px solid #475569', fontSize: '1.3rem', cursor: 'pointer',
                            display: 'grid', placeItems: 'center'
                          }}
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          onClick={() => setDailyLightboxIndex((dailyLightboxIndex + 1) % dailyPublished.length)}
                          style={{
                            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                            width: 38, height: 38, borderRadius: '50%', background: 'rgba(15,23,42,0.8)',
                            color: '#fff', border: '1px solid #475569', fontSize: '1.3rem', cursor: 'pointer',
                            display: 'grid', placeItems: 'center'
                          }}
                        >
                          ›
                        </button>
                      </>
                    )}
                  </div>

                  {dailyPublished[dailyLightboxIndex].comment && (
                    <div style={{ width: '100%', padding: '0.65rem 1rem', background: '#090d16', color: '#e2e8f0', fontSize: '0.78rem', borderTop: '1px solid #1e293b' }}>
                      💬 {dailyPublished[dailyLightboxIndex].comment}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {prospect.delivery_date && !delivered && (
            <div style={{ marginTop: 8, color: '#475569', fontSize: '0.75rem' }}>
              Fecha de entrega acordada: <strong>{formatDate(`${prospect.delivery_date}T12:00:00`) || prospect.delivery_date}</strong>
            </div>
          )}
          {prospect.is_papelera && (
            <div style={{ marginTop: 8, padding: '0.55rem 0.7rem', background: '#fef2f2', color: '#b91c1c', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700 }}>
              Seguimiento pausado: el proyecto está en papelera.
            </div>
          )}
        </>
      )}
    </section>
  );
}
