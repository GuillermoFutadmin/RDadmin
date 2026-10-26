import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('quotation document renders only the quoted scope, while controls keep pending work', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { CotizacionView } = await server.ssrLoadModule('/src/Cotizacion.jsx');
    const prospect = {
      id: 999997, name: 'Prueba cascada', project_type: 'Cocina, Closet, Puertas',
      has_quote: true, quote_title: 'FABRICACIÓN DE CLOSET', quote_description: 'Fabricación de Closet.',
      valuation_data: JSON.stringify({ globalMargin: 30, sheets: [
        { type: 'Cocina', materials: [{ id: 1, qty: 1, price: 10000 }] },
        { type: 'Closet', labor: [{ id: 1, qty: 2, price: 2500 }] },
        { type: 'Puertas', concepts: [{ id: 1, qty: 3, price: 1000 }] }
      ] }),
      work_flow: JSON.stringify({ quoted: ['work-2'], items: { 'work-3': { status: 'PAUSED' } } })
    };
    const html = renderToStaticMarkup(React.createElement(CotizacionView, { prospect }));
    const document = html.slice(html.indexOf('id="cotizacion-doc"'));
    assert.match(html, /Trabajos para cotizar/);
    assert.match(html, /Pausado/);
    assert.match(html, /Retomar/);
    assert.match(document, /value="6,500.00"/);
    assert.match(document, /#1 Closet/);
    assert.doesNotMatch(document, /Cocina|Puertas/);
    assert.match(document, /\$3,900.00/);
    assert.match(document, /\$2,600.00/);
  } finally {
    await server.close();
  }
});

test('valuation shows individual removal and excludes deleted or transferred sheets from totals', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { ValuationModal } = await server.ssrLoadModule('/src/Prospects.jsx');
    const prospect = {
      name: 'Cliente prueba',
      valuation_data: JSON.stringify({ globalMargin: 0, sheets: [
        { type: 'Cocina', materials: [{ id: 1, qty: 1, price: 10000 }] },
        { type: 'Closet', labor: [{ id: 1, qty: 2, price: 2500 }] },
        { type: 'Puertas', concepts: [{ id: 1, qty: 3, price: 1000 }] }
      ] })
    };
    const render = p => renderToStaticMarkup(React.createElement(ValuationModal, { prospect: p }));
    const initial = render(prospect);
    assert.match(initial, /Eliminar valoración de Cocina/);
    assert.match(initial, /\$18,000.00/);
    const remaining = render({ ...prospect, work_flow: JSON.stringify({ items: {
      'work-1': { status: 'DELETED' }, 'work-2': { status: 'TRANSFERRED' }
    } }) });
    assert.match(remaining, /Eliminar valoración de Puertas/);
    assert.match(remaining, /\$3,000.00/);
    assert.doesNotMatch(remaining, /Cocina|Closet|\$18,000.00/);
    const contract = render({ ...prospect, is_contract: true });
    assert.doesNotMatch(contract, /Eliminar valoración/);
    const empty = render({ ...prospect, work_flow: JSON.stringify({ items: {
      'work-1': { status: 'DELETED' }, 'work-2': { status: 'DELETED' }, 'work-3': { status: 'DELETED' }
    } }) });
    assert.match(empty, /No quedan valoraciones pendientes/);
    assert.doesNotMatch(empty, /Eliminar valoración/);
  } finally {
    await server.close();
  }
});

test('contract export treats stored markup as text instead of executable HTML', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { ContratoPDFView } = await server.ssrLoadModule('/src/ContratoPDF.jsx');
    const payload = '<img src=x onerror="testOnly()">\n<script>testOnly()</script>';
    const html = renderToStaticMarkup(React.createElement(ContratoPDFView, {
      prospect: { id: 999, name: 'Security test', quote_description: payload }
    }));
    assert.ok(html.includes('&lt;img'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.doesNotMatch(html, /<img src="x"|<script>testOnly|<img src=x/);
  } finally {
    await server.close();
  }
});
