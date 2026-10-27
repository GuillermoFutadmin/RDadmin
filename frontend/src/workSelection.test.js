import test from 'node:test';
import assert from 'node:assert/strict';
import { getProductionWorkOptions, getPendingContractWork, getSemaforoWorkItems, isInContracts, startSelectedProductionWork } from './productionWorkItems.js';
import { getWorkSheets, getSheetPrice, getSelectedWorkIds, getSelectedTotal, getWorkSelectionPayload } from './workSelection.js';

const sheets = [
  { type: 'Closet', materials: [{ qty: 1, price: 9450 }] },
  { type: 'Puerta Tambor', labor: [{ qty: 1, price: 5130 }] },
  { type: 'Cocina', concepts: [{ qty: 1, price: 12470 }] }
];

test('legacy records include all work and retain the full price', () => {
  const ids = getSelectedWorkIds({}, sheets);
  assert.deepEqual(ids, ['work-1', 'work-2', 'work-3']);
  assert.equal(getSelectedTotal(sheets, 30, ids), 35165);
  assert.equal(getSheetPrice(sheets[0], 30), 12285);
});

test('selection persists and recalculates manufacturing, render and payment amounts', () => {
  const prospect = { render_applies: true, render_price: 1500 };
  const selected = ['work-1'];
  const total = getSelectedTotal(sheets, 30, selected);
  const payload = getWorkSelectionPayload(prospect, selected, total);
  assert.equal(payload.quote_total_price, undefined);
  assert.equal(payload.contract_work_item_ids, '["work-1"]');
  assert.equal(payload.render_total_price, 13785);
  assert.equal(total * 0.6 + 1500, 8871);
  assert.equal(total * 0.4, 4914);
  assert.deepEqual(getSelectedWorkIds(payload, sheets), selected);
  assert.equal(getSelectedTotal(sheets, 30, ['work-2', 'work-3']), 22880);
  assert.equal(sheets.length, 3);
});

test('all sheets stay available in Contracts for later production', () => {
  const prospect = {
    estimation_data: JSON.stringify({ sheets }),
    other_projects: JSON.stringify([{ name: 'Old project' }]),
    contract_work_item_ids: '["work-2"]'
  };
  assert.equal(getProductionWorkOptions(prospect).length, 3);
  assert.equal(getProductionWorkOptions(prospect)[1].name, 'Puerta Tambor');
});

test('valuation sheets work before an estimation exists', () => {
  assert.equal(getProductionWorkOptions({
    valuation_data: JSON.stringify({ sheets }),
    contract_work_item_ids: '["work-3"]'
  })[2].name, 'Cocina');
  assert.equal(getWorkSheets({ materials: [] }, 'Legacy')[0].type, 'Legacy');
});

test('empty selection is not saveable and a zero-price selected sheet stays zero', () => {
  assert.throws(() => getWorkSelectionPayload({}, [], 0), /al menos un trabajo/);
  assert.equal(getSelectedTotal([{ type: 'Free' }], 30, ['work-1']), 0);
  assert.equal(getWorkSelectionPayload({}, ['work-1'], 0).render_total_price, 0);
});

test('pending work is preserved and active work cannot be excluded from the contract', () => {
  const prospect = { production_data: JSON.stringify({ work_items: [
    { id: 'work-1', status: 'PRODUCCION', production_data: { current_stage: 2 } },
    { id: 'work-2', status: 'STANDBY' }
  ] }) };
  assert.throws(() => getWorkSelectionPayload(prospect, ['work-2'], 6669), /ya inició/);
  const payload = getWorkSelectionPayload(prospect, ['work-1'], 12285);
  assert.equal(payload.production_data, undefined);
  assert.deepEqual(getProductionWorkOptions({ ...prospect, ...payload }).map(item => item.id), ['work-1', 'work-2']);
});

test('partial production keeps pending work in Contracts, including after active work is delivered', () => {
  const prospect = { is_contract: true, status: 'CONTRATO', estimation_data: JSON.stringify({ sheets }) };
  const production = startSelectedProductionWork(prospect, ['work-1'], '2026-10-23T12:00:00Z');
  const partial = { ...prospect, status: 'PRODUCCION', production_data: JSON.stringify(production) };
  assert.equal(isInContracts(partial), true);
  assert.deepEqual(getPendingContractWork(partial).map(item => item.name), ['Puerta Tambor', 'Cocina']);
  assert.deepEqual(production.work_items.map(item => item.status), ['PRODUCCION', 'STANDBY', 'STANDBY']);
  production.work_items[0].status = 'ENTREGADO';
  const delivered = { ...partial, status: 'ENTREGADO', production_data: JSON.stringify(production) };
  assert.equal(isInContracts(delivered), true);
  const next = startSelectedProductionWork(delivered, ['work-2'], '2026-10-24T12:00:00Z');
  assert.deepEqual(next.work_items.map(item => item.status), ['ENTREGADO', 'PRODUCCION', 'STANDBY']);
  assert.equal(next.work_items[0].production_data.stages[0].entered_at, '2026-10-23T12:00:00Z');
  next.work_items[2].status = 'PRODUCCION';
  assert.equal(isInContracts({ ...partial, production_data: JSON.stringify(next) }), false);
});

test('the production traffic light includes active and delivered work items but not standby work', () => {
  const contracts = [{
    id: 42,
    name: 'Cliente',
    production_data: JSON.stringify({ work_items: [
      { id: 'work-1', name: 'Cocina', status: 'PRODUCCION', production_data: { current_stage: 0 } },
      { id: 'work-2', name: 'Clóset', status: 'STANDBY', production_data: { current_stage: 0 } },
      { id: 'work-3', name: 'Vanity', status: 'ENTREGADO', production_data: { current_stage: 5 } }
    ] })
  }];

  const items = getSemaforoWorkItems(contracts);
  assert.deepEqual(items.map(item => item.semaforoKey), ['42:work-1', '42:work-3']);
  assert.equal(items[0].production_data.current_stage, 0);
  assert.equal(items[0].workItemName, 'Cocina');
  assert.equal(items[1].status, 'ENTREGADO');
});
