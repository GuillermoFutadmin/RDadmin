export function normalizeValuationRows(rows = []) {
  const validId = id => (typeof id === 'string' && id.trim() !== '') ||
    (typeof id === 'number' && Number.isFinite(id));
  const reserved = new Set(rows.filter(row => validId(row.id)).map(row => String(row.id)));
  const seen = new Set();
  return rows.map(row => {
    const key = String(row.id);
    if (validId(row.id) && !seen.has(key)) {
      seen.add(key);
      return row;
    }
    let id;
    do { id = crypto.randomUUID(); } while (reserved.has(id));
    reserved.add(id);
    seen.add(id);
    return { ...row, id };
  });
}

export function normalizeValuationSheets(sheets) {
  return sheets.map(sheet => ({
    ...sheet,
    materials: normalizeValuationRows(sheet.materials),
    labor: normalizeValuationRows(sheet.labor),
    concepts: normalizeValuationRows(sheet.concepts),
  }));
}
