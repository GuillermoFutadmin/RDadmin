import test from 'node:test';
import assert from 'node:assert/strict';
import { getLatestProductionActivity, getProductionDailyActivity, getProductionFreshness } from './dashboardMetrics.js';

const now = Date.parse('2026-10-25T20:00:00Z');

test('production freshness uses a 24-hour window and ignores delivered work', () => {
  const freshness = getProductionFreshness([
    { id: 'fresh', status: 'PRODUCCION', updated_at: '2026-10-24T20:00:00Z', production_data: { started_at: '2026-10-24T20:00:00Z' } },
    { id: 'stale', status: 'PRODUCCION', updated_at: '2026-10-24T19:59:59Z', production_data: { started_at: '2026-10-24T19:59:59Z' } },
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

test('a recent prospect record edit does not make old production activity look fresh', () => {
  const freshness = getProductionFreshness([{
    status: 'PRODUCCION',
    updated_at: '2026-10-25T19:00:00Z',
    production_data: JSON.stringify({
      started_at: '2026-10-21T12:00:00Z',
      current_stage: 0,
      stages: [{ entered_at: '2026-10-21T12:00:00Z' }]
    })
  }], now);

  assert.equal(freshness.fresh, 0);
  assert.equal(freshness.stale, 1);
  assert.equal(freshness.items[0].isFresh, false);
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

test('daily activity counts calendar days, distinct worked dates and future dates separately', () => {
  const result = getProductionDailyActivity({
    production_days: 5,
    production_data: JSON.stringify({
      started_at: '2026-10-23',
      daily_advances: [
        { date: '2026-10-23', created_at: '2026-10-25T18:00:00Z' },
        { date: '2026-10-23' },
        { date: '2026-10-25', published: false },
        { date: '2026-10-27' },
        { date: '2026-10-22' }
      ]
    })
  }, now);

  assert.deepEqual(result.days.map(day => day.value), [1, -1, 1, null, null]);
  assert.equal(result.workedDays, 2);
  assert.equal(result.idleDays, 1);
  assert.equal(result.elapsedDays, 3);
  assert.equal(result.overdueDays, 0);
});

test('daily activity uses Tijuana calendar dates and does not lose days at a DST boundary', () => {
  const result = getProductionDailyActivity({
    production_days: 2,
    production_data: {
      started_at: '2026-10-31T23:00:00Z',
      daily_advances: [
        { created_at: '2026-11-01T06:30:00Z' },
        { created_at: '2026-11-02T07:30:00Z' }
      ]
    }
  }, Date.parse('2026-11-02T20:00:00Z'));

  assert.deepEqual(result.days.map(day => [day.date, day.value]), [
    ['2026-10-31', 1], ['2026-11-01', 1], ['2026-11-02', -1]
  ]);
  assert.equal(result.overdueDays, 1);
});

test('starting production or changing a stage alone is not a recorded daily advance', () => {
  const result = getProductionDailyActivity({
    production_days: 1,
    production_data: { stages: [{ entered_at: '2026-10-25T12:00:00Z' }] }
  }, now);
  assert.deepEqual(result.days.map(day => day.value), [-1]);
});

test('daily activity reports missing schedule data instead of inventing a schedule', () => {
  assert.match(getProductionDailyActivity({ production_days: 5 }, now).error, /inicio/);
  assert.match(getProductionDailyActivity({
    production_days: 5, production_data: { started_at: '2026-02-30' }
  }, now).error, /inicio/);
  for (const production_days of [null, 0, -1, 1.5, 'abc']) {
    assert.match(getProductionDailyActivity({
      production_days, production_data: { started_at: '2026-10-25' }
    }, now).error, /duración/);
  }
});

test('a project not yet started has only future dates and no idle days', () => {
  const result = getProductionDailyActivity({
    production_days: 2,
    production_data: { started_at: '2026-10-26' }
  }, now);
  assert.deepEqual(result.days.map(day => day.value), [null, null]);
  assert.equal(result.idleDays, 0);
  assert.equal(result.elapsedDays, 0);
});
