import React, { useState, useEffect } from 'react';

const API = '';

const PIPELINE_STAGES = [
  { key: 'APROBADO',     label: 'Aprobado',      icon: '✅', color: '#166534', bg: '#dcfce7', border: '#86efac' },
  { key: 'RENDER SI/NO', label: 'Render SI/NO',  icon: '🎨', color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  { key: 'ESTIMACIÓN',   label: 'Estimación',    icon: '📐', color: '#3730a3', bg: '#e0e7ff', border: '#a5b4fc' },
  { key: 'CONTRATO',     label: 'Contrato',      icon: '📄', color: '#9d174d', bg: '#fce7f3', border: '#f9a8d4' },
];

function getStatus(c) {
  const validStates = ['APROBADO', 'RENDER SI/NO', 'ESTIMACIÓN', 'CONTRATO'];
  if (c.status && validStates.includes(c.status)) return c.status;
  return 'APROBADO';
}

function Dashboard() {
  const [prospectsCount, setProspectsCount] = useState(null);
  const [contratos, setContratos] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/prospects`)
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => {
        const all = Array.isArray(data) ? data : [];
        setProspectsCount(all.filter(p => !p.is_contract).length);
        setContratos(all.filter(p => p.is_contract));
      })
      .catch(() => { setProspectsCount(0); setContratos([]); });
  }, []);

  const stageCounts = PIPELINE_STAGES.map(st => ({
    ...st,
    count: contratos ? contratos.filter(c => getStatus(c) === st.key).length : null,
  }));

  const totalClientes = contratos ? contratos.length : null;

  return (
    <section style={{
      display: 'flex', flexWrap: 'wrap', gap: '1.5rem',
      padding: '1.5rem', alignItems: 'flex-start'
    }}>

      {/* ── Tarjeta Prospectos ── */}
      <div style={{
        background: 'white', borderRadius: '16px', padding: '2rem 2.5rem',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)', textAlign: 'center',
        border: '2px solid #f1f5f9', minWidth: '200px',
        borderTop: '4px solid #ba4b24'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👥</div>
        <h3 style={{ color: '#555', marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600' }}>Total Prospectos</h3>
        <p style={{ fontSize: '2.8rem', fontWeight: '800', color: '#ba4b24', margin: 0 }}>
          {prospectsCount === null ? '...' : prospectsCount}
        </p>
      </div>

      {/* ── Tarjeta Clientes con Pipeline ── */}
      <div style={{
        background: 'white', borderRadius: '16px', padding: '1.5rem',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        border: '2px solid #f1f5f9', minWidth: '340px', flex: 1, maxWidth: '600px',
        borderTop: '4px solid #7c3aed'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.8rem' }}>📋</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1e293b' }}>Clientes</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Estado del proceso</div>
            </div>
          </div>
          <div style={{
            background: '#f5f3ff', borderRadius: '12px', padding: '0.4rem 1rem',
            fontWeight: '800', fontSize: '2rem', color: '#7c3aed', lineHeight: 1
          }}>
            {totalClientes === null ? '...' : totalClientes}
          </div>
        </div>

        {/* Stages grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {stageCounts.map(st => (
            <div key={st.key} style={{
              background: st.bg, border: `1.5px solid ${st.border}`,
              borderRadius: '10px', padding: '0.75rem 1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{st.icon}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: st.color }}>{st.label}</span>
              </div>
              <span style={{
                fontSize: '1.5rem', fontWeight: '800', color: st.color,
                background: 'rgba(255,255,255,0.6)', borderRadius: '8px',
                padding: '0.1rem 0.5rem', minWidth: '2rem', textAlign: 'center'
              }}>
                {st.count === null ? '–' : st.count}
              </span>
            </div>
          ))}
        </div>

        {/* Total bar */}
        {contratos && contratos.length > 0 && (
          <div style={{
            marginTop: '1rem', background: '#f8fafc', borderRadius: '8px',
            padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', borderTop: '2px solid #e2e8f0'
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>Total en proceso</span>
            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>
              {stageCounts.reduce((s, st) => s + (st.count || 0), 0)}
            </span>
          </div>
        )}
      </div>

    </section>
  );
}

export default Dashboard;
