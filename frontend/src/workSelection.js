import { parseStoredData } from './productionWorkItems.js';

export function getWorkSheets(data, projectType = 'Proyecto') {
  if (Array.isArray(data.sheets) && data.sheets.length) return data.sheets;
  if (data.materials || data.labor || data.concepts) {
    return [{ type: data.projectType || projectType, materials: data.materials || [], labor: data.labor || [], concepts: data.concepts || [] }];
  }
  return [];
}

export const workId = index => `work-${index + 1}`;

export function getSheetPrice(sheet, margin) {
  const rows = [...(sheet.materials || []), ...(sheet.labor || []), ...(sheet.concepts || [])];
  const cost = rows.reduce((sum, row) => sum + (Number(row.qty) || 0) * (Number(row.price) || 0), 0);
  return cost * (1 + margin / 100);
}

export function getSelectedWorkIds(prospect, sheets) {
  return prospect.contract_work_item_ids
    ? JSON.parse(prospect.contract_work_item_ids)
    : sheets.map((_, index) => workId(index));
}

export function getSelectedTotal(sheets, margin, selectedIds) {
  return sheets.reduce((total, sheet, index) => total + (selectedIds.includes(workId(index)) ? getSheetPrice(sheet, margin) : 0), 0);
}

export function getWorkSelectionPayload(prospect, selectedIds, projectTotal) {
  if (!selectedIds.length) throw new Error('Selecciona al menos un trabajo.');
  const production = parseStoredData(prospect.production_data);
  const items = Array.isArray(production.work_items) ? production.work_items : [];
  if (items.some(item => ['PRODUCCION', 'ENTREGADO'].includes(item.status) && !selectedIds.includes(item.id))) {
    throw new Error('No se puede quitar del contrato un trabajo que ya inició producción.');
  }
  const renderTotal = prospect.render_applies ? Math.max(0, Number(prospect.render_price) || 0) : 0;
  return {
    contract_work_item_ids: JSON.stringify(selectedIds),
    render_total_price: projectTotal + renderTotal,
  };
}
