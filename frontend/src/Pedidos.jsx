import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ContratoDetail, getMeasureSections } from './Contratos';
import useAutoRefresh from './useAutoRefresh';
import { StageIcon, PRODUCTION_STAGE_NAMES } from './StageIcon';
import { convertPdfToImageUrls } from './pdfUtils';
import { getSemaforoWorkItems, getSemaforoWorkItemStageCounts } from './productionWorkItems';

const API = import.meta.env.VITE_API_URL || '';
import { fetchFullProspect, mergeHeavy } from './prospectData';
const STAGE_NAMES = PRODUCTION_STAGE_NAMES;

const SPANISH_LABELS = {
  production_days: 'Días de producción',
  start_date: 'Fecha de inicio',
  delivery_date: 'Fecha de entrega',
  kitchen_measurements: 'Medidas de cocina',
  closet_measurements: 'Medidas de clóset',
  kitchen_island_measurements: 'Medidas de isla de cocina',
  closet_island_measurements: 'Medidas de isla de clóset',
  render: 'Render',
  measurements: 'Medidas generales del cliente'
};

const parseJson = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

const spanishFieldLabel = (key) => {
  const normalized = String(key).replace(/([a-z])([A-Z])/g, '$1_$2').replaceAll('-', '_').toLowerCase();
  return SPANISH_LABELS[normalized] || normalized.replaceAll('_', ' ');
};

const chunkItems = (items, size) => Array.from(
  { length: Math.ceil(items.length / size) },
  (_, index) => items.slice(index * size, index * size + size)
);

const normalizeProduction = (value) => {
  const production = parseJson(value);
  if (!Array.isArray(production.stages)) return { ...production, stages: [] };
  if (production.stages.length === STAGE_NAMES.length + 1) {
    const legacyStage = Number.isInteger(production.current_stage) ? production.current_stage : 0;
    const firstStage = production.stages[0] || {};
    const secondStage = production.stages[1] || {};
    const notes = [firstStage.note, secondStage.note].filter(Boolean);
    return {
      ...production,
      current_stage: legacyStage <= 1 ? 0 : legacyStage - 1,
      stages: [
        {
          ...firstStage,
          name: STAGE_NAMES[0],
          entered_at: firstStage.entered_at || production.started_at || null,
          note: notes.join('\n'),
          photos: [...(firstStage.photos || []), ...(secondStage.photos || [])]
        },
        ...production.stages.slice(2).map((stage, index) => ({ ...stage, name: STAGE_NAMES[index + 1] }))
      ]
    };
  }
  if (production.stages.length === STAGE_NAMES.length) {
    return {
      ...production,
      stages: production.stages.map((stage, index) => ({ ...stage, name: STAGE_NAMES[index] }))
    };
  }
  return production;
};

const productionStageIndex = (project) => {
  const current = normalizeProduction(project.production_data).current_stage;
  return Number.isInteger(current) ? Math.max(0, Math.min(current, STAGE_NAMES.length - 1)) : 0;
};

const formatDate = (value) => value
  ? new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Pendiente';

const formatReadableDate = (dateKey) => {
  if (!dateKey) return '';
  const parts = String(dateKey).split('-');
  if (parts.length < 3) return String(dateKey);
  const [year, month, day] = parts.map(Number);
  const d = new Date(year, month - 1, day, 12);
  return d.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const calendarDate = (value) => {
  if (!value) return null;
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const countBusinessDays = (start, end) => {
  const current = new Date(start);
  current.setHours(12, 0, 0, 0);
  const last = new Date(end);
  last.setHours(12, 0, 0, 0);
  let days = 0;
  while (current < last) {
    current.setDate(current.getDate() + 1);
    if (current.getDay() !== 0 && current.getDay() !== 6) days += 1;
  }
  return days;
};

const addBusinessDays = (start, days) => {
  const date = new Date(start);
  date.setHours(12, 0, 0, 0);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) added += 1;
  }
  return date;
};

const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthCalendarDays = (month) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

const getWeekCalendarDays = (date) => {
  const start = new Date(date);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
};

const shiftCalendarDate = (date, amount, view) => {
  if (view !== 'month') {
    const shifted = new Date(date);
    shifted.setDate(shifted.getDate() + amount * (view === 'week' ? 7 : 1));
    return shifted;
  }
  const targetMonth = new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
  const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
  targetMonth.setDate(Math.min(date.getDate(), lastDay));
  return targetMonth;
};

const getProductionSchedule = (project, now) => {
  const production = normalizeProduction(project.production_data);
  const startedAt = production.started_at || production.stages[0]?.entered_at;
  const startDate = calendarDate(startedAt);
  const plannedDays = Number.parseInt(project.production_days, 10);
  if (!startDate || !Number.isFinite(plannedDays) || plannedDays <= 0) return null;

  const deliveredAt = project.status === 'ENTREGADO' ? production.delivered_at : null;
  const endDate = calendarDate(deliveredAt) || now;
  const elapsedDays = countBusinessDays(startDate, endDate);
  const deadline = addBusinessDays(startDate, plannedDays);
  const expectedStage = project.status === 'ENTREGADO'
    ? STAGE_NAMES.length - 1
    : Math.min(Math.floor((elapsedDays * STAGE_NAMES.length) / plannedDays), STAGE_NAMES.length - 1);

  return {
    startDate,
    plannedDays,
    elapsedDays,
    deadline,
    expectedStage,
    timeProgress: Math.min(100, Math.round((elapsedDays / plannedDays) * 100)),
    daysRemaining: endDate <= deadline
      ? countBusinessDays(endDate, deadline)
      : -countBusinessDays(deadline, endDate)
  };
};

const imageUrl = (url) => url?.startsWith('http') || url?.startsWith('data:') ? url : `${API}${url || ''}`;
const getCurrentIsoTimestamp = () => new Date().toISOString();

const collectImageUrls = (...values) => {
  const urls = new Set();
  const visit = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (typeof value === 'object') {
      if (value.url || value.path || value.image) visit(value.url || value.path || value.image);
      else Object.values(value).forEach(visit);
    } else if (typeof value === 'string') {
      const normalized = value.trim();
      if (normalized.startsWith('data:')) {
        urls.add(normalized);
      } else {
        normalized.split(',').map(item => item.trim()).filter(Boolean).forEach(url => urls.add(url));
      }
    }
  };
  values.forEach(visit);
  return [...urls];
};

function InfoCard({ label, children }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <div style={{ minWidth: 0, padding: '0.85rem 1rem', border: '1px solid #e2e8f0', borderRadius: 12, background: '#f5f7fa' }}>
      <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      <div style={{ color: '#263449', fontSize: '0.88rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{children}</div>
    </div>
  );
}

const SECTION_KIND_STYLES = {
  info: { label: '🔒 Información · solo consulta', color: '#475569', background: '#e2e8f0' },
  action: { label: '✏️ Por capturar / revisar', color: '#9a3412', background: '#ffedd5' },
  done: { label: '✅ Resuelto', color: '#166534', background: '#dcfce7' }
};
const SECTION_BLOCK_STYLES = {
  info: { background: '#f8fafc', border: '1px solid #e2e8f0' },
  action: { background: '#fffaf3', border: '1.5px solid #fb923c', boxShadow: '0 2px 10px rgba(249, 115, 22, 0.10)' }
};

function SectionTag({ kind, children }) {
  const style = SECTION_KIND_STYLES[kind] || SECTION_KIND_STYLES.info;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.18rem 0.55rem', borderRadius: 20, background: style.background, color: style.color, fontSize: '0.66rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
      {children || style.label}
    </span>
  );
}

const getSemaforoProjectKey = project => project.semaforoKey || String(project.id);

const getProjectDisplayName = project => project.workItemName
  ? `${project.name || 'Cliente sin nombre'} · ${project.workItemName}`
  : project.name || 'Cliente sin nombre';

const getProjectStaleInfo = (project, now = Date.now()) => {
  if (project.status === 'ENTREGADO') return { isStale: false, hours: 0 };
  const prod = normalizeProduction(project.production_data);
  const timestamps = [];
  if (prod.started_at) timestamps.push(new Date(prod.started_at).getTime());
  if (Array.isArray(prod.stages)) {
    prod.stages.forEach(stg => {
      if (stg.entered_at) timestamps.push(new Date(stg.entered_at).getTime());
      if (Array.isArray(stg.photos)) {
        stg.photos.forEach(ph => {
          const u = ph.uploaded_at || ph.created_at;
          if (u) timestamps.push(new Date(u).getTime());
        });
      }
    });
  }
  if (Array.isArray(prod.daily_advances)) {
    prod.daily_advances.forEach(adv => {
      const u = adv.created_at || (adv.date ? `${adv.date}T12:00:00` : null);
      if (u) timestamps.push(new Date(u).getTime());
    });
  }
  if (!timestamps.length && project.updated_at) {
    timestamps.push(new Date(project.updated_at).getTime());
  }
  if (!timestamps.length && project.contract_date) {
    timestamps.push(new Date(project.contract_date).getTime());
  }
  const validTimestamps = timestamps.filter(Number.isFinite);
  const lastTs = validTimestamps.length ? Math.max(...validTimestamps) : 0;
  if (!lastTs) return { isStale: true, hours: 24 };
  const hours = Math.floor((now - lastTs) / (3600 * 1000));
  return { isStale: hours >= 24, hours };
};

const getCalendarEventLabel = (event, compact = false) => {
  if (event.isStale) return `Sin avance · ${event.hours}h sin registro`;
  if (event.isDeadline) return compact ? 'Entregado · avance 6 de 6' : 'Entrega registrada · proyecto completo';
  if (event.isDailyAdvance) {
    const photos = `${event.photoCount} ${event.photoCount === 1 ? 'foto' : 'fotos'}`;
    return event.comment && !compact ? `Avance diario · ${photos} · ${event.comment}` : `Avance diario · ${photos}`;
  }
  return compact
    ? `Avance ${event.stageIndex + 1} de ${STAGE_NAMES.length} · ${STAGE_NAMES[event.stageIndex]}`
    : `${STAGE_NAMES[event.stageIndex]} · avance ${event.stageIndex + 1} de ${STAGE_NAMES.length}`;
};

