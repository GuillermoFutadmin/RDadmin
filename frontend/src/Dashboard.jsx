import React, { useState, useEffect } from 'react';
import { IconUsers, IconCheckCircle, IconPalette, IconRuler, IconFileText, IconPlusCircle, IconTrendingUp, IconTrash, IconPackage, IconClock } from './icons';
import useAutoRefresh from './useAutoRefresh';
import { isInProspects } from './workCascade';
import { getDashboardProductionProjects } from './productionWorkItems';
import { getProductionFreshness } from './dashboardMetrics';
import './Dashboard.css';

const API = '';

const CLIENT_STAGES = [
  { key: 'APROBADO',     label: 'Aprobado',     icon: IconCheckCircle, color: '#166534', bg: '#dcfce7', border: '#86efac' },
  { key: 'RENDER SI/NO', label: 'Render',       icon: IconPalette, color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  { key: 'ESTIMACIÓN',   label: 'Estimación',   icon: IconRuler, color: '#3730a3', bg: '#e0e7ff', border: '#a5b4fc' },
  { key: 'CONTRATO PENDIENTE', label: 'Contrato pendiente', icon: IconFileText, color: '#c2410c', bg: '#fff7ed', border: '#fdba74' },
  { key: 'CONTRATO',     label: 'Contrato',     icon: IconFileText, color: '#9d174d', bg: '#fce7f3', border: '#f9a8d4' },
];

const PROSPECT_STAGES = [
  { key: 'Prospecto',   label: 'Nuevo',        icon: IconPlusCircle, color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
  { key: 'Valoración',  label: 'Valoración',   icon: IconTrendingUp, color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  { key: 'Cotización',  label: 'Cotización',   icon: IconFileText, color: '#14532d', bg: '#f0fdf4', border: '#86efac' },
  { key: 'papelera',    label: 'Papelera',     icon: IconTrash, color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
];

const PRODUCTION_STAGE_NAMES = [
  'Generando información',
  'Preparación de materiales',
  'Producción iniciada',
  'Avance 1',
  'Avance 2 / revisión',
  'Entrega del proyecto',
];

const PRODUCTION_STAGE_EMOJIS = ['📋', '🧰', '🪚', '🔨', '🔍', '🚚', '✅'];

const PRODUCTION_STAGES = [
  ...PRODUCTION_STAGE_NAMES.map((label, index) => ({
    key: `stage-${index}`,
    label,
    stageIndex: index,
    icon: index === 0 ? IconPackage : IconClock,
    color: '#1d4ed8',
    bg: '#eff6ff',
    border: '#bfdbfe',
  })),
  { key: 'delivered', label: 'Entregados', icon: IconCheckCircle, color: '#166534', bg: '#dcfce7', border: '#86efac' },
];

function parseProductionData(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function getProductionStage(project) {
  const production = parseProductionData(project.production_data);
  const stage = Number.isInteger(production.current_stage) ? production.current_stage : 0;
  if (Array.isArray(production.stages) && production.stages.length === 7) {
    return stage <= 1 ? 0 : stage - 1;
  }
  return stage;
}

function getClientStatus(c) {
  const valid = ['APROBADO', 'RENDER SI/NO', 'ESTIMACIÓN', 'CONTRATO', 'CONTRATO PENDIENTE'];
  if (c.status && valid.includes(c.status)) return c.status;
  return 'APROBADO';
}

function formatRegisteredDate(item) {
  const value = item.capture_date || item.created_at;
  if (!value) return 'Fecha no disponible';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';

  return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Compact counter badge
function CountBadge({ count, color, bg, className = '' }) {
  return (
    <span className={className} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: '1.6rem', height: '1.6rem', borderRadius: '6px',
      background: bg, color, fontWeight: '800', fontSize: '0.88rem',
      padding: '0 0.35rem'
    }}>
      {count === null ? '–' : count}
    </span>
  );
}

function DashboardStageNode({ stage, groupKey, color, onHover }) {
  const StageGlyph = stage.icon;
  const productionEmojiIndex = stage.key === 'delivered' ? PRODUCTION_STAGE_EMOJIS.length - 1 : stage.stageIndex;
  const icon = groupKey === 'production' && Number.isInteger(productionEmojiIndex)
    ? <span className="dashboard-stage-emoji" aria-hidden="true">{PRODUCTION_STAGE_EMOJIS[productionEmojiIndex]}</span>
    : <StageGlyph aria-hidden="true" />;
  return (
    <div
      className="dashboard-stage-node"
      tabIndex={0}
      aria-label={`${stage.label}: ${stage.count ?? 'cargando'}`}
      onMouseEnter={() => onHover(`${groupKey}-${stage.key}`)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(`${groupKey}-${stage.key}`)}
      onBlur={() => onHover(null)}
    >
      <span className="dashboard-stage-marker" style={{ '--stage-color': color }}>
        {icon}
      </span>
      <span className="dashboard-stage-label">{stage.label}</span>
      <CountBadge count={stage.count} color={color} bg="#ffffff" className="dashboard-stage-count" />
    </div>
  );
}

function formatFreshnessDate(timestamp) {
  if (timestamp === null) return 'Sin fecha de actualización';
  return new Date(timestamp).toLocaleString('es-MX', {
    timeZone: 'America/Tijuana',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function ProductionFreshnessCard({ projects, loading }) {
  const [expanded, setExpanded] = useState(false);
  const freshness = getProductionFreshness(projects || []);
  const circumference = 2 * Math.PI * 45;
  const toneLabels = {
    green: 'Todos al día',
    amber: 'Algunos pendientes',
    red: 'Mayoría pendiente',
    neutral: 'Sin producción activa'
  };
  const percentage = freshness.total ? Math.round(freshness.ratio * 100) : null;

  return (
    <article className={`dashboard-insight-card dashboard-freshness-card is-${freshness.tone}`}>
      <div>
        <div className="dashboard-insight-eyebrow">Semáforo de producción</div>
        <h2 className="dashboard-insight-title">Actualización en producción</h2>
        <p className="dashboard-insight-description">Actividad registrada en las últimas 24 horas.</p>
      </div>
      <button
        type="button"
        className="dashboard-freshness-control"
        aria-expanded={expanded}
        aria-label={`${loading ? 'Cargando estado' : toneLabels[freshness.tone]}. ${freshness.fresh} de ${freshness.total} trabajos actualizados en las últimas 24 horas.`}
        onClick={() => setExpanded(value => !value)}
        disabled={loading}
      >
        <svg className="dashboard-freshness-ring" viewBox="0 0 108 108" role="img" aria-hidden="true">
          <circle className="dashboard-freshness-track" cx="54" cy="54" r="45" />
          <circle
            className="dashboard-freshness-progress"
            cx="54"
            cy="54"
            r="45"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - (freshness.total ? freshness.ratio : 0))}
          />
        </svg>
        <span className="dashboard-freshness-value">{loading ? '…' : percentage === null ? '—' : `${percentage}%`}</span>
      </button>
      <div className="dashboard-freshness-summary">
        <strong>{loading ? 'Cargando estado…' : toneLabels[freshness.tone]}</strong>
        <span>{loading ? ' ' : `${freshness.fresh} al día · ${freshness.stale} pendientes`}</span>
      </div>
      {expanded && !loading && freshness.total > 0 && (
        <div className="dashboard-freshness-details">
          {freshness.items.map(project => (
            <div className="dashboard-freshness-item" key={project.semaforoKey || project.id}>
              <span className={`dashboard-freshness-dot${project.isFresh ? ' is-fresh' : ' is-stale'}`} />
              <span>{project.name || 'Cliente'} · {project.workItemName || project.project_type || 'Proyecto'}</span>
              <small>{formatFreshnessDate(project.lastUpdatedAt)}</small>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function Dashboard() {
  const [prospects, setProspects] = useState(null);
  const [contratos, setContratos] = useState(null);
  const [productionProjects, setProductionProjects] = useState(null);
  const [hoveredStage, setHoveredStage] = useState(null);

  const refreshDashboard = async () => {
    const response = await fetch(`${API}/api/prospects?light=true`);
    if (!response.ok) throw new Error(`No se pudo sincronizar el panel (${response.status})`);
    const data = await response.json();
    const all = Array.isArray(data) ? data : [];
    setProspects(all.filter(p => !p.is_contract && (p.is_papelera || isInProspects(p))));
    setContratos(all.filter(p => p.is_contract && !['PRODUCCION', 'ENTREGADO'].includes(p.status)));
    setProductionProjects(all.filter(p =>
      p.is_contract && p.production_data && ['PRODUCCION', 'ENTREGADO'].includes(p.status)
    ));
  };

  useEffect(() => { refreshDashboard().catch(error => console.error(error)); }, []);
  useAutoRefresh(refreshDashboard);

  // Prospect state counts
  const prospectStages = PROSPECT_STAGES.map(st => {
    let filtered = [];
    if (prospects) {
      if (st.key === 'papelera') {
        filtered = prospects.filter(p => p.is_papelera);
      } else if (st.key === 'Valoración') {
        filtered = prospects.filter(p => isInProspects(p) && !p.is_papelera && (p.status === 'Valoración' || p.status === 'Valoracion'));
      } else if (st.key === 'Cotización') {
        filtered = prospects.filter(p => isInProspects(p) && !p.is_papelera && p.status === 'Cotización');
      } else {
        filtered = prospects.filter(p => isInProspects(p) && !p.is_papelera && (!p.status || p.status === 'New' || p.status === 'Prospecto'));
      }
    }
    return {
      ...st,
      count: prospects ? filtered.length : null,
      items: filtered
    };
  });
  const totalProspects = prospects ? prospectStages.reduce((sum, s) => sum + (s.count || 0), 0) : null;

  // Client pipeline counts
  const clientStages = CLIENT_STAGES.map(st => {
    let filtered = [];
    if (contratos) {
      filtered = contratos.filter(c => getClientStatus(c) === st.key);
    }
    return {
      ...st,
      count: contratos ? filtered.length : null,
      items: filtered
    };
  });
  const totalClientes = contratos ? contratos.length : null;

  const dashboardProductionProjects = productionProjects
    ? getDashboardProductionProjects(productionProjects)
    : null;
  const productionStages = PRODUCTION_STAGES.map(stage => {
    const items = dashboardProductionProjects
      ? dashboardProductionProjects.filter(project => stage.key === 'delivered'
        ? project.status === 'ENTREGADO'
        : project.status === 'PRODUCCION' && getProductionStage(project) === stage.stageIndex)
      : [];
    return { ...stage, count: dashboardProductionProjects ? items.length : null, items };
  });
  const totalProduction = dashboardProductionProjects ? dashboardProductionProjects.length : null;
  const stageGroups = [
    {
      key: 'prospect',
      label: 'Prospectos',
      icon: IconUsers,
      total: totalProspects,
      color: '#475569',
      stages: prospectStages.filter(stage => stage.key !== 'papelera'),
      branch: prospectStages.find(stage => stage.key === 'papelera')
    },
    {
      key: 'client',
      label: 'Clientes',
      icon: IconFileText,
      total: totalClientes,
      color: '#6d5aa6',
      stages: clientStages
    },
    {
      key: 'production',
      label: 'Producción',
      icon: IconPackage,
      total: totalProduction,
      color: '#315f91',
      stages: productionStages
    }
  ];
  const hoveredStageDetails = stageGroups.flatMap(group => [
    ...group.stages.map(stage => ({ groupKey: group.key, stage })),
    ...(group.branch ? [{ groupKey: group.key, stage: group.branch }] : [])
  ]).find(({ groupKey, stage }) => hoveredStage === `${groupKey}-${stage.key}`);

  return (
    <>
    <section className="dashboard-lifecycle" aria-label="Flujo de prospectos, clientes y producción">
      <div className="dashboard-lifecycle-scroll">
        <div className="dashboard-lifecycle-groups">
          {stageGroups.map((group, groupIndex) => {
            const GroupIcon = group.icon;
            return (
              <section className={`dashboard-lifecycle-group dashboard-lifecycle-group--${group.key}`} key={group.key} style={{ '--group-color': group.color }}>
                <header className="dashboard-lifecycle-heading">
                  <span className="dashboard-lifecycle-title">
                    <GroupIcon aria-hidden="true" />
                    {group.label}
                  </span>
                  <span className="dashboard-lifecycle-total">{group.total ?? '...'}</span>
                </header>
                <div className="dashboard-stage-track">
                  {group.stages.map((stage, index) => (
                    <div className="dashboard-stage-slot" key={stage.key}>
                      {group.branch && stage.key === 'Cotización' && (
                        <div className="dashboard-trash-branch">
                          <span className="dashboard-trash-connector" aria-hidden="true" />
                          <DashboardStageNode stage={group.branch} groupKey={group.key} color="#a14646" onHover={setHoveredStage} />
                        </div>
                      )}
                      {index > 0 && <span className="dashboard-stage-connector" aria-hidden="true" />}
                      <DashboardStageNode stage={stage} groupKey={group.key} color={group.color} onHover={setHoveredStage} />
                    </div>
                  ))}
                </div>
                {groupIndex < stageGroups.length - 1 && <span className="dashboard-lifecycle-divider" aria-hidden="true" />}
              </section>
            );
          })}
        </div>
      </div>
      {hoveredStageDetails?.stage.items.length > 0 && (
        <div className="dashboard-stage-details" role="status">
          <strong>{hoveredStageDetails.stage.label} · {hoveredStageDetails.stage.items.length}</strong>
          <div className="dashboard-stage-details-list">
            {hoveredStageDetails.stage.items.map((item, index) => (
              <div className="dashboard-stage-detail" key={item.id || index}>
                <span>{item.name || 'Sin nombre'}</span>
                <span>{item.project_type || 'Proyecto sin definir'}</span>
                <small>Registrado: {formatRegisteredDate(item)}</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
    <section className="dashboard-insights" aria-label="Semáforo de actualización en producción">
      <ProductionFreshnessCard projects={dashboardProductionProjects || []} loading={dashboardProductionProjects === null} />
    </section>
    </>
  );
}

export default Dashboard;
