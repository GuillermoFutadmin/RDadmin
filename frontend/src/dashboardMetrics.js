const PRODUCTION_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

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
