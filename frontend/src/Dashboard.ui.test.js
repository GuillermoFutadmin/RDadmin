import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { createServer } from 'vite';

test('the production circle toggles project cards with independent daily graphs', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  let renderer;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tijuana' });
  const twoDaysAgo = new Date(Date.parse(`${today}T12:00:00Z`) - 2 * 86400000).toISOString().slice(0, 10);
  globalThis.window = { setInterval, clearInterval, addEventListener() {}, removeEventListener() {} };
  globalThis.document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };
  globalThis.fetch = async url => {
    assert.equal(url, '/api/prospects?light=true');
    return { ok: true, json: async () => [{
      id: 1, name: 'Cliente con áreas', is_contract: true, status: 'PRODUCCION', production_days: 3,
      production_data: {
        work_items: [
          { id: 'work-1', name: 'Cocina', status: 'PRODUCCION', production_data: { started_at: twoDaysAgo, daily_advances: [{ date: twoDaysAgo }, { date: today }] } },
          { id: 'work-2', name: 'Clóset', status: 'PRODUCCION', production_data: { started_at: today, daily_advances: [] } },
          { id: 'work-3', name: 'Entregado', status: 'ENTREGADO', production_data: { started_at: today } }
        ]
      }
    }, {
      id: 2, name: 'Sin duración', is_contract: true, status: 'PRODUCCION',
      production_data: { started_at: today }
    }] };
  };
  try {
    const { default: Dashboard } = await server.ssrLoadModule('/src/Dashboard.jsx');
    await act(async () => { renderer = create(React.createElement(Dashboard)); });
    const circle = () => renderer.root.findByProps({ className: 'dashboard-freshness-control' });
    const cards = () => renderer.root.findAllByProps({ className: 'dashboard-production-card' });
    assert.equal(circle().props['aria-expanded'], false);
    assert.equal(cards().length, 0);
    await act(async () => { circle().props.onClick(); });
    assert.equal(circle().props['aria-expanded'], true);
    assert.equal(cards().length, 3);
    assert.deepEqual(cards().map(card => card.findByType('h3').children.join('')), [
      'Cliente con áreas · Cocina', 'Cliente con áreas · Clóset', 'Sin duración · Proyecto'
    ]);
    const graphs = renderer.root.findAllByType('svg').filter(node => node.props.role === 'img' && node.props['aria-label']);
    assert.equal(graphs.length, 2);
    assert.match(graphs[0].props['aria-label'], /2 días con avance y 1 días sin avance/);
    assert.match(graphs[1].props['aria-label'], /0 días con avance y 1 días sin avance/);
    assert.equal(graphs[0].props.viewBox, '0 0 328 92');
    assert.equal(graphs[0].props.width, undefined);
    assert.equal(graphs[0].findAllByType('rect').length, 0);
    assert.equal(graphs[0].findByType('polyline').props.points, '28,16 170,60 312,16');
    assert.equal(graphs[0].findAllByType('circle').length, 3);
    assert.equal(graphs[1].findAllByType('circle').length, 1);
    assert.equal(graphs[1].findAllByType('polyline').length, 0);
    assert.match(cards()[2].findByProps({ role: 'status' }).children.join(''), /duración/);
    await act(async () => { circle().props.onClick(); });
    assert.equal(cards().length, 0);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    await server.close();
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.fetch = originalFetch;
  }
});
