import React from 'react';

export default function ProspectWorkSelection({ works, selectedIds, onSelect, onAction, busy, error }) {
  return (
    <section data-guide="quote-selection" className="no-print" style={{ margin: '16px 0', padding: 16, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10 }}>
      <h3 style={{ margin: '0 0 8px' }}>Trabajos para cotizar</h3>
      <p>Selecciona solo lo que pidió cotizar. Los demás permanecen en Prospectos. Pausar conserva la valoración; eliminar retira el trabajo de este flujo.</p>
      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      {works.map(item => (
        <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '9px 0', borderTop: '1px solid #cbd5e1' }}>
          <label style={{ flex: 1 }}>
            <input type="checkbox" disabled={busy || item.status !== 'ACTIVE'} checked={selectedIds.includes(item.id)}
              onChange={() => onSelect(selectedIds.includes(item.id) ? selectedIds.filter(id => id !== item.id) : [...selectedIds, item.id])} />
            {' '}{item.name} — {item.price.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
          </label>
          <span>{({ ACTIVE: 'Disponible', PAUSED: 'Pausado', DELETED: 'Eliminado', TRANSFERRED: `En Clientes ${item.publicId || ''}` })[item.status]}</span>
          {['ACTIVE', 'PAUSED'].includes(item.status) && <>
            <button type="button" disabled={busy} onClick={() => onAction(item.status === 'PAUSED' ? 'resume' : 'pause', item)}>{item.status === 'PAUSED' ? 'Retomar' : 'Pausar'}</button>
            <button type="button" disabled={busy} onClick={() => onAction('delete', item)} style={{ color: '#b91c1c' }}>Eliminar trabajo</button>
          </>}
        </div>
      ))}
      {!selectedIds.length && <p>Selecciona al menos un trabajo para guardar la cotización.</p>}
    </section>
  );
}