function Pedidos() {
  const [projects, setProjects] = useState([]);
  const [workItemContracts, setWorkItemContracts] = useState([]);
  const [hasWorkItemProjects, setHasWorkItemProjects] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [activeStageSelection, setActiveStageSelection] = useState(null);
  const [overviewStage, setOverviewStage] = useState(null);
  const [scheduleNow, setScheduleNow] = useState(() => new Date());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1, 12);
  });
  const [calendarView, setCalendarView] = useState('month');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(() => getDateKey(new Date()));
  const [noteDraft, setNoteDraft] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showTechnicalSheet, setShowTechnicalSheet] = useState(false);
  const [exportingProjectPdf, setExportingProjectPdf] = useState(false);
  const [showPdfPrompt, setShowPdfPrompt] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierError, setSupplierError] = useState('');
  const [purchaseDrafts, setPurchaseDrafts] = useState({});
  const [expandedMaterialKey, setExpandedMaterialKey] = useState(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [supplierForMaterial, setSupplierForMaterial] = useState(null);
  const [supplierForm, setSupplierForm] = useState({ name: '', contact_name: '', phone: '', location: '' });
  const [showSemaforo, setShowSemaforo] = useState(false);
  const [semaforoSelected, setSemaforoSelected] = useState(null);
  const [semaforoSelectedDayKey, setSemaforoSelectedDayKey] = useState(null);
  const [semaforoAdvanceComment, setSemaforoAdvanceComment] = useState('');
  const [semaforoAdvanceFiles, setSemaforoAdvanceFiles] = useState([]);
  const [semaforoAdvancePublished, setSemaforoAdvancePublished] = useState(true);
  const [semaforoUploadingAdvance, setSemaforoUploadingAdvance] = useState(false);
  const [semaforoLightboxUrl, setSemaforoLightboxUrl] = useState(null);
  const [uploadingRender, setUploadingRender] = useState(false);
  const [renderUploadOk, setRenderUploadOk] = useState(false);

  const [selectedWorkItemId, setSelectedWorkItemId] = useState(null);
  const [areaAdvanceFiles, setAreaAdvanceFiles] = useState([]);
  const [areaAdvanceComment, setAreaAdvanceComment] = useState('');

  const clearProductionSelection = () => {
    setShowTechnicalSheet(false);
    setSelectedId(null);
    setSelectedWorkItemId(null);
  };
  const updateContractRecord = (contractId, update) => {
    const apply = current => current.map(item => item.id === contractId ? update(item) : item);
    setProjects(apply);
    setWorkItemContracts(apply);
  };

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`${API}/api/prospects?light=true`);
      if (!response.ok) throw new Error(`No se pudo cargar Producción (${response.status})`);
      const data = await response.json();
      const allProductionProjects = data.filter(project =>
        project.is_contract && project.production_data && ['PRODUCCION', 'ENTREGADO'].includes(project.status)
      );
      const contractsWithWorkItems = allProductionProjects.filter(project =>
        Array.isArray(parseJson(project.production_data, {}).work_items)
      );
      setHasWorkItemProjects(contractsWithWorkItems.length > 0);
      setWorkItemContracts(current => contractsWithWorkItems.map(project =>
        mergeHeavy(project, current.find(item => item.id === project.id))
      ));
      const productionProjects = allProductionProjects.filter(project =>
        !Array.isArray(parseJson(project.production_data, {}).work_items)
      );
      setProjects(current => productionProjects.map(project => mergeHeavy(project, current.find(item => item.id === project.id))));
      if (selectedId && !allProductionProjects.some(project => project.id === selectedId)) {
        setShowTechnicalSheet(false);
      }
      setSelectedId(current => allProductionProjects.some(project => project.id === current) ? current : null);
    } catch (error) {
      setMessage(error.message || 'Error al cargar los proyectos.');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useAutoRefresh(() => refresh({ silent: true }), { immediate: true });
  useEffect(() => {
    const interval = window.setInterval(() => setScheduleNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const response = await fetch(`${API}/api/suppliers`);
        if (!response.ok) throw new Error(`No se pudieron cargar los proveedores (${response.status})`);
        setSuppliers(await response.json());
      } catch (error) {
        setSupplierError(error.message || 'No se pudieron cargar los proveedores.');
      }
    };
    loadSuppliers();
  }, []);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return projects.filter(project => !query || [project.name, project.public_id, project.project_type, project.contact_info]
      .some(value => String(value || '').toLocaleLowerCase().includes(query)));
  }, [projects, search]);
  const semaforoWorkProjects = useMemo(() => getSemaforoWorkItems(workItemContracts)
    .filter(project => !search.trim() || [
    project.name,
    project.public_id,
    project.project_type,
    project.contact_info,
    project.workItemName
    ].some(value => String(value || '').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))),
  [workItemContracts, search]);
  const semaforoProjects = useMemo(
    () => [...filteredProjects, ...semaforoWorkProjects],
    [filteredProjects, semaforoWorkProjects]
  );
  const semaforoProjectSchedules = useMemo(() => new Map(semaforoProjects.map(project => [
    getSemaforoProjectKey(project),
    getProductionSchedule(project, scheduleNow)
  ])), [semaforoProjects, scheduleNow]);
  const projectsByStage = useMemo(() => STAGE_NAMES.map((_, index) =>
    filteredProjects.filter(project => productionStageIndex(project) === index)
  ), [filteredProjects]);
  const workItemsByStage = useMemo(() => STAGE_NAMES.map((_, index) =>
    semaforoWorkProjects.filter(project => productionStageIndex(project) === index)
  ), [semaforoWorkProjects]);
  const flowStageCounts = useMemo(() => {
    const workItemCounts = getSemaforoWorkItemStageCounts(semaforoWorkProjects);
    return projectsByStage.map((stageProjects, index) => stageProjects.length + workItemCounts[index]);
  }, [projectsByStage, semaforoWorkProjects]);
  const projectsWithoutSchedule = useMemo(
    () => semaforoProjects.filter(project => !semaforoProjectSchedules.get(getSemaforoProjectKey(project))),
    [semaforoProjects, semaforoProjectSchedules]
  );
  const calendarProjects = useMemo(() => overviewStage === null
    ? semaforoProjects
    : overviewStage === -1
      ? projectsWithoutSchedule
    : [...(projectsByStage[overviewStage] || []), ...(workItemsByStage[overviewStage] || [])],
  [overviewStage, semaforoProjects, projectsWithoutSchedule, projectsByStage, workItemsByStage]);
  const selectedCalendarDate = calendarDate(selectedCalendarDay);
  const calendarDays = useMemo(() => {
    if (calendarView === 'day') return selectedCalendarDate ? [selectedCalendarDate] : [];
    if (calendarView === 'week') return selectedCalendarDate ? getWeekCalendarDays(selectedCalendarDate) : [];
    return getMonthCalendarDays(calendarMonth);
  }, [calendarView, calendarMonth, selectedCalendarDate]);
  const projectColors = useMemo(() => {
    const sortedProjects = [...projects].sort((left, right) => left.id - right.id);
    return new Map(sortedProjects.map((project, index) => [
      project.id,
      `hsl(${Math.round((index * 137.508) % 360)} 76% 36%)`
    ]));
  }, [projects]);
  const getProjectColor = project => {
    const color = projectColors.get(project.id);
    if (color) return color;
    const seed = [...getSemaforoProjectKey(project)].reduce((total, char) => total + char.charCodeAt(0), 0);
    return `hsl(${Math.round((seed * 137.508) % 360)} 70% 36%)`;
  };
  const openProjectInSemaforo = project => {
    setShowSemaforo(true);
    setSemaforoSelected(project);
    setSemaforoSelectedDayKey(null);
    setSemaforoAdvanceFiles([]);
    setSemaforoAdvanceComment('');
  };
  const openCalendarProject = project => selectProductionProject(project);
  const calendarEvents = useMemo(() => {
    const events = new Map();
    const addEvent = (dateValue, event) => {
      const date = calendarDate(dateValue);
      if (!date) return;
      const key = getDateKey(date);
      if (!events.has(key)) events.set(key, []);
      events.get(key).push(event);
    };
    calendarProjects.forEach(project => {
      const projectKey = getSemaforoProjectKey(project);
      const production = normalizeProduction(project.production_data);
      const stages = Array.isArray(production.stages) ? production.stages : [];
      stages.forEach((stage, stageIndex) => {
        const enteredAt = stage.entered_at || (stageIndex === 0 ? production.started_at : null);
        if (!enteredAt) return;
        addEvent(enteredAt, {
          id: `${projectKey}-stage-${stageIndex}`,
          project,
          stageIndex,
          capturedAt: enteredAt,
          isMilestone: true
        });
      });
      const dailyAdvances = Array.isArray(production.daily_advances) ? production.daily_advances : [];
      const advancesByDay = new Map();
      dailyAdvances.forEach(advance => {
        const capturedAt = advance.created_at || (advance.date ? `${advance.date}T12:00:00` : null);
        const dayKey = advance.date || (capturedAt ? getDateKey(new Date(capturedAt)) : null);
        if (!dayKey) return;
        const group = advancesByDay.get(dayKey) || { capturedAt, photoCount: 0, comments: [] };
        if (advance.url) group.photoCount += 1;
        if (advance.comment) group.comments.push(advance.comment);
        if (capturedAt && (!group.capturedAt || new Date(capturedAt) > new Date(group.capturedAt))) group.capturedAt = capturedAt;
        advancesByDay.set(dayKey, group);
      });
      advancesByDay.forEach((group, dayKey) => {
        addEvent(`${dayKey}T12:00:00`, {
          id: `${projectKey}-advance-${dayKey}`,
          project,
          stageIndex: productionStageIndex(project),
          capturedAt: group.capturedAt || `${dayKey}T12:00:00`,
          photoCount: group.photoCount,
          comment: group.comments.join(' · '),
          isDailyAdvance: true
        });
      });
      if (production.delivered_at) {
        addEvent(production.delivered_at, {
          id: `${projectKey}-delivered`,
          project,
          capturedAt: production.delivered_at,
          stageIndex: STAGE_NAMES.length - 1,
          isDeadline: true
        });
      }
      const staleInfo = getProjectStaleInfo(project, scheduleNow.getTime());
      if (staleInfo.isStale) {
        addEvent(scheduleNow, {
          id: `${projectKey}-stale`,
          project,
          stageIndex: productionStageIndex(project),
          capturedAt: scheduleNow,
          hours: staleInfo.hours,
          isStale: true
        });
      }
    });
    events.forEach(dayEvents => dayEvents.sort((left, right) =>
      Number(Boolean(right.isStale)) - Number(Boolean(left.isStale))
      || new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime()
    ));
    return events;
  }, [calendarProjects, scheduleNow]);
  const selectedDayActions = selectedCalendarDate
    ? calendarEvents.get(getDateKey(selectedCalendarDate)) || []
    : [];
  const isProjectLate = (project, schedule) => project.status === 'ENTREGADO'
    ? schedule.daysRemaining < 0
    : schedule.daysRemaining < 0 || productionStageIndex(project) < schedule.expectedStage;
  const lateProjectsCount = semaforoProjects.filter(project => {
    const schedule = semaforoProjectSchedules.get(getSemaforoProjectKey(project));
    return schedule && isProjectLate(project, schedule);
  }).length;
  const onTimeProjectsCount = semaforoProjects.filter(project => {
    const schedule = semaforoProjectSchedules.get(getSemaforoProjectKey(project));
    return schedule && !isProjectLate(project, schedule);
  }).length;
  const activeProjectsCount = semaforoProjects.filter(project => project.status !== 'ENTREGADO').length;
  const deliveredProjectsCount = semaforoProjects.length - activeProjectsCount;
  const staleProjectsCount = semaforoProjects.filter(project => getProjectStaleInfo(project, scheduleNow.getTime()).isStale).length;
  const stagesWithProjects = flowStageCounts.reduce((indexes, count, index) => {
    if (count) indexes.push(index);
    return indexes;
  }, []);
  const latestActiveStage = overviewStage === null
    ? (stagesWithProjects.length ? stagesWithProjects[stagesWithProjects.length - 1] : -1)
    : overviewStage;

  const selectedContract = selectedWorkItemId
    ? workItemContracts.find(project => project.id === selectedId) || null
    : projects.find(project => project.id === selectedId) || null;
  // En contratos con áreas, la ficha trabaja sobre la producción del área seleccionada.
  const selected = selectedWorkItemId
    ? (selectedContract ? getSemaforoWorkItems([selectedContract]).find(item => item.workItemId === selectedWorkItemId) || null : null)
    : selectedContract;
  const isAreaSelection = Boolean(selected?.workItemId);
  const selectionKey = selectedWorkItemId ? `${selectedId}:${selectedWorkItemId}` : selectedId;
  // El listado es ligero: al seleccionar un proyecto se descarga su registro completo.
  const selectedIsLight = !!selectedContract?.is_light;
  useEffect(() => {
    if (!selectedId || !selectedIsLight) return;
    let cancelled = false;
    fetchFullProspect(selectedId).then(full => {
      if (cancelled || !full) return;
      const apply = current => current.map(item => item.id === full.id ? full : item);
      setProjects(apply);
      setWorkItemContracts(apply);
    });
    return () => { cancelled = true; };
  }, [selectedId, selectedIsLight]);
  const renderPreview = selected ? collectImageUrls(selected.render_image_path)[0] : null;
  const production = normalizeProduction(selected?.production_data);
  const stages = Array.isArray(production.stages) ? production.stages : [];
  const currentStage = Number.isInteger(production.current_stage) ? production.current_stage : 0;
  const areaDailyAdvances = isAreaSelection && Array.isArray(production.daily_advances) ? production.daily_advances : [];
  const activeStage = activeStageSelection?.projectId === selectionKey
    && activeStageSelection.currentStage === currentStage
    ? activeStageSelection.stage
    : currentStage;
  const note = noteDraft?.projectId === selectionKey
    && noteDraft.currentStage === currentStage
    && noteDraft.stage === activeStage
    ? noteDraft.value
    : stages[activeStage]?.note || '';
  const updateNote = value => setNoteDraft({
    projectId: selectionKey,
    currentStage,
    stage: activeStage,
    value
  });
  const selectedStage = stages[activeStage] || { name: STAGE_NAMES[activeStage], note: '', photos: [] };
  const estimation = parseJson(selected?.estimation_data);
  const estimationSheets = Array.isArray(estimation.sheets) ? estimation.sheets : [];
  const estimationMaterialSheets = estimationSheets.some(sheet => Array.isArray(sheet.materials) && sheet.materials.length)
    ? estimationSheets
    : estimation.materials
      ? [{ type: selected?.project_type || 'Proyecto', materials: estimation.materials }]
      : estimationSheets;
  const valuation = parseJson(selected?.valuation_data);
  const valuationSheets = Array.isArray(valuation.sheets) && valuation.sheets.length
    ? valuation.sheets
    : valuation.materials
      ? [{ type: valuation.projectType || selected?.project_type || 'Proyecto', materials: valuation.materials }]
      : [];
  const projectDetails = estimation.projectDetails || {};
  const estimationMeasures = estimation.measures && typeof estimation.measures === 'object' ? estimation.measures : {};
  const estimationMeasurePhotos = estimation.photos && typeof estimation.photos === 'object' ? estimation.photos : {};
  const measurementLabels = new Map(getMeasureSections(selectedContract?.project_type || '').flatMap(group =>
    group.sections.flatMap(section => section.fields.map(field => [
      `${section.key}_${field.id}`,
      { label: field.label, group: group._groupLabel || 'Medidas capturadas', suffix: field.suffix }
    ]))
  ));
  const measureKeys = new Set([...Object.keys(estimationMeasures), ...Object.keys(estimationMeasurePhotos)]);
  const measurementEntries = [...measureKeys].map(key => {
    const field = measurementLabels.get(key);
    const value = estimationMeasures[key];
    const photo = estimationMeasurePhotos[key];
    const hasValue = value !== null && value !== undefined && value !== '';
    const label = field?.label || spanishFieldLabel(key);
    const formattedValue = hasValue
      ? `${value}${field?.suffix === 'cm' ? ` ${estimation.unit || 'cm'}` : field?.suffix ? ` ${field.suffix}` : ''}`
      : '';
    return { key, label, group: field?.group || 'Medidas capturadas', value: formattedValue, photo };
  }).filter(entry => entry.value || entry.photo);
  const croquisImages = collectImageUrls(estimation.croquisPhotos, estimation.croquis_data);
  const measurementPhotos = measurementEntries.flatMap(entry =>
    collectImageUrls(entry.photo).map((url, index) => ({
      key: `${entry.key}-${index}`,
      label: entry.label,
      value: entry.value,
      group: entry.group,
      url
    }))
  );
  const croquisPages = Array.from({ length: Math.ceil(croquisImages.length / 2) }, (_, index) =>
    croquisImages.slice(index * 2, index * 2 + 2)
  );
  const measurementPhotoPages = Array.from({ length: Math.ceil(measurementPhotos.length / 6) }, (_, index) =>
    measurementPhotos.slice(index * 6, index * 6 + 6)
  );
  const measurementTableRows = chunkItems(measurementEntries, 3);
  const materialSheets = estimationMaterialSheets.some(sheet => Array.isArray(sheet.materials) && sheet.materials.length)
    ? estimationMaterialSheets
    : valuationSheets;
  const normalizeSheetName = value => String(value || '').trim().toLocaleLowerCase();
  const selectedWorkItemRecord = isAreaSelection
    ? (parseJson(selectedContract?.production_data, {}).work_items || []).find(item => item.id === selected.workItemId) || null
    : null;
  const areaSheetNames = new Set([selectedWorkItemRecord?.valuation, selectedWorkItemRecord?.name, selected?.workItemName]
    .map(normalizeSheetName).filter(Boolean));
  const allProjectMaterials = materialSheets.flatMap((sheet, sheetIndex) =>
    (Array.isArray(sheet.materials) ? sheet.materials : []).map((item, itemIndex) => ({
      ...item,
      sheetName: sheet.type || `Proyecto ${sheetIndex + 1}`,
      purchaseKey: `${sheetIndex}:${item.id ?? ''}:${itemIndex}`
    }))
  ).filter(material => Number(material.qty) > 0);
  const areaMaterials = areaSheetNames.size
    ? allProjectMaterials.filter(material => areaSheetNames.has(normalizeSheetName(material.sheetName)))
    : [];
  // Si la hoja del área no se identifica, se muestra el contrato completo para no ocultar materiales.
  const projectMaterials = isAreaSelection && areaMaterials.length ? areaMaterials : allProjectMaterials;
  const projectMaterialGroups = projectMaterials.reduce((groups, material) => {
    let group = groups.find(item => item.name === material.sheetName);
    if (!group) {
      group = { name: material.sheetName, materials: [] };
      groups.push(group);
    }
    group.materials.push(material);
    return groups;
  }, []);
  const savedPurchaseRecords = normalizeProduction(selectedContract?.production_data).materialPurchases;
  const purchaseRecords = savedPurchaseRecords && typeof savedPurchaseRecords === 'object'
    ? savedPurchaseRecords
    : {};
  const purchaseRecordsFingerprint = JSON.stringify(purchaseRecords);
  const syncedPurchasesRef = useRef({ projectId: null, records: {} });
  useEffect(() => {
    const records = JSON.parse(purchaseRecordsFingerprint);
    const previous = syncedPurchasesRef.current;
    setPurchaseDrafts(current => {
      if (previous.projectId !== selectedId) return records;
      const unsavedDrafts = Object.fromEntries(Object.entries(current).filter(([key, value]) =>
        JSON.stringify(value) !== JSON.stringify(previous.records[key] || {})
      ));
      return { ...records, ...unsavedDrafts };
    });
    syncedPurchasesRef.current = { projectId: selectedId, records };
  }, [selectedId, purchaseRecordsFingerprint]);
  const persist = async (nextProduction, nextStatus) => {
    if (!selected || isAreaSelection) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${API}/api/prospects/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          production_data: JSON.stringify(nextProduction),
          ...(nextStatus ? { status: nextStatus } : {})
        })
      });
      if (!response.ok) throw new Error(`No se pudo guardar el avance (${response.status})`);
      const updated = await response.json();
      setProjects(current => current.map(project => project.id === updated.id ? updated : project));
      setMessage('Cambios guardados.');
      return updated;
    } catch (error) {
      setMessage(error.message || 'No se pudo guardar el avance.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveMaterialPurchase = async (materialKey, record) => {
    const nextPurchases = { ...purchaseRecords, [materialKey]: record };
    const targetContractId = selectedContract?.id || selected?.id;
    if (!targetContractId) return;

    const contractProd = parseJson(selectedContract?.production_data || selected?.production_data, {});
    const nextProduction = { ...contractProd, materialPurchases: nextPurchases };

    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${API}/api/prospects/${targetContractId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          production_data: JSON.stringify(nextProduction)
        })
      });
      if (!response.ok) throw new Error(`No se pudo guardar la compra (${response.status})`);
      const updated = await response.json();
      updateContractRecord(targetContractId, item => ({
        ...item,
        production_data: updated.production_data
      }));
      setPurchaseDrafts(nextPurchases);
      setMessage('Compra del material guardada.');
    } catch (error) {
      setMessage(error.message || 'No se pudo guardar la compra del material.');
    } finally {
      setSaving(false);
    }
  };

  const addSupplierFromProduction = async event => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${API}/api/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierForm)
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.detail || `No se pudo guardar el proveedor (${response.status})`);
      }
      const supplier = await response.json();
      setSuppliers(current => [...current, supplier].sort((a, b) => a.name.localeCompare(b.name)));
      const materialKey = supplierForMaterial;
      const record = {
        ...(purchaseDrafts[materialKey] || {}),
        supplier_id: String(supplier.id),
        purchase_place: supplier.location || ''
      };
      setPurchaseDrafts(current => ({ ...current, [materialKey]: record }));
      setShowSupplierForm(false);
      setSupplierForm({ name: '', contact_name: '', phone: '', location: '' });
      setSupplierError('');
      if (materialKey) await saveMaterialPurchase(materialKey, record);
      else setMessage('Proveedor agregado a la agenda.');
    } catch (error) {
      setMessage(error.message || 'No se pudo agregar el proveedor.');
    } finally {
      setSaving(false);
    }
  };

  const saveNote = async () => {
    const next = { ...production, stages: stages.map((stage, index) =>
      index === activeStage ? { ...stage, note } : stage
    ) };
    await persist(next);
  };

  const advanceStage = async () => {
    if (!selected) return;
    if (activeStage !== currentStage) {
      setMessage(`Para avanzar, selecciona la etapa actual: ${STAGE_NAMES[currentStage]}.`);
      return;
    }
    const nowIso = getCurrentIsoTimestamp();
    if (currentStage >= STAGE_NAMES.length - 1) {
      const delivered = await persist({ ...production, delivered_at: nowIso }, 'ENTREGADO');
      if (delivered) {
        setMessage('Proyecto marcado como entregado.');
        setShowPdfPrompt(true);
      }
      return;
    }
    const nextIndex = Math.min(currentStage + 1, STAGE_NAMES.length - 1);
    const nextStages = STAGE_NAMES.map((name, index) => {
      const existing = stages[index] || { name, note: '', photos: [] };
      if (index === currentStage) return { ...existing, note };
      if (index === nextIndex && !existing.entered_at) return { ...existing, entered_at: nowIso };
      return existing;
    });
    const updated = await persist(
      { ...production, current_stage: nextIndex, stages: nextStages },
      'PRODUCCION'
    );
    if (updated) {
      setShowPdfPrompt(true);
    }
  };
  const handleAdvanceClick = () => (isAreaSelection ? changeAreaStage(currentStage + 1) : advanceStage());

  const changeAreaStage = async targetStage => {
    if (!isAreaSelection || targetStage < 0 || targetStage > STAGE_NAMES.length - 1) return;
    if (activeStage !== currentStage) {
      setMessage(`Para cambiar el flujo, selecciona la etapa actual: ${STAGE_NAMES[currentStage]}.`);
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${API}/api/prospects/${selected.id}/production-work-items/${encodeURIComponent(selected.workItemId)}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_stage: targetStage })
      });
      if (!response.ok) {
        let detail = `No se pudo cambiar la etapa del área (${response.status})`;
        try { detail = (await response.json()).detail || detail; } catch { /* respuesta sin JSON */ }
        throw new Error(detail);
      }
      const result = await response.json();
      updateContractRecord(selected.id, item => ({ ...item, production_data: result.production_data, status: result.status }));
      setMessage(targetStage > currentStage
        ? `Área ${selected.workItemName} pasó a ${STAGE_NAMES[targetStage]}.`
        : `Área ${selected.workItemName} regresó a ${STAGE_NAMES[targetStage]}.`);
    } catch (error) {
      setMessage(error.message || 'No se pudo cambiar la etapa del área.');
    } finally {
      setSaving(false);
    }
  };

  const uploadAreaAdvance = async () => {
    if (!isAreaSelection) return;
    if (!areaAdvanceFiles.length) {
      setMessage('Selecciona al menos una foto para registrar el avance del área.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      let lastResult = null;
      for (const file of areaAdvanceFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('date', getDateKey(new Date(getCurrentIsoTimestamp())));
        formData.append('comment', areaAdvanceComment);
        formData.append('published', 'true');
        formData.append('stage', String(activeStage));
        formData.append('work_item_id', selected.workItemId);
        const response = await fetch(`${API}/api/prospects/${selected.id}/daily-advances`, { method: 'POST', body: formData });
        if (!response.ok) {
          let detail = `No se pudo guardar el avance (${response.status})`;
          try { detail = (await response.json()).detail || detail; } catch { /* respuesta sin JSON */ }
          throw new Error(detail);
        }
        lastResult = await response.json();
      }
      if (lastResult) updateContractRecord(selected.id, item => ({ ...item, production_data: lastResult.production_data }));
      setAreaAdvanceFiles([]);
      setAreaAdvanceComment('');
      setMessage('✅ Avance del área guardado. Ya aparece en el calendario.');
    } catch (error) {
      setMessage(error.message || 'No se pudo guardar el avance del área.');
    } finally {
      setSaving(false);
    }
  };

  const returnToPreviousStage = async () => {
    if (!selected || currentStage <= 0 || selected.status === 'ENTREGADO') return;
    if (activeStage !== currentStage) {
      setMessage(`Para cambiar el flujo, selecciona la etapa actual: ${STAGE_NAMES[currentStage]}.`);
      return;
    }
    const previousStage = currentStage - 1;
    const confirmMsg = isAreaSelection
      ? `¿Estás seguro de regresar el área "${selected.workItemName}" a la etapa "${STAGE_NAMES[previousStage]}"?`
      : `¿Estás seguro de regresar el proyecto a la etapa "${STAGE_NAMES[previousStage]}"?`;
    if (!window.confirm(confirmMsg)) return;

    if (isAreaSelection) {
      await changeAreaStage(previousStage);
      return;
    }
    const nextStages = stages.map((stage, index) =>
      index === activeStage ? { ...stage, note } : stage
    );
    const updated = await persist({
      ...production,
      current_stage: previousStage,
      stages: nextStages
    }, 'PRODUCCION');
    if (updated) {
      setMessage(`Proyecto regresado a ${STAGE_NAMES[previousStage]}. Se conservaron notas, fotos y compras.`);
    }
  };

  const selectProductionProject = (project) => {
    const stageIndex = productionStageIndex(project);
    const workItemId = project.workItemId || null;
    setShowTechnicalSheet(false);
    setSelectedId(project.id);
    setSelectedWorkItemId(workItemId);
    setAreaAdvanceFiles([]);
    setAreaAdvanceComment('');
    setActiveStageSelection({
      projectId: workItemId ? `${project.id}:${workItemId}` : project.id,
      currentStage: stageIndex,
      stage: stageIndex
    });
  };

  const uploadEvidence = async (file) => {
    if (!file || !selected || isAreaSelection) return;
    setSaving(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API}/api/prospects/${selected.id}/production-evidence/${activeStage}`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error(`No se pudo subir la foto (${response.status})`);
      const result = await response.json();
      const updated = { ...selected, production_data: result.production_data };
      setProjects(current => current.map(project => project.id === updated.id ? updated : project));
      setMessage('Foto agregada a esta etapa.');
    } catch (error) {
      setMessage(error.message || 'No se pudo subir la foto.');
    } finally {
      setSaving(false);
    }
  };

  const returnToClients = async () => {
    const target = selectedContract || selected;
    if (!target) return;
    const confirmMsg = `¿Regresar a ${target.name} a Clientes para volver a generar o modificar el contrato?\n\nSe conservarán las etapas, fotos y notas de producción registradas.`;
    if (!window.confirm(confirmMsg)) return;
    setSaving(true);
    setMessage('');
    try {
      const currentProd = parseJson(target.production_data, {});
      let updatedProd = currentProd;
      if (Array.isArray(currentProd.work_items) && currentProd.work_items.length > 0) {
        updatedProd = {
          ...currentProd,
          work_items: currentProd.work_items.map(item => ({
            ...item,
            status: 'STANDBY'
          }))
        };
      }
      const response = await fetch(`${API}/api/prospects/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CONTRATO',
          production_data: JSON.stringify(updatedProd)
        })
      });
      if (!response.ok) throw new Error(`No se pudo regresar el proyecto a Clientes (${response.status})`);
      const returnedId = target.id;
      setProjects(current => current.filter(project => project.id !== returnedId));
      setWorkItemContracts(current => current.filter(project => project.id !== returnedId));
      setSelectedId(null);
      setSelectedWorkItemId(null);
      setShowTechnicalSheet(false);
      await refresh();
      window.alert(`El proyecto "${target.name}" regresó exitosamente a Clientes / Contratos.`);
    } catch (error) {
      console.error(error);
      const errMsg = error.message || 'No se pudo regresar el proyecto a Clientes.';
      setMessage(errMsg);
      window.alert('❌ ' + errMsg);
    } finally {
      setSaving(false);
    }
  };

  const photoPath = (photo) => typeof photo === 'string' ? photo : photo?.url;
  const projectReferenceImages = selected ? collectImageUrls(
    selected.space_image_path,
    selected.reference_image_path,
    selected.design_image_path,
    selected.quote_image_1,
    selected.quote_image_2,
    selected.quote_image_3,
    selected.quote_image_4,
    selected.render_image_path
  ) : [];
  const stageEvidence = stages.map((stage, index) => ({
    name: STAGE_NAMES[index],
    enteredAt: stage.entered_at,
    note: stage.note,
    photos: collectImageUrls(stage.photos)
  }));
  const generalMeasurements = selected
    ? Object.entries(selected)
      .filter(([key, value]) => /measurement/i.test(key) && value !== null && value !== undefined && value !== '' && typeof value !== 'object')
      .map(([key, value]) => [spanishFieldLabel(key), String(value)])
    : [];
  const generalMeasurementRows = chunkItems(generalMeasurements, 3);
  const clientSurname = selected?.name?.trim().split(/\s+/).slice(-1)[0] || 'Cliente';
  const projectSpecifications = Object.entries(projectDetails)
    .filter(([key, value]) => !/price|precio|total|margin|anticipo|cost|importe/i.test(key)
      && value !== null && value !== undefined && value !== ''
      && (typeof value !== 'object' || Array.isArray(value)))
    .map(([key, value]) => [spanishFieldLabel(key), Array.isArray(value) ? value.join(', ') : String(value)]);
  const handoffDetails = [
    ['Tipo de proyecto', selected?.project_type],
    ['Domicilio del proyecto', selected?.location],
    ['Tiempo de entrega', selected?.quote_delivery_time || selected?.project_timeline || selected?.delivery_date],
    ['Días de producción', selected?.production_days || projectDetails.production_days],
    ['Material / acabado', [selected?.material_type, selected?.material_type_2, selected?.furniture_color].filter(Boolean).join(' · ')],
    ['Render', selected?.render_applies === true ? 'Sí' : selected?.render_applies === false ? 'No aplica' : null],
    ['Observaciones de diseño', selected?.design_details],
    ['Notas de estimación', estimation.obsText],
    ...projectSpecifications,
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');

  const downloadProjectPdf = async () => {
    if (!selected) return;
    const element = document.getElementById('production-project-pdf');
    if (!element) {
      setMessage('No se encontró el contenido del machote para imprimir.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setMessage('El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes e inténtalo de nuevo.');
      return;
    }

    setExportingProjectPdf(true);
    setMessage('');
    try {
      const title = `Proyecto_${selected.public_id || selected.id}_${clientSurname}`
        .replace(/[<>&"]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[character]);
      const content = element.cloneNode(true);
      content.removeAttribute('id');
      content.querySelectorAll('img').forEach(image => {
        if (!image.closest('.production-pdf-layout-image')) {
          image.removeAttribute('style');
          image.style.cssText = 'display:block;max-width:100%;max-height:250mm;object-fit:contain;margin:5mm auto;page-break-inside:avoid;break-inside:avoid';
        }
      });

      // Adjuntar páginas del PDF de render al final del machote de trabajo
      if (selected.render_pdf_path) {
        try {
          setMessage('Procesando planos y hojas del PDF de render...');
          const pdfUrl = `${API}/api/prospects/${selected.id}/render-pdf`;
          const renderPages = await convertPdfToImageUrls(pdfUrl);
          if (renderPages && renderPages.length > 0) {
            const renderAnnex = document.createElement('div');
            renderAnnex.className = 'production-pdf-render-annex';
            renderPages.forEach(p => {
              const isLandscape = p.isLandscape ?? (p.width > p.height);
              const pageContainer = document.createElement('div');
              pageContainer.className = isLandscape
                ? 'production-pdf-new-page production-pdf-page-landscape'
                : 'production-pdf-new-page';
              pageContainer.style.cssText = isLandscape
                ? 'page: landscape-page; break-before: page; page-break-before: always; margin: 0; padding: 0;'
                : 'break-before: page; page-break-before: always; margin-top: 10mm;';
              pageContainer.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #1d4f91; padding-bottom: 2.5mm; margin-bottom: 3.5mm;">
                  <h2 style="margin:0; font-size:15px; color:#1d4f91; font-weight:bold;">
                    Plano / Render del proyecto — Producción
                  </h2>
                  <span style="font-size:11px; color:#64748b; font-weight:bold;">
                    Hoja ${p.pageNum} de ${p.totalPages}
                  </span>
                </div>
                <div style="display:flex; justify-content:center; align-items:center; ${isLandscape ? 'height:178mm;' : 'min-height:225mm;'} padding: 0;">
                  <img src="${p.dataUrl}" alt="Render Hoja ${p.pageNum}" style="display:block; max-width:100%; ${isLandscape ? 'max-height:174mm; width:100%;' : 'max-height:235mm;'} object-fit:contain; margin:0 auto; border:1px solid #cbd5e1; border-radius:4px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);" />
                </div>
              `;
              renderAnnex.appendChild(pageContainer);
            });
            content.appendChild(renderAnnex);
          }
        } catch (pdfErr) {
          console.error('Error adjuntando páginas de render PDF al machote:', pdfErr);
        }
      } else if (selected.render_image_path) {
        const renderAnnex = document.createElement('div');
        renderAnnex.className = 'production-pdf-render-annex';
        for (const renderPhoto of collectImageUrls(selected.render_image_path)) {
        const pageContainer = document.createElement('div');
        pageContainer.className = 'production-pdf-new-page production-pdf-page-landscape';
        pageContainer.style.cssText = 'page: landscape-page; break-before: page; page-break-before: always; margin: 0; padding: 0;';
        pageContainer.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #1d4f91; padding-bottom: 2.5mm; margin-bottom: 3.5mm;">
            <h2 style="margin:0; font-size:15px; color:#1d4f91; font-weight:bold;">
              Render Oficial del proyecto — Producción
            </h2>
            <span style="font-size:11px; color:#64748b; font-weight:bold;">
              Hoja de render
            </span>
          </div>
          <div style="display:flex; justify-content:center; align-items:center; height:178mm; padding: 0;">
            <img alt="Render Oficial" style="display:block; max-width:100%; max-height:174mm; width:100%; object-fit:contain; margin:0 auto; border:1px solid #cbd5e1; border-radius:4px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);" />
          </div>
        `;
        pageContainer.querySelector('img').src = imageUrl(renderPhoto);
        renderAnnex.appendChild(pageContainer);
        }
        content.appendChild(renderAnnex);
      }

      printWindow.document.open();
      printWindow.document.write(`<!doctype html>
        <html lang="es">
          <head>
            <meta charset="utf-8">
            <title>${title}</title>
            <style>
              @page { size: A4 portrait; margin: 12mm; }
              @page landscape-page { size: A4 landscape; margin: 8mm; }
              .production-pdf-page-landscape {
                page: landscape-page;
                break-before: page;
                page-break-before: always;
              }
              @media print {
                .production-pdf-page-landscape {
                  page: landscape-page;
                  break-before: page;
                  page-break-before: always;
                }
              }
              * { box-sizing: border-box; }
              html, body { margin: 0; padding: 0; background: #fff; }
              body { color: #1e293b; font: 12px/1.5 Arial, sans-serif; }
              #machote { width: 100%; color: #1e293b; overflow-wrap: anywhere; }
              h1, h2, h3 { break-after: avoid-page; page-break-after: avoid; }
              p, figure, article, section { orphans: 2; widows: 2; }
              img { max-width: 100%; }
              a { color: #1d4f91; overflow-wrap: anywhere; }
              .production-pdf-section { margin-bottom: 8mm; }
              .production-pdf-section-title { margin: 0 0 5mm; color: #1d4f91; font-size: 16px; }
              .production-pdf-measurement-table {
                width: 100%; margin: 0 0 4mm; border-collapse: collapse; table-layout: fixed;
                font-size: 10px;
              }
              .production-pdf-measurement-table td {
                width: 33.333%; padding: 2.5mm; border: 1px solid #94a3b8;
                vertical-align: top; overflow-wrap: anywhere;
              }
              .production-pdf-measurement-table strong { color: #1e3a5f; }
              .production-pdf-material-group { margin: 0 0 5mm; break-inside: avoid; page-break-inside: avoid; }
              .production-pdf-material-group h3 {
                margin: 0; padding: 2mm 2.5mm; border: 1px solid #64748b; border-bottom: 0;
                background: #eaf2ff; color: #1e3a5f; font-size: 12px;
              }
              .production-pdf-material-group .production-pdf-measurement-table { margin: 0; }
              .production-pdf-new-page { break-before: page; page-break-before: always; }
              .production-pdf-image-page { break-inside: avoid; page-break-inside: avoid; }
              .production-pdf-image-page h2 { margin: 0 0 5mm; color: #1d4f91; font-size: 16px; }
              .production-pdf-croquis-grid {
                display: grid; grid-template-columns: 1fr; grid-template-rows: repeat(2, minmax(0, 1fr));
                gap: 5mm; height: 245mm;
              }
              .production-pdf-measure-grid {
                display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(3, minmax(0, 1fr));
                gap: 3mm; height: 245mm;
              }
              .production-pdf-layout-image {
                display: flex; flex-direction: column; justify-content: center; min-height: 0;
                margin: 0; padding: 3mm; border: 1px solid #cbd5e1; border-radius: 2mm;
                overflow: hidden; break-inside: avoid; page-break-inside: avoid;
              }
              .production-pdf-layout-image img {
                display: block; width: 100%; height: 100%; min-height: 0;
                object-fit: contain; margin: 0;
              }
              .production-pdf-layout-image figcaption {
                flex: none; margin-top: 1mm; color: #475569; font-size: 9px;
              }
              @media screen {
                body { max-width: 210mm; margin: 0 auto; padding: 12mm; }
                .production-pdf-new-page { margin-top: 12mm; }
                .production-pdf-page-landscape {
                  max-width: 297mm;
                  margin-left: calc((210mm - 297mm) / 2);
                  margin-right: calc((210mm - 297mm) / 2);
                }
              }
            </style>
          </head>
          <body><main id="machote">${content.innerHTML}</main></body>
        </html>`);
      printWindow.document.close();
      await new Promise(resolve => {
        const pendingImages = Array.from(printWindow.document.images).filter(image => !image.complete);
        if (!pendingImages.length) {
          resolve();
          return;
        }
        let remaining = pendingImages.length;
        const imageFinished = () => {
          remaining -= 1;
          if (remaining === 0) resolve();
        };
        pendingImages.forEach(image => {
          image.addEventListener('load', imageFinished, { once: true });
          image.addEventListener('error', imageFinished, { once: true });
        });
        window.setTimeout(resolve, 10000);
      });
      await printWindow.document.fonts?.ready;
      printWindow.focus();
      printWindow.onafterprint = () => printWindow.close();
      printWindow.print();
      setMessage('El machote está listo. En el diálogo de impresión, elige “Guardar como PDF”.');
    } catch (error) {
      printWindow.close();
      setMessage(error.message || 'No se pudo generar el PDF del expediente.');
    } finally {
      setExportingProjectPdf(false);
    }
  };

  const downloadRenderPdf = async () => {
    if (!selected) return;
    try {
      const response = await fetch(`${API}/api/prospects/${selected.id}/render-pdf`);
      if (!response.ok) {
        let errDetail = `No se pudo descargar el PDF (${response.status})`;
        try { const j = await response.json(); if (j.detail) errDetail = j.detail; } catch {}
        throw new Error(errDetail);
      }
      const fileUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `Render_${selected.public_id || selected.id}_${clientSurname}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
    } catch (error) {
      setMessage(error.message || 'No se pudo descargar el PDF de render.');
    }
  };

  const viewRenderPdf = async () => {
    if (!selected) return;
    try {
      const response = await fetch(`${API}/api/prospects/${selected.id}/render-pdf`);
      if (!response.ok) {
        let errDetail = `Error al abrir el PDF (${response.status})`;
        try { const j = await response.json(); if (j.detail) errDetail = j.detail; } catch {}
        throw new Error(errDetail);
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
      setMessage(error.message || 'No se pudo abrir el PDF de render.');
    }
  };

  const uploadRenderFile = async (file) => {
    if (!file || !selected) return;

    // Con almacenamiento en base de datos ya no hay límite estricto de 10 MB de Cloudinary
    const MAX_MB = 45;
    const fileMB = file.size / (1024 * 1024);
    if (fileMB > MAX_MB) {
      setMessage(
        `❌ El archivo pesa ${fileMB.toFixed(1)} MB y supera el límite de ${MAX_MB} MB. ` +
        `Por favor comprima el PDF (puede usar ilovepdf.com) y vuelva a intentarlo.`
      );
      return;
    }

    setUploadingRender(true);
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('files', file);
      const res = await fetch(`${API}/api/prospects/${selected.id}/upload-render`, {
        method: 'POST',
        body: fd
      });
      if (!res.ok) {
        // Intentar leer el mensaje de error del servidor
        let detail = 'Error al subir archivo de render';
        try { const json = await res.json(); detail = json.detail || detail; } catch {}
        throw new Error(detail);
      }
      const data = await res.json();
      const newPdfPath = data.pdf_path || (file.name.toLowerCase().endsWith('.pdf') ? data.image_path : selected.render_pdf_path);
      const newImgPath = data.image_path || selected.render_image_path;
      setProjects(prev => prev.map(p => p.id === selected.id ? {
        ...p,
        render_pdf_path: newPdfPath,
        render_image_path: newImgPath,
        render_applies: true
      } : p));
      setWorkItemContracts(prev => prev.map(p => p.id === selected.id ? {
        ...p,
        render_pdf_path: newPdfPath,
        render_image_path: newImgPath,
        render_applies: true
      } : p));
      setMessage('✅ Archivo de render cargado correctamente y listo para el machote.');
      // Indicador visual de éxito en el botón
      setRenderUploadOk(true);
      setTimeout(() => setRenderUploadOk(false), 3000);
    } catch (err) {
      console.error(err);
      setMessage('❌ ' + (err.message || 'Error al subir archivo de render'));
    } finally {
      setUploadingRender(false);
    }
  };

  if (selected && showTechnicalSheet) {
    return (
      <div style={{ padding: '1rem' }}>
        <ContratoDetail
          prospect={selectedContract || selected}
          productionMode
          onBack={() => setShowTechnicalSheet(false)}
          onRefresh={refresh}
          onReturnToClients={returnToClients}
        />
      </div>
    );
  }


  return (
    <main style={{ padding: 'clamp(0.8rem, 2vw, 1.6rem)', color: '#1e293b' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <div style={{ color: '#2563a8', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seguimiento de proyectos</div>
          <h1 style={{ margin: '0.2rem 0', fontSize: 'clamp(1.45rem, 3vw, 2rem)', color: '#14243a' }}>Producción</h1>
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Del contrato a la entrega, con avances y evidencia por etapa.</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar cliente o proyecto"
            style={{ width: 'min(280px, 65vw)', padding: '0.7rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: 10 }} />
          <button type="button" onClick={refresh} style={{ padding: '0.7rem 0.9rem', border: 0, borderRadius: 10, background: '#eaf2ff', color: '#1d4f91', fontWeight: 700, cursor: 'pointer' }}>Actualizar</button>
        </div>
      </header>

      {message && <div role="status" style={{ marginBottom: 12, padding: '0.7rem 0.9rem', background: message.includes('no pudo') || message.includes('No se pudo') ? '#fef2f2' : '#eff6ff', color: message.includes('no pudo') || message.includes('No se pudo') ? '#b91c1c' : '#1d4f91', borderRadius: 10 }}>{message}</div>}
      {semaforoWorkProjects.length > 0 && (
        <div style={{ marginBottom: 16, padding: '0.85rem 1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, color: '#1e40af', fontSize: '0.85rem' }}>
          Selecciona un área en el semáforo para consultar su calendario de producción y registrar sus fotos de avance.
        </div>
      )}
      {(!hasWorkItemProjects || projects.length > 0 || semaforoWorkProjects.length > 0) && <>

      <section style={{ marginBottom: 16, padding: '1rem', background: '#fff', border: '1px solid #dbe5ef', borderRadius: 16, boxShadow: '0 3px 12px rgba(15, 23, 42, 0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, color: '#172b4d', fontSize: '1rem' }}>Flujo y control de tiempos</h2>
            <div style={{ marginTop: 3, color: '#64748b', fontSize: '0.78rem' }}>Los círculos muestran la etapa registrada en Producción. La tabla compara ese avance con el esperado según los días hábiles de Prospectos, divididos entre seis etapas.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>{filteredProjects.length} proyectos</span>
            <button
              type="button"
              id="btn-semaforo-produccion"
              aria-pressed={showSemaforo}
              onClick={() => setShowSemaforo(v => !v)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '0.45rem 0.85rem',
                border: `2px solid ${showSemaforo ? '#16a34a' : '#cbd5e1'}`,
                borderRadius: 20,
                background: showSemaforo ? '#f0fdf4' : '#fff',
                color: showSemaforo ? '#15803d' : '#475569',
                fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
                transition: 'all 0.18s ease'
              }}
            >
              <span style={{ fontSize: '1rem' }}>🚦</span>
              Semáforo de producción
            </button>
          </div>
        </div>
        {loading ? (
          <p style={{ margin: 0, padding: '1rem', color: '#64748b' }}>Cargando proyectos...</p>
        ) : (
          <>
            <div className="production-stage-flow">
              {STAGE_NAMES.map((name, index) => {
                const count = flowStageCounts[index];
                const isActive = overviewStage === index;
                const circleColor = isActive ? '#2563eb' : count ? '#16a34a' : '#cbd5e1';
                const isNextStep = latestActiveStage === index - 1;
                return (
                  <React.Fragment key={name}>
                    <button type="button" aria-pressed={isActive} aria-label={`${name}, ${count} ${count === 1 ? 'proyecto' : 'proyectos'}`} onClick={() => { setOverviewStage(index); clearProductionSelection(); }}
                      className={`production-stage-button${isActive ? ' is-selected' : ''}${count ? ' has-projects' : ''}`}
                      style={{ '--stage-color': circleColor, '--stage-surface': isActive ? '#eff6ff' : count ? '#f0fdf4' : '#f8fafc', color: isActive ? '#1d4ed8' : '#334155' }}>
                      <span className="production-stage-icon"><StageIcon stage={index} /></span>
                      <span className="production-stage-name">{name}</span>
                      <span className="production-stage-count" style={{ color: isActive ? '#1d4ed8' : count ? '#15803d' : '#64748b' }}>{count} {count === 1 ? 'proyecto' : 'proyectos'}</span>
                    </button>
                    {index < STAGE_NAMES.length - 1 && (
                      <span className={`production-stage-connector${index < latestActiveStage ? ' is-lit' : ''}${isNextStep ? ' is-next' : ''}`} aria-hidden="true" title={isNextStep ? `Siguiente etapa: ${STAGE_NAMES[index + 1]}` : undefined}>
                        <span>›</span>
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 1rem' }}>
              <button type="button" aria-pressed={overviewStage === -1}
                onClick={() => {
                  setOverviewStage(projectsWithoutSchedule.length ? -1 : null);
                  clearProductionSelection();
                }}
                style={{ padding: '0.5rem 0.8rem', border: `1px solid ${overviewStage === -1 ? '#2563eb' : '#cbd5e1'}`, borderRadius: 20, background: overviewStage === -1 ? '#eff6ff' : '#fff', color: overviewStage === -1 ? '#1d4ed8' : '#475569', fontWeight: 750, cursor: 'pointer' }}>
                Sin cronograma ({projectsWithoutSchedule.length})
              </button>
            </div>

            {/* ── SEMÁFORO DE PRODUCCIÓN ── */}
            {showSemaforo && (() => {
              const SEMAFORO_ETAPAS = STAGE_NAMES;

              const getProjectBusinessDaysList = (startDate, plannedDays) => {
                if (!startDate || !Number.isFinite(plannedDays) || plannedDays <= 0) return [];
                const list = [];
                const cur = new Date(startDate);
                cur.setHours(12, 0, 0, 0);
                let count = 0;
                while (count < plannedDays) {
                  if (cur.getDay() !== 0 && cur.getDay() !== 6) {
                    count += 1;
                    list.push({
                      dayNumber: count,
                      date: new Date(cur),
                      dateKey: getDateKey(cur)
                    });
                  }
                  cur.setDate(cur.getDate() + 1);
                }
                return list;
              };

              const getSemaforo = (project) => {
                const schedule = semaforoProjectSchedules.get(getSemaforoProjectKey(project));
                const currentStageIdx = productionStageIndex(project);
                const isDelivered = project.status === 'ENTREGADO';
                if (isDelivered) return { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', emoji: '✅', label: 'Entregado', etapa: SEMAFORO_ETAPAS[5], detail: '' };
                if (!schedule) {
                  return { color: '#78716c', bg: '#fafaf9', border: '#d6d3d1', emoji: '⚪', label: 'Sin cronograma', etapa: SEMAFORO_ETAPAS[currentStageIdx] || SEMAFORO_ETAPAS[0], detail: 'No tiene días de producción registrados' };
                }
                const { expectedStage, daysRemaining } = schedule;
                const stageDiff = currentStageIdx - expectedStage;
                if (daysRemaining < 0 || stageDiff < -1) {
                  const diasAtras = Math.abs(daysRemaining);
                  return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', emoji: '🔴', label: stageDiff < -1 ? `Atrasado ${Math.abs(stageDiff)} etapa(s)` : `${diasAtras} día(s) vencido(s)`, etapa: SEMAFORO_ETAPAS[currentStageIdx] || SEMAFORO_ETAPAS[0], detail: `Etapa actual: ${currentStageIdx + 1} · Esperada: ${expectedStage + 1}` };
                }
                if (stageDiff < 0 || daysRemaining <= 3) {
                  return { color: '#d97706', bg: '#fffbeb', border: '#fde68a', emoji: '🟡', label: daysRemaining <= 3 && daysRemaining >= 0 ? `${daysRemaining} día(s) restante(s)` : 'Etapa ligeramente atrás', etapa: SEMAFORO_ETAPAS[currentStageIdx] || SEMAFORO_ETAPAS[0], detail: `Etapa actual: ${currentStageIdx + 1} · Esperada: ${expectedStage + 1}` };
                }
                return { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', emoji: '🟢', label: `${daysRemaining} día(s) restante(s)`, etapa: SEMAFORO_ETAPAS[currentStageIdx] || SEMAFORO_ETAPAS[0], detail: `Etapa ${currentStageIdx + 1} de ${SEMAFORO_ETAPAS.length}` };
              };
              const semRed = semaforoProjects.filter(p => getSemaforo(p).emoji === '🔴');
              const semYellow = semaforoProjects.filter(p => getSemaforo(p).emoji === '🟡');
              const semGreen = semaforoProjects.filter(p => getSemaforo(p).emoji === '🟢');
              const semWhite = semaforoProjects.filter(p => getSemaforo(p).emoji === '⚪');
              const semDone = semaforoProjects.filter(p => getSemaforo(p).emoji === '✅');
              const semStale = semaforoProjects.filter(p => getProjectStaleInfo(p).isStale);
              const orderedProjects = [...semRed, ...semYellow, ...semGreen, ...semWhite, ...semDone];
              return (
                <section
                  aria-label="Semáforo de producción"
                  style={{
                    marginTop: 2,
                    marginBottom: 4,
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    border: '2px solid #334155',
                    borderRadius: 14,
                    boxShadow: '0 8px 28px rgba(15,23,42,0.18)'
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Control de producción</div>
                      <h3 style={{ margin: '3px 0 0', color: '#f1f5f9', fontSize: '1rem' }}>🚦 Semáforo de producción</h3>
                      <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: 2 }}>Días hábiles ÷ 6 etapas · Se actuali&shy;za en tiempo real</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {semStale.length > 0 && (
                        <span style={{ padding: '0.28rem 0.65rem', borderRadius: 999, background: '#7f1d1d', color: '#fecaca', border: '1px solid #ef4444', fontSize: '0.72rem', fontWeight: 900, boxShadow: '0 0 10px rgba(239,68,68,0.3)' }}>
                          🚨 {semStale.length} sin avance &gt;24h
                        </span>
                      )}
                      {[['🔴', semRed.length, '#fecaca', '#7f1d1d'], ['🟡', semYellow.length, '#fde68a', '#78350f'], ['🟢', semGreen.length, '#bbf7d0', '#14532d'], ['⚪', semWhite.length, '#e2e8f0', '#475569'], ['✅', semDone.length, '#a7f3d0', '#065f46']].map(([emoji, count, bg, color]) => (
                        <span key={emoji} style={{ padding: '0.28rem 0.6rem', borderRadius: 999, background: bg, color, fontSize: '0.72rem', fontWeight: 800 }}>{emoji} {count}</span>
                      ))}
                    </div>
                  </div>

                  {/* Leyenda de etapas */}
                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 0 10px', marginBottom: 10, borderBottom: '1px solid #334155' }}>
                    {SEMAFORO_ETAPAS.map((etapa, idx) => (
                      <div key={etapa} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.6rem', background: '#1e293b', border: '1px solid #334155', borderRadius: 20 }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#334155', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', flexShrink: 0 }}>{idx + 1}</span>
                        <span style={{ color: '#cbd5e1', fontSize: '0.67rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{etapa}</span>
                      </div>
                    ))}
                  </div>

                  {/* Lista de clientes */}
                  {orderedProjects.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>No hay proyectos en producción.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 10 }}>
                      {orderedProjects.map(project => {
                        const sem = getSemaforo(project);
                        const projectKey = getSemaforoProjectKey(project);
                        const schedule = semaforoProjectSchedules.get(projectKey);
                        const stageIdx = productionStageIndex(project);
                        const staleInfo = getProjectStaleInfo(project);
                        return (
                          <button
                            key={projectKey}
                            type="button"
                            id={`semaforo-cliente-${projectKey}`}
                            onClick={() => {
                              setSemaforoSelected(previous => getSemaforoProjectKey(previous || {}) === projectKey ? null : project);
                              setSemaforoSelectedDayKey(null);
                              setSemaforoAdvanceFiles([]);
                              setSemaforoAdvanceComment('');
                            }}
                            aria-pressed={semaforoSelected ? getSemaforoProjectKey(semaforoSelected) === projectKey : false}
                            style={{
                              display: 'flex', flexDirection: 'column', gap: 8,
                              padding: '0.85rem 1rem',
                              background: '#1e293b',
                              border: staleInfo.isStale ? '2px solid #ef4444' : `2px solid ${sem.border}`,
                              borderLeft: staleInfo.isStale ? '6px solid #ef4444' : `6px solid ${sem.color}`,
                              borderRadius: 12,
                              textAlign: 'left', cursor: 'pointer',
                              position: 'relative',
                              boxShadow: staleInfo.isStale ? '0 0 16px rgba(239,68,68,0.22)' : 'none',
                              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px rgba(0,0,0,0.3)`; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = staleInfo.isStale ? '0 0 16px rgba(239,68,68,0.22)' : 'none'; }}
                          >
                            {/* Alarma 24 horas sin actividad */}
                            {staleInfo.isStale && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 6,
                                padding: '4px 8px',
                                background: 'linear-gradient(90deg, #991b1b 0%, #dc2626 100%)',
                                border: '1px solid #f87171',
                                borderRadius: 7,
                                color: '#ffffff',
                                fontSize: '0.64rem',
                                fontWeight: 900,
                                boxShadow: '0 2px 8px rgba(220,38,38,0.4)'
                              }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#fff', boxShadow: '0 0 6px #fff' }} />
                                  🚨 ALERTA 24H: Sin avance en taller
                                </span>
                                <span style={{ background: '#7f1d1d', padding: '1px 5px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 900, border: '1px solid #f87171' }}>
                                  +{staleInfo.hours}h
                                </span>
                              </div>
                            )}

                            {/* Fila superior: nombre + semáforo */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                              <div style={{ minWidth: 0 }}>
                                <strong style={{ display: 'block', color: '#f1f5f9', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {project.name || 'Cliente sin nombre'}
                                </strong>
                                <span style={{ display: 'block', marginTop: 2, color: '#94a3b8', fontSize: '0.71rem' }}>
                                  {project.workItemName
                                    ? `${project.workItemName} · ${project.public_id || `ID ${project.id}`}`
                                    : `${project.project_type || 'Proyecto'} · ${project.public_id || `ID ${project.id}`}`}
                                </span>
                              </div>
                              <div style={{ flexShrink: 0, textAlign: 'center' }}>
                                <div style={{ fontSize: '1.4rem', lineHeight: 1 }}>{sem.emoji}</div>
                                <div style={{ marginTop: 3, fontSize: '0.62rem', fontWeight: 800, color: sem.color, whiteSpace: 'nowrap' }}>{sem.label}</div>
                              </div>
                            </div>

                            {/* Etapa actual */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                                {SEMAFORO_ETAPAS.map((_, idx) => {
                                  const done = idx < stageIdx || project.status === 'ENTREGADO';
                                  const curr = idx === stageIdx && project.status !== 'ENTREGADO';
                                  return (
                                    <div key={idx} style={{
                                      flex: 1, height: 6, borderRadius: 999,
                                      background: done ? sem.color : curr ? sem.color : '#334155',
                                      opacity: curr ? 1 : done ? 0.85 : 0.3,
                                      transition: 'all 0.2s ease'
                                    }} />
                                  );
                                })}
                              </div>
                              <span style={{ flexShrink: 0, fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>
                                {project.status === 'ENTREGADO' ? '6/6' : `${stageIdx + 1}/6`}
                              </span>
                            </div>

                            {/* Etapa + días */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '0.7rem', color: '#cbd5e1', fontWeight: 600 }}>
                                {sem.etapa}
                              </span>
                              {schedule && project.status !== 'ENTREGADO' && (
                                <span style={{ fontSize: '0.65rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                  {schedule.elapsedDays}d / {schedule.plannedDays}d hábiles
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* ── PANEL INLINE HORIZONTAL ── */}
                  {semaforoSelected && (() => {
                    const selectedKey = getSemaforoProjectKey(semaforoSelected);
                    const sp = semaforoProjects.find(project => getSemaforoProjectKey(project) === selectedKey) || semaforoSelected;
                    const sprod = normalizeProduction(sp.production_data);
                    const ssched = semaforoProjectSchedules.get(selectedKey);
                    const staleInfo = getProjectStaleInfo(sp);

                    const getSem = (proj) => {
                      const sc = semaforoProjectSchedules.get(getSemaforoProjectKey(proj));
                      const ci = productionStageIndex(proj);
                      if (proj.status === 'ENTREGADO') return { color:'#16a34a', emoji:'✅', label:'Entregado' };
                      if (!sc) return { color:'#78716c', emoji:'⚪', label:'Sin cronograma' };
                      const diff = ci - sc.expectedStage;
                      if (sc.daysRemaining < 0 || diff < -1) return { color:'#dc2626', emoji:'🔴', label: diff < -1 ? `${Math.abs(diff)} etapa(s) atrás` : `${Math.abs(sc.daysRemaining)}d vencido` };
                      if (diff < 0 || sc.daysRemaining <= 3) return { color:'#d97706', emoji:'🟡', label:`${sc.daysRemaining}d restantes` };
                      return { color:'#16a34a', emoji:'🟢', label:`${sc.daysRemaining}d restantes` };
                    };
                    const sem = getSem(sp);

                    // Días y cronograma del proyecto
                    const sPlannedDays = ssched?.plannedDays || Number.parseInt(sp.production_days, 10) || 30;
                    const sStartDate = ssched?.startDate || calendarDate(sprod.started_at) || calendarDate(sp.contract_date) || new Date();
                    const rawProjectDays = getProjectBusinessDaysList(sStartDate, sPlannedDays);
                    const projectDays = rawProjectDays.length > 0 ? rawProjectDays : getProjectBusinessDaysList(new Date(), 30);

                    // Avances diarios por fecha
                    const dailyAdvances = Array.isArray(sprod.daily_advances) ? sprod.daily_advances : [];
                    const advancesByDate = new Map();
                    dailyAdvances.forEach(adv => {
                      const k = adv.date || (adv.created_at ? getDateKey(new Date(adv.created_at)) : null);
                      if (!k) return;
                      if (!advancesByDate.has(k)) advancesByDate.set(k, []);
                      advancesByDate.get(k).push(adv);
                    });

                    const todayKey = getDateKey(new Date());
                    // Día activo seleccionado (por defecto hoy si está dentro del proyecto, o el primer día)
                    const activeDayKey = semaforoSelectedDayKey || (projectDays.some(d => d.dateKey === todayKey) ? todayKey : projectDays[0]?.dateKey);
                    const activeDayObj = projectDays.find(d => d.dateKey === activeDayKey) || projectDays[0];
                    const activeDayAdvances = activeDayKey ? (advancesByDate.get(activeDayKey) || []) : [];
                    const updateSemaforoProduction = (project, parentProductionData) => {
                      if (project.workItemId) {
                        const parentProduction = parseJson(parentProductionData, {});
                        const item = (Array.isArray(parentProduction.work_items) ? parentProduction.work_items : [])
                          .find(workItem => workItem.id === project.workItemId);
                        if (!item) throw new Error('No se encontró el área actualizada en la respuesta.');
                        setWorkItemContracts(current => current.map(contract => contract.id === project.id
                          ? { ...contract, production_data: parentProductionData }
                          : contract));
                        setSemaforoSelected(previous => previous
                          && getSemaforoProjectKey(previous) === getSemaforoProjectKey(project)
                          ? { ...previous, production_data: item.production_data || {}, status: item.status }
                          : previous);
                        return;
                      }
                      setProjects(current => current.map(item => item.id === project.id
                        ? { ...item, production_data: parentProductionData }
                        : item));
                      setSemaforoSelected(previous => previous?.id === project.id
                        ? { ...previous, production_data: parentProductionData }
                        : previous);
                    };

                    // Subir avance a este día
                    const handleUploadDayAdvance = async (e) => {
                      e.preventDefault();
                      if (!semaforoAdvanceFiles || semaforoAdvanceFiles.length === 0) {
                        alert('Por favor selecciona al menos una foto.');
                        return;
                      }
                      if (!activeDayKey) {
                        alert('Selecciona un día del calendario.');
                        return;
                      }
                      setSemaforoUploadingAdvance(true);
                      try {
                        let lastResult = null;
                        for (const file of semaforoAdvanceFiles) {
                          const spProd = parseJson(sp.production_data, {});
                          const curStage = spProd.current_stage !== undefined ? spProd.current_stage : 2;
                          const fd = new FormData();
                          fd.append('file', file);
                          fd.append('date', activeDayKey);
                          fd.append('comment', semaforoAdvanceComment);
                          fd.append('published', semaforoAdvancePublished ? 'true' : 'false');
                          fd.append('stage', String(curStage));
                          if (sp.workItemId) fd.append('work_item_id', sp.workItemId);
                          const res = await fetch(`${API}/api/prospects/${sp.id}/daily-advances`, {
                            method: 'POST',
                            body: fd
                          });
                          if (!res.ok) throw new Error('Error al subir la evidencia diaria');
                          lastResult = await res.json();
                        }
                        if (lastResult) {
                          updateSemaforoProduction(sp, lastResult.production_data);
                        }
                        setSemaforoAdvanceFiles([]);
                        setSemaforoAdvanceComment('');
                        setMessage('✅ Evidencia del día guardada correctamente');
                      } catch (err) {
                        setMessage('❌ ' + err.message);
                      } finally {
                        setSemaforoUploadingAdvance(false);
                      }
                    };

                    // Alternar publicación al cliente
                    const handleToggleDailyPublish = async (advId, currentPublished) => {
                      try {
                        const workItemQuery = sp.workItemId ? `?work_item_id=${encodeURIComponent(sp.workItemId)}` : '';
                        const res = await fetch(`${API}/api/prospects/${sp.id}/daily-advances/${advId}${workItemQuery}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ published: !currentPublished })
                        });
                        if (!res.ok) throw new Error('Error al actualizar visibilidad');
                        const updated = await res.json();
                        updateSemaforoProduction(sp, updated.production_data);
                      } catch (err) {
                        setMessage('❌ ' + err.message);
                      }
                    };

                    // Eliminar avance
                    const handleDeleteDailyAdvance = async (advId) => {
                      if (!window.confirm('¿Eliminar esta foto de avance?')) return;
                      try {
                        const workItemQuery = sp.workItemId ? `?work_item_id=${encodeURIComponent(sp.workItemId)}` : '';
                        const res = await fetch(`${API}/api/prospects/${sp.id}/daily-advances/${advId}${workItemQuery}`, {
                          method: 'DELETE'
                        });
                        if (!res.ok) throw new Error('Error al eliminar');
                        const updated = await res.json();
                        updateSemaforoProduction(sp, updated.production_data);
                      } catch (err) {
                        setMessage('❌ ' + err.message);
                      }
                    };

                    // Agrupar días del proyecto por semanas (de 5 días hábiles c/u)
                    const projectWeeks = [];
                    for (let i = 0; i < projectDays.length; i += 5) {
                      projectWeeks.push({
                        weekNum: Math.floor(i / 5) + 1,
                        days: projectDays.slice(i, i + 5)
                      });
                    }

                    // Días transcurridos vs restantes en producción
                    const totalDays = projectDays.length;
                    const elapsedDaysCount = projectDays.filter(d => d.dateKey < todayKey).length;
                    const remainingDaysCount = projectDays.filter(d => d.dateKey > todayKey).length;

                    // Ciclo de vida completo del proyecto: Prospecto -> Cliente -> Producción
                    const pProspectDate = calendarDate(sp.capture_date) || calendarDate(sp.created_at);
                    const pContractDate = calendarDate(sp.contract_date);
                    const pProdStartDate = sStartDate;
                    const pDeadlineDate = ssched?.deadline || (projectDays[projectDays.length - 1]?.date) || null;

                    // Días en Prospecto (desde captación hasta firma de contrato)
                    let pProspectDays = 0;
                    if (pProspectDate && pContractDate) {
                      pProspectDays = Math.max(1, Math.round((pContractDate.getTime() - pProspectDate.getTime()) / (1000 * 60 * 60 * 24)));
                    } else if (pProspectDate) {
                      pProspectDays = Math.max(1, Math.round((new Date().getTime() - pProspectDate.getTime()) / (1000 * 60 * 60 * 24)));
                    }

                    // Días en Cliente / Pre-producción (desde firma de contrato hasta arranque en taller)
                    let pClientPrepDays = 0;
                    if (pContractDate && pProdStartDate) {
                      const diff = Math.round((pProdStartDate.getTime() - pContractDate.getTime()) / (1000 * 60 * 60 * 24));
                      pClientPrepDays = Math.max(0, diff);
                    }

                    // Total de días acumulados del proyecto en todas sus fases
                    const pTotalLifecycleDays = (pProspectDays || 0) + (pClientPrepDays || 0) + elapsedDaysCount;

                    return (
                      <div style={{ marginTop:16, padding:'1.25rem', background:'linear-gradient(135deg,#0f172a,#1a2744)', border:`2px solid ${sem.color}44`, borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,0.25)' }}>

                        {/* Alerta de 24 horas sin actividad si aplica */}
                        {staleInfo.isStale && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 10,
                            padding: '0.65rem 1rem',
                            marginBottom: 16,
                            background: 'linear-gradient(90deg, #7f1d1d 0%, #991b1b 100%)',
                            border: '1px solid #ef4444',
                            borderRadius: 10,
                            color: '#ffffff',
                            boxShadow: '0 4px 14px rgba(220,38,38,0.3)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '1.2rem' }}>🚨</span>
                              <div>
                                <strong style={{ display: 'block', fontSize: '0.78rem', color: '#fee2e2' }}>
                                  ¡ALERTA DE PRODUCCIÓN: +{staleInfo.hours} horas sin reporte en taller!
                                </strong>
                                <span style={{ fontSize: '0.68rem', color: '#fca5a5' }}>
                                  No se ha subido evidencia hoy. Selecciona el día actual en el calendario abajo para registrar fotos y actualizar el semáforo.
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSemaforoSelectedDayKey(todayKey)}
                              style={{
                                padding: '0.35rem 0.8rem',
                                background: '#fee2e2',
                                color: '#991b1b',
                                border: 'none',
                                borderRadius: 7,
                                fontSize: '0.7rem',
                                fontWeight: 900,
                                cursor: 'pointer'
                              }}
                            >
                              Ir a HOY y subir foto 📸
                            </button>
                          </div>
                        )}

                        {/* Header del panel */}
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, marginBottom:16 }}>
                          <div>
                            <div style={{ color:'#94a3b8', fontSize:'0.65rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em' }}>
                              {sp.workItemName ? `Área · ${sp.workItemName}` : sp.project_type || 'Proyecto'} · {sp.public_id || `ID ${sp.id}`}
                            </div>
                            <div style={{ color:'#ffffff', fontSize:'1.1rem', fontWeight:900, marginTop:2 }}>{sp.name}</div>
                          </div>
                          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                            <span style={{ padding:'0.25rem 0.7rem', borderRadius999: true, background:`${sem.color}22`, color:sem.color, fontSize:'0.72rem', fontWeight:800, border:`1px solid ${sem.color}55`, borderRadius: 999 }}>
                              {sem.emoji} {sem.label}
                            </span>
                            <span style={{ color:'#cbd5e1', fontSize:'0.72rem', fontWeight:700 }}>
                              {totalDays} días contratados · {elapsedDaysCount} agotados
                            </span>
                            {!sp.workItemId && (
                              <button type="button" onClick={() => { setSemaforoSelected(null); selectProductionProject(sp); }}
                                style={{ padding:'0.35rem 0.8rem', border:'1px solid #3b82f6', borderRadius:8, background:'#1d4ed8', color:'#fff', fontSize:'0.7rem', fontWeight:800, cursor:'pointer' }}>
                                📋 Ficha completa
                              </button>
                            )}
                            <button type="button" onClick={() => setSemaforoSelected(null)}
                              style={{ width:28, height:28, border:'1px solid #334155', borderRadius:8, background:'#1e293b', color:'#94a3b8', cursor:'pointer', fontSize:'0.9rem' }}>×</button>
                          </div>
                        </div>

                        {/* Barra de resumen del ciclo de vida */}
                        <div style={{ display:'flex', gap:10, flexWrap:'wrap', padding:'0.65rem 0.9rem', background:'#0b1329', border:'1px solid #1e293b', borderRadius:10, marginBottom:18, alignItems:'center' }}>
                          <span style={{ color:'#f59e0b', fontSize:'0.72rem', fontWeight:800 }}>
                            🎯 <strong>Prospecto:</strong> {pProspectDays} {pProspectDays === 1 ? 'día' : 'días'}
                          </span>
                          <span style={{ color:'#475569' }}>·</span>
                          <span style={{ color:'#38bdf8', fontSize:'0.72rem', fontWeight:800 }}>
                            ✍️ <strong>Cliente:</strong> {pClientPrepDays} {pClientPrepDays === 1 ? 'día' : 'días'}
                          </span>
                          <span style={{ color:'#475569' }}>·</span>
                          <span style={{ color:'#10b981', fontSize:'0.72rem', fontWeight:800 }}>
                            🔨 <strong>Producción:</strong> {elapsedDaysCount} de {totalDays} días ({remainingDaysCount} rest.)
                          </span>
                          <span style={{ color:'#475569' }}>·</span>
                          <span style={{ color:'#ffffff', fontSize:'0.72rem', fontWeight:800, background:'#1e293b', padding:'3px 8px', borderRadius:6, border:'1px solid #334155' }}>
                            ⏱️ <strong>Total acumulado:</strong> {pTotalLifecycleDays} días
                          </span>
                          <span style={{ color:'#475569' }}>·</span>
                          <span style={{ color:'#fbbf24', fontSize:'0.72rem', fontWeight:800 }}>
                            📸 {dailyAdvances.length} fotos
                          </span>
                        </div>

                        {/* ── SECCIÓN 1: CICLO DE VIDA Y LÍNEA DE TIEMPO COMPACTA ── */}
                        {(() => {
                          const pct = totalDays > 0 ? Math.min(100, Math.round((elapsedDaysCount / totalDays) * 100)) : 0;
                          // Milestones: día 1, 25%, 50%, 75%, hoy, último día
                          const milestoneIndices = [
                            0,
                            Math.round(totalDays * 0.25) - 1,
                            Math.round(totalDays * 0.5) - 1,
                            Math.round(totalDays * 0.75) - 1,
                            totalDays - 1,
                          ].filter((v, i, a) => v >= 0 && v < totalDays && a.indexOf(v) === i);
                          const todayIdx = projectDays.findIndex(d => d.dateKey === todayKey);

                          return (
                            <div style={{ marginBottom: 20, padding: '0.9rem 1rem', background: '#090d16', border: '1px solid #1e293b', borderRadius: 12 }}>
                              
                              {/* ── TARJETAS DEL CICLO DE VIDA COMPLETO (PROSPECTO ➔ CLIENTE ➔ PRODUCCIÓN) ── */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, marginBottom: 14 }}>
                                {/* FASE 1: PROSPECTO */}
                                <div style={{
                                  background: '#131b2e',
                                  border: '1px solid #f59e0b55',
                                  borderLeft: '4px solid #f59e0b',
                                  borderRadius: 8,
                                  padding: '0.6rem 0.8rem'
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                    <span style={{ color: '#fbbf24', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                      🎯 Fase 1 · Prospecto
                                    </span>
                                    <span style={{ background: '#f59e0b22', color: '#fbbf24', fontSize: '0.68rem', fontWeight: 900, padding: '1px 6px', borderRadius: 4, border: '1px solid #f59e0b44' }}>
                                      {pProspectDays} {pProspectDays === 1 ? 'día' : 'días'}
                                    </span>
                                  </div>
                                  <div style={{ color: '#ffffff', fontSize: '0.74rem', fontWeight: 700 }}>
                                    Captación & Cotización
                                  </div>
                                  <div style={{ color: '#94a3b8', fontSize: '0.62rem', marginTop: 3 }}>
                                    {pProspectDate ? pProspectDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Captura'} ➔ {pContractDate ? pContractDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Firma contrato'}
                                  </div>
                                </div>

                                {/* FASE 2: CLIENTE / FORMALIZACIÓN */}
                                <div style={{
                                  background: '#131b2e',
                                  border: '1px solid #38bdf855',
                                  borderLeft: '4px solid #38bdf8',
                                  borderRadius: 8,
                                  padding: '0.6rem 0.8rem'
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                    <span style={{ color: '#38bdf8', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                      ✍️ Fase 2 · Cliente
                                    </span>
                                    <span style={{ background: '#38bdf822', color: '#38bdf8', fontSize: '0.68rem', fontWeight: 900, padding: '1px 6px', borderRadius: 4, border: '1px solid #38bdf844' }}>
                                      {pClientPrepDays} {pClientPrepDays === 1 ? 'día' : 'días'}
                                    </span>
                                  </div>
                                  <div style={{ color: '#ffffff', fontSize: '0.74rem', fontWeight: 700 }}>
                                    Firma & Preparación Taller
                                  </div>
                                  <div style={{ color: '#94a3b8', fontSize: '0.62rem', marginTop: 3 }}>
                                    {pContractDate ? pContractDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Contrato'} ➔ {pProdStartDate ? pProdStartDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Inicio taller'}
                                  </div>
                                </div>

                                {/* FASE 3: PRODUCCIÓN EN TALLER */}
                                <div style={{
                                  background: '#131b2e',
                                  border: '1px solid #10b98155',
                                  borderLeft: '4px solid #10b981',
                                  borderRadius: 8,
                                  padding: '0.6rem 0.8rem'
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                    <span style={{ color: '#34d399', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                      🔨 Fase 3 · Producción
                                    </span>
                                    <span style={{ background: '#10b98122', color: '#34d399', fontSize: '0.68rem', fontWeight: 900, padding: '1px 6px', borderRadius: 4, border: '1px solid #10b98144' }}>
                                      {totalDays} días contratados
                                    </span>
                                  </div>
                                  <div style={{ color: '#ffffff', fontSize: '0.74rem', fontWeight: 700 }}>
                                    {elapsedDaysCount} agotados · {remainingDaysCount} restantes
                                  </div>
                                  <div style={{ color: '#94a3b8', fontSize: '0.62rem', marginTop: 3 }}>
                                    {pProdStartDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })} ➔ {pDeadlineDate ? pDeadlineDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Compromiso'}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <h4 style={{ margin: 0, color: '#ffffff', fontSize: '0.82rem', fontWeight: 900 }}>
                                  📏 Producción en Taller · {totalDays} días hábiles contratados
                                </h4>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button type="button" onClick={() => setSemaforoSelectedDayKey(projectDays[0]?.dateKey)}
                                    style={{ padding:'0.2rem 0.5rem', background:'#1e293b', border:'1px solid #334155', borderRadius:5, color:'#fff', fontSize:'0.62rem', fontWeight:800, cursor:'pointer' }}>
                                    ⏮ Día 1
                                  </button>
                                  <button type="button" onClick={() => setSemaforoSelectedDayKey(todayKey)}
                                    style={{ padding:'0.2rem 0.5rem', background:'#1e3a8a', border:'1px solid #38bdf8', borderRadius:5, color:'#fff', fontSize:'0.62rem', fontWeight:800, cursor:'pointer' }}>
                                    📍 HOY
                                  </button>
                                  <button type="button" onClick={() => setSemaforoSelectedDayKey(projectDays[projectDays.length - 1]?.dateKey)}
                                    style={{ padding:'0.2rem 0.5rem', background:'#1e293b', border:'1px solid #334155', borderRadius:5, color:'#fff', fontSize:'0.62rem', fontWeight:800, cursor:'pointer' }}>
                                    ⏭ Día {totalDays}
                                  </button>
                                </div>
                              </div>

                              {/* Barra de progreso */}
                              <div style={{ position: 'relative', height: 10, background: '#1e293b', borderRadius: 999, marginBottom: 14, overflow: 'visible' }}>
                                {/* Relleno progreso */}
                                <div style={{
                                  position: 'absolute', left: 0, top: 0, bottom: 0,
                                  width: `${pct}%`,
                                  background: 'linear-gradient(90deg, #2563eb, #10b981)',
                                  borderRadius: 999,
                                  boxShadow: '0 0 10px rgba(16,185,129,0.45)',
                                  transition: 'width 0.5s ease'
                                }} />

                                {/* Indicador HOY */}
                                {todayIdx >= 0 && (
                                  <div style={{
                                    position: 'absolute',
                                    left: `${Math.min(100, (todayIdx / Math.max(1, totalDays - 1)) * 100)}%`,
                                    top: '50%', transform: 'translate(-50%, -50%)',
                                    width: 18, height: 18, borderRadius: '50%',
                                    background: '#fbbf24', border: '3px solid #fff',
                                    boxShadow: '0 0 10px rgba(251,191,36,0.8)',
                                    zIndex: 4
                                  }} />
                                )}

                                {/* Milestones */}
                                {milestoneIndices.map(mi => {
                                  const md = projectDays[mi];
                                  if (!md) return null;
                                  const mPct = (mi / Math.max(1, totalDays - 1)) * 100;
                                  const mIsPast = md.dateKey <= todayKey;
                                  return (
                                    <div key={mi} style={{
                                      position: 'absolute',
                                      left: `${mPct}%`,
                                      top: '50%', transform: 'translate(-50%, -50%)',
                                      width: 10, height: 10, borderRadius: '50%',
                                      background: mIsPast ? '#10b981' : '#334155',
                                      border: '2px solid #0f172a',
                                      zIndex: 3
                                    }} />
                                  );
                                })}
                              </div>

                              {/* Etiquetas de milestones */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                                {milestoneIndices.map(mi => {
                                  const md = projectDays[mi];
                                  if (!md) return null;
                                  const mIsPast = md.dateKey <= todayKey;
                                  return (
                                    <button key={mi} type="button"
                                      onClick={() => setSemaforoSelectedDayKey(md.dateKey)}
                                      style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        padding: '3px 7px',
                                        background: activeDayKey === md.dateKey ? '#0369a1' : '#1e293b',
                                        border: `1px solid ${activeDayKey === md.dateKey ? '#38bdf8' : mIsPast ? '#10b981' : '#334155'}`,
                                        borderRadius: 6, cursor: 'pointer',
                                        boxShadow: activeDayKey === md.dateKey ? '0 0 8px rgba(56,189,248,0.4)' : 'none'
                                      }}
                                    >
                                      <span style={{ color: '#ffffff', fontSize: '0.62rem', fontWeight: 900 }}>Día {md.dayNumber}</span>
                                      <span style={{ color: '#94a3b8', fontSize: '0.58rem' }}>
                                        {md.date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Texto de porcentaje y progreso */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: '0.68rem', color: '#94a3b8' }}>
                                <span>🔵 {elapsedDaysCount} días agotados</span>
                                <span style={{ color: '#10b981', fontWeight: 900 }}>{pct}% completado</span>
                                <span>🟢 {remainingDaysCount} días restantes</span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* ── SECCIÓN 2: CALENDARIO MENSUAL + PANEL DE FOTOS DEL DÍA ── */}
                        {(() => {
                          // Construir set de días del proyecto para lookup rápido
                          const projectDayMap = new Map(projectDays.map(d => [d.dateKey, d]));

                          // Calcular rango de meses cubiertos por el proyecto
                          const firstDate = projectDays[0]?.date || new Date();
                          const lastDate = projectDays[projectDays.length - 1]?.date || new Date();

                          // Mes activo del calendario (derivado del día seleccionado o el mes de hoy)
                          const calTargetDate = activeDayKey
                            ? (projectDayMap.get(activeDayKey)?.date || firstDate)
                            : firstDate;

                          // Navegar meses con estado local (usamos ref para no re-renderizar todo)
                          // Usamos el mes/año del día activo como ancla
                          const calYear = calTargetDate.getFullYear();
                          const calMonth = calTargetDate.getMonth(); // 0-indexed

                          // Número de días en el mes
                          const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                          // Día de la semana del 1ro del mes (0=Dom)
                          const firstWeekday = new Date(calYear, calMonth, 1).getDay();
                          // Ajustar para Lun=0
                          const startOffset = (firstWeekday + 6) % 7;

                          const calCells = [];
                          // Celdas vacías al inicio
                          for (let i = 0; i < startOffset; i++) calCells.push(null);
                          // Días del mes
                          for (let d = 1; d <= daysInMonth; d++) {
                            const dt = new Date(calYear, calMonth, d);
                            const dk = getDateKey(dt);
                            calCells.push({ date: dt, dateKey: dk, dayNum: d, projDay: projectDayMap.get(dk) || null });
                          }

                          const calMonthLabel = new Date(calYear, calMonth, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

                          // Mes anterior / siguiente dentro del rango del proyecto
                          const prevMonthDate = new Date(calYear, calMonth - 1, 15);
                          const nextMonthDate = new Date(calYear, calMonth + 1, 15);
                          const canGoPrev = prevMonthDate >= new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
                          const canGoNext = nextMonthDate <= new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);

                          const weekDays = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

                          return (
                            <div style={{ marginBottom: 24 }}>
                              <h4 style={{ margin: '0 0 10px', color: '#ffffff', fontSize: '0.88rem', fontWeight: 900 }}>
                                📅 Calendario del proyecto · {totalDays} días hábiles
                              </h4>

                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                                gap: 14,
                                alignItems: 'start'
                              }}>

                                {/* COLUMNA IZQUIERDA: Calendario mensual */}
                                <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: 12, padding: '0.85rem', minWidth: 0 }}>
                                  {/* Header del mes */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <button type="button"
                                      disabled={!canGoPrev}
                                      onClick={() => {
                                        const pd = projectDays.find(d => {
                                          const dt = d.date;
                                          return dt.getFullYear() === prevMonthDate.getFullYear() && dt.getMonth() === prevMonthDate.getMonth();
                                        });
                                        if (pd) setSemaforoSelectedDayKey(pd.dateKey);
                                      }}
                                      style={{ background: 'none', border: '1px solid #334155', borderRadius: 6, color: canGoPrev ? '#ffffff' : '#334155', cursor: canGoPrev ? 'pointer' : 'default', padding: '2px 8px', fontSize: '0.8rem' }}
                                    >‹</button>
                                    <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.78rem', textTransform: 'capitalize' }}>{calMonthLabel}</span>
                                    <button type="button"
                                      disabled={!canGoNext}
                                      onClick={() => {
                                        const nd = projectDays.find(d => {
                                          const dt = d.date;
                                          return dt.getFullYear() === nextMonthDate.getFullYear() && dt.getMonth() === nextMonthDate.getMonth();
                                        });
                                        if (nd) setSemaforoSelectedDayKey(nd.dateKey);
                                      }}
                                      style={{ background: 'none', border: '1px solid #334155', borderRadius: 6, color: canGoNext ? '#ffffff' : '#334155', cursor: canGoNext ? 'pointer' : 'default', padding: '2px 8px', fontSize: '0.8rem' }}
                                    >›</button>
                                  </div>

                                  {/* Cabecera días semana */}
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                                    {weekDays.map(wd => (
                                      <div key={wd} style={{ textAlign: 'center', color: '#64748b', fontSize: '0.58rem', fontWeight: 800, padding: '2px 0' }}>{wd}</div>
                                    ))}
                                  </div>

                                  {/* Grid de días */}
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                                    {calCells.map((cell, ci) => {
                                      if (!cell) return <div key={`e${ci}`} />;
                                      const isProjectDay = !!cell.projDay;
                                      const isPast = cell.dateKey < todayKey;
                                      const isToday = cell.dateKey === todayKey;
                                      const isSelected = cell.dateKey === activeDayKey;
                                      const dayAdvs = isProjectDay ? (advancesByDate.get(cell.dateKey) || []) : [];
                                      const hasPhotos = dayAdvs.length > 0;
                                      const firstPhoto = hasPhotos ? dayAdvs[0] : null;

                                      return (
                                        <button
                                          key={cell.dateKey}
                                          type="button"
                                          disabled={!isProjectDay}
                                          onClick={() => isProjectDay && setSemaforoSelectedDayKey(cell.dateKey)}
                                          title={isProjectDay ? `Día ${cell.projDay.dayNumber} · ${cell.dateKey}${hasPhotos ? ` · ${dayAdvs.length} foto(s)` : ''}` : ''}
                                          style={{
                                            position: 'relative',
                                            aspectRatio: '1',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'flex-start',
                                            padding: '2px',
                                            border: isSelected
                                              ? '2px solid #38bdf8'
                                              : isToday
                                                ? '2px solid #fbbf24'
                                                : isProjectDay
                                                  ? hasPhotos
                                                    ? '1px solid #22c55e'
                                                    : isPast
                                                      ? '1px solid #1e3a8a'
                                                      : '1px solid #1e293b'
                                                  : '1px solid #0f172a',
                                            borderRadius: 6,
                                            background: isSelected
                                              ? '#0369a1'
                                              : isToday
                                                ? '#78350f'
                                                : isProjectDay
                                                  ? hasPhotos
                                                    ? '#0f2d18'
                                                    : isPast
                                                      ? '#0d1a2e'
                                                      : '#0d1322'
                                                  : '#07090f',
                                            cursor: isProjectDay ? 'pointer' : 'default',
                                            overflow: 'hidden',
                                            boxShadow: isSelected ? '0 0 8px rgba(56,189,248,0.5)' : isToday ? '0 0 8px rgba(251,191,36,0.4)' : 'none',
                                            transition: 'border-color 0.15s, background 0.15s'
                                          }}
                                        >
                                          {/* Miniatura de foto si hay */}
                                          {firstPhoto && (
                                            <img
                                              src={imageUrl(firstPhoto.url)}
                                              alt=""
                                              style={{
                                                position: 'absolute', inset: 0,
                                                width: '100%', height: '100%',
                                                objectFit: 'cover',
                                                opacity: 0.55,
                                                borderRadius: 5
                                              }}
                                            />
                                          )}

                                          {/* Número del día (siempre encima) */}
                                          <span style={{
                                            position: 'relative', zIndex: 1,
                                            fontSize: '0.62rem', fontWeight: 900,
                                            color: isProjectDay ? '#ffffff' : '#334155',
                                            lineHeight: 1,
                                            marginTop: 2,
                                            textShadow: firstPhoto ? '0 1px 3px rgba(0,0,0,0.9)' : 'none'
                                          }}>
                                            {cell.dayNum}
                                          </span>

                                          {/* Badge de fotos */}
                                          {hasPhotos && (
                                            <span style={{
                                              position: 'absolute', bottom: 2, right: 2, zIndex: 2,
                                              background: 'rgba(0,0,0,0.75)',
                                              color: '#86efac', fontSize: '0.48rem', fontWeight: 900,
                                              padding: '1px 3px', borderRadius: 3
                                            }}>📷{dayAdvs.length}</span>
                                          )}

                                          {/* HOY indicator */}
                                          {isToday && (
                                            <span style={{
                                              position: 'absolute', bottom: 2, left: 2, zIndex: 2,
                                              background: '#fbbf24', color: '#000',
                                              fontSize: '0.42rem', fontWeight: 900,
                                              padding: '1px 3px', borderRadius: 3
                                            }}>HOY</span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* Leyenda */}
                                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, fontSize: '0.58rem' }}>
                                    <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 3 }}>
                                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#78350f', border: '2px solid #fbbf24', display: 'inline-block' }} />HOY
                                    </span>
                                    <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 3 }}>
                                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#0369a1', border: '2px solid #38bdf8', display: 'inline-block' }} />Seleccionado
                                    </span>
                                    <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 3 }}>
                                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#0f2d18', border: '1px solid #22c55e', display: 'inline-block' }} />Con fotos
                                    </span>
                                    <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 3 }}>
                                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#07090f', border: '1px solid #0f172a', display: 'inline-block' }} />Fuera del proyecto
                                    </span>
                                  </div>
                                </div>

                                {/* COLUMNA DERECHA: Panel de fotos del día seleccionado */}
                                <div style={{ background: '#090d16', border: '2px solid #38bdf844', borderRadius: 12, padding: '0.85rem', minWidth: 0 }}>
                                  {/* Header del panel derecho */}
                                  <div style={{ marginBottom: 12 }}>
                                    <div style={{ color: '#38bdf8', fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Registro fotográfico</div>
                                    <div style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 900, marginTop: 2 }}>
                                      📸 {activeDayObj ? `Día ${activeDayObj.dayNumber} de ${totalDays}` : 'Selecciona un día'}
                                    </div>
                                    {activeDayKey && (
                                      <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: 2 }}>{formatReadableDate(activeDayKey)}</div>
                                    )}
                                    {activeDayKey && (
                                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                                        <span style={{
                                          padding: '2px 8px', borderRadius: 5,
                                          background: activeDayKey === todayKey ? '#78350f' : activeDayKey < todayKey ? '#1e293b' : '#0d1322',
                                          color: activeDayKey === todayKey ? '#fde047' : '#ffffff',
                                          border: '1px solid #334155', fontSize: '0.65rem', fontWeight: 800
                                        }}>
                                          {activeDayKey === todayKey ? '🔥 Día en curso (HOY)' : activeDayKey < todayKey ? '✓ Día agotado' : '⏳ Día futuro'}
                                        </span>
                                        {activeDayAdvances.length > 0 && (
                                          <>
                                            <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: 4, background: '#052e16', color: '#86efac', border: '1px solid #166534', fontWeight: 800 }}>
                                              👁️ {activeDayAdvances.filter(a => a.published !== false).length} para cliente
                                            </span>
                                            {activeDayAdvances.some(a => a.published === false) && (
                                              <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: 4, background: '#451a03', color: '#fdba74', border: '1px solid #9a3412', fontWeight: 800 }}>
                                                🔒 {activeDayAdvances.filter(a => a.published === false).length} taller
                                              </span>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Galería de fotos del día con control de visibilidad */}
                                  {!activeDayKey ? (
                                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#475569', fontSize: '0.75rem' }}>
                                      👆 Selecciona un día del calendario para ver o subir fotos
                                    </div>
                                  ) : activeDayAdvances.length === 0 ? (
                                    <div style={{ padding: '1rem', textAlign: 'center', background: '#0b1329', border: '1px dashed #334155', borderRadius: 8, color: '#64748b', fontSize: '0.72rem', marginBottom: 12 }}>
                                      Sin fotos para el Día {activeDayObj?.dayNumber}. Arrastra o selecciona fotos abajo.
                                    </div>
                                  ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 115px), 1fr))', gap: 8, marginBottom: 12 }}>
                                      {activeDayAdvances.map(adv => {
                                        const isPub = adv.published !== false;
                                        return (
                                          <div key={adv.id} style={{
                                            position: 'relative',
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                            border: `2px solid ${isPub ? '#22c55e' : '#f59e0b'}`,
                                            background: '#070c18',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            boxShadow: isPub ? '0 0 8px rgba(34,197,94,0.15)' : 'none'
                                          }}>
                                            {/* Foto */}
                                            <div style={{ position: 'relative', paddingTop: '80%', background: '#000', cursor: 'pointer' }}
                                              onClick={() => setSemaforoLightboxUrl(imageUrl(adv.url))}>
                                              <img src={imageUrl(adv.url)} alt=""
                                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                              
                                              {/* Badge superior de estado */}
                                              <span style={{
                                                position: 'absolute', top: 3, left: 3,
                                                background: isPub ? 'rgba(21,128,61,0.92)' : 'rgba(180,83,9,0.92)',
                                                color: '#ffffff', fontSize: '0.55rem', fontWeight: 900,
                                                padding: '1px 5px', borderRadius: 4, backdropFilter: 'blur(3px)'
                                              }}>
                                                {isPub ? '👁️ Cliente' : '🔒 Taller'}
                                              </span>

                                              <span style={{
                                                position: 'absolute', bottom: 3, right: 3,
                                                background: 'rgba(0,0,0,0.75)', color: '#fff',
                                                fontSize: '0.5rem', padding: '1px 4px', borderRadius: 3
                                              }}>🔍</span>
                                            </div>

                                            {/* Comentario */}
                                            {adv.comment && (
                                              <div style={{ padding: '3px 5px', background: '#0b1329', color: '#ffffff', fontSize: '0.58rem', lineHeight: 1.25, wordBreak: 'break-word', borderBottom: '1px solid #1e293b' }}>
                                                {adv.comment}
                                              </div>
                                            )}

                                            {/* Controles de visibilidad foto por foto */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px', background: '#020617' }}>
                                              <button
                                                type="button"
                                                onClick={() => handleToggleDailyPublish(adv.id, adv.published)}
                                                style={{
                                                  background: isPub ? '#166534' : '#334155',
                                                  border: 'none', borderRadius: 4,
                                                  color: '#ffffff', cursor: 'pointer',
                                                  fontSize: '0.58rem', fontWeight: 800,
                                                  padding: '2px 5px'
                                                }}
                                                title={isPub ? 'Clic para ocultar al cliente' : 'Clic para mostrar al cliente'}
                                              >
                                                {isPub ? '✓ Visible' : '🔒 Privada'}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteDailyAdvance(adv.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: '#ef4444', padding: '0 2px' }}
                                                title="Eliminar foto"
                                              >
                                                🗑️
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Formulario subida con Drag & Drop y previsualización */}
                                  {activeDayKey && (!sp.workItemId || sp.status === 'PRODUCCION') && (
                                    <form onSubmit={handleUploadDayAdvance} style={{ padding: '0.75rem', background: '#0b1329', border: '1px solid #1e293b', borderRadius: 8 }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <div style={{ color: '#ffffff', fontSize: '0.72rem', fontWeight: 900 }}>
                                          📤 Agregar fotos – Día {activeDayObj?.dayNumber}
                                        </div>
                                        {semaforoAdvanceFiles.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => setSemaforoAdvanceFiles([])}
                                            style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.62rem', cursor: 'pointer', fontWeight: 700 }}
                                          >
                                            Limpiar selección
                                          </button>
                                        )}
                                      </div>

                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {/* Dropzone interactiva */}
                                        <label
                                          onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                                          onDrop={e => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                              const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                                              setSemaforoAdvanceFiles(prev => [...prev, ...dropped]);
                                            }
                                          }}
                                          style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            gap: 4, padding: '0.75rem',
                                            background: '#131b2e', border: '2px dashed #38bdf8',
                                            borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                                            transition: 'border-color 0.2s'
                                          }}
                                        >
                                          <span style={{ fontSize: '1.2rem' }}>📷</span>
                                          <strong style={{ color: '#38bdf8', fontSize: '0.72rem' }}>
                                            Arrastra fotos aquí o haz clic para seleccionar
                                          </strong>
                                          <span style={{ color: '#94a3b8', fontSize: '0.6rem' }}>
                                            Puedes subir múltiples fotos de carpintería
                                          </span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            style={{ display: 'none' }}
                                            onChange={e => {
                                              const files = Array.from(e.target.files || []);
                                              setSemaforoAdvanceFiles(prev => [...prev, ...files]);
                                            }}
                                          />
                                        </label>

                                        {/* Previsualización de fotos antes de guardar */}
                                        {semaforoAdvanceFiles.length > 0 && (
                                          <div style={{ padding: '0.5rem', background: '#070a14', borderRadius: 7, border: '1px solid #1e293b' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                              <span style={{ color: '#86efac', fontSize: '0.65rem', fontWeight: 800 }}>
                                                {semaforoAdvanceFiles.length} foto(s) lista(s) para subir:
                                              </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                                              {semaforoAdvanceFiles.map((f, fi) => (
                                                <div key={fi} style={{ position: 'relative', width: 48, height: 48, borderRadius: 5, overflow: 'hidden', flex: 'none', border: '1px solid #38bdf8' }}>
                                                  <img
                                                    src={URL.createObjectURL(f)}
                                                    alt=""
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={(ev) => {
                                                      ev.preventDefault();
                                                      setSemaforoAdvanceFiles(cur => cur.filter((_, idx) => idx !== fi));
                                                    }}
                                                    style={{
                                                      position: 'absolute', top: 0, right: 0,
                                                      background: 'rgba(239,68,68,0.9)', color: '#fff',
                                                      border: 'none', width: 14, height: 14, fontSize: '0.55rem',
                                                      display: 'grid', placeItems: 'center', cursor: 'pointer'
                                                    }}
                                                  >
                                                    ✕
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        <input
                                          type="text"
                                          placeholder="Nota o descripción del avance en taller..."
                                          value={semaforoAdvanceComment}
                                          onChange={e => setSemaforoAdvanceComment(e.target.value)}
                                          style={{ padding: '0.45rem 0.65rem', background: '#1e293b', border: '1px solid #334155', borderRadius: 7, color: '#ffffff', fontSize: '0.72rem' }}
                                        />

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingTop: 2 }}>
                                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#cbd5e1', fontSize: '0.7rem', cursor: 'pointer' }}>
                                            <input
                                              type="checkbox"
                                              checked={semaforoAdvancePublished}
                                              onChange={e => setSemaforoAdvancePublished(e.target.checked)}
                                            />
                                            <span>
                                              {semaforoAdvancePublished ? '👁️ Publicar al cliente' : '🔒 Solo para taller'}
                                            </span>
                                          </label>
                                          <button
                                            type="submit"
                                            disabled={semaforoUploadingAdvance || semaforoAdvanceFiles.length === 0}
                                            style={{
                                              padding: '0.45rem 1rem',
                                              background: semaforoUploadingAdvance || semaforoAdvanceFiles.length === 0 ? '#334155' : '#2563eb',
                                              color: '#fff', border: 'none', borderRadius: 7, fontSize: '0.72rem', fontWeight: 900,
                                              cursor: semaforoUploadingAdvance || semaforoAdvanceFiles.length === 0 ? 'not-allowed' : 'pointer'
                                            }}
                                          >
                                            {semaforoUploadingAdvance ? '⏳ Guardando...' : `Subir ${semaforoAdvanceFiles.length > 0 ? `(${semaforoAdvanceFiles.length})` : ''}`}
                                          </button>
                                        </div>
                                      </div>
                                    </form>
                                  )}
                                  {sp.workItemId && sp.status === 'ENTREGADO' && (
                                    <div style={{ padding: '0.65rem', border: '1px solid #166534', borderRadius: 8, color: '#bbf7d0', fontSize: '0.72rem' }}>
                                      Esta área ya fue entregada; el calendario y las fotos existentes siguen disponibles para consulta.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Sección 3 eliminada – el gestor de fotos ya está integrado en la columna derecha del calendario */}

                        {/* Lightbox visor grande */}
                        {semaforoLightboxUrl && (
                          <div
                            style={{
                              position: 'fixed',
                              inset: 0,
                              background: 'rgba(0,0,0,0.85)',
                              zIndex: 99999,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '1rem',
                              backdropFilter: 'blur(4px)'
                            }}
                            onClick={() => setSemaforoLightboxUrl(null)}
                          >
                            <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                              <img
                                src={semaforoLightboxUrl}
                                alt="Evidencia ampliada"
                                style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
                              />
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                <a
                                  href={semaforoLightboxUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none' }}
                                >
                                  🔗 Abrir en pestaña nueva
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setSemaforoLightboxUrl(null)}
                                  style={{
                                    padding: '0.35rem 0.8rem',
                                    background: '#ef4444',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 6,
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Cerrar ×
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })()}

                </section>
              );
            })()}
            {!showSemaforo && (overviewStage === null ? (
            <section aria-label="Calendario de producción" style={{ padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 9 }}>
                <div>
                  <h3 style={{ margin: 0, color: '#172b4d', fontSize: '0.9rem' }}>Calendario de producción</h3>
                  <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                    {overviewStage === null ? 'Todos los proyectos' : overviewStage === -1 ? 'Proyectos sin cronograma' : `Etapa: ${STAGE_NAMES[overviewStage]}`}
                    {' · '}Colores únicos por proyecto; las marcas indican inicio, etapas y entrega.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ padding: '0.3rem 0.55rem', borderRadius: 20, background: '#fef2f2', color: '#b91c1c', fontSize: '0.7rem', fontWeight: 800 }}>{lateProjectsCount} atrasados</span>
                  <span style={{ padding: '0.3rem 0.55rem', borderRadius: 20, background: '#f0fdf4', color: '#166534', fontSize: '0.7rem', fontWeight: 800 }}>{onTimeProjectsCount} en tiempo</span>
                  <span style={{ padding: '0.3rem 0.55rem', borderRadius: 20, background: '#fff7ed', color: '#9a3412', fontSize: '0.7rem', fontWeight: 800 }}>{projectsWithoutSchedule.length} sin cronograma</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button type="button" aria-label="Periodo anterior" onClick={() => {
                    const currentDate = selectedCalendarDate || scheduleNow;
                    const nextDate = shiftCalendarDate(currentDate, -1, calendarView);
                    setSelectedCalendarDay(getDateKey(nextDate));
                    setCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1, 12));
                  }}
                    style={{ width: 30, height: 30, border: '1px solid #dbe3ec', borderRadius: 8, background: '#fff', color: '#334155', cursor: 'pointer' }}>‹</button>
                  <button type="button" onClick={() => {
                    const today = new Date();
                    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12));
                    setSelectedCalendarDay(getDateKey(today));
                  }} style={{ padding: '0.4rem 0.6rem', border: '1px solid #dbe3ec', borderRadius: 8, background: '#fff', color: '#334155', fontSize: '0.72rem', fontWeight: 750, cursor: 'pointer' }}>Hoy</button>
                  <button type="button" aria-label="Periodo siguiente" onClick={() => {
                    const currentDate = selectedCalendarDate || scheduleNow;
                    const nextDate = shiftCalendarDate(currentDate, 1, calendarView);
                    setSelectedCalendarDay(getDateKey(nextDate));
                    setCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1, 12));
                  }}
                    style={{ width: 30, height: 30, border: '1px solid #dbe3ec', borderRadius: 8, background: '#fff', color: '#334155', cursor: 'pointer' }}>›</button>
                </div>
                <strong style={{ color: '#1e3a5f', fontSize: '0.85rem', textTransform: 'capitalize' }}>
                  {calendarView === 'month'
                    ? calendarMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
                    : calendarView === 'week'
                      ? `${calendarDays[0]?.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} – ${calendarDays[6]?.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : selectedCalendarDate?.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </strong>
                <div role="group" aria-label="Vista del calendario" style={{ display: 'flex', padding: 3, gap: 2, background: '#eaf0f7', borderRadius: 9 }}>
                  {[['month', 'Mes'], ['week', 'Semana'], ['day', 'Día']].map(([view, label]) => (
                    <button key={view} type="button" aria-pressed={calendarView === view} onClick={() => setCalendarView(view)}
                      style={{ padding: '0.38rem 0.62rem', border: 0, borderRadius: 7, background: calendarView === view ? '#fff' : 'transparent', color: calendarView === view ? '#1d4f91' : '#64748b', fontSize: '0.7rem', fontWeight: 800, boxShadow: calendarView === view ? '0 1px 3px rgba(15,23,42,0.12)' : 'none', cursor: 'pointer' }}>{label}</button>
                  ))}
                </div>
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{calendarProjects.length} proyectos</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 10, alignItems: 'start' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${calendarView === 'day' ? 1 : 7}, minmax(0, 1fr))`, borderTop: '1px solid #e2e8f0', borderLeft: '1px solid #e2e8f0', background: '#fff' }}>
                {calendarView !== 'day' && calendarDays.slice(0, calendarView === 'month' ? 7 : calendarDays.length).map(day => {
                  const dayKey = getDateKey(day);
                  const dayName = day.toLocaleDateString('es-MX', { weekday: 'short' });
                  return (
                    <div key={`weekday-${dayKey}`} style={{ padding: '0.38rem 0.25rem', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', background: '#eef2f7', color: '#64748b', textAlign: 'center', fontSize: '0.66rem', fontWeight: 800, textTransform: 'capitalize' }}>
                      {dayName}
                    </div>
                  );
                })}
                {calendarDays.map(day => {
                  const dayKey = getDateKey(day);
                  const inMonth = calendarView !== 'month' || day.getMonth() === calendarMonth.getMonth();
                  const isToday = dayKey === getDateKey(scheduleNow);
                  const isSelected = dayKey === selectedCalendarDay;
                  const events = calendarEvents.get(dayKey) || [];
                  const visibleEvents = events.slice(0, calendarView === 'month' ? 3 : calendarView === 'week' ? 7 : 14);
                  return (
                    <button key={`date-${dayKey}`} type="button" aria-pressed={isSelected} onClick={() => {
                      setSelectedCalendarDay(dayKey);
                      setCalendarMonth(new Date(day.getFullYear(), day.getMonth(), 1, 12));
                    }}
                      style={{ minWidth: 0, minHeight: calendarView === 'month' ? 78 : calendarView === 'week' ? 180 : 260, padding: calendarView === 'day' ? '0.8rem' : '0.35rem', border: 0, borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', background: isSelected ? '#eff6ff' : '#fff', textAlign: 'left', verticalAlign: 'top', cursor: 'pointer', outline: isSelected ? '2px solid #60a5fa' : 'none', outlineOffset: -2 }}>
                      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: inMonth ? '#334155' : '#b6c0ce', fontSize: '0.68rem', fontWeight: isToday ? 850 : 650 }}>
                        <span>{calendarView === 'day' ? day.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' }) : day.getDate()}</span>
                        {isToday && <span style={{ color: '#2563eb', fontSize: '0.58rem' }}>HOY</span>}
                      </span>
                      <span style={{ display: 'grid', gap: 2, marginTop: 3 }}>
                        {visibleEvents.map(event => {
                          const color = event.isStale ? '#dc2626' : getProjectColor(event.project);
                          const progressLabel = getCalendarEventLabel(event, true);
                          const displayName = getProjectDisplayName(event.project);
                          return (
                            <span key={event.id}
                              title={`${displayName} · ${progressLabel} · Capturado: ${formatDate(event.capturedAt)}`}
                              style={{ display: 'block', overflow: 'hidden', padding: calendarView === 'month' ? '3px 4px' : '5px 7px', borderRadius: 4, background: color, color: '#fff', boxShadow: '0 1px 2px rgba(15,23,42,0.18)', fontSize: calendarView === 'month' ? '0.6rem' : '0.72rem', lineHeight: 1.3, textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700, border: event.isDailyAdvance ? '1px dashed #fff' : 0 }}>
                              {event.isStale && <span aria-hidden="true" style={{ marginRight: 3 }}>⚠</span>}
                              {event.isDailyAdvance && <span aria-hidden="true" style={{ marginRight: 3 }}>📷</span>}
                              {event.isMilestone && <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 3, padding: 1, background: '#fff', borderRadius: 3 }}><StageIcon stage={event.stageIndex} size={11} /></span>}
                              {displayName} · {progressLabel}
                            </span>
                          );
                        })}
                        {events.length > visibleEvents.length && <span style={{ color: '#64748b', fontSize: '0.6rem', fontWeight: 700 }}>+{events.length - visibleEvents.length} acciones</span>}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div aria-live="polite" style={{ padding: '0.65rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 9, maxHeight: 640, overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                  <strong style={{ color: '#1e3a5f', fontSize: '0.76rem' }}>
                    {selectedCalendarDate?.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </strong>
                  <span style={{ color: '#64748b', fontSize: '0.68rem' }}>{selectedDayActions.length} acciones registradas este día</span>
                </div>
                {selectedCalendarDay === getDateKey(scheduleNow) && (
                  <div aria-label="Indicadores de producción de hoy" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: 6, marginBottom: 8 }}>
                    {[
                      { label: 'Total de proyectos', value: semaforoProjects.length, color: '#1d4ed8', background: '#eff6ff' },
                      { label: 'En producción', value: activeProjectsCount, color: '#475569', background: '#f1f5f9' },
                      { label: 'En tiempo', value: onTimeProjectsCount, color: '#15803d', background: '#f0fdf4' },
                      { label: 'Atrasados', value: lateProjectsCount, color: '#b91c1c', background: '#fef2f2' },
                      { label: 'Sin avance >24h', value: staleProjectsCount, color: '#dc2626', background: '#fee2e2' },
                      { label: 'Entregados', value: deliveredProjectsCount, color: '#6d28d9', background: '#f5f3ff' },
                      { label: 'Sin cronograma', value: projectsWithoutSchedule.length, color: '#9a3412', background: '#fff7ed' }
                    ].map(kpi => (
                      <div key={kpi.label} style={{ padding: '0.5rem 0.6rem', borderRadius: 8, background: kpi.background }}>
                        <strong style={{ display: 'block', color: kpi.color, fontSize: '1rem', lineHeight: 1.2 }}>{kpi.value}</strong>
                        <span style={{ color: '#64748b', fontSize: '0.62rem', fontWeight: 700 }}>{kpi.label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedDayActions.length ? (
                  <div style={{ display: 'grid', gap: 4 }}>
                    {selectedDayActions.map(action => {
                      const progressLabel = getCalendarEventLabel(action);
                      return (
                        <button key={action.id} type="button" onClick={() => openCalendarProject(action.project)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', padding: '0.45rem 0.55rem', border: '1px solid #e2e8f0', borderLeft: `4px solid ${action.isStale ? '#dc2626' : getProjectColor(action.project)}`, borderRadius: 7, background: action.isStale ? '#fef2f2' : '#fff', textAlign: 'left', cursor: 'pointer' }}>
                          <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {action.isStale && <span aria-hidden="true" style={{ flexShrink: 0, fontSize: '1rem' }}>⚠</span>}
                            {action.isDailyAdvance && <span aria-hidden="true" style={{ flexShrink: 0, fontSize: '1rem' }}>📷</span>}
                            {action.isMilestone && <span style={{ flexShrink: 0, display: 'inline-flex' }}><StageIcon stage={action.stageIndex} size={22} /></span>}
                            <span style={{ minWidth: 0 }}>
                            <strong style={{ display: 'block', overflow: 'hidden', color: '#1e3a5f', fontSize: '0.7rem', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getProjectDisplayName(action.project)}</strong>
                            <small style={{ color: action.isStale ? '#b91c1c' : '#475569', fontSize: '0.65rem' }}>{progressLabel}</small>
                            </span>
                          </span>
                          <span style={{ flexShrink: 0, color: '#64748b', fontSize: '0.63rem' }}>{action.isStale ? STAGE_NAMES[action.stageIndex] : formatDate(action.capturedAt)}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span style={{ color: '#64748b', fontSize: '0.7rem' }}>No hay avances ni acciones registrados en esta fecha.</span>
                )}
              </div>
              </div>
            </section>
            ) : (
              <section aria-label="Clientes por etapa de producción" style={{ padding: '0.9rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#172b4d', fontSize: '0.95rem' }}>
                      {overviewStage === -1 ? 'Clientes sin cronograma' : `Clientes en ${STAGE_NAMES[overviewStage]}`}
                    </h3>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                      {calendarProjects.length} {calendarProjects.length === 1 ? 'cliente' : 'clientes'} en esta vista
                    </span>
                  </div>
                  <button type="button" onClick={() => { setOverviewStage(null); clearProductionSelection(); }}
                    style={{ padding: '0.45rem 0.7rem', border: '1px solid #bfdbfe', borderRadius: 8, background: '#fff', color: '#1d4f91', fontSize: '0.74rem', fontWeight: 750, cursor: 'pointer' }}>
                    Ver calendario de producción
                  </button>
                </div>
                {calendarProjects.length ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 8 }}>
                    {calendarProjects.map(project => (
                      <button key={getSemaforoProjectKey(project)} type="button" onClick={() => openCalendarProject(project)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minWidth: 0, padding: '0.75rem', border: '1px solid #e2e8f0', borderLeft: `4px solid ${getProjectColor(project)}`, borderRadius: 9, background: '#fff', textAlign: 'left', cursor: 'pointer' }}>
                        <span style={{ minWidth: 0 }}>
                          <strong style={{ display: 'block', overflow: 'hidden', color: '#1e3a5f', fontSize: '0.8rem', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name || 'Cliente sin nombre'}</strong>
                          <span style={{ display: 'block', marginTop: 3, color: '#64748b', fontSize: '0.7rem' }}>
                            {project.workItemName ? `Área: ${project.workItemName}` : project.project_type || 'Proyecto'} · {project.public_id || `ID ${project.id}`}
                          </span>
                        </span>
                        <span aria-hidden="true" style={{ flexShrink: 0, color: '#2563eb', fontSize: '1rem' }}>›</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '1rem', borderRadius: 9, background: '#fff', color: '#64748b', fontSize: '0.8rem', textAlign: 'center' }}>
                    No hay clientes en esta etapa.
                  </div>
                )}
              </section>
            ))}
          </>
        )}
      </section>

      {selected ? (
        <section style={{ minWidth: 0 }}>
            <div style={{ padding: '1.1rem 1.25rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'start' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#172b4d' }}>{selected.name}</h2>
                  <div style={{ marginTop: 5, color: '#64748b', fontSize: '0.85rem' }}>
                    {isAreaSelection ? <strong style={{ color: '#c2410c' }}>Área: {selected.workItemName}</strong> : selected.project_type || 'Proyecto'} · {selected.public_id || `ID ${selected.id}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" onClick={clearProductionSelection} style={{ padding: '0.55rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: 9, background: '#fff', color: '#475569', fontWeight: 750, cursor: 'pointer' }}>
                      Cerrar ficha
                    </button>
                    {isAreaSelection && (
                      <button type="button" onClick={() => openProjectInSemaforo(selected)} style={{ padding: '0.55rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: 9, background: '#fff', color: '#334155', fontWeight: 800, cursor: 'pointer' }}>
                        🚦 Ver en semáforo
                      </button>
                    )}
                    <button type="button" disabled={exportingProjectPdf} onClick={downloadProjectPdf} style={{ padding: '0.55rem 0.8rem', border: '1px solid #bfdbfe', borderRadius: 9, background: exportingProjectPdf ? '#f1f5f9' : '#eff6ff', color: exportingProjectPdf ? '#94a3b8' : '#1d4f91', fontWeight: 800, cursor: exportingProjectPdf ? 'not-allowed' : 'pointer' }}>
                      {exportingProjectPdf ? 'Preparando machote...' : '⬇ Imprimir / guardar machote PDF'}
                    </button>
                    {renderPreview && (
                      <a href={imageUrl(renderPreview)} target="_blank" rel="noreferrer"
                        style={{ padding: '0.55rem 0.8rem', border: '1px solid #bbf7d0', borderRadius: 9, background: '#f0fdf4', color: '#15803d', fontWeight: 800, textDecoration: 'none' }}>
                        🎨 Render
                      </a>
                    )}
                    <button type="button" onClick={() => setShowTechnicalSheet(true)} style={{ padding: '0.55rem 0.8rem', border: '1px solid #bfdbfe', borderRadius: 9, background: '#fff', color: '#1d4f91', fontWeight: 800, cursor: 'pointer' }}>
                    📋 Ficha técnica
                  </button>
                  {currentStage <= 0 && selected.status !== 'ENTREGADO' ? (
                    <button type="button" disabled={saving} onClick={returnToClients} style={{ padding: '0.55rem 0.8rem', border: '1px solid #fed7aa', borderRadius: 9, background: '#fff7ed', color: '#c2410c', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.55 : 1 }}>
                      ↩ Regresar a contrato
                    </button>
                  ) : (() => {
                    const canReturn = currentStage > 0 && selected.status !== 'ENTREGADO' && activeStage === currentStage;
                    return (
                      <button type="button" disabled={saving || !canReturn} onClick={returnToPreviousStage} style={{ padding: '0.55rem 0.8rem', border: '1px solid #fed7aa', borderRadius: 9, background: '#fff7ed', color: '#c2410c', fontWeight: 800, cursor: saving || !canReturn ? 'not-allowed' : 'pointer', opacity: canReturn ? 1 : 0.55 }}>
                        {currentStage > 0 && selected.status !== 'ENTREGADO' ? activeStage !== currentStage ? 'Selecciona la etapa actual para regresar' : `↩ Regresar a ${STAGE_NAMES[currentStage - 1]}` : '↩ Sin etapa anterior'}
                      </button>
                    );
                  })()}
                  <span style={{ padding: '0.4rem 0.7rem', borderRadius: 20, background: '#eaf2ff', color: '#1d4f91', fontSize: '0.76rem', fontWeight: 800 }}>Etapa {currentStage + 1} de {STAGE_NAMES.length}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '1.25rem 0 0.2rem' }}>
                {STAGE_NAMES.map((name, index) => {
                  const complete = index < currentStage;
                  const active = index === currentStage;
                  const stage = stages[index] || {};
                  const photoCount = (Array.isArray(stage.photos) ? stage.photos.length : 0)
                    + areaDailyAdvances.filter(advance => Number(advance.stage) === index).length;
                  const viewing = index === activeStage;
                  const working = active && selected.status !== 'ENTREGADO';
                  const tone = working
                    ? { border: '#f97316', background: '#fff7ed', circle: '#ea580c', text: '#9a3412', shadow: '0 0 0 3px rgba(249, 115, 22, 0.18)' }
                    : complete || active
                      ? { border: '#86efac', background: '#f0fdf4', circle: '#16a34a', text: '#166534', shadow: 'none' }
                      : { border: '#e2e8f0', background: '#f8fafc', circle: '#cbd5e1', text: '#64748b', shadow: 'none' };
                  return (
                    <button key={name} type="button" aria-current={active ? 'step' : undefined} onClick={() => { setActiveStageSelection({ projectId: selectionKey, currentStage, stage: index }); setMessage(''); }}
                      style={{ flex: '1 0 135px', minWidth: 125, padding: '0.75rem', border: `${viewing ? 2 : 1}px solid ${viewing && !working ? '#1d4f91' : tone.border}`, borderRadius: 12, background: tone.background, boxShadow: tone.shadow, opacity: !complete && !active && !viewing ? 0.8 : 1, textAlign: 'left', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                        <span style={{ width: 22, height: 22, borderRadius: 99, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: tone.circle, color: complete || active ? '#fff' : '#475569', fontSize: 11, fontWeight: 800 }}>{complete || (active && !working) ? '✓' : index + 1}</span>
                        <span style={{ color: tone.text, fontSize: '0.75rem', fontWeight: 800 }}>{name}</span>
                      </div>
                      {working && <span style={{ display: 'table', marginBottom: 4, padding: '0.1rem 0.45rem', borderRadius: 20, background: '#ea580c', color: '#fff', fontSize: '0.6rem', fontWeight: 800 }}>✏️ Trabajar aquí</span>}
                      <span style={{ color: '#64748b', fontSize: '0.68rem' }}>{formatDate(stages[index]?.entered_at)}</span>
                      <span style={{ display: 'block', marginTop: 5, color: '#64748b', fontSize: '0.66rem' }}>
                        {[stage.note ? 'Comentario' : null, photoCount ? `${photoCount} ${photoCount === 1 ? 'foto' : 'fotos'}` : null].filter(Boolean).join(' · ') || 'Sin avances registrados'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {activeStage === 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 7px' }}>
                  <strong style={{ color: '#475569', fontSize: '0.8rem' }}>Datos del proyecto</strong>
                  <SectionTag kind="info" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 9, marginBottom: 14 }}>
                  <InfoCard label="Contacto">{selected.contact_info}</InfoCard>
                  <InfoCard label="Domicilio del proyecto">{selected.location}</InfoCard>
                  <InfoCard label="Entrega estimada">{selected.quote_delivery_time || selected.project_timeline || selected.delivery_date}</InfoCard>
                  <InfoCard label="Material / acabado">{[selected.material_type, selected.material_type_2, selected.furniture_color].filter(Boolean).join(' · ')}</InfoCard>
                  <InfoCard label="Render">{selected.render_applies ? 'Sí' : selected.render_applies === false ? 'No aplica' : null}</InfoCard>
                </div>

                {generalMeasurements.length > 0 && (
                  <section style={{ ...SECTION_BLOCK_STYLES.info, borderRadius: 14, padding: '1rem', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', margin: '0 0 0.75rem' }}>
                      <h3 style={{ margin: 0, color: '#475569', fontSize: '0.95rem' }}>Medidas generales del cliente</h3>
                      <SectionTag kind="info" />
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', background: '#fff' }}>
                      <tbody>
                        {generalMeasurementRows.map((row, rowIndex) => (
                          <tr key={`general-measurements-${rowIndex}`}>
                            {Array.from({ length: 3 }, (_, columnIndex) => {
                              const item = row[columnIndex];
                              return (
                                <td key={item?.[0] || `empty-${columnIndex}`} style={{ width: '33.333%', padding: '0.55rem', border: '1px solid #cbd5e1', verticalAlign: 'top', overflowWrap: 'anywhere' }}>
                                  {item && <><strong style={{ display: 'block', color: '#334155', fontSize: '0.72rem' }}>{item[0]}</strong><span style={{ color: '#475569', fontSize: '0.8rem' }}>{item[1]}</span></>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                )}
              </>
            )}

            {activeStage === 1 && (() => {
              const pendingMaterialsCount = projectMaterials.filter(material => !(purchaseDrafts[material.purchaseKey] || purchaseRecords[material.purchaseKey])?.acquired).length;
              const materialsNeedAction = pendingMaterialsCount > 0;
              return (
              <section style={{ ...(materialsNeedAction ? SECTION_BLOCK_STYLES.action : SECTION_BLOCK_STYLES.info), borderRadius: 14, padding: '1rem', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                  <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '0 0 3px', color: materialsNeedAction ? '#9a3412' : '#475569', fontSize: '0.95rem' }}>
                      Materiales y compras
                      {pendingMaterialsCount > 0 && <span style={{ color: '#c2410c', fontSize: '0.78rem' }}>· {pendingMaterialsCount} por comprar</span>}
                      <SectionTag kind={materialsNeedAction ? 'action' : pendingMaterialsCount ? 'info' : 'done'} />
                    </h3>
                    <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                      {isAreaSelection
                        ? `Materiales asignados a ${selected.workItemName || 'esta área'}. Marca las compras conforme se adquieran.`
                        : 'Lista tomada de Estimación o del cotizador en vivo. Marca las compras conforme lleguen.'}
                    </div>
                  </div>
                  <span style={{ padding: '0.35rem 0.65rem', borderRadius: 20, background: '#eff6ff', color: '#1d4f91', fontSize: '0.75rem', fontWeight: 800 }}>
                    {projectMaterials.filter(material => (purchaseDrafts[material.purchaseKey] || purchaseRecords[material.purchaseKey])?.acquired).length} / {projectMaterials.length} adquiridos
                  </span>
                </div>

                {supplierError && <div role="alert" style={{ marginBottom: 10, color: '#b91c1c', fontSize: '0.8rem' }}>{supplierError}</div>}
                {!projectMaterials.length ? (
                  <div style={{ padding: '0.8rem', background: '#f8fafc', borderRadius: 9, color: '#64748b', fontSize: '0.83rem' }}>La estimación no tiene materiales con cantidad capturada.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 10, alignItems: 'start' }}>
                    {[false, true].map(acquired => {
                      const materials = projectMaterials.filter(material =>
                        Boolean((purchaseDrafts[material.purchaseKey] || purchaseRecords[material.purchaseKey])?.acquired) === acquired
                      );
                      return (
                        <section key={String(acquired)} style={{ minWidth: 0, padding: '0.65rem', background: acquired ? '#f0fdf4' : '#fff', border: `1px solid ${acquired ? '#bbf7d0' : '#fdba74'}`, borderRadius: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                            <strong style={{ color: acquired ? '#166534' : '#c2410c', fontSize: '0.8rem' }}>{acquired ? 'Comprado' : 'Por comprar'}</strong>
                            <span style={{ padding: '0.2rem 0.45rem', borderRadius: 20, background: acquired ? '#dcfce7' : '#e2e8f0', color: acquired ? '#166534' : '#475569', fontSize: '0.68rem', fontWeight: 800 }}>{materials.length}</span>
                          </div>
                          {materials.length ? (
                            <div style={{ display: 'grid', gap: 5 }}>
                              {materials.map(material => {
                      const record = purchaseDrafts[material.purchaseKey] || purchaseRecords[material.purchaseKey] || {};
                      const supplier = suppliers.find(item => String(item.id) === String(record.supplier_id));
                      const expanded = expandedMaterialKey === material.purchaseKey;
                      return (
                        <article key={material.purchaseKey} style={{ overflow: 'hidden', background: '#fff', border: `1px solid ${expanded ? '#93c5fd' : '#e2e8f0'}`, borderRadius: 8 }}>
                          <button type="button" aria-expanded={expanded}
                            onClick={() => setExpandedMaterialKey(current => current === material.purchaseKey ? null : material.purchaseKey)}
                            style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0.48rem 0.65rem', border: 0, background: expanded ? '#eff6ff' : '#f8fafc', textAlign: 'left', cursor: 'pointer' }}>
                            <span style={{ minWidth: 0 }}>
                              <span style={{ color: '#64748b', fontSize: '0.66rem', fontWeight: 750 }}>{material.sheetName} · </span>
                              <span style={{ color: '#1e3a5f', fontSize: '0.78rem', fontWeight: 750 }}>
                                {material.desc || 'Material'}{Number(material.qty) > 0 ? ` · ${material.qty} ${material.unit || 'pza'}` : ''}
                              </span>
                              <span style={{ display: 'block', marginTop: 2, color: record.acquired ? '#15803d' : '#64748b', fontSize: '0.67rem' }}>
                                {record.acquired ? 'Adquirido' : record.supplier_id || record.store_price || record.purchase_place ? 'Captura iniciada' : 'Pendiente de captura'}
                                {supplier ? ` · ${supplier.name}` : ''}
                                {record.store_price ? ` · $${record.store_price}` : ''}
                              </span>
                            </span>
                            <span aria-hidden="true" style={{ flexShrink: 0, color: '#64748b', fontSize: '0.85rem' }}>{expanded ? '−' : '+'}</span>
                          </button>

                          {expanded && (
                            <div style={{ padding: '0.65rem', borderTop: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: record.acquired ? '#15803d' : '#475569', fontSize: '0.74rem', fontWeight: 800, cursor: saving ? 'wait' : 'pointer' }}>
                                  <input type="checkbox" checked={Boolean(record.acquired)} disabled={saving}
                                    onChange={event => {
                                      const nextRecord = { ...record, acquired: event.target.checked };
                                      setPurchaseDrafts(current => ({ ...current, [material.purchaseKey]: nextRecord }));
                                      saveMaterialPurchase(material.purchaseKey, nextRecord);
                                    }} />
                                  Ya se adquirió
                                </label>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 8 }}>
                                <label style={{ display: 'grid', gap: 4, color: '#475569', fontSize: '0.72rem', fontWeight: 700 }}>
                                  Precio pagado en tienda
                                  <input type="number" min="0" step="0.01" value={record.store_price ?? ''}
                                    onChange={event => setPurchaseDrafts(current => ({ ...current, [material.purchaseKey]: { ...record, store_price: event.target.value } }))}
                                    onBlur={() => saveMaterialPurchase(material.purchaseKey, purchaseDrafts[material.purchaseKey] || record)}
                                    placeholder="$ 0.00" style={{ boxSizing: 'border-box', width: '100%', padding: '0.5rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                                </label>
                                <label style={{ display: 'grid', gap: 4, color: '#475569', fontSize: '0.72rem', fontWeight: 700 }}>
                                  Proveedor
                                  <select value={record.supplier_id || ''}
                                    onChange={event => {
                                      const selectedSupplier = suppliers.find(item => String(item.id) === event.target.value);
                                      const nextRecord = {
                                        ...record,
                                        supplier_id: event.target.value,
                                        purchase_place: record.purchase_place || selectedSupplier?.location || ''
                                      };
                                      setPurchaseDrafts(current => ({ ...current, [material.purchaseKey]: nextRecord }));
                                      saveMaterialPurchase(material.purchaseKey, nextRecord);
                                    }}
                                    style={{ boxSizing: 'border-box', width: '100%', padding: '0.5rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}>
                                    <option value="">Seleccionar proveedor...</option>
                                    {suppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                  </select>
                                </label>
                                <label style={{ display: 'grid', gap: 4, color: '#475569', fontSize: '0.72rem', fontWeight: 700 }}>
                                  Tienda / sucursal donde se compró
                                  <input value={record.purchase_place || ''}
                                    onChange={event => setPurchaseDrafts(current => ({ ...current, [material.purchaseKey]: { ...record, purchase_place: event.target.value } }))}
                                    onBlur={() => saveMaterialPurchase(material.purchaseKey, purchaseDrafts[material.purchaseKey] || record)}
                                    placeholder="Nombre de tienda o sucursal" style={{ boxSizing: 'border-box', width: '100%', padding: '0.5rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                                </label>
                              </div>
                              {supplier && (supplier.contact_name || supplier.phone) && (
                                <div style={{ marginTop: 7, color: '#64748b', fontSize: '0.74rem' }}>
                                  Contacto: {supplier.contact_name || '—'}{supplier.phone && <> · <a href={`tel:${supplier.phone}`} style={{ color: '#2563eb' }}>{supplier.phone}</a></>}
                                </div>
                              )}
                              <button type="button" onClick={() => {
                                setSupplierForMaterial(material.purchaseKey);
                                setSupplierForm({ name: '', contact_name: '', phone: '', location: '' });
                                setShowSupplierForm(true);
                              }}
                                style={{ marginTop: 8, padding: '0.38rem 0.55rem', border: '1px solid #bfdbfe', borderRadius: 8, background: '#fff', color: '#1d4f91', fontSize: '0.72rem', fontWeight: 750, cursor: 'pointer' }}>
                                + Agregar contacto de proveedor
                              </button>
                            </div>
                          )}
                        </article>
                      );
                              })}
                            </div>
                          ) : (
                            <div style={{ padding: '0.65rem 0.4rem', color: '#64748b', fontSize: '0.74rem' }}>
                              {acquired ? 'Todavía no hay materiales comprados.' : 'No hay compras pendientes.'}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                )}

                <div style={{ marginTop: 10, padding: '0.7rem 0.8rem', background: '#f0fdf4', color: '#166534', borderRadius: 9, fontSize: '0.78rem' }}>
                  Puedes iniciar Producción aunque falten materiales; marca las compras pendientes conforme se vayan adquiriendo.
                </div>
              </section>
              );
            })()}

            {activeStage === 0 && <details open style={{ ...SECTION_BLOCK_STYLES.info, borderRadius: 14, marginBottom: 14 }}>
              <summary style={{ padding: '0.9rem 1rem', color: '#475569', fontWeight: 800, cursor: 'pointer' }}>Información de Estimación y materiales <SectionTag kind="info" /></summary>
              <div style={{ padding: '0 1rem 1rem' }}>
                {Object.keys(projectDetails).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <h3 style={{ fontSize: '0.82rem', color: '#334155' }}>Especificaciones del proyecto</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 8 }}>
                      {Object.entries(projectDetails).filter(([key, value]) => !/price|precio|total|margin|anticipo|cost/i.test(key) && typeof value !== 'object' && value !== '').map(([key, value]) => <InfoCard key={key} label={spanishFieldLabel(key)}>{String(value)}</InfoCard>)}
                    </div>
                  </div>
                )}
                {projectMaterialGroups.map(group => (
                  <div key={group.name} style={{ margin: '0 0 14px', padding: '0.8rem', background: '#f8fafc', borderRadius: 10 }}>
                    <div style={{ fontWeight: 800, color: '#334155', marginBottom: 7 }}>{group.name}</div>
                    <div style={{ marginTop: 8 }}>
                      <div style={{ color: '#2563a8', fontSize: '0.72rem', fontWeight: 800, marginBottom: 4 }}>Materiales</div>
                      {group.materials.map(row => <div key={row.purchaseKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '0.3rem 0', borderBottom: '1px solid #e8edf3', color: '#475569', fontSize: '0.8rem' }}>
                        <span>{row.desc || 'Material'} · {row.qty} {row.unit || 'pza'}</span>
                      </div>)}
                    </div>
                  </div>
                ))}
                {!projectMaterials.length && <div style={{ color: '#64748b', fontSize: '0.85rem' }}>La estimación no tiene materiales con cantidad capturada.</div>}
                {croquisImages.length > 0 && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: 'pointer', color: '#334155', fontSize: '0.82rem', fontWeight: 700 }}>Croquis del proyecto ({croquisImages.length})</summary>
                    {croquisPages.map((page, pageIndex) => (
                      <div key={`preview-croquis-page-${pageIndex}`} style={{ paddingTop: 8 }}>
                        {croquisPages.length > 1 && <div style={{ marginBottom: 5, color: '#64748b', fontSize: '0.72rem' }}>Hoja {pageIndex + 1} · hasta 2 croquis</div>}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                          {page.map((photo, index) => {
                            const photoIndex = pageIndex * 2 + index;
                            return <a key={photoIndex} href={imageUrl(photo)} target="_blank" rel="noreferrer"><img src={imageUrl(photo)} alt={`Croquis ${photoIndex + 1}`} style={{ width: '100%', height: 150, objectFit: 'contain', borderRadius: 8, border: '1px solid #dbe3ec', background: '#f8fafc' }} /></a>;
                          })}
                        </div>
                      </div>
                    ))}
                  </details>
                )}
                {measurementEntries.length > 0 && (
                  <section style={{ marginTop: 14 }}>
                    <h3 style={{ margin: '0 0 0.65rem', color: '#1d4f91', fontSize: '0.88rem' }}>Medidas y fotos de visita</h3>
                    {measurementTableRows.length > 0 && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', background: '#fff' }}>
                        <tbody>
                          {measurementTableRows.map((row, rowIndex) => (
                            <tr key={`visit-measurements-${rowIndex}`}>
                              {Array.from({ length: 3 }, (_, columnIndex) => {
                                const entry = row[columnIndex];
                                return (
                                  <td key={entry?.key || `empty-${columnIndex}`} style={{ width: '33.333%', padding: '0.55rem', border: '1px solid #cbd5e1', verticalAlign: 'top', overflowWrap: 'anywhere' }}>
                                    {entry && <>
                                      <strong style={{ display: 'block', color: '#334155', fontSize: '0.72rem' }}>{entry.group} — {entry.label}</strong>
                                      <span style={{ color: '#475569', fontSize: '0.8rem' }}>{entry.value || (collectImageUrls(entry.photo).length ? 'Foto adjunta' : 'Sin medida anotada')}</span>
                                    </>}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {measurementPhotoPages.map((page, pageIndex) => (
                      <div key={`preview-measure-page-${pageIndex}`} style={{ marginTop: 10, padding: 10, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fbfdff' }}>
                        <div style={{ marginBottom: 7, color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>Fotos de medidas · Hoja {pageIndex + 1} (hasta 6)</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 8 }}>
                          {page.map(photo => (
                            <article key={photo.key} style={{ minWidth: 0, padding: 8, background: '#fff', border: '1px solid #dbe5f0', borderRadius: 8 }}>
                              <div style={{ color: '#64748b', fontSize: '0.66rem', fontWeight: 800 }}>{photo.group}</div>
                              <div style={{ color: '#1e3a5f', fontSize: '0.76rem', fontWeight: 750 }}>{photo.label}{photo.value ? ` · ${photo.value}` : ''}</div>
                              <a href={imageUrl(photo.url)} target="_blank" rel="noreferrer">
                                <img src={imageUrl(photo.url)} alt={`Foto de ${photo.label}`} style={{ width: '100%', height: 110, marginTop: 6, objectFit: 'cover', borderRadius: 7, border: '1px solid #bfdbfe' }} />
                              </a>
                            </article>
                          ))}
                        </div>
                      </div>
                    ))}
                  </section>
                )}
              </div>
            </details>}

            {activeStage === 0 && (
              <section style={{
                ...(selected.render_pdf_path ? SECTION_BLOCK_STYLES.info : SECTION_BLOCK_STYLES.action),
                borderRadius: 14,
                padding: '0.9rem 1.15rem',
                marginBottom: 14
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.5rem' }}>🎨</span>
                    <div>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', color: selected.render_pdf_path ? '#1e3a5f' : '#9a3412', fontSize: '0.92rem' }}>
                        {selected.render_pdf_path ? 'PDF de Render / Planos disponible' : 'Cargar Render del proyecto'}
                        <SectionTag kind={selected.render_pdf_path ? 'done' : 'action'}>{selected.render_pdf_path ? '✅ Cargado' : '✏️ Pendiente de cargar'}</SectionTag>
                      </strong>
                      <span style={{ display: 'block', marginTop: 2, color: '#64748b', fontSize: '0.78rem' }}>
                        {selected.render_pdf_path
                          ? 'Este archivo se adjunta automáticamente al final del Machote de Producción.'
                          : 'Si en contrato no se cargó render, puedes subir aquí el PDF o imagen para incluirlo en el machote.'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {selected.render_pdf_path && (
                      <>
                        <button type="button" onClick={viewRenderPdf} style={{ padding: '0.5rem 0.8rem', borderRadius: 8, background: '#eff6ff', color: '#1d4f91', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', border: '1px solid #bfdbfe' }}>
                          Ver PDF
                        </button>
                        <button type="button" onClick={downloadRenderPdf} style={{ padding: '0.5rem 0.8rem', border: 0, borderRadius: 8, background: '#1d4ed8', color: '#fff', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                          Descargar PDF
                        </button>
                      </>
                    )}

                    <label style={{
                      padding: '0.52rem 0.85rem',
                      borderRadius: 8,
                      background: renderUploadOk ? '#16a34a' : (uploadingRender ? '#e2e8f0' : (selected.render_pdf_path ? '#f1f5f9' : '#ea580c')),
                      color: renderUploadOk ? '#fff' : (selected.render_pdf_path ? '#334155' : '#fff'),
                      border: renderUploadOk ? 'none' : (selected.render_pdf_path ? '1px solid #cbd5e1' : 'none'),
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: uploadingRender ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'background 0.3s, color 0.3s'
                    }}>
                      {uploadingRender
                        ? '⏳ Subiendo...'
                        : renderUploadOk
                          ? '✅ Render cargado'
                          : (selected.render_pdf_path ? '🔄 Reemplazar Render' : '＋ Cargar Render (PDF / Imagen)')}
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        disabled={uploadingRender}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) uploadRenderFile(file);
                          e.target.value = '';
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>
              </section>
            )}

            {(() => {
              const stageNeedsWork = activeStage === currentStage && selected.status !== 'ENTREGADO';
              const advanceDisabled = saving || selected.status === 'ENTREGADO' || activeStage !== currentStage;
              const stageAdvances = areaDailyAdvances.filter(advance => Number(advance.stage) === activeStage);
              return (
            <div style={{ ...(stageNeedsWork ? SECTION_BLOCK_STYLES.action : SECTION_BLOCK_STYLES.info), borderRadius: 14, padding: '1rem', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: 0, color: stageNeedsWork ? '#9a3412' : '#475569', fontSize: '1rem' }}>
                    {STAGE_NAMES[activeStage]}{isAreaSelection ? ` · ${selected.workItemName}` : ''}
                    <SectionTag kind={stageNeedsWork ? 'action' : activeStage < currentStage || selected.status === 'ENTREGADO' ? 'done' : 'info'}>
                      {stageNeedsWork ? '✏️ Por capturar / revisar' : activeStage < currentStage || selected.status === 'ENTREGADO' ? '✅ Etapa terminada' : '⏳ Próxima etapa'}
                    </SectionTag>
                  </h3>
                  <span style={{ display: 'block', marginTop: 3, color: '#64748b', fontSize: '0.72rem' }}>
                    {isAreaSelection
                      ? 'Las fotos y el comentario se guardan como avance del día de esta área y se ven en el calendario.'
                      : activeStage === currentStage ? 'Etapa actual · registra aquí el avance del proyecto.' : activeStage < currentStage ? 'Etapa anterior · consulta o completa sus comentarios y fotos.' : 'Etapa siguiente · puedes preparar sus comentarios y fotos antes de avanzar.'}
                  </span>
                </div>
                {isAreaSelection ? (
                  <label style={{ padding: '0.55rem 0.8rem', borderRadius: 9, background: selected.status === 'ENTREGADO' ? '#e2e8f0' : '#ea580c', color: selected.status === 'ENTREGADO' ? '#64748b' : '#fff', fontSize: '0.78rem', fontWeight: 800, cursor: saving || selected.status === 'ENTREGADO' ? 'not-allowed' : 'pointer' }}>
                    {areaAdvanceFiles.length ? `📷 ${areaAdvanceFiles.length} ${areaAdvanceFiles.length === 1 ? 'foto lista' : 'fotos listas'}` : '＋ Seleccionar fotos'}
                    <input type="file" accept="image/*" multiple disabled={saving || selected.status === 'ENTREGADO'} onChange={event => { setAreaAdvanceFiles(Array.from(event.target.files || [])); event.target.value = ''; }} style={{ display: 'none' }} />
                  </label>
                ) : (
                  <label style={{ padding: '0.55rem 0.8rem', borderRadius: 9, background: stageNeedsWork ? '#ea580c' : '#eff6ff', color: stageNeedsWork ? '#fff' : '#1d4f91', fontSize: '0.78rem', fontWeight: 800, cursor: saving ? 'wait' : 'pointer' }}>
                    {saving ? 'Procesando...' : '＋ Agregar foto'}
                    <input type="file" accept="image/*" disabled={saving} onChange={event => { uploadEvidence(event.target.files?.[0]); event.target.value = ''; }} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
              {isAreaSelection ? (
                <textarea value={areaAdvanceComment} onChange={event => setAreaAdvanceComment(event.target.value)} disabled={selected.status === 'ENTREGADO'} placeholder="Comentario del avance de hoy para esta área..."
                  rows={3} style={{ boxSizing: 'border-box', width: '100%', resize: 'vertical', margin: '0.85rem 0', padding: '0.75rem', border: `1px solid ${stageNeedsWork ? '#fdba74' : '#cbd5e1'}`, borderRadius: 10, background: '#fff', font: 'inherit', fontSize: '0.85rem' }} />
              ) : (
                <textarea value={note} onChange={event => updateNote(event.target.value)} placeholder="Describe el avance, acuerdos o pendientes de esta etapa..."
                  rows={3} style={{ boxSizing: 'border-box', width: '100%', resize: 'vertical', margin: '0.85rem 0', padding: '0.75rem', border: `1px solid ${stageNeedsWork ? '#fdba74' : '#cbd5e1'}`, borderRadius: 10, background: '#fff', font: 'inherit', fontSize: '0.85rem' }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                {isAreaSelection ? (
                  <button type="button" disabled={saving || !areaAdvanceFiles.length || selected.status === 'ENTREGADO'} onClick={uploadAreaAdvance} style={{ padding: '0.65rem 0.9rem', border: '1px solid #fdba74', borderRadius: 9, background: '#fff', color: '#c2410c', fontWeight: 800, cursor: saving || !areaAdvanceFiles.length ? 'not-allowed' : 'pointer', opacity: !areaAdvanceFiles.length || selected.status === 'ENTREGADO' ? 0.6 : 1 }}>
                    {saving ? 'Guardando...' : '💾 Guardar avance del día'}
                  </button>
                ) : (
                  <button type="button" disabled={saving} onClick={saveNote} style={{ padding: '0.65rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: 9, background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>Guardar nota</button>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button type="button" disabled={advanceDisabled} onClick={handleAdvanceClick} style={{ padding: '0.65rem 1rem', border: 0, borderRadius: 9, background: selected.status === 'ENTREGADO' || activeStage !== currentStage ? '#cbd5e1' : '#ea580c', color: '#fff', fontWeight: 800, cursor: selected.status === 'ENTREGADO' || activeStage !== currentStage ? 'not-allowed' : 'pointer' }}>
                      {selected.status === 'ENTREGADO' ? (isAreaSelection ? 'Área entregada' : 'Proyecto entregado') : activeStage !== currentStage ? `Selecciona ${STAGE_NAMES[currentStage]} para avanzar` : currentStage >= STAGE_NAMES.length - 1 ? 'Confirmar entrega' : `${isAreaSelection ? 'Pasar área' : 'Guardar avance y pasar'} a ${STAGE_NAMES[currentStage + 1]} →`}
                  </button>
                </div>
              </div>
              {stageAdvances.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginTop: 14 }}>
                  {stageAdvances.map((advance, index) => {
                    const src = imageUrl(advance.url);
                    return (
                      <a key={advance.id || `${src}-${index}`} href={src} target="_blank" rel="noreferrer" title={[advance.date, advance.comment].filter(Boolean).join(' · ')} style={{ display: 'grid', gap: 3, width: 130, color: '#64748b', fontSize: '0.66rem', textDecoration: 'none' }}>
                        <img src={src} alt={`Avance ${index + 1} · ${STAGE_NAMES[activeStage]}`} style={{ width: 130, height: 95, objectFit: 'cover', borderRadius: 9, border: '1px solid #dbe3ec' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDate(advance.date)}{advance.comment ? ` · ${advance.comment}` : ''}</span>
                      </a>
                    );
                  })}
                </div>
              )}
              {!!(selectedStage.photos || []).length && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginTop: 14 }}>
                  {selectedStage.photos.map((photo, index) => {
                    const src = imageUrl(photoPath(photo));
                    return <a key={`${src}-${index}`} href={src} target="_blank" rel="noreferrer"><img src={src} alt={`Evidencia ${index + 1} · ${STAGE_NAMES[activeStage]}`} style={{ width: 130, height: 95, objectFit: 'cover', borderRadius: 9, border: '1px solid #dbe3ec' }} /></a>;
                  })}
                </div>
              )}
            </div>
              );
            })()}
            <div id="production-project-pdf" style={{ position: 'fixed', left: '-10000px', top: 0, width: '794px', padding: '28px', background: '#fff', color: '#1e293b', fontFamily: 'Arial, sans-serif', fontSize: '12px', lineHeight: 1.5 }}>
              <h1 style={{ margin: '0 0 4px', color: '#1d4f91', fontSize: '22px' }}>Machote de trabajo — Producción</h1>
              <p style={{ margin: '0 0 16px', color: '#475569' }}>ID: {selected.public_id || selected.id} · Cliente: {clientSurname}</p>
              <section className="production-pdf-section">
                <h2 className="production-pdf-section-title">1. Información general del cliente</h2>
                {handoffDetails.length ? handoffDetails.map(([label, value], index) => (
                  <p key={`handoff-${index}`} style={{ margin: '0 0 6px' }}><strong>{label}:</strong> {value}</p>
                )) : <p>Sin datos generales adicionales.</p>}
                <h3 style={{ margin: '12px 0 6px', fontSize: '13px' }}>Medidas generales del cliente</h3>
                {generalMeasurements.length ? (
                  <table className="production-pdf-measurement-table">
                    <tbody>
                      {generalMeasurementRows.map((row, rowIndex) => (
                        <tr key={`pdf-general-measurements-${rowIndex}`}>
                          {Array.from({ length: 3 }, (_, columnIndex) => {
                            const item = row[columnIndex];
                            return <td key={item?.[0] || `empty-${columnIndex}`}>{item && <><strong>{item[0]}</strong><br />{item[1]}</>}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p>Sin medidas generales capturadas.</p>}
                {measurementEntries.length > 0 && (
                  <>
                    <h3 style={{ margin: '12px 0 6px', fontSize: '13px' }}>Medidas de visita</h3>
                    <table className="production-pdf-measurement-table">
                      <tbody>
                        {measurementTableRows.map((row, rowIndex) => (
                          <tr key={`pdf-visit-measurements-${rowIndex}`}>
                            {Array.from({ length: 3 }, (_, columnIndex) => {
                              const entry = row[columnIndex];
                              return (
                                <td key={entry?.key || `empty-${columnIndex}`}>
                                  {entry && <>
                                    <strong>{entry.group} — {entry.label}</strong><br />
                                    {entry.value || (collectImageUrls(entry.photo).length ? 'Foto adjunta' : 'Sin medida anotada')}
                                  </>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </section>
              <section className="production-pdf-section production-pdf-new-page">
                <h2 className="production-pdf-section-title">2. Materiales</h2>
                {projectMaterials.length ? (
                  projectMaterialGroups.map(group => (
                    <div key={group.name} className="production-pdf-material-group">
                      <h3>{group.name}</h3>
                      <table className="production-pdf-measurement-table">
                        <tbody>
                          {chunkItems(group.materials, 3).map((row, rowIndex) => (
                            <tr key={`${group.name}-materials-${rowIndex}`}>
                              {Array.from({ length: 3 }, (_, columnIndex) => {
                                const material = row[columnIndex];
                                return (
                                  <td key={material?.purchaseKey || `empty-${columnIndex}`}>
                                    {material && <>{material.desc || 'Material'}{Number(material.qty) > 0 ? ` · ${material.qty} ${material.unit || 'pza'}` : ''}</>}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))
                ) : <p>Sin materiales con cantidad capturada.</p>}
              </section>
              {croquisPages.map((page, pageIndex) => (
                <section key={`croquis-page-${pageIndex}`} className="production-pdf-image-page production-pdf-new-page">
                  <h2>3. Croquis del proyecto{croquisImages.length > 2 ? ` · Hoja ${pageIndex + 1}` : ''}</h2>
                  <div className="production-pdf-croquis-grid">
                    {page.map((photo, index) => {
                      const photoIndex = pageIndex * 2 + index;
                      return (
                        <figure className="production-pdf-layout-image" key={`croquis-${photoIndex}`}>
                          <img src={imageUrl(photo)} alt={`Croquis ${photoIndex + 1}`} />
                          <figcaption>Croquis {photoIndex + 1}</figcaption>
                        </figure>
                      );
                    })}
                  </div>
                </section>
              ))}
              {measurementPhotoPages.map((page, pageIndex) => (
                <section key={`measurement-page-${pageIndex}`} className="production-pdf-image-page production-pdf-new-page">
                  <h2>4. Medidas y fotos de visita · Hoja {pageIndex + 1}</h2>
                  <div className="production-pdf-measure-grid">
                    {page.map(photo => (
                      <figure className="production-pdf-layout-image" key={photo.key}>
                        <img src={imageUrl(photo.url)} alt={`Foto de ${photo.label}`} />
                        <figcaption>{photo.group} — {photo.label}{photo.value ? ` · ${photo.value}` : ''}</figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
              ))}
              {selected.render_pdf_path && (
                <p style={{ margin: '0 0 10px' }}>
                  <strong>PDF de render:</strong>{' '}
                  <a href={`${API}/api/prospects/${selected.id}/render-pdf`} target="_blank" rel="noreferrer">Ver / Descargar PDF de Render</a>
                </p>
              )}
              {croquisImages.length > 0 && (
                <>
                  <h2 style={{ margin: '16px 0 8px', fontSize: '15px' }}>Croquis del proyecto</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {croquisImages.map((photo, index) => (
                      <figure className="production-pdf-photo" key={`croquis-${index}`} style={{ margin: 0, padding: 8, border: '1px solid #cbd5e1', borderRadius: 8, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                        <img src={imageUrl(photo)} alt={`Croquis ${index + 1}`} style={{ display: 'block', width: '100%', maxHeight: '330px', objectFit: 'contain' }} />
                        <figcaption style={{ marginTop: 4, color: '#475569', fontSize: '10px' }}>Croquis {index + 1}</figcaption>
                      </figure>
                    ))}
                  </div>
                </>
              )}
              <h2 style={{ margin: '16px 0 8px', fontSize: '15px' }}>Fotos del proyecto</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {projectReferenceImages.map((photo, index) => (
                  <figure className="production-pdf-photo" key={`${photo.slice(0, 80)}-${index}`} style={{ margin: 0, padding: 8, border: '1px solid #cbd5e1', borderRadius: 8, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <img src={imageUrl(photo)} alt={photo === selected.render_image_path ? 'Render del proyecto' : `Foto de proyecto ${index + 1}`} style={{ display: 'block', width: '100%', maxHeight: '330px', objectFit: 'contain' }} />
                    <figcaption style={{ marginTop: 4, color: '#475569', fontSize: '10px' }}>{photo === selected.render_image_path ? 'Render del proyecto' : `Imagen ${index + 1}`}</figcaption>
                  </figure>
                ))}
              </div>
              {stageEvidence.some(stage => stage.note || stage.photos.length) && (
                <>
                  <h2 style={{ margin: '16px 0 8px', fontSize: '15px' }}>Avances de producción</h2>
                  {stageEvidence.map((stage, index) => (stage.note || stage.photos.length > 0) && (
                    <section key={`stage-${index}`} style={{ margin: '0 0 12px', padding: 8, border: '1px solid #cbd5e1', borderRadius: 8, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                      <h3 style={{ margin: '0 0 4px', color: '#1d4f91', fontSize: '13px' }}>{stage.name}</h3>
                      <p style={{ margin: '0 0 5px', color: '#64748b' }}>Ingreso: {formatDate(stage.enteredAt)}</p>
                      {stage.note && <p style={{ margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{stage.note}</p>}
                      {stage.photos.map((photo, photoIndex) => (
                        <img key={`stage-${index}-photo-${photoIndex}`} src={imageUrl(photo)} alt={`Evidencia ${photoIndex + 1} - ${stage.name}`} style={{ display: 'block', maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', margin: '6px 0' }} />
                      ))}
                    </section>
                  ))}
                </>
              )}
            </div>
          </section>
      ) : !loading && overviewStage === null && filteredProjects.length === 0 ? (
          <div style={{ padding: '2rem', color: '#64748b', textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16 }}>
            {projects.length
              ? 'No hay proyectos que coincidan con la búsqueda.'
              : 'Los contratos se incorporan desde el módulo Clientes.'}
          </div>
      ) : null}

      {showSupplierForm && (
        <div role="presentation" onClick={event => {
          if (event.target === event.currentTarget) setShowSupplierForm(false);
        }} style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15, 23, 42, 0.58)' }}>
          <section role="dialog" aria-modal="true" aria-labelledby="production-supplier-title"
            onClick={event => event.stopPropagation()}
            style={{ width: 'min(520px, 100%)', padding: '1.3rem', background: '#fff', borderRadius: 16, boxShadow: '0 20px 50px rgba(15,23,42,0.25)' }}>
            <h2 id="production-supplier-title" style={{ margin: '0 0 0.35rem', color: '#172b4d', fontSize: '1.1rem' }}>Agregar proveedor</h2>
            <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.82rem', lineHeight: 1.45 }}>Se guardará en la agenda de proveedores y se asignará al material seleccionado.</p>
            <form onSubmit={addSupplierFromProduction} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: 10 }}>
              <label style={{ display: 'grid', gap: 5, color: '#475569', fontSize: '0.75rem', fontWeight: 750 }}>
                Nombre del proveedor *
                <input required autoFocus value={supplierForm.name} onChange={event => setSupplierForm(current => ({ ...current, name: event.target.value }))} placeholder="Nombre del proveedor" style={{ boxSizing: 'border-box', width: '100%', padding: '0.65rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </label>
              <label style={{ display: 'grid', gap: 5, color: '#475569', fontSize: '0.75rem', fontWeight: 750 }}>
                Nombre de contacto
                <input value={supplierForm.contact_name} onChange={event => setSupplierForm(current => ({ ...current, contact_name: event.target.value }))} placeholder="Persona de contacto" style={{ boxSizing: 'border-box', width: '100%', padding: '0.65rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </label>
              <label style={{ display: 'grid', gap: 5, color: '#475569', fontSize: '0.75rem', fontWeight: 750 }}>
                Teléfono
                <input type="tel" value={supplierForm.phone} onChange={event => setSupplierForm(current => ({ ...current, phone: event.target.value }))} placeholder="Teléfono" style={{ boxSizing: 'border-box', width: '100%', padding: '0.65rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </label>
              <label style={{ display: 'grid', gap: 5, color: '#475569', fontSize: '0.75rem', fontWeight: 750 }}>
                Tienda o ubicación
                <input value={supplierForm.location} onChange={event => setSupplierForm(current => ({ ...current, location: event.target.value }))} placeholder="Tienda o sucursal" style={{ boxSizing: 'border-box', width: '100%', padding: '0.65rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </label>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button type="button" disabled={saving} onClick={() => setShowSupplierForm(false)} style={{ padding: '0.65rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: 9, background: '#fff', color: '#475569', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ padding: '0.65rem 0.9rem', border: 0, borderRadius: 9, background: saving ? '#93c5fd' : '#2563eb', color: '#fff', fontWeight: 800, cursor: saving ? 'wait' : 'pointer' }}>{saving ? 'Guardando...' : 'Guardar proveedor'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showPdfPrompt && selected && (
        <div role="presentation" onClick={() => setShowPdfPrompt(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15, 23, 42, 0.55)' }}>
          <section role="dialog" aria-modal="true" aria-labelledby="production-pdf-prompt-title"
            onClick={event => event.stopPropagation()}
            style={{ width: 'min(440px, 100%)', padding: '1.3rem', background: '#fff', borderRadius: 16, boxShadow: '0 20px 50px rgba(15,23,42,0.25)' }}>
            <h2 id="production-pdf-prompt-title" style={{ margin: '0 0 0.5rem', color: '#172b4d', fontSize: '1.1rem' }}>Etapa actualizada</h2>
            <p style={{ margin: '0 0 1.1rem', color: '#526174', lineHeight: 1.5 }}>
              El proyecto ya está en <strong>{STAGE_NAMES[currentStage]}</strong>. ¿Quieres abrir el machote para imprimirlo o guardarlo como PDF para Compras y Carpintería?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" onClick={() => setShowPdfPrompt(false)}
                style={{ padding: '0.65rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: 9, background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>
                Continuar sin descargar
              </button>
              <button type="button" disabled={exportingProjectPdf} onClick={() => { setShowPdfPrompt(false); downloadProjectPdf(); }}
                style={{ padding: '0.65rem 0.9rem', border: 0, borderRadius: 9, background: '#2563eb', color: '#fff', fontWeight: 800, cursor: exportingProjectPdf ? 'wait' : 'pointer' }}>
                {exportingProjectPdf ? 'Preparando machote...' : 'Sí, abrir impresión'}
              </button>
            </div>
          </section>
        </div>
      )}
      </>}
    </main>
  );
}

export default Pedidos;
