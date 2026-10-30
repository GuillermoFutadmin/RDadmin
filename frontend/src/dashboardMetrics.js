const PRODUCTION_STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const TIME_ZONE = 'America/Tijuana';

function parseJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function parseTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00Z`
    : /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
      ? value
      : `${value}Z`;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getProductionCurrentStage(production) {
  const stage = Number.isInteger(production.current_stage) ? production.current_stage : 0;
  return Array.isArray(production.stages) && production.stages.length === 7
    ? stage <= 1 ? 0 : stage - 1
    : stage;
}

export function getLatestProductionActivity(project) {
  const production = parseJson(project.production_data);
  const currentStage = getProductionCurrentStage(production);
  const stageEnteredAt = production.stages?.[currentStage]?.entered_at;
  const candidates = [
    stageEnteredAt,
    production.started_at,
    project.updated_at,
    ...((Array.isArray(production.daily_advances) ? production.daily_advances : [])
      .filter(advance => advance && advance.published !== false)
      .map(advance => advance.created_at || advance.date))
  ];
  const timestamps = candidates.map(parseTimestamp).filter(Number.isFinite);
  return timestamps.length ? Math.max(...timestamps) : null;
}

export function getProductionFreshness(projects, now = Date.now()) {
  const activeProjects = projects.filter(project => project.status === 'PRODUCCION');
  const items = activeProjects.map(project => {
    const lastUpdatedAt = getLatestProductionActivity(project);
    const isFresh = lastUpdatedAt !== null
      && lastUpdatedAt <= now
      && now - lastUpdatedAt <= PRODUCTION_STALE_AFTER_MS;
    return { ...project, lastUpdatedAt, isFresh };
  });
  const fresh = items.filter(item => item.isFresh).length;
  const stale = items.length - fresh;
  const tone = items.length === 0 ? 'neutral'
    : stale === 0 ? 'green'
      : stale > items.length / 2 ? 'red' : 'amber';
  return {
    items,
    total: items.length,
    fresh,
    stale,
    ratio: items.length ? fresh / items.length : 0,
    tone
  };
}

function mexicoDateKey(timestamp) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(timestamp);
  const part = type => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function getLastUpdate(project) {
  return parseTimestamp(project.updated_at)
    ?? parseTimestamp(project.capture_date)
    ?? parseTimestamp(project.contract_date);
}

export function getThreeDayFlowActivity({ prospects = [], clients = [], production = [] }, now = Date.now()) {
  const todayKey = mexicoDateKey(now);
  const day = new Date(`${todayKey}T12:00:00Z`);
  const dayKeys = Array.from({ length: 3 }, (_, index) => {
    const date = new Date(day);
    date.setUTCDate(date.getUTCDate() - (2 - index));
    return mexicoDateKey(date);
  });
  const counts = {
    prospects: Array(3).fill(0),
    clients: Array(3).fill(0),
    production: Array(3).fill(0)
  };
  const recordActivity = (group, project, timestamp) => {
    if (timestamp === null) return;
    const index = dayKeys.indexOf(mexicoDateKey(timestamp));
    if (index >= 0) counts[group][index] += 1;
  };

  prospects.forEach(project => recordActivity('prospects', project, getLastUpdate(project)));
  clients.forEach(project => recordActivity('clients', project, getLastUpdate(project)));
  production.forEach(project => recordActivity('production', project, getLatestProductionActivity(project)));

  return {
    days: dayKeys.map(key => ({
      key,
      label: new Date(`${key}T20:00:00Z`).toLocaleDateString('es-MX', {
        timeZone: TIME_ZONE,
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      })
    })),
    series: [
      { key: 'prospects', label: 'Prospectos', color: '#64748b', values: counts.prospects },
      { key: 'clients', label: 'Clientes', color: '#7c6ba6', values: counts.clients },
      { key: 'production', label: 'Producción', color: '#315f91', values: counts.production }
    ]
  };
}
