import { getWorkSheets, getSheetPrice, workId } from './workSelection.js';
import { parseStoredData } from './productionWorkItems.js';

export function cascadeWorks(prospect) {
  const valuation = parseStoredData(prospect.valuation_data);
  const state = JSON.parse(prospect.work_flow || '{}');
  const margin = Number(valuation.globalMargin ?? valuation.margin ?? 30);
  return getWorkSheets(valuation, prospect.project_type).map((sheet, index) => ({
    id: workId(index), sheet, name: sheet.type || 'Proyecto',
    price: getSheetPrice(sheet, margin),
    status: state.items?.[workId(index)]?.status || 'ACTIVE',
    publicId: state.items?.[workId(index)]?.public_id,
    quoted: state.quoted?.includes(workId(index)) || false
  }));
}

export function isInProspects(prospect) {
  if (prospect.is_contract) return false;
  if (!prospect.work_flow) return true;
  return cascadeWorks(prospect).some(item => ['ACTIVE', 'PAUSED'].includes(item.status));
}

export async function cascadeAction(prospectId, action, ids, quoteFields) {
  const response = await fetch(`/api/prospects/${prospectId}/work-cascade`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ids, quote_fields: quoteFields })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'No se pudo guardar el cambio de trabajos');
  return data;
}
