import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { createServer } from 'vite';

const date = '2026-10-28';
const photo = id => ({ id, url: `/test/${id}.jpg`, date, published: true });
const production = daily_advances => ({
  started_at: date,
  current_stage: 0,
  stages: [],
  ...(daily_advances === undefined ? {} : { daily_advances })
});
const baseProject = {
  is_contract: true,
  status: 'PRODUCCION',
  production_days: 10,
  contract_date: date
};
const projects = [
  { ...baseProject, id: 101, name: 'Cliente sin fotos', production_data: production() },
  { ...baseProject, id: 102, name: 'Cliente con fotos', production_data: JSON.stringify(production([photo('legacy-1'), photo('legacy-2')])) },
  {
    ...baseProject,
    id: 103,
    name: 'Cliente con áreas',
    production_data: JSON.stringify({
      ...production([photo('parent-1')]),
      work_items: [
        { id: 'work-1', name: 'Cocina', status: 'PRODUCCION', production_data: production([photo('area-1'), photo('area-2')]) },
        { id: 'work-2', name: 'Clóset', status: 'PRODUCCION', production_data: production([photo('area-1'), photo('area-3')]) }
      ]
    })
  }
];

const directText = node => node.children.filter(child => typeof child === 'string').join('');

test('production traffic light opens clients and counts the photos shown in the gallery', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  const originalFormData = globalThis.FormData;
  const originalCreateObjectURL = URL.createObjectURL;
  const uploads = [];
  let renderer;

  class MockFormData {
    fields = new Map();
    append(key, value) {
      this.fields.set(key, value);
    }
  }

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
  globalThis.FormData = MockFormData;
  URL.createObjectURL = () => 'blob:test-image';
  globalThis.fetch = async (url, options) => {
    if (url === '/api/prospects?light=true') return { ok: true, json: async () => projects };
    if (url === '/api/suppliers') return { ok: true, json: async () => [] };
    if (url === '/api/prospects/101/daily-advances') {
      uploads.push({ url, date: options.body.fields.get('date') });
      return { ok: true, json: async () => ({ production_data: production() }) };
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const { default: Pedidos } = await server.ssrLoadModule('/src/Pedidos.jsx');
    await act(async () => {
      renderer = create(React.createElement(Pedidos));
    });
    await act(async () => {
      renderer.root.findByProps({ id: 'btn-semaforo-produccion' }).props.onClick();
    });

    for (const [key, count] of [['101', 0], ['102', 2], ['103:work-1', 4]]) {
      await act(async () => {
        renderer.root.findByProps({ id: `semaforo-cliente-${key}` }).props.onClick();
      });

      const badge = renderer.root.findAllByType('span')
        .find(node => /^📸 \d+ fotos$/.test(directText(node)));
      assert.ok(badge, `Missing photo count for ${key}`);
      assert.equal(directText(badge), `📸 ${count} fotos`);

      const galleryTab = renderer.root.findAllByType('button')
        .find(node => directText(node).startsWith('🖼️ Ver todas ('));
      assert.ok(galleryTab, `Missing gallery tab for ${key}`);
      assert.equal(directText(galleryTab), `🖼️ Ver todas (${count})`);

      if (key === '101') {
        const saturday = renderer.root.findByProps({ title: 'Fin de semana · 2026-10-31' });
        assert.equal(saturday.props.disabled, false);
        await act(async () => saturday.props.onClick());

        const imageInput = renderer.root.findAllByType('input')
          .find(node => node.props.type === 'file' && node.props.accept === 'image/*');
        assert.ok(imageInput, 'Weekend selection should keep the photo upload input available');
        await act(async () => {
          imageInput.props.onChange({ target: { files: [{ name: 'weekend.jpg' }] } });
        });

        const uploadForm = renderer.root.findAllByType('form')
          .find(form => form.findAllByType('button').some(button => directText(button).startsWith('Subir')));
        assert.ok(uploadForm, 'Weekend selection should keep the photo upload form available');
        await act(async () => uploadForm.props.onSubmit({ preventDefault() {} }));
        assert.deepEqual(uploads, [{ url: '/api/prospects/101/daily-advances', date: '2026-10-31' }]);

        const nextMonth = renderer.root.findByProps({ 'aria-label': 'Mes siguiente' });
        await act(async () => nextMonth.props.onClick());
        const sunday = renderer.root.findByProps({ title: 'Fin de semana · 2026-11-01' });
        assert.equal(sunday.props.disabled, false);
        await act(async () => sunday.props.onClick());
        assert.equal(renderer.root.findByProps({ title: 'Fin de semana · 2026-11-01' }).props.style.border, '2px solid #38bdf8');

        const sundayImageInput = renderer.root.findAllByType('input')
          .find(node => node.props.type === 'file' && node.props.accept === 'image/*');
        await act(async () => {
          sundayImageInput.props.onChange({ target: { files: [{ name: 'sunday.jpg' }] } });
        });
        const sundayUploadForm = renderer.root.findAllByType('form')
          .find(form => form.findAllByType('button').some(button => directText(button).startsWith('Subir')));
        await act(async () => sundayUploadForm.props.onSubmit({ preventDefault() {} }));
        assert.deepEqual(uploads, [
          { url: '/api/prospects/101/daily-advances', date: '2026-10-31' },
          { url: '/api/prospects/101/daily-advances', date: '2026-11-01' }
        ]);
      }

      await act(async () => {
        galleryTab.props.onClick();
      });
      assert.equal(renderer.root.findAllByProps({ title: 'Eliminar foto' }).length, count);
    }
  } finally {
    if (renderer) {
      await act(async () => renderer.unmount());
    }
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    globalThis.FormData = originalFormData;
    if (originalCreateObjectURL === undefined) delete URL.createObjectURL;
    else URL.createObjectURL = originalCreateObjectURL;
    globalThis.fetch = originalFetch;
    await server.close();
  }
});
