import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { createServer } from 'vite';

test('Day of the Dead has a continuous large-flower floor and alternating small foreground flowers', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  const originalDate = globalThis.Date;
  let renderer;

  globalThis.Date = class extends originalDate {
    constructor(...args) {
      super(...(args.length ? args : ['2026-10-31T18:00:00-06:00']));
    }
  };
  globalThis.window = {
    setInterval,
    clearInterval,
    addEventListener() {},
    removeEventListener() {}
  };
  globalThis.document = {
    visibilityState: 'visible',
    addEventListener() {},
    removeEventListener() {}
  };
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ id: 1, public_id: 'DEMO', name: 'Cliente de prueba', status: 'PROSPECTO' })
  });

  try {
    const { default: ClientPortal } = await server.ssrLoadModule('/src/ClientPortal.jsx');
    await act(async () => {
      renderer = create(React.createElement(ClientPortal));
    });
    await act(async () => {
      await renderer.root.findByType('form').props.onSubmit({ preventDefault() {} });
    });

    const floor = renderer.root.findByProps({ className: 'client-card-flower-path client-card-flower-path--floor' });
    const front = renderer.root.findByProps({ className: 'client-card-flower-path client-card-flower-path--front' });
    const floorPattern = floor.findByType('pattern');
    const frontPattern = front.findByType('pattern');
    assert.equal(floorPattern.props.height, 36);
    assert.equal(floorPattern.props.width, 28);
    assert.equal(floorPattern.children[0].props.width, 36);
    assert.equal(frontPattern.props.height, 28);
    assert.equal(frontPattern.props.width, 48);
    assert.equal(frontPattern.children[0].props.width, 28);
    assert.equal(frontPattern.props.width - frontPattern.children[0].props.width, 20);
    assert.notEqual(floorPattern.props.id, frontPattern.props.id);

    for (const layer of [floor, front]) {
      assert.equal(layer.props['aria-hidden'], 'true');
      assert.equal(layer.findByType('pattern').props.patternUnits, 'userSpaceOnUse');
      assert.equal(layer.findByType('rect').props.width, '100%');
      assert.equal(layer.findByType('rect').props.fill, `url(#${layer.findByType('pattern').props.id})`);
    }
    assert.equal(renderer.root.findByProps({ className: 'client-card-procession-figure' }).props.src, '/catrina-xolo.png');
  } finally {
    if (renderer) act(() => renderer.unmount());
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.fetch = originalFetch;
    globalThis.Date = originalDate;
    await server.close();
  }
});
