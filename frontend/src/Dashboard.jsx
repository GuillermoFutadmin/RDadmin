import React, { useState, useEffect } from 'react';
import { IconUsers, IconCheckCircle, IconPalette, IconRuler, IconFileText, IconPlusCircle, IconTrendingUp, IconTrash } from './icons';

const API = '';

const CLIENT_STAGES = [
  { key: 'APROBADO',     label: 'Aprobado',     icon: IconCheckCircle, color: '#166534', bg: '#dcfce7', border: '#86efac' },
  { key: 'RENDER SI/NO', label: 'Render',       icon: IconPalette, color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  { key: 'ESTIMACIÓN',   label: 'Estimación',   icon: IconRuler, color: '#3730a3', bg: '#e0e7ff', border: '#a5b4fc' },
  { key: 'CONTRATO',     label: 'Contrato',     icon: IconFileText, color: '#9d174d', bg: '#fce7f3', border: '#f9a8d4' },
];

const PROSPECT_STAGES = [
  { key: 'Prospecto',   label: 'Nuevo',        icon: IconPlusCircle, color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
  { key: 'Valoración',  label: 'Valoración',   icon: IconTrendingUp, color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  { key: 'Cotización',  label: 'Cotización',   icon: IconFileText, color: '#14532d', bg: '#f0fdf4', border: '#86efac' },
  { key: 'papelera',    label: 'Papelera',     icon: IconTrash, color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
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
  const [hoveredStage, setHoveredStage] = useState(null);

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
  const prospectStages = PROSPECT_STAGES.map(st => {
    let filtered = [];
    if (prospects) {
      if (st.key === 'papelera') filtered = prospects.filter(p => p.is_papelera);
      else if (st.key === 'Valoración') filtered = prospects.filter(p => !p.is_papelera && (p.status === 'Valoración' || p.status === 'Valoracion'));
      else filtered = prospects.filter(p => !p.is_papelera && (p.status === st.key || (!p.status && st.key === 'Prospecto')));
    }
    return {
      ...st,
      count: prospects ? filtered.length : null,
      items: filtered
    };
  });
  const totalProspects = prospects ? prospects.length : null;

  // Client pipeline counts
  const clientStages = CLIENT_STAGES.map(st => {
    let filtered = [];
    if (contratos) {
      filtered = contratos.filter(c => getClientStatus(c) === st.key);
    }
    return {
      ...st,
      count: contratos ? filtered.length : null,
      items: filtered
    };
  });
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
            <IconUsers style={{ width:'22px', height:'22px', marginRight:0, color:'#ba4b24' }} />
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>Prospectos</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Prospectos</div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Totales</div>
            <span style={{
              background: '#fff1ec', borderRadius: '10px', padding: '0.1rem 0.75rem',
              fontWeight: '800', fontSize: '1.6rem', color: '#ba4b24', lineHeight: 1, display: 'block'
            }}>
              {totalProspects === null ? '...' : totalProspects}
            </span>
          </div>
        </div>

        {/* Contadores por estado */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {prospectStages.map(st => (
            <div key={st.key}
              onMouseEnter={() => setHoveredStage(`prospect-${st.key}`)}
              onMouseLeave={() => setHoveredStage(null)}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.3rem 0.6rem', borderRadius: '8px',
                background: st.bg, border: `1px solid ${st.border}`
              }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: st.color, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <st.icon style={{ width:'14px', height:'14px', marginRight:0, flexShrink:0 }} />{st.label}
              </span>
              <CountBadge count={st.count} color={st.color} bg="rgba(255,255,255,0.65)" />
              
              {/* Tooltip personalizado */}
              {hoveredStage === `prospect-${st.key}` && st.items.length > 0 && (
                <div style={{
                  position: 'absolute', top: 0, left: '105%', zIndex: 100,
                  background: '#1e293b', color: 'white', borderRadius: '12px', padding: '1rem',
                  minWidth: '220px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '800', marginBottom: '0.5rem', borderBottom: '1px solid #334155', paddingBottom: '0.4rem' }}>{st.label} ({st.items.length})</div>
                  {st.items.map((item, idx) => (
                    <div key={item.id || idx} style={{ marginBottom: idx === st.items.length - 1 ? 0 : '0.6rem' }}>
                      <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'white' }}>{item.name || 'Sin nombre'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{item.project_type || 'Proyecto sin definir'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Registrado: {new Date(item.created_at).toLocaleDateString('es-MX', { year:'numeric', month:'short', day:'numeric' })}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Tarjeta Clientes ── */}
      <div style={{ ...cardStyle, borderTop: '4px solid #7c3aed', minWidth: '220px', flex: '0 0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconFileText style={{ width:'22px', height:'22px', marginRight:0, color:'#7c3aed' }} />
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>Clientes</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Clientes</div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Totales</div>
            <span style={{
              background: '#f5f3ff', borderRadius: '10px', padding: '0.1rem 0.75rem',
              fontWeight: '800', fontSize: '1.6rem', color: '#7c3aed', lineHeight: 1, display: 'block'
            }}>
              {totalClientes === null ? '...' : totalClientes}
            </span>
          </div>
        </div>

        {/* Pipeline stages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {clientStages.map(st => (
            <div key={st.key}
              onMouseEnter={() => setHoveredStage(`client-${st.key}`)}
              onMouseLeave={() => setHoveredStage(null)}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.3rem 0.6rem', borderRadius: '8px',
                background: st.bg, border: `1px solid ${st.border}`
              }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: st.color, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <st.icon style={{ width:'14px', height:'14px', marginRight:0, flexShrink:0 }} />{st.label}
              </span>
              <CountBadge count={st.count} color={st.color} bg="rgba(255,255,255,0.65)" />

              {/* Tooltip personalizado */}
              {hoveredStage === `client-${st.key}` && st.items.length > 0 && (
                <div style={{
                  position: 'absolute', top: 0, left: '105%', zIndex: 100,
                  background: '#1e293b', color: 'white', borderRadius: '12px', padding: '1rem',
                  minWidth: '220px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '800', marginBottom: '0.5rem', borderBottom: '1px solid #334155', paddingBottom: '0.4rem' }}>{st.label} ({st.items.length})</div>
                  {st.items.map((item, idx) => (
                    <div key={item.id || idx} style={{ marginBottom: idx === st.items.length - 1 ? 0 : '0.6rem' }}>
                      <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'white' }}>{item.name || 'Sin nombre'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{item.project_type || 'Proyecto sin definir'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Registrado: {new Date(item.created_at).toLocaleDateString('es-MX', { year:'numeric', month:'short', day:'numeric' })}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}

export default Dashboard;
