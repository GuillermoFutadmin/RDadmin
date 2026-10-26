import test from 'node:test';
import assert from 'node:assert/strict';
import { cascadeWorks, isInProspects } from './workCascade.js';

const prospect = {
  is_contract: false,
  valuation_data: JSON.stringify({ globalMargin: 30, sheets: [
    { type: 'Cocina', materials: [{ qty: 1, price: 10000 }] },
    { type: 'Closet', labor: [{ qty: 2, price: 2500 }] },
    { type: 'Puertas', concepts: [{ qty: 3, price: 1000 }] }
  ] })
};

test('legacy multiple-work prospects start available with accurate totals', () => {
  assert.equal(isInProspects(prospect), true);
  assert.deepEqual(cascadeWorks(prospect).map(item => [item.id, item.status, item.price]), [
    ['work-1', 'ACTIVE', 13000], ['work-2', 'ACTIVE', 6500], ['work-3', 'ACTIVE', 3900]
  ]);
});

test('partial transfer leaves paused and unapproved work in prospects', () => {
  const p = { ...prospect, work_flow: JSON.stringify({ quoted: ['work-2'], items: {
    'work-1': { status: 'TRANSFERRED', public_id: 'CLIENT1' },
    'work-3': { status: 'PAUSED' }
  } }) };
  assert.equal(isInProspects(p), true);
  const works = cascadeWorks(p);
  assert.equal(works[0].publicId, 'CLIENT1');
  assert.equal(works[1].quoted, true);
  assert.equal(works[2].status, 'PAUSED');
});

test('all transferred or removed work hides the exhausted prospect', () => {
  const p = { ...prospect, work_flow: JSON.stringify({ items: {
    'work-1': { status: 'TRANSFERRED' }, 'work-2': { status: 'TRANSFERRED' }, 'work-3': { status: 'DELETED' }
  } }) };
  assert.equal(isInProspects(p), false);
  assert.equal(isInProspects({ ...prospect, is_contract: true }), false);
});

test('legacy free-text valuation notes do not break the quotation', () => {
  assert.deepEqual(cascadeWorks({ valuation_data: 'Notas pendientes de valorar' }), []);
});
