export const PRODUCTION_WORK_STAGES = [
  'Generando información',
  'Preparación de materiales',
  'Producción iniciada',
  'Avance 1',
  'Avance 2 / revisión',
  'Entrega del proyecto'
];

export function parseStoredData(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function createWorkProduction(startedAt) {
  return {
    current_stage: 0,
    started_at: startedAt,
    daily_advances: [],
    stages: PRODUCTION_WORK_STAGES.map((name, index) => ({
      name,
      entered_at: index === 0 ? startedAt : null,
      note: '',
      photos: []
    }))
  };
}

export function getProductionWorkOptions(prospect) {
  const currentProduction = parseStoredData(prospect.production_data);
  if (Array.isArray(currentProduction.work_items) && currentProduction.work_items.length) {
    return currentProduction.work_items.map(({ id, name, measurements, valuation }) => ({
      id,
      name,
      measurements: measurements || '',
      valuation: valuation || ''
    }));
  }

  const estimation = parseStoredData(prospect.estimation_data);
  const valuation = parseStoredData(prospect.valuation_data);
  const sheets = Array.isArray(estimation.sheets) && estimation.sheets.length
    ? estimation.sheets
    : Array.isArray(valuation.sheets) ? valuation.sheets : [];
  const otherProjects = parseStoredData(prospect.other_projects, []);
  const projectList = Array.isArray(otherProjects) ? otherProjects.filter(item => item && (item.name || item.measurements)) : [];

  if (projectList.length && !sheets.length) {
    return projectList.map((project, index) => ({
      id: `work-${index + 1}`,
      name: project.name || `Trabajo ${index + 1}`,
      measurements: project.measurements || '',
      valuation: sheets[index]?.type || (sheets.length === 1 ? sheets[0].type : '')
    }));
  }

  if (sheets.length) {
    return sheets.map((sheet, index) => ({
      id: `work-${index + 1}`,
      name: sheet.type || `Trabajo ${index + 1}`,
      measurements: projectList[index]?.measurements || '',
      valuation: sheet.type || ''
    }));
  }

  return [{
    id: 'work-1',
    name: prospect.project_type || 'Proyecto',
    measurements: prospect.measurements || '',
    valuation: ''
  }];
}

export function getPendingContractWork(prospect) {
  const production = parseStoredData(prospect.production_data);
  return (Array.isArray(production.work_items) ? production.work_items : []).filter(item => item.status === 'STANDBY');
}

export function getSemaforoWorkItems(contracts) {
  return contracts.flatMap(contract => {
    const production = parseStoredData(contract.production_data);
    return (Array.isArray(production.work_items) ? production.work_items : [])
      .filter(item => ['PRODUCCION', 'ENTREGADO'].includes(item.status))
      .map(item => ({
        ...contract,
        production_data: item.production_data || {},
        status: item.status,
        project_type: item.name || contract.project_type,
        workItemId: item.id,
        workItemName: item.name || 'Trabajo',
        semaforoKey: `${contract.id}:${item.id}`
      }));
  });
}

export function getSemaforoWorkItemStageCounts(workItems) {
  const counts = Array(PRODUCTION_WORK_STAGES.length).fill(0);
  workItems.forEach(item => {
    const stage = Number.isInteger(item.production_data?.current_stage)
      ? Math.max(0, Math.min(item.production_data.current_stage, counts.length - 1))
      : 0;
    counts[stage] += 1;
  });
  return counts;
}

export function isInContracts(prospect) {
  return prospect.is_contract && (!['PRODUCCION', 'ENTREGADO'].includes(prospect.status) || getPendingContractWork(prospect).length > 0);
}

export function startSelectedProductionWork(prospect, selectedIds, startedAt) {
  const production = parseStoredData(prospect.production_data);
  const existingItems = Array.isArray(production.work_items) ? production.work_items : [];
  const options = getProductionWorkOptions(prospect);
  if (!selectedIds.length || selectedIds.some(id => !options.some(item => item.id === id))) {
    throw new Error('Selecciona al menos un trabajo válido para producción.');
  }
  const workItems = options.map(option => {
    const current = existingItems.find(item => item.id === option.id) || { ...option, status: 'STANDBY', production_data: null };
    if (['PRODUCCION', 'ENTREGADO'].includes(current.status)) return current;
    return selectedIds.includes(option.id) ? activateProductionWorkItem(current, startedAt) : current;
  });
  return { ...production, work_items: workItems, started_at: production.started_at || startedAt };
}

export function activateProductionWorkItem(item, startedAt) {
  return {
    ...item,
    status: 'PRODUCCION',
    started_at: startedAt,
    production_data: item.production_data || createWorkProduction(startedAt)
  };
}
