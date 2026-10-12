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
  const [previewState, setPreviewState] = useState(null);

  useEffect(() => {
    if (!previewState) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setPreviewState(null);
      } else if (event.key === 'ArrowLeft' && previewState.photos.length > 1) {
        setPreviewState(prev => prev ? ({
          ...prev,
          index: (prev.index - 1 + prev.photos.length) % prev.photos.length
        }) : null);
      } else if (event.key === 'ArrowRight' && previewState.photos.length > 1) {
        setPreviewState(prev => prev ? ({
          ...prev,
          index: (prev.index + 1) % previewState.photos.length
        }) : null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewState]);
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
          <div style={{ height: 6, overflow: 'hidden', background: '#e9eef5', borderRadius: 999, marginTop: 13 }}>
            <div style={{ height: '100%', width: `${completion}%`, background: delivered ? '#16a34a' : '#2563eb', borderRadius: 999, transition: 'width 0.2s ease' }} />
          </div>
          <div style={{ display: 'flex', overflowX: 'auto', padding: '14px 2px 5px', gap: 0 }}>
            {stages.map((stage, index) => {
              const color = stage.complete ? '#16a34a' : stage.current ? '#2563eb' : '#94a3b8';
              return (
                <div key={stage.label} style={{ display: 'flex', alignItems: 'flex-start', minWidth: 138, flex: '1 0 138px' }}>
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{
                      display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: '50%',
                      color: stage.complete || stage.current ? '#fff' : '#64748b',
                      background: stage.complete ? '#16a34a' : stage.current ? '#2563eb' : '#f1f5f9',
                      border: `2px solid ${color}`, fontSize: '0.95rem', flex: 'none'
                    }}>
                      {stage.complete ? '✓' : stage.icon}
                    </div>
                    <span style={{ color: stage.current ? '#1d4ed8' : stage.complete ? '#166534' : '#64748b', fontSize: '0.72rem', fontWeight: stage.current ? 800 : 700, lineHeight: 1.25, marginTop: 6 }}>
                      {stage.label}
                    </span>
                    <span style={{ minHeight: 15, color: '#94a3b8', fontSize: '0.63rem', marginTop: 3 }}>
                      {formatDate(stage.date) || (stage.current ? 'Etapa actual' : stage.complete ? 'Completada' : 'Pendiente')}
                    </span>
                  </div>
                  {index < stages.length - 1 && (
                    <div aria-hidden="true" style={{ width: 18, flex: 'none', height: 2, marginTop: 17, background: index < currentIndex || delivered ? '#86efac' : '#e2e8f0' }} />
                  )}
                </div>
              );
            })}
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
                          onClick={() => setSelectedStage(index)}
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

                  {stageData.note && <div style={{ marginTop: 10, color: '#475569', fontSize: '0.84rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{stageData.note}</div>}

                  {photos.length > 0 && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: photos.length === 1
                        ? 'minmax(0, 480px)'
                        : 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                      gap: 14,
                      marginTop: 12
                    }}>
                      {photos.map((url, photoIndex) => (
                        <button
                          key={`${url}-${photoIndex}`}
                          type="button"
                          onClick={() => setPreviewState({ photos, index: photoIndex, stageName })}
                          aria-label={`Ver evidencia ${photoIndex + 1} de ${stageName} en pantalla completa`}
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

                  {activeStage !== 0 && !photos.length && !stageData.note && (
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

      {/* Visualizador de imagen en pantalla completa (Lightbox sin salir de la pantalla) */}
      {previewState && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Evidencia ampliada de ${previewState.stageName}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewState(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            boxSizing: 'border-box'
          }}
        >
          {/* Barra superior con título y botón cerrar */}
          <div style={{
            width: 'min(100%, 960px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 10,
            color: '#f8fafc'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '1rem', color: '#ffffff' }}>{previewState.stageName}</strong>
              {previewState.photos.length > 1 && (
                <span style={{
                  fontSize: '0.8rem',
                  padding: '3px 10px',
                  background: 'rgba(255, 255, 255, 0.16)',
                  borderRadius: 999,
                  color: '#e2e8f0',
                  fontWeight: 600
                }}>
                  {previewState.index + 1} de {previewState.photos.length}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setPreviewState(null)}
              aria-label="Cerrar vista de foto"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.45rem 1rem',
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                borderRadius: 8,
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; }}
            >
              ✕ Cerrar
            </button>
          </div>

          {/* Área principal de la foto */}
          <div style={{
            position: 'relative',
            maxWidth: 'min(100%, 960px)',
            maxHeight: 'min(76vh, 680px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img
              src={previewState.photos[previewState.index]}
              alt={`Evidencia ${previewState.index + 1} de ${previewState.photos.length} · ${previewState.stageName}`}
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: 'min(76vh, 680px)',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: 12,
                boxShadow: '0 20px 45px rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}
            />

            {previewState.photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewState(prev => ({
                      ...prev,
                      index: (prev.index - 1 + prev.photos.length) % prev.photos.length
                    }));
                  }}
                  aria-label="Foto anterior"
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'rgba(15, 23, 42, 0.78)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    fontSize: '1.6rem',
                    lineHeight: '1',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                    transition: 'background 0.15s, transform 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.95)';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.78)';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewState(prev => ({
                      ...prev,
                      index: (prev.index + 1) % prev.photos.length
                    }));
                  }}
                  aria-label="Siguiente foto"
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'rgba(15, 23, 42, 0.78)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    fontSize: '1.6rem',
                    lineHeight: '1',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                    transition: 'background 0.15s, transform 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.95)';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.78)';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  }}
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* Carrusel inferior de miniaturas */}
          {previewState.photos.length > 1 && (
            <div style={{
              display: 'flex',
              gap: 8,
              marginTop: 14,
              maxWidth: 'min(100%, 960px)',
              overflowX: 'auto',
              padding: '4px 2px'
            }}>
              {previewState.photos.map((url, idx) => {
                const isCurrent = idx === previewState.index;
                return (
                  <button
                    key={`modal-thumb-${url}-${idx}`}
                    type="button"
                    onClick={() => setPreviewState(prev => ({ ...prev, index: idx }))}
                    aria-label={`Ver foto ${idx + 1}`}
                    aria-current={isCurrent}
                    style={{
                      padding: 0,
                      border: isCurrent ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.25)',
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: '#000',
                      cursor: 'pointer',
                      opacity: isCurrent ? 1 : 0.6,
                      transform: isCurrent ? 'scale(1.05)' : 'none',
                      transition: 'opacity 0.15s, transform 0.15s, border-color 0.15s',
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
      )}
    </section>
  );
}
