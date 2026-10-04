import React, { useState, useEffect } from 'react';

const API = '';

const CLIENT_STAGES = [
  { key: 'APROBADO',     label: 'Aprobado',     icon: '✅', color: '#166534', bg: '#dcfce7', border: '#86efac' },
  { key: 'RENDER SI/NO', label: 'Render',        icon: '🎨', color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  { key: 'ESTIMACIÓN',   label: 'Estimación',   icon: '📐', color: '#3730a3', bg: '#e0e7ff', border: '#a5b4fc' },
  { key: 'CONTRATO',     label: 'Contrato',     icon: '📄', color: '#9d174d', bg: '#fce7f3', border: '#f9a8d4' },
];

const PROSPECT_STAGES = [
  { key: 'Prospecto',   label: 'Nuevo',        icon: '🆕', color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
  { key: 'Valoración',  label: 'Valoración',    icon: '📊', color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  { key: 'Cotización',  label: 'Cotización',    icon: '💰', color: '#14532d', bg: '#f0fdf4', border: '#86efac' },
  { key: 'papelera',    label: 'Papelera',      icon: '🗑️', color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
];

function getClientStatus(c) {
  const valid = ['APROBADO', 'RENDER SI/NO', 'ESTIMACIÓN', 'CONTRATO'];
  if (c.status && valid.includes(c.status)) return c.status;
  return 'APROBADO';
}

// Compact counter badge
function CountBadge({ count, color, bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: '1.6rem', height: '1.6rem', borderRadius: '6px',
      background: bg, color, fontWeight: '800', fontSize: '0.88rem',
      padding: '0 0.35rem'
    }}>
      {count === null ? '–' : count}
    </span>
  );
}

function Dashboard() {
  const [prospects, setProspects] = useState(null);
  const [contratos, setContratos] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/prospects`)
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => {
        const all = Array.isArray(data) ? data : [];
        setProspects(all.filter(p => !p.is_contract));
        setContratos(all.filter(p => p.is_contract));
      })
      .catch(() => { setProspects([]); setContratos([]); });
  }, []);

  // Prospect state counts
  const prospectStages = PROSPECT_STAGES.map(st => ({
    ...st,
    count: prospects
      ? st.key === 'papelera'
        ? prospects.filter(p => p.is_papelera).length
        : st.key === 'Valoración'
          ? prospects.filter(p => !p.is_papelera && (p.status === 'Valoración' || p.status === 'Valoracion')).length
          : prospects.filter(p => !p.is_papelera && (p.status === st.key || (!p.status && st.key === 'Prospecto'))).length
      : null,
  }));
  const totalProspects = prospects ? prospects.length : null;

  // Client pipeline counts
  const clientStages = CLIENT_STAGES.map(st => ({
    ...st,
    count: contratos ? contratos.filter(c => getClientStatus(c) === st.key).length : null,
  }));
  const totalClientes = contratos ? contratos.length : null;

  const cardStyle = {
    background: 'white', borderRadius: '14px', padding: '1rem 1.2rem',
    boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
    border: '1.5px solid #f1f5f9',
  };

  return (
    <section style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '1.5rem', alignItems: 'flex-start' }}>

      {/* ── Tarjeta Prospectos ── */}
      <div style={{ ...cardStyle, borderTop: '4px solid #ba4b24', minWidth: '220px', flex: '0 0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.4rem' }}>👥</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>Prospectos</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Estado actual</div>
            </div>
          </div>
          <span style={{
            background: '#fff1ec', borderRadius: '10px', padding: '0.25rem 0.75rem',
            fontWeight: '800', fontSize: '1.6rem', color: '#ba4b24', lineHeight: 1
          }}>
            {totalProspects === null ? '...' : totalProspects}
          </span>
        </div>

        {/* Contadores por estado */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {prospectStages.map(st => (
            <div key={st.key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.3rem 0.6rem', borderRadius: '8px',
              background: st.bg, border: `1px solid ${st.border}`
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: st.color, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>{st.icon}</span>{st.label}
              </span>
              <CountBadge count={st.count} color={st.color} bg="rgba(255,255,255,0.65)" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Tarjeta Clientes ── */}
      <div style={{ ...cardStyle, borderTop: '4px solid #7c3aed', minWidth: '220px', flex: '0 0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.4rem' }}>📋</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>Clientes</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Estado del proceso</div>
            </div>
          </div>
          <span style={{
            background: '#f5f3ff', borderRadius: '10px', padding: '0.25rem 0.75rem',
            fontWeight: '800', fontSize: '1.6rem', color: '#7c3aed', lineHeight: 1
          }}>
            {totalClientes === null ? '...' : totalClientes}
          </span>
        </div>

        {/* Pipeline stages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {clientStages.map(st => (
            <div key={st.key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.3rem 0.6rem', borderRadius: '8px',
              background: st.bg, border: `1px solid ${st.border}`
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: st.color, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>{st.icon}</span>{st.label}
              </span>
              <CountBadge count={st.count} color={st.color} bg="rgba(255,255,255,0.65)" />
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}

export default Dashboard;
