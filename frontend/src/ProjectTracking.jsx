import React, { useState } from 'react';
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginTop: 10 }}>
                      {photos.map((url, photoIndex) => (
                        <a key={`${url}-${photoIndex}`} href={url} target="_blank" rel="noreferrer" aria-label={`Abrir evidencia ${photoIndex + 1} de ${stageName}`}>
                          <img src={url} alt={`Evidencia ${photoIndex + 1} · ${stageName}`} loading="lazy"
                            style={{ display: 'block', width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', border: '1px solid #cbd5e1', borderRadius: 9 }} />
                        </a>
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
    </section>
  );
}
