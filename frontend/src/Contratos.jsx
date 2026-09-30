import React, { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || '';

export default function Contratos() {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'estimacion'
  const [selected, setSelected] = useState(null);

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

  useEffect(() => {
    fetchContratos();
  }, []);

  if (view === 'estimacion' && selected) {
    return <Estimacion prospect={selected} onBack={() => { setView('list'); setSelected(null); fetchContratos(); }} />;
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h2 style={{ marginBottom: '1rem', color: '#1e293b' }}>📄 Contratos</h2>
      {loading ? <p>Cargando contratos...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left', background: '#fafafa' }}>
              <th style={{ padding: '0.6rem' }}>ID</th>
              <th style={{ padding: '0.6rem' }}>Nombre</th>
              <th style={{ padding: '0.6rem' }}>Proyecto</th>
              <th style={{ padding: '0.6rem' }}>Fecha Contrato</th>
              <th style={{ padding: '0.6rem' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {contratos.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.6rem' }}>{c.public_id}</td>
                <td style={{ padding: '0.6rem', fontWeight: 'bold' }}>{c.name}</td>
                <td style={{ padding: '0.6rem' }}>{c.project_type}</td>
                <td style={{ padding: '0.6rem' }}>{c.contract_date ? new Date(c.contract_date + (c.contract_date.endsWith('Z') ? '' : 'Z')).toLocaleDateString() : '-'}</td>
                <td style={{ padding: '0.6rem' }}>
                  <button onClick={() => { setSelected(c); setView('estimacion'); }} style={{ padding: '5px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    📐 ESTIMACIÓN
                  </button>
                </td>
              </tr>
            ))}
            {contratos.length === 0 && (
              <tr><td colSpan="5" style={{ padding: '1rem', textAlign: 'center' }}>No hay contratos aprobados aún.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Estimacion({ prospect, onBack }) {
  const canvasRef = useRef(null);
  const [color, setColor] = useState('#000000');
  const [isDrawing, setIsDrawing] = useState(false);
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

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/api/prospects/${prospect.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimation_data: medidas })
      });
      alert('Estimación guardada');
    } catch (e) {
      alert('Error guardando');
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: '1rem' }}>
      <button onClick={onBack} style={{ marginBottom: '1rem', padding: '5px 10px', cursor: 'pointer' }}>← Volver</button>
      <h2>Estimación - {prospect.name}</h2>
      
      <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <h3>Medidas y Cotización</h3>
          <textarea 
            value={medidas}
            onChange={(e) => setMedidas(e.target.value)}
            style={{ width: '100%', height: '300px', padding: '0.5rem', borderRadius: '5px', border: '1px solid #ccc' }}
            placeholder="Anota aquí las medidas y la cotización en vivo..."
          />
          <button onClick={handleSave} disabled={saving} style={{ marginTop: '1rem', padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            {saving ? 'Guardando...' : 'Guardar Datos'}
          </button>
        </div>
        
        <div style={{ flex: '1 1 400px' }}>
          <h3>Dibujo de Guía (Croquis)</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            Color: <input type="color" value={color} onChange={e => setColor(e.target.value)} />
            <button onClick={() => {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }} style={{ marginLeft: '1rem' }}>Limpiar Lienzo</button>
          </div>
          <canvas
            ref={canvasRef}
            width={500}
            height={400}
            style={{ border: '1px solid #000', cursor: 'crosshair', background: '#fff', touchAction: 'none' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
          />
        </div>
      </div>
    </div>
  );
}
