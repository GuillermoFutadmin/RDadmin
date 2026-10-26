import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeValuationRows, normalizeValuationSheets } from './valuationRows.js';

test('duplicate or missing row IDs cannot link material quantities', () => {
  const rows = [
    { id: 100, desc: 'Tablero A', qty: '', price: 100, unit: 'pza' },
    { id: 100, desc: 'Tablero B', qty: 2, price: 200, unit: 'pza' },
    { desc: 'Tablero C', qty: 3, price: 300 },
    { desc: 'Tablero D', qty: 4, price: 400 },
  ];
  const original = structuredClone(rows);
  const normalized = normalizeValuationRows(rows);
  assert.equal(new Set(normalized.map(row => String(row.id))).size, 4);
  assert.equal(normalized[0].id, 100);
  assert.deepEqual(rows, original);
  normalized.forEach((row, index) => {
    const { id, ...fields } = row;
    const { id: oldId, ...oldFields } = original[index];
    assert.deepEqual(fields, oldFields);
  });

  for (let target = 0; target < normalized.length; target++) {
    const changed = normalized.map(row => row.id === normalized[target].id ? { ...row, qty: '7' } : row);
    assert.deepEqual(changed.map(row => row.qty), normalized.map((row, index) => index === target ? '7' : row.qty));
    const saved = structuredClone(normalized);
    saved.find(row => row.id === normalized[target].id).qty = '9';
    assert.deepEqual(saved.map(row => row.qty), normalized.map((row, index) => index === target ? '9' : row.qty));
    assert.equal(normalized.filter(row => row.id !== normalized[target].id).length, normalized.length - 1);
  }
});

test('numeric and string IDs also remain distinct React keys after repair', () => {
  const rows = normalizeValuationRows([
    { id: 1 }, { id: '1' }, { id: '' }, { id: ' ' }, { id: null }, { id: Infinity }, { id: 0 },
  ]);
  assert.equal(new Set(rows.map(row => String(row.id))).size, rows.length);
  assert.equal(rows[0].id, 1);
  assert.equal(rows.at(-1).id, 0);
  assert.ok(rows.slice(1, -1).every(row => typeof row.id === 'string' && row.id.trim()));
});

test('valid saved row identities survive normalization, save and reload', () => {
  const rows = normalizeValuationRows([{ id: 4, qty: 0 }, { id: 4, qty: '' }, { id: 'stable', qty: '2.5' }]);
  assert.deepEqual(normalizeValuationRows(JSON.parse(JSON.stringify(rows))), rows);
  assert.deepEqual(normalizeValuationRows(), []);
});

test('all sheets and sections repair IDs without changing prices, quantities, totals or metadata', () => {
  const section = [
    { id: 10, desc: 'A', qty: 2, price: 100, unit: 'par' },
    { id: 10, desc: 'B', qty: 3, price: 50, unit: 'pza' },
  ];
  const original = [
    { type: 'Cocina', note: 'Conservar', materials: section, labor: section, concepts: section },
    { type: 'Clóset', materials: section },
  ];
  const sheets = normalizeValuationSheets(original);
  assert.equal(sheets[0].type, 'Cocina');
  assert.equal(sheets[0].note, 'Conservar');
  for (const sheet of sheets) for (const key of ['materials', 'labor', 'concepts']) {
    const rows = sheet[key];
    assert.equal(new Set(rows.map(row => String(row.id))).size, rows.length);
    if (rows.length) assert.equal(rows.reduce((total, row) => total + row.qty * row.price, 0), 350);
  }
  assert.deepEqual(sheets[1].labor, []);
  assert.deepEqual(sheets[1].concepts, []);
  assert.equal(original[0].materials[1].id, 10);
  assert.deepEqual(normalizeValuationSheets(JSON.parse(JSON.stringify(sheets))), sheets);
});
