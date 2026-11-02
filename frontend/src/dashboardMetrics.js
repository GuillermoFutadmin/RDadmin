const PRODUCTION_STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const productionDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Tijuana',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

function productionDateKey(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
  }
  const timestamp = typeof value === 'number' ? value : parseTimestamp(value);
  if (!Number.isFinite(timestamp)) return null;
  const parts = productionDateFormatter.formatToParts(timestamp);
  const part = type => parts.find(item => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

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

export function getProductionDailyActivity(project, now = Date.now()) {
  const production = parseJson(project.production_data);
  const start = productionDateKey(production.started_at || production.stages?.[0]?.entered_at);
  const today = productionDateKey(now);
  const plannedDays = Number(project.production_days);
  if (!start) return { error: 'Falta una fecha válida de inicio de producción.' };
  if (!Number.isInteger(plannedDays) || plannedDays <= 0) {
    return { error: 'Falta definir la duración del proyecto en días de producción.' };
  }
  if (!today) return { error: 'No se pudo determinar la fecha actual.' };

  const startTime = Date.parse(`${start}T00:00:00Z`);
  const elapsedDays = Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - startTime) / DAY_MS) + 1);
  const advances = Array.isArray(production.daily_advances) ? production.daily_advances : [];
  const workedDates = new Set(advances.filter(Boolean).map(advance =>
    productionDateKey(advance.date) || productionDateKey(advance.created_at)
  ).filter(Boolean));
  const days = Array.from({ length: Math.max(plannedDays, elapsedDays) }, (_, index) => {
    const date = new Date(startTime + index * DAY_MS).toISOString().slice(0, 10);
    return {
      day: index + 1,
      date,
      value: date > today ? null : workedDates.has(date) ? 1 : -1
    };
  });
  const workedDays = days.filter(day => day.value === 1).length;
  return {
    start,
    plannedDays,
    elapsedDays,
    workedDays,
    idleDays: elapsedDays - workedDays,
    overdueDays: Math.max(0, elapsedDays - plannedDays),
    days
  };
}
