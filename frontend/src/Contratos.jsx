import React, { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || '';

export default function Contratos() {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');   // 'list' | 'estimacion'
  const [selected, setSelected] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState('');

  const fetchContratos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/prospects`);
      const data = await res.json();
      setContratos(data.filter(p => p.is_contract));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchContratos(); }, []);

  if (view === 'estimacion' && selected) {
    return <Estimacion prospect={selected} onBack={() => { setView('list'); setSelected(null); fetchContratos(); }} />;
  }

  const txt = filterText.toLowerCase().trim();
  const filtered = contratos.filter(c => {
    if (txt && !(
      (c.name || '').toLowerCase().includes(txt) ||
      (c.public_id || '').toLowerCase().includes(txt) ||
      (c.contact_info || '').toLowerCase().includes(txt) ||
      (c.project_type || '').toLowerCase().includes(txt)
    )) return false;
    if (filterType && c.project_type !== filterType) return false;
    return true;
  });

  const typeOptions = [...new Set(contratos.map(c => c.project_type).filter(Boolean))];

  const fmtDate = (d) => {
    if (!d) return '-';
    return new Date(d + (d.endsWith('Z') ? '' : 'Z')).toLocaleDateString('es-MX', {
      timeZone: 'America/Tijuana', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const statusBadge = (s) => {
    const isP = !s || s === 'New' || s === 'Prospecto';
    const isV = s === 'Valoración' || s === 'Valoracion';
    const isC = s === 'Cotización';
    const label = isP ? 'Prospecto' : isV ? 'Valoración' : 'Cotización';
    const bg = isP ? '#eff6ff' : isV ? '#fef3c7' : '#dcfce7';
    const color = isP ? '#1e40af' : isV ? '#92400e' : '#14532d';
    const dot = isP ? '#3b82f6' : isV ? '#f59e0b' : '#22c55e';
    return (
      <span style={{ background: bg, color, padding: '0.2rem 0.65rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
        {label}
      </span>
    );
  };

  return (
    <div style={{ padding: '1rem' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.4rem', fontWeight: '800' }}>📄 Contratos</h2>
          <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>Proyectos aprobados y en proceso</p>
        </div>
        <div style={{ background: '#1e293b', color: 'white', borderRadius: '10px', padding: '0.5rem 1.2rem', fontWeight: '700', fontSize: '1.1rem' }}>
          {contratos.length} contrato{contratos.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', marginBottom: '1.2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 220px' }}>
          <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>Buscar</label>
          <input value={filterText} onChange={e => setFilterText(e.target.value)}
            placeholder="Nombre, ID, contacto..."
            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '0.87rem' }} />
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>Tipo de Proyecto</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{ width: '100%', padding: '7px 8px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '0.87rem' }}>
            <option value="">Todos</option>
            {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {(txt || filterType) && (
          <button onClick={() => { setFilterText(''); setFilterType(''); }}
            style={{ padding: '7px 14px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '7px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', alignSelf: 'flex-end' }}>
            ✕ Limpiar
          </button>
        )}
        <div style={{ width: '100%', fontSize: '0.77rem', color: '#94a3b8' }}>
          {filtered.length} de {contratos.length} contrato{contratos.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <p style={{ color: '#64748b' }}>Cargando contratos...</p>
      ) : (
        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '10px', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left', background: '#fafafa' }}>
                {['ID','Nombre','Proyecto','Contacto','F. Contrato','Material','Estado','Acciones'].map(h => (
                  <th key={h} style={{ padding: '0.6rem 0.8rem', fontSize: '0.82rem', color: '#64748b', fontWeight: '700' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}
                  style={{ borderBottom: '1px solid #f0f0f0', transition: 'background 0.1s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fffbf7'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                  <td style={{ padding: '0.7rem 0.8rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>{c.public_id}</td>
                  <td style={{ padding: '0.7rem 0.8rem', fontWeight: '600', color: '#1e293b' }}>{c.name}</td>
                  <td style={{ padding: '0.7rem 0.8rem', fontSize: '0.9rem', color: '#475569' }}>{c.project_type || '-'}</td>
                  <td style={{ padding: '0.7rem 0.8rem', fontSize: '0.9rem' }}>{c.contact_info || '-'}</td>
                  <td style={{ padding: '0.7rem 0.8rem', fontSize: '0.85rem', color: '#64748b' }}>{fmtDate(c.contract_date)}</td>
                  <td style={{ padding: '0.7rem 0.8rem', fontSize: '0.88rem' }}>
                    {c.material_type_2 ? `${c.material_type} + ${c.material_type_2}` : (c.material_type || '-')}
                  </td>
                  <td style={{ padding: '0.7rem 0.8rem' }}>{statusBadge(c.status)}</td>
                  <td style={{ padding: '0.7rem 0.8rem' }}>
                    <button onClick={() => { setSelected(c); setView('estimacion'); }}
                      style={{ padding: '0.35rem 0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      📐 Estimación
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                    {contratos.length === 0 ? 'No hay contratos aprobados aún.' : 'Ningún contrato coincide con los filtros.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── ESTIMACIÓN ─────────────────── */
function Estimacion({ prospect, onBack }) {
  const canvasRef = useRef(null);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [medidas, setMedidas] = useState(prospect.estimation_data || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = erasing ? '#ffffff' : color;
    ctx.lineWidth = erasing ? 20 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/api/prospects/${prospect.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimation_data: medidas })
      });
      alert('✅ Estimación guardada correctamente');
    } catch {
      alert('Error guardando');
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: '1rem', minHeight: '100vh' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack}
          style={{ padding: '0.4rem 0.9rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '7px', cursor: 'pointer', fontWeight: '600', fontSize: '0.87rem' }}>
          ← Volver
        </button>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.3rem', fontWeight: '800' }}>📐 Estimación · {prospect.name}</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.83rem' }}>{prospect.project_type} · {prospect.public_id}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {/* ── Left: medidas y cotización ── */}
        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1rem' }}>
            <h3 style={{ margin: '0 0 0.8rem', color: '#1e293b', fontSize: '1rem', fontWeight: '700' }}>📏 Medidas y Cotización en Vivo</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.8rem' }}>
              {[
                { label: 'Ancho (cm)' }, { label: 'Alto (cm)' },
                { label: 'Profundo (cm)' }, { label: 'Módulos' },
                { label: 'Material' }, { label: 'Precio Estimado ($)' }
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '2px' }}>{f.label}</label>
                  <input type="text" style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.87rem', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>Notas adicionales / Conceptos</label>
            <textarea
              value={medidas}
              onChange={e => setMedidas(e.target.value)}
              rows={10}
              style={{ width: '100%', padding: '8px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '0.88rem', resize: 'vertical', boxSizing: 'border-box' }}
              placeholder="Escribe medidas, conceptos de materiales, mano de obra, subtotales..."
            />
          </div>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '0.75rem', background: saving ? '#94a3b8' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.95rem' }}>
            {saving ? 'Guardando...' : '💾 Guardar Estimación'}
          </button>
        </div>

        {/* ── Right: Drawing canvas ── */}
        <div style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1rem' }}>
            <h3 style={{ margin: '0 0 0.8rem', color: '#1e293b', fontSize: '1rem', fontWeight: '700' }}>✏️ Croquis y Dibujo de Guía</h3>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#64748b' }}>Color:</label>
                <input type="color" value={color} onChange={e => { setColor(e.target.value); setErasing(false); }}
                  style={{ width: '36px', height: '30px', padding: '2px', border: '1px solid #e2e8f0', borderRadius: '5px', cursor: 'pointer' }} />
              </div>
              {/* Quick color buttons */}
              {['#000000','#e11d48','#2563eb','#16a34a','#f59e0b','#7c3aed'].map(c => (
                <button key={c} onClick={() => { setColor(c); setErasing(false); }}
                  style={{ width: '24px', height: '24px', background: c, border: color === c && !erasing ? '3px solid #0f172a' : '2px solid transparent', borderRadius: '50%', cursor: 'pointer', padding: 0 }} />
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#64748b' }}>Grosor:</label>
                <select value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))}
                  style={{ padding: '3px 6px', borderRadius: '5px', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                  {[1,2,4,6,10].map(n => <option key={n} value={n}>{n}px</option>)}
                </select>
              </div>
              <button onClick={() => setErasing(prev => !prev)}
                style={{ padding: '0.3rem 0.7rem', background: erasing ? '#f59e0b' : '#f1f5f9', border: `1px solid ${erasing ? '#d97706' : '#e2e8f0'}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
                {erasing ? '🩹 Borrando' : '🧹 Borrador'}
              </button>
              <button onClick={clearCanvas}
                style={{ padding: '0.3rem 0.7rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
                🗑 Limpiar
              </button>
            </div>
            <canvas
              ref={canvasRef}
              width={800}
              height={520}
              style={{ border: '1px solid #e2e8f0', cursor: erasing ? 'cell' : 'crosshair', background: '#fff', width: '100%', borderRadius: '6px', touchAction: 'none' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
