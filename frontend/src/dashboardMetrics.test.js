import test from 'node:test';
import assert from 'node:assert/strict';
import { getLatestProductionActivity, getProductionFreshness } from './dashboardMetrics.js';

const now = Date.parse('2026-10-25T20:00:00Z');

test('production freshness uses a 24-hour window and ignores delivered work', () => {
  const freshness = getProductionFreshness([
    { id: 'fresh', status: 'PRODUCCION', updated_at: '2026-10-24T20:00:00Z' },
    { id: 'stale', status: 'PRODUCCION', updated_at: '2026-10-24T19:59:59Z' },
    { id: 'delivered', status: 'ENTREGADO', updated_at: '2026-10-25T19:00:00Z' },
    { id: 'standby', status: 'STANDBY', updated_at: '2026-10-25T19:00:00Z' }
  ], now);

  assert.equal(freshness.total, 2);
  assert.equal(freshness.fresh, 1);
  assert.equal(freshness.stale, 1);
  assert.equal(freshness.tone, 'amber');
});

test('production freshness turns red only when most active projects are stale', () => {
  const projects = [
    { status: 'PRODUCCION', updated_at: '2026-10-25T19:00:00Z' },
    { status: 'PRODUCCION', updated_at: '2026-10-23T19:00:00Z' },
    { status: 'PRODUCCION', updated_at: null }
  ];

  assert.equal(getProductionFreshness(projects, now).tone, 'red');
  assert.equal(getProductionFreshness([], now).tone, 'neutral');
});

test('latest production activity uses the current stage entry and visible advances', () => {
  assert.equal(getLatestProductionActivity({
    updated_at: null,
    production_data: {
      current_stage: 1,
      stages: [
        { entered_at: '2026-10-20T12:00:00Z' },
        { entered_at: '2026-10-24T12:00:00Z' }
      ],
      daily_advances: [
        { created_at: '2026-10-25T12:00:00Z', published: false },
        { created_at: '2026-10-23T12:00:00Z', published: true }
      ]
    }
  }), Date.parse('2026-10-24T12:00:00Z'));
});
