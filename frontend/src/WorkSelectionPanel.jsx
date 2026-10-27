import React from 'react';
import { getSheetPrice, workId } from './workSelection';
import { parseStoredData } from './productionWorkItems';

export default function WorkSelectionPanel({ prospect, sheets, margin, selectedIds, onChange, disabled = false }) {
  const production = parseStoredData(prospect.production_data);
  const items = Array.isArray(production.work_items) ? production.work_items : [];
  const format = value => value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  return (
    <div className="no-print" style={{ marginBottom: 12, padding: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8 }}>
      <strong style={{ color: '#1e40af' }}>Seleccionar trabajos para este contrato</strong>
      <p style={{ margin: '5px 0 10px', fontSize: '0.8rem', color: '#475569' }}>
        El contrato y sus pagos consideran solo los seleccionados. Los demás conservan su valoración y permanecen pendientes en Contratos; la cotización no cambia.
      </p>
      {sheets.map((sheet, index) => {
        const id = workId(index);
        const started = items.some(item => item.id === id && ['PRODUCCION', 'ENTREGADO'].includes(item.status));
        return (
          <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: '1px solid #dbeafe' }}>
            <input type="checkbox" checked={selectedIds.includes(id)} disabled={disabled || started}
              onChange={() => onChange(selectedIds.includes(id) ? selectedIds.filter(value => value !== id) : [...selectedIds, id])} />
            <span style={{ flex: 1 }}>#{index + 1} {sheet.type || 'Proyecto'}{started ? ' (ya en producción)' : ''}</span>
            <strong>{format(getSheetPrice(sheet, margin))}</strong>
          </label>
        );
      })}
      {!selectedIds.length && <p role="alert" style={{ color: '#b91c1c', marginBottom: 0 }}>Selecciona al menos un trabajo para guardar.</p>}
    </div>
  );
}
