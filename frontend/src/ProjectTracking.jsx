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

export const PRODUCTION_STAGES = [
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
  const rawStages = Array.isArray(production.stages) ? production.stages : [];
  let mappedStages = rawStages;
  if (rawStages.length === PRODUCTION_STAGES.length + 1) {
    const legacyStage = Number.isInteger(production.current_stage) ? production.current_stage : 0;
    const firstStage = rawStages[0] || {};
    const secondStage = rawStages[1] || {};
    mappedStages = [
      {
        ...firstStage,
        name: PRODUCTION_STAGES[0],
        entered_at: firstStage.entered_at || production.started_at || null,
        note: [firstStage.note, secondStage.note].filter(Boolean).join('\n'),
        photos: [...(firstStage.photos || []), ...(secondStage.photos || [])]
      },
      ...rawStages.slice(2).map((stage, index) => ({ ...stage, name: PRODUCTION_STAGES[index + 1] }))
    ];
  }
  const stages = PRODUCTION_STAGES.map((name, index) => {
    const stage = mappedStages[index] || {};
    return {
      ...stage,
      name,
      photos: Array.isArray(stage.photos) ? stage.photos : []
    };
  });
  return {
    ...production,
    stages
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
  const workItems = Array.isArray(production.work_items) ? production.work_items : [];
  const firstTrackedWork = workItems.find(item => item.status === 'PRODUCCION' || item.status === 'ENTREGADO');
  const delivered = status === 'ENTREGADO' || !!production.delivered_at;
  const productionStarted = !!production.started_at || workItems.some(item => item.status === 'PRODUCCION' || item.status === 'ENTREGADO');
  const inProduction = status === 'PRODUCCION' || delivered
    || productionStarted;
  const underContract = !!prospect.is_contract || !!prospect.contract_date || [
    'APROBADO', 'CONTRATO', 'CONTRATO PENDIENTE', 'PRODUCCION', 'ENTREGADO'
  ].includes(status);
  const quoteSent = !!prospect.has_quote || underContract || status === 'COTIZACION';
  const valuationDone = !!prospect.valuation_data || !!prospect.estimated_price || quoteSent
    || status === 'VALORACION';
  const currentIndex = delivered ? 5 : inProduction ? 4 : underContract ? 3
    : quoteSent ? 2 : valuationDone ? 1 : 0;
  const productionStage = Number.isInteger(production.current_stage)
    ? production.current_stage
    : firstTrackedWork?.production_data?.current_stage;
  const currentProductionStage = Number.isInteger(productionStage) && productionStarted
    ? Math.max(0, Math.min(productionStage, PRODUCTION_STAGES.length - 1))
    : 0;
  const activeWorkCount = workItems.filter(item => item.status === 'PRODUCCION').length;
  const standbyWorkCount = workItems.filter(item => item.status === 'STANDBY').length;

  return {
    production,
    workItems,
    delivered,
    currentIndex,
    currentProductionStage,
    completion: delivered ? 100 : Math.round((currentIndex / (TRACKING_STAGES.length - 1)) * 100),
    stageLabel: delivered
      ? 'Proyecto entregado'
      : workItems.length
        ? `${activeWorkCount} en producción · ${standbyWorkCount} en espera`
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

export default function ProjectTracking({
  prospect,
  allProjects = [],
  onSelectProject,
  compact = false,
  showEvidence = false,
  requestDetails = []
}) {
  const [selectedStage, setSelectedStage] = useState(null);
  const [galleryLightboxIndex, setGalleryLightboxIndex] = useState(null);

  const progress = getProjectTrackingProgress(prospect);
  const { production, workItems, delivered, currentIndex, currentProductionStage, completion, stageLabel } = progress;
  const firstTrackedWork = workItems.find(item => item.status === 'PRODUCCION' || item.status === 'ENTREGADO');
  const productionStages = production.stages.length
    ? production.stages
    : firstTrackedWork?.production_data?.stages || [];
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

  // Only build the PDF URL when the server signals the project could have a render
  const mayHaveRender = Boolean(
    prospect.render_pdf_path ||
    prospect.has_render_pdf ||
    prospect.render_applies ||
    prospect.render_image_path
  );
  const rawPdfUrl = mayHaveRender
    ? (prospect.public_id
        ? `/api/client-portal/${prospect.public_id}/render-pdf`
        : (prospect.id ? `/api/prospects/${prospect.id}/render-pdf` : null))
    : null;

  const [pdfStatus, setPdfStatus] = useState(() => {
    if (prospect.render_pdf_path || prospect.has_render_pdf) return 'ready';
    if (!mayHaveRender) return 'not_found';
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
  }, [rawPdfUrl, prospect.has_render_pdf, prospect.render_pdf_path, mayHaveRender]);

  const renderPdfUrl = pdfStatus === 'ready' ? rawPdfUrl : null;
  const hasRender = Boolean(
    pdfStatus === 'ready' ||
    pdfStatus === 'checking' ||
    prospect.render_pdf_path ||
    prospect.has_render_pdf ||
    prospect.render_image_path ||
    prospect.render_applies
  );
  const [imageError, setImageError] = useState(false);
  const rawImageUrl = safePhotoUrl(prospect.render_image_path);
  const isImagePdf = rawImageUrl && (rawImageUrl.toLowerCase().endsWith('.pdf') || rawImageUrl.toLowerCase().includes('/pdf'));
  const renderImageUrl = !isImagePdf ? rawImageUrl : null;

  useEffect(() => {
    setImageError(false);
  }, [prospect.render_image_path]);

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

  const dailyPublished = [
    ...(production.daily_advances || []),
    ...workItems.flatMap(item => (item.production_data?.daily_advances || [])
      .filter(advance => advance.published !== false)
      .map(advance => ({ ...advance, work_item_name: item.name })))
  ].filter(a => a.published !== false);

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

      {workItems.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))', gap:8, marginTop:12 }}>
          {workItems.map(item => {
            const itemProduction = item.production_data || {};
            const itemStage = Number.isInteger(itemProduction.current_stage)
              ? Math.max(0, Math.min(itemProduction.current_stage, PRODUCTION_STAGES.length - 1))
              : 0;
            const itemStatus = item.status === 'STANDBY' ? 'En espera'
              : item.status === 'ENTREGADO' ? 'Entregado'
                : PRODUCTION_STAGES[itemStage];
            const itemColor = item.status === 'STANDBY' ? '#92400e'
              : item.status === 'ENTREGADO' ? '#166534' : '#1d4ed8';
            const itemBackground = item.status === 'STANDBY' ? '#fffbeb'
              : item.status === 'ENTREGADO' ? '#f0fdf4' : '#eff6ff';
            return (
              <div key={item.id} style={{ minWidth:0, padding:'0.65rem 0.75rem', border:`1px solid ${item.status === 'STANDBY' ? '#fde68a' : item.status === 'ENTREGADO' ? '#bbf7d0' : '#bfdbfe'}`, borderRadius:9, background:itemBackground }}>
                <strong style={{ display:'block', color:'#334155', fontSize:'0.78rem', overflowWrap:'anywhere' }}>{item.name}</strong>
                <span style={{ display:'block', marginTop:4, color:itemColor, fontSize:'0.7rem', fontWeight:800 }}>{itemStatus}</span>
                {item.measurements && <span style={{ display:'block', marginTop:3, color:'#64748b', fontSize:'0.66rem' }}>{item.measurements}</span>}
              </div>
            );
          })}
        </div>
      )}

      {!compact && (
        <>
          {showEvidence && productionStages.length > 0 && (() => {
            const activeStage = selectedStage ?? currentProductionStage;
            const stageData = productionStages[activeStage] || {};
            const photos = (stageData.photos || []).map(safePhotoUrl).filter(Boolean);
            const stageName = PRODUCTION_STAGES[activeStage];
            const stageComplete = delivered || activeStage < currentProductionStage;
            const stageDailyAdvances = dailyPublished.filter(adv => {
              const advStage = adv.stage !== undefined && adv.stage !== null ? Number(adv.stage) : currentProductionStage;
              return advStage === activeStage;
            });
            const combinedStagePhotos = [
              ...photos.map((url, idx) => ({
                id: `stage-${idx}`,
                url,
                badge: photos.length > 1 ? `Foto ${idx + 1}` : 'Etapa',
                date: stageData.entered_at ? formatDate(stageData.entered_at) : null,
                comment: null,
                source: 'stage'
              })),
              ...stageDailyAdvances
                .map((adv, idx) => {
                  const cleanedUrl = safePhotoUrl(adv.url) || adv.url;
                  return {
                    id: adv.id || `daily-${idx}`,
                    url: cleanedUrl,
                    badge: [adv.work_item_name, adv.date ? `📅 ${adv.date}` : 'Taller'].filter(Boolean).join(' · '),
                    date: adv.date || null,
                    comment: adv.comment || null,
                    source: 'daily'
                  };
                })
                .filter(item => Boolean(item.url))
            ];
            return (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <div>
                    <strong style={{ color: '#0f172a', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🔄</span> Flujo y Avance por Etapas
                    </strong>
                    <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: 2 }}>
                      Toca o haz clic en cualquier círculo para consultar planos, fotos y notas de cada etapa.
                    </div>
                  </div>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0.35rem 0.75rem',
                    borderRadius: 20,
                    background: delivered ? '#f0fdf4' : '#eff6ff',
                    border: `1px solid ${delivered ? '#bbf7d0' : '#bfdbfe'}`,
                    color: delivered ? '#166534' : '#1d4ed8',
                    fontSize: '0.74rem',
                    fontWeight: 800
                  }}>
                    <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: delivered ? '#16a34a' : '#2563eb' }} />
                    {delivered ? 'Proyecto entregado' : `Etapa actual: ${PRODUCTION_STAGES[currentProductionStage]}`}
                  </span>
                </div>
                <div className="production-stage-flow is-client">
                  {PRODUCTION_STAGES.map((name, index) => {
                    const complete = delivered || index < currentProductionStage;
                    const current = !delivered && index === currentProductionStage;
                    const isActive = activeStage === index;
                    const reached = complete || current;
                    const color = complete ? '#16a34a' : current ? '#2563eb' : '#cbd5e1';

                    // Proyectos (hermanos o activo) que estén en esta etapa de taller
                    const projectsHere = allProjects.filter(p => {
                      const pTr = getProjectTrackingProgress(p);
                      return !pTr.delivered && pTr.currentIndex === 4 && pTr.currentProductionStage === index;
                    });
                    const workItemsHere = workItems.filter(wi => {
                      const wiStage = wi.production_data?.current_stage;
                      return wi.status === 'PRODUCCION' && Number.isInteger(wiStage) && wiStage === index;
                    });

                    return (
                      <React.Fragment key={name}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1 1 0', minWidth: 0 }}>
                          <button type="button" aria-pressed={isActive} aria-label={`${name}, ${complete ? 'completada' : current ? 'etapa actual' : 'pendiente'}`}
                            onClick={() => { setSelectedStage(index); setGalleryLightboxIndex(null); }}
                            className={`production-stage-button${isActive ? ' is-selected' : ''}${reached ? ' has-projects' : ''}`}
                            style={{ '--stage-color': color, '--stage-surface': complete ? '#f0fdf4' : current ? '#eff6ff' : '#f8fafc', color: current ? '#1d4ed8' : complete ? '#166534' : '#334155' }}>
                            <span className="production-stage-icon"><StageIcon stage={index} /></span>
                            <span className="production-stage-name">{name}</span>
                            <span className="production-stage-count" style={{ color: current ? '#1d4ed8' : complete ? '#15803d' : '#64748b' }}>
                              {complete ? 'Completada' : current ? 'Etapa actual' : 'Pendiente'}
                            </span>
                          </button>

                          {(projectsHere.length > 0 || workItemsHere.length > 0) && (
                            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', width: '100%' }}>
                              {projectsHere.map(p => {
                                const isThisActive = String(p.public_id || p.id).toUpperCase() === String(prospect.public_id || prospect.id).toUpperCase();
                                return (
                                  <span
                                    key={p.public_id || p.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onSelectProject) onSelectProject(p.public_id || p.id);
                                      setSelectedStage(index);
                                    }}
                                    title={`Proyecto: ${p.project_type || p.name} (Folio: ${p.public_id})`}
                                    style={{
                                      display: 'inline-block',
                                      maxWidth: '100%',
                                      padding: '2px 5px',
                                      borderRadius: 5,
                                      background: isThisActive ? '#ffedd5' : '#f8fafc',
                                      border: isThisActive ? '1.5px solid #ea580c' : '1px solid #cbd5e1',
                                      color: isThisActive ? '#9a3412' : '#334155',
                                      fontSize: '0.62rem',
                                      fontWeight: 800,
                                      cursor: onSelectProject ? 'pointer' : 'default',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      textAlign: 'center',
                                      boxShadow: isThisActive ? '0 1px 4px rgba(234, 88, 12, 0.2)' : 'none'
                                    }}
                                  >
                                    {isThisActive ? '● ' : '📍 '}{p.project_type || p.name}
                                  </span>
                                );
                              })}
                              {workItemsHere.map(wi => (
                                <span
                                  key={wi.id}
                                  title={`Área: ${wi.name}`}
                                  style={{
                                    display: 'inline-block',
                                    maxWidth: '100%',
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    background: '#e0f2fe',
                                    border: '1px solid #bae6fd',
                                    color: '#0369a1',
                                    fontSize: '0.58rem',
                                    fontWeight: 700,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    textAlign: 'center'
                                  }}
                                >
                                  📐 {wi.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {index < PRODUCTION_STAGES.length - 1 && (
                          <span className={`production-stage-connector${index < currentProductionStage || delivered ? ' is-lit' : ''}${!delivered && index === currentProductionStage ? ' is-next' : ''}`} aria-hidden="true" style={{ marginTop: 'clamp(20px, 4vw, 34px)' }}>
                            <span>›</span>
                          </span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {(() => {
                  const stageDisplayDate = stageData.entered_at
                    || (activeStage === 0 ? (prospect.capture_date || prospect.created_at) : null)
                    || (activeStage === 1 ? (prospect.contract_date) : null)
                    || (activeStage === 2 ? (production.started_at) : null)
                    || (activeStage === 5 ? (production.delivered_at || prospect.delivery_date) : null);
                  return (
                    <div style={{ padding: '0.9rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '1.25rem' }}>
                            {activeStage === 0 ? '📋' : activeStage === 1 ? '🧰' : activeStage === 2 ? '📐' : activeStage === 3 ? '🔨' : activeStage === 4 ? '🔍' : '🚚'}
                          </span>
                          <div>
                            <strong style={{ color: '#172b4d', fontSize: '0.98rem' }}>{stageName}</strong>
                            <div style={{ fontSize: '0.7rem', color: stageComplete ? '#166534' : (!delivered && activeStage === currentProductionStage) ? '#1d4ed8' : '#64748b', fontWeight: 700 }}>
                              {stageComplete ? '✓ Etapa completada' : (!delivered && activeStage === currentProductionStage) ? '● En proceso en taller' : '○ Etapa pendiente'}
                            </div>
                          </div>
                        </div>
                        {stageDisplayDate && (
                          <span style={{ color: '#64748b', fontSize: '0.74rem', background: '#fff', padding: '3px 9px', borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 600 }}>
                            📅 {formatDate(stageDisplayDate)}
                          </span>
                        )}
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

                        {renderImageUrl && !imageError ? (
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
                              onError={() => setImageError(true)}
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

                  {combinedStagePhotos.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      {/* Cabecera unificada de la galería */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginBottom: 10,
                        paddingBottom: 8,
                        borderBottom: '1px solid #e2e8f0'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '1rem' }}>📷</span>
                          <strong style={{ color: '#1e3a5f', fontSize: '0.88rem' }}>
                            Galería de avances en {stageName}
                          </strong>
                        </div>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          padding: '2px 10px',
                          borderRadius: 999,
                          border: '1px solid #bfdbfe'
                        }}>
                          {combinedStagePhotos.length} {combinedStagePhotos.length === 1 ? 'fotografía registrada' : 'fotografías registradas'}
                        </span>
                      </div>

                      {/* Cuadrícula unificada de fotos */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 230px), 1fr))',
                        gap: 12
                      }}>
                        {combinedStagePhotos.map((item, photoIndex) => (
                          <div
                            key={item.id || `${item.url}-${photoIndex}`}
                            style={{
                              background: '#ffffff',
                              borderRadius: 12,
                              overflow: 'hidden',
                              border: '1px solid #cbd5e1',
                              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
                              display: 'flex',
                              flexDirection: 'column',
                              transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-3px)';
                              e.currentTarget.style.boxShadow = '0 8px 22px rgba(15, 23, 42, 0.14)';
                              e.currentTarget.style.borderColor = '#94a3b8';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.06)';
                              e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setGalleryLightboxIndex(photoIndex)}
                              aria-label={`Ver foto ${photoIndex + 1} de ${stageName}`}
                              style={{
                                position: 'relative',
                                display: 'block',
                                width: '100%',
                                aspectRatio: '4 / 3',
                                padding: 0,
                                margin: 0,
                                border: 'none',
                                background: '#0f172a',
                                cursor: 'pointer',
                                overflow: 'hidden'
                              }}
                            >
                              <img
                                src={item.url}
                                alt={item.comment || `Evidencia ${photoIndex + 1} · ${stageName}`}
                                loading="lazy"
                                onError={(e) => {
                                  // Ocultar card si la imagen no carga o tiene enlace roto
                                  const card = e.currentTarget.closest('[style*="display: flex"]');
                                  if (card) card.style.display = 'none';
                                }}
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                              />

                              {/* Badge en esquina superior izquierda */}
                              <div style={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                background: 'rgba(15, 23, 42, 0.72)',
                                color: '#ffffff',
                                borderRadius: 6,
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                backdropFilter: 'blur(4px)',
                                WebkitBackdropFilter: 'blur(4px)',
                                pointerEvents: 'none'
                              }}>
                                {item.badge}
                              </div>

                              {/* Botón Ampliar */}
                              <div style={{
                                position: 'absolute',
                                bottom: 8,
                                right: 8,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 8px',
                                background: 'rgba(15, 23, 42, 0.8)',
                                color: '#ffffff',
                                borderRadius: 6,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                backdropFilter: 'blur(4px)',
                                WebkitBackdropFilter: 'blur(4px)',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                                pointerEvents: 'none'
                              }}>
                                <span>🔍</span>
                                <span>Ampliar</span>
                              </div>
                            </button>

                            {/* Detalle o comentario */}
                            <div style={{
                              padding: '0.6rem 0.75rem',
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: item.comment ? 'flex-start' : 'center',
                              background: '#ffffff',
                              borderTop: '1px solid #f1f5f9'
                            }}>
                              {item.comment ? (
                                <p style={{
                                  margin: 0,
                                  fontSize: '0.76rem',
                                  color: '#1e293b',
                                  lineHeight: 1.35,
                                  wordBreak: 'break-word'
                                }}>
                                  {item.comment}
                                </p>
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                  {item.date ? `Fecha: ${item.date}` : `Fotografía de ${stageName}`}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lightbox unificado en modal para recorrer TODAS las fotos de la etapa */}
                  {galleryLightboxIndex !== null && combinedStagePhotos[galleryLightboxIndex] && (
                    <div
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: 'rgba(2, 6, 23, 0.94)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)'
                      }}
                      onClick={() => setGalleryLightboxIndex(null)}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          maxWidth: 'min(92vw, 920px)',
                          maxHeight: '90vh',
                          display: 'flex',
                          flexDirection: 'column',
                          background: '#0f172a',
                          borderRadius: 14,
                          overflow: 'hidden',
                          border: '1px solid #334155',
                          boxShadow: '0 16px 48px rgba(0,0,0,0.7)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Cabecera del Lightbox */}
                        <div style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem 1rem',
                          background: '#090d16',
                          color: '#ffffff',
                          borderBottom: '1px solid #1e293b'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.88rem', color: '#ffffff' }}>📷 {stageName}</strong>
                            <span style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              background: 'rgba(255, 255, 255, 0.16)',
                              borderRadius: 999,
                              color: '#e2e8f0',
                              fontWeight: 600
                            }}>
                              Foto {galleryLightboxIndex + 1} de {combinedStagePhotos.length}
                            </span>
                            {combinedStagePhotos[galleryLightboxIndex].date && (
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                · {combinedStagePhotos[galleryLightboxIndex].date}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setGalleryLightboxIndex(null)}
                            style={{
                              background: '#1e293b',
                              color: '#ffffff',
                              border: '1px solid #334155',
                              borderRadius: 6,
                              padding: '4px 10px',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              fontWeight: 700
                            }}
                          >
                            ✕ Cerrar
                          </button>
                        </div>

                        {/* Contenedor de la foto principal */}
                        <div style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#020617',
                          width: '100%',
                          maxHeight: 'min(68vh, 600px)',
                          minHeight: 260,
                          overflow: 'hidden'
                        }}>
                          <img
                            src={combinedStagePhotos[galleryLightboxIndex].url}
                            alt=""
                            style={{
                              maxWidth: '100%',
                              maxHeight: 'min(68vh, 600px)',
                              width: 'auto',
                              height: 'auto',
                              objectFit: 'contain',
                              display: 'block'
                            }}
                          />

                          {/* Flechas de navegación */}
                          {combinedStagePhotos.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={() => setGalleryLightboxIndex((galleryLightboxIndex - 1 + combinedStagePhotos.length) % combinedStagePhotos.length)}
                                aria-label="Foto anterior"
                                style={{
                                  position: 'absolute',
                                  left: 12,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  width: 42,
                                  height: 42,
                                  borderRadius: '50%',
                                  background: 'rgba(15,23,42,0.85)',
                                  color: '#ffffff',
                                  border: '1px solid rgba(255,255,255,0.3)',
                                  fontSize: '1.5rem',
                                  lineHeight: 1,
                                  display: 'grid',
                                  placeItems: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                }}
                              >
                                ‹
                              </button>
                              <button
                                type="button"
                                onClick={() => setGalleryLightboxIndex((galleryLightboxIndex + 1) % combinedStagePhotos.length)}
                                aria-label="Foto siguiente"
                                style={{
                                  position: 'absolute',
                                  right: 12,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  width: 42,
                                  height: 42,
                                  borderRadius: '50%',
                                  background: 'rgba(15,23,42,0.85)',
                                  color: '#ffffff',
                                  border: '1px solid rgba(255,255,255,0.3)',
                                  fontSize: '1.5rem',
                                  lineHeight: 1,
                                  display: 'grid',
                                  placeItems: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                }}
                              >
                                ›
                              </button>
                            </>
                          )}
                        </div>

                        {/* Pie con comentario si existe */}
                        {combinedStagePhotos[galleryLightboxIndex].comment && (
                          <div style={{
                            width: '100%',
                            padding: '0.65rem 1rem',
                            background: '#090d16',
                            color: '#e2e8f0',
                            fontSize: '0.8rem',
                            borderTop: '1px solid #1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}>
                            <span>💬</span>
                            <span>{combinedStagePhotos[galleryLightboxIndex].comment}</span>
                          </div>
                        )}

                        {/* Tira de miniaturas */}
                        {combinedStagePhotos.length > 1 && (
                          <div style={{
                            display: 'flex',
                            gap: 8,
                            padding: '8px 12px',
                            background: '#060a12',
                            borderTop: '1px solid #1e293b',
                            overflowX: 'auto'
                          }}>
                            {combinedStagePhotos.map((thumb, tIdx) => {
                              const isCurrent = tIdx === galleryLightboxIndex;
                              return (
                                <button
                                  key={`thumb-${thumb.id || tIdx}`}
                                  type="button"
                                  onClick={() => setGalleryLightboxIndex(tIdx)}
                                  aria-label={`Ver foto ${tIdx + 1}`}
                                  style={{
                                    padding: 0,
                                    border: isCurrent ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: 6,
                                    overflow: 'hidden',
                                    background: '#000',
                                    cursor: 'pointer',
                                    opacity: isCurrent ? 1 : 0.55,
                                    transform: isCurrent ? 'scale(1.04)' : 'none',
                                    flex: 'none'
                                  }}
                                >
                                  <img
                                    src={thumb.url}
                                    alt=""
                                    style={{
                                      display: 'block',
                                      width: 54,
                                      height: 40,
                                      objectFit: 'cover'
                                    }}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeStage !== 0 && (activeStage !== 1 || !hasRender) && !combinedStagePhotos.length && !stageData.note && (
                    <div style={{
                      marginTop: 12,
                      padding: '1.4rem 1rem',
                      textAlign: 'center',
                      background: '#ffffff',
                      borderRadius: 10,
                      border: '1px dashed #cbd5e1',
                      color: '#64748b'
                    }}>
                      <span style={{ fontSize: '1.6rem', display: 'block', marginBottom: 4 }}>
                        {activeStage === 5 ? (delivered ? '✅' : '🚚') : stageComplete ? '✓' : '⏳'}
                      </span>
                      <strong style={{ display: 'block', color: '#334155', fontSize: '0.88rem' }}>
                        {activeStage === 5
                          ? (delivered ? '¡Proyecto entregado con éxito!' : 'Etapa de Entrega y Cierre')
                          : stageComplete
                            ? 'Etapa concluida en taller'
                            : 'Etapa en proceso o próxima a iniciar'}
                      </strong>
                      <span style={{ fontSize: '0.76rem', marginTop: 3, display: 'inline-block' }}>
                        {activeStage === 5
                          ? (delivered
                              ? (production.delivered_at ? `Entrega final realizada el ${formatDate(production.delivered_at)}.` : 'El proyecto ya fue entregado.')
                              : (prospect.delivery_date ? `Fecha programada de entrega: ${formatDate(`${prospect.delivery_date}T12:00:00`) || prospect.delivery_date}.` : 'Te notificaremos cuando tu proyecto esté listo para entrega.'))
                          : stageComplete
                            ? 'El equipo de taller completó esta fase y continuó con el siguiente paso.'
                            : 'Las fotografías de evidencia y notas se irán publicando aquí conforme el equipo trabaje en ella.'}
                      </span>
                    </div>
                  )}
                    </div>
                  );
                })()}
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
