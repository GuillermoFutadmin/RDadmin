import React, { useEffect, useMemo, useState } from 'react';
import { ContratoDetail } from './Contratos';

const API = import.meta.env.VITE_API_URL || '';
const STAGE_NAMES = [
  'Producción',
  'Generando información',
  'Preparación de materiales',
  'Producción iniciada',
  'Avance 1',
  'Avance 2 / revisión',
  'Entrega del proyecto'
];

const parseJson = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

const normalizeProduction = (value) => {
  const production = parseJson(value);
  if (!Array.isArray(production.stages)) return { ...production, stages: [] };
  if (production.stages.length === STAGE_NAMES.length - 1) {
    const enteredAt = production.started_at || production.stages[0]?.entered_at || null;
    return {
      ...production,
      current_stage: (Number.isInteger(production.current_stage) ? production.current_stage : 0) + 1,
      stages: [
        { name: STAGE_NAMES[0], entered_at: enteredAt, note: '', photos: [] },
        ...production.stages.map((stage, index) => ({ ...stage, name: STAGE_NAMES[index + 1] }))
      ]
    };
  }
  return production;
};

const formatDate = (value) => value
  ? new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Pendiente';

const imageUrl = (url) => url?.startsWith('http') || url?.startsWith('data:') ? url : `${API}${url || ''}`;

function InfoCard({ label, children }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <div style={{ minWidth: 0, padding: '0.85rem 1rem', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}>
      <div style={{ color: '#2563a8', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      <div style={{ color: '#263449', fontSize: '0.88rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{children}</div>
    </div>
  );
}

function Pedidos() {
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeStage, setActiveStage] = useState(0);
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showTechnicalSheet, setShowTechnicalSheet] = useState(false);
  const [stageFilter, setStageFilter] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/prospects`);
      if (!response.ok) throw new Error(`No se pudo cargar Producción (${response.status})`);
      const data = await response.json();
      const productionProjects = data.filter(project =>
        project.is_contract && project.production_data && ['PRODUCCION', 'ENTREGADO'].includes(project.status)
      );
      setProjects(productionProjects);
      setSelectedId(current => productionProjects.some(project => project.id === current)
        ? current
        : productionProjects[0]?.id ?? null);
    } catch (error) {
      setMessage(error.message || 'Error al cargar los proyectos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return projects.filter(project => {
      const matchesQuery = !query || [project.name, project.public_id, project.project_type, project.contact_info]
        .some(value => String(value || '').toLocaleLowerCase().includes(query));
      const matchesStage = stageFilter === null || normalizeProduction(project.production_data).current_stage === stageFilter;
      return matchesQuery && matchesStage;
    });
  }, [projects, search, stageFilter]);

  const selected = projects.find(project => project.id === selectedId) || null;
  useEffect(() => { setShowTechnicalSheet(false); }, [selectedId]);
  const production = normalizeProduction(selected?.production_data);
  const stages = Array.isArray(production.stages) ? production.stages : [];
  const currentStage = Number.isInteger(production.current_stage) ? production.current_stage : 0;
  const selectedStage = stages[activeStage] || { name: STAGE_NAMES[activeStage], note: '', photos: [] };
  const estimation = parseJson(selected?.estimation_data);
  const estimationSheets = Array.isArray(estimation.sheets) ? estimation.sheets : [];
  const projectDetails = estimation.projectDetails || {};
  const allMaterials = estimationSheets.flatMap((sheet, sheetIndex) =>
    ['materials', 'labor', 'concepts'].flatMap(section =>
      (Array.isArray(sheet[section]) ? sheet[section] : []).map(item => ({
        ...item,
        sheetName: sheet.type || `Proyecto ${sheetIndex + 1}`,
        group: section === 'materials' ? 'Material' : section === 'labor' ? 'Mano de obra' : 'Concepto'
      }))
    )
  );
  const measurements = Object.entries({
    ...(selected || {}),
    ...(estimation.measures || {})
  }).filter(([key, value]) => /measurement|medida|measure/i.test(key) && value !== null && value !== undefined && value !== '');

  const persist = async (nextProduction, nextStatus) => {
    if (!selected) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${API}/api/prospects/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          production_data: JSON.stringify(nextProduction),
          ...(nextStatus ? { status: nextStatus } : {})
        })
      });
      if (!response.ok) throw new Error(`No se pudo guardar el avance (${response.status})`);
      const updated = await response.json();
      setProjects(current => current.map(project => project.id === updated.id ? updated : project));
      setMessage('Cambios guardados.');
      return updated;
    } catch (error) {
      setMessage(error.message || 'No se pudo guardar el avance.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    setActiveStage(currentStage);
    setNote(stages[currentStage]?.note || '');
  }, [selectedId, currentStage]);

  const saveNote = async () => {
    const next = { ...production, stages: stages.map((stage, index) =>
      index === activeStage ? { ...stage, note } : stage
    ) };
    await persist(next);
  };

  const advanceStage = async () => {
    if (!selected) return;
    const now = new Date().toISOString();
    if (currentStage >= STAGE_NAMES.length - 1) {
      const delivered = await persist({ ...production, delivered_at: now }, 'ENTREGADO');
      if (delivered) setMessage('Proyecto marcado como entregado.');
      return;
    }
    const nextIndex = Math.min(currentStage + 1, STAGE_NAMES.length - 1);
    const nextStages = STAGE_NAMES.map((name, index) => {
      const existing = stages[index] || { name, note: '', photos: [] };
      if (index === activeStage) return { ...existing, note };
      if (index === nextIndex && !existing.entered_at) return { ...existing, entered_at: now };
      return existing;
    });
    const updated = await persist(
      { ...production, current_stage: nextIndex, stages: nextStages },
      'PRODUCCION'
    );
    if (updated) {
      setActiveStage(nextIndex);
      setNote(nextStages[nextIndex]?.note || '');
    }
  };

  const uploadEvidence = async (file) => {
    if (!file || !selected) return;
    setSaving(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API}/api/prospects/${selected.id}/production-evidence/${activeStage}`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error(`No se pudo subir la foto (${response.status})`);
      const result = await response.json();
      const updated = { ...selected, production_data: result.production_data };
      setProjects(current => current.map(project => project.id === updated.id ? updated : project));
      setMessage('Foto agregada a esta etapa.');
    } catch (error) {
      setMessage(error.message || 'No se pudo subir la foto.');
    } finally {
      setSaving(false);
    }
  };

  const returnToClients = async () => {
    if (!selected) return;
    if (!window.confirm(`¿Regresar a ${selected.name} a Clientes para volver a generar el contrato? Se conservarán las etapas y fotos de producción.`)) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${API}/api/prospects/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONTRATO PENDIENTE' })
      });
      if (!response.ok) throw new Error(`No se pudo regresar el proyecto a Clientes (${response.status})`);
      const returnedId = selected.id;
      const remaining = projects.filter(project => project.id !== returnedId);
      setProjects(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setShowTechnicalSheet(false);
      setMessage('El proyecto regresó a Clientes en Contrato pendiente. Su historial de producción se conservó.');
    } catch (error) {
      setMessage(error.message || 'No se pudo regresar el proyecto a Clientes.');
    } finally {
      setSaving(false);
    }
  };

  const selectStage = (stageIndex) => {
    setStageFilter(stageIndex);
    const matching = stageIndex === null
      ? projects
      : projects.filter(project => normalizeProduction(project.production_data).current_stage === stageIndex);
    if (!matching.some(project => project.id === selectedId)) {
      setSelectedId(matching[0]?.id ?? null);
    }
  };

  const photoPath = (photo) => typeof photo === 'string' ? photo : photo?.url;
  const money = (value) => Number.isFinite(Number(value))
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value))
    : value;

  if (selected && showTechnicalSheet) {
    return (
      <div style={{ padding: '1rem' }}>
        <ContratoDetail
          prospect={selected}
          productionMode
          onBack={() => setShowTechnicalSheet(false)}
          onRefresh={refresh}
          onReturnToClients={returnToClients}
        />
      </div>
    );
  }

  return (
    <main style={{ padding: 'clamp(0.8rem, 2vw, 1.6rem)', color: '#1e293b' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <div style={{ color: '#2563a8', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Seguimiento de proyectos</div>
          <h1 style={{ margin: '0.2rem 0', fontSize: 'clamp(1.45rem, 3vw, 2rem)', color: '#14243a' }}>Producción</h1>
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Del contrato a la entrega, con avances y evidencia por etapa.</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar cliente o proyecto"
            style={{ width: 'min(280px, 65vw)', padding: '0.7rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: 10 }} />
          <button type="button" onClick={refresh} style={{ padding: '0.7rem 0.9rem', border: 0, borderRadius: 10, background: '#eaf2ff', color: '#1d4f91', fontWeight: 700, cursor: 'pointer' }}>Actualizar</button>
        </div>
      </header>

      {message && <div role="status" style={{ marginBottom: 12, padding: '0.7rem 0.9rem', background: message.includes('no pudo') || message.includes('No se pudo') ? '#fef2f2' : '#eff6ff', color: message.includes('no pudo') || message.includes('No se pudo') ? '#b91c1c' : '#1d4f91', borderRadius: 10 }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem', marginBottom: '1.2rem' }}>
        {[
          { index: null, label: 'Todos', count: projects.length, color: '#475569', bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' },
          ...STAGE_NAMES.map((label, index) => ({
            index,
            label,
            count: projects.filter(project => normalizeProduction(project.production_data).current_stage === index).length,
            color: index === 0 ? '#1d4ed8' : '#2563a8',
            bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
          }))
        ].map(({ index, label, count, color, bg }) => {
          const active = stageFilter === index;
          return (
            <button key={label} type="button" onClick={() => selectStage(index)}
              style={{ minWidth: 0, padding: '0.8rem 0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, background: active ? bg : '#fff', border: `1px solid ${active ? color : '#e2e8f0'}`, borderRadius: 12, boxShadow: active ? `0 3px 10px ${color}20` : '0 1px 3px rgba(15,23,42,0.05)', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, color: active ? color : '#64748b', fontSize: '0.78rem', fontWeight: active ? 800 : 700 }}>
                <span style={{ width: 30, height: 30, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: active ? '#fff' : '#f8fafc', borderRadius: 9, color }}>{index === null ? '☷' : index === 0 ? '📦' : index + 1}</span>
                <span>{label}</span>
              </span>
              <span style={{ color: '#1e293b', fontSize: '1.1rem', fontWeight: 800 }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(230px, 300px) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
        <aside style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #edf1f5', fontWeight: 800, color: '#334155' }}>
            Proyectos <span style={{ color: '#64748b', fontWeight: 600 }}>({filteredProjects.length})</span>
          </div>
          {loading ? <p style={{ padding: '1rem', color: '#64748b' }}>Cargando...</p> : filteredProjects.length ? filteredProjects.map(project => (
            <button key={project.id} type="button" onClick={() => setSelectedId(project.id)}
              style={{ display: 'block', width: '100%', padding: '0.9rem 1rem', textAlign: 'left', border: 0, borderBottom: '1px solid #f1f5f9', background: project.id === selectedId ? '#eff6ff' : '#fff', cursor: 'pointer' }}>
              <span style={{ display: 'block', color: '#1e293b', fontWeight: 750 }}>{project.name || 'Cliente sin nombre'}</span>
              <span style={{ display: 'block', marginTop: 4, color: '#64748b', fontSize: '0.78rem' }}>{project.project_type || 'Proyecto'} · {project.public_id || `ID ${project.id}`}</span>
              <span style={{ display: 'inline-block', marginTop: 8, color: '#1d4f91', fontWeight: 700, fontSize: '0.73rem' }}>{STAGE_NAMES[normalizeProduction(project.production_data).current_stage || 0]}</span>
            </button>
          )) : <p style={{ padding: '1rem', margin: 0, color: '#64748b', lineHeight: 1.5 }}>{projects.length ? 'No hay proyectos que coincidan con la búsqueda.' : 'Aún no hay proyectos en producción. Desde Contratos, usa “Enviar a Producción” para iniciar el seguimiento.'}</p>}
        </aside>

        {selected ? (
          <section style={{ minWidth: 0 }}>
            <div style={{ padding: '1.1rem 1.25rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'start' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#172b4d' }}>{selected.name}</h2>
                  <div style={{ marginTop: 5, color: '#64748b', fontSize: '0.85rem' }}>{selected.project_type || 'Proyecto'} · {selected.public_id || `ID ${selected.id}`}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setShowTechnicalSheet(true)} style={{ padding: '0.55rem 0.8rem', border: '1px solid #bfdbfe', borderRadius: 9, background: '#fff', color: '#1d4f91', fontWeight: 800, cursor: 'pointer' }}>
                    📋 Ficha técnica
                  </button>
                  <button type="button" disabled={saving} onClick={returnToClients} style={{ padding: '0.55rem 0.8rem', border: '1px solid #fed7aa', borderRadius: 9, background: '#fff7ed', color: '#c2410c', fontWeight: 800, cursor: saving ? 'wait' : 'pointer' }}>
                    ↩ Regresar a Clientes
                  </button>
                  <span style={{ padding: '0.4rem 0.7rem', borderRadius: 20, background: '#eaf2ff', color: '#1d4f91', fontSize: '0.76rem', fontWeight: 800 }}>Etapa {currentStage + 1} de {STAGE_NAMES.length}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '1.25rem 0 0.2rem' }}>
                {STAGE_NAMES.map((name, index) => {
                  const complete = index < currentStage;
                  const active = index === currentStage;
                  return (
                    <button key={name} type="button" onClick={() => { setActiveStage(index); setNote(stages[index]?.note || ''); }}
                      style={{ flex: '1 0 135px', minWidth: 125, padding: '0.75rem', border: `1px solid ${active ? '#2563eb' : complete ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: 12, background: active ? '#eff6ff' : complete ? '#f8fbff' : '#fff', textAlign: 'left', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                        <span style={{ width: 22, height: 22, borderRadius: 99, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: complete || active ? '#2563eb' : '#e2e8f0', color: complete || active ? '#fff' : '#64748b', fontSize: 11, fontWeight: 800 }}>{complete ? '✓' : index + 1}</span>
                        <span style={{ color: active ? '#1d4ed8' : '#334155', fontSize: '0.75rem', fontWeight: 800 }}>{name}</span>
                      </div>
                      <span style={{ color: '#64748b', fontSize: '0.68rem' }}>{formatDate(stages[index]?.entered_at)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 9, marginBottom: 14 }}>
              <InfoCard label="Contacto">{selected.contact_info}</InfoCard>
              <InfoCard label="Domicilio del proyecto">{selected.location}</InfoCard>
              <InfoCard label="Entrega estimada">{selected.quote_delivery_time || selected.project_timeline || selected.delivery_date}</InfoCard>
              <InfoCard label="Total cotizado">{selected.quote_total_price ? money(selected.quote_total_price) : selected.estimated_price ? money(selected.estimated_price) : null}</InfoCard>
              <InfoCard label="Material / acabado">{[selected.material_type, selected.material_type_2, selected.furniture_color].filter(Boolean).join(' · ')}</InfoCard>
              <InfoCard label="Render">{selected.render_applies ? `Sí${selected.render_price ? ` · ${money(selected.render_price)}` : ''}` : selected.render_applies === false ? 'No aplica' : null}</InfoCard>
            </div>

            <details open style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, marginBottom: 14 }}>
              <summary style={{ padding: '0.9rem 1rem', color: '#1d4f91', fontWeight: 800, cursor: 'pointer' }}>Información de Estimación y materiales</summary>
              <div style={{ padding: '0 1rem 1rem' }}>
                {(selected.measurements || measurements.length > 0 || Object.keys(projectDetails).length > 0) && (
                  <div style={{ marginBottom: 12 }}>
                    <h3 style={{ fontSize: '0.82rem', color: '#334155' }}>Medidas y especificaciones</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 8 }}>
                      <InfoCard label="Medidas generales">{selected.measurements}</InfoCard>
                      {measurements.filter(([key]) => key !== 'measurements').map(([key, value]) => <InfoCard key={key} label={key.replaceAll('_', ' ')}>{String(value)}</InfoCard>)}
                      {Object.entries(projectDetails).map(([key, value]) => typeof value !== 'object' && <InfoCard key={key} label={key.replaceAll('_', ' ')}>{String(value)}</InfoCard>)}
                    </div>
                  </div>
                )}
                {estimationSheets.map((sheet, index) => (
                  <div key={`${sheet.type}-${index}`} style={{ margin: '0 0 14px', padding: '0.8rem', background: '#f8fafc', borderRadius: 10 }}>
                    <div style={{ fontWeight: 800, color: '#334155', marginBottom: 7 }}>{sheet.type || `Proyecto ${index + 1}`}</div>
                    {['materials', 'labor', 'concepts'].map(section => {
                      const rows = Array.isArray(sheet[section]) ? sheet[section] : [];
                      if (!rows.length) return null;
                      const label = section === 'materials' ? 'Materiales' : section === 'labor' ? 'Mano de obra' : 'Conceptos';
                      return <div key={section} style={{ marginTop: 8 }}>
                        <div style={{ color: '#2563a8', fontSize: '0.72rem', fontWeight: 800, marginBottom: 4 }}>{label}</div>
                        {rows.map((row, rowIndex) => <div key={row.id || rowIndex} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '0.3rem 0', borderBottom: '1px solid #e8edf3', color: '#475569', fontSize: '0.8rem' }}>
                          <span>{row.desc || 'Concepto'} · {row.qty || 0} {row.unit || 'pza'}</span><span>{money((Number(row.qty) || 0) * (Number(row.price) || 0))}</span>
                        </div>)}
                      </div>;
                    })}
                  </div>
                ))}
                {!estimationSheets.length && !selected.measurements && !measurements.length && <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No hay medidas o desglose de materiales guardados en la estimación.</div>}
                {(estimation.croquisPhotos || estimation.croquis_data || estimation.photos) && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: 'pointer', color: '#334155', fontSize: '0.82rem', fontWeight: 700 }}>Ver croquis y fotos de estimación</summary>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 8 }}>
                      {[...(Array.isArray(estimation.croquisPhotos) ? estimation.croquisPhotos : []), estimation.croquis_data, ...Object.values(estimation.photos || {}).flat()].filter(value => typeof value === 'string').map((photo, index) =>
                        <a key={index} href={imageUrl(photo)} target="_blank" rel="noreferrer"><img src={imageUrl(photo)} alt={`Referencia de estimación ${index + 1}`} style={{ width: 130, height: 95, objectFit: 'cover', borderRadius: 8, border: '1px solid #dbe3ec' }} /></a>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </details>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1rem', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, color: '#1d4f91', fontSize: '1rem' }}>{STAGE_NAMES[activeStage]}</h3>
                <label style={{ padding: '0.55rem 0.8rem', borderRadius: 9, background: '#eff6ff', color: '#1d4f91', fontSize: '0.78rem', fontWeight: 800, cursor: saving ? 'wait' : 'pointer' }}>
                  {saving ? 'Procesando...' : '＋ Agregar foto'}
                  <input type="file" accept="image/*" disabled={saving} onChange={event => { uploadEvidence(event.target.files?.[0]); event.target.value = ''; }} style={{ display: 'none' }} />
                </label>
              </div>
              <textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Describe el avance, acuerdos o pendientes de esta etapa..."
                rows={3} style={{ boxSizing: 'border-box', width: '100%', resize: 'vertical', margin: '0.85rem 0', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: 10, font: 'inherit', fontSize: '0.85rem' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" disabled={saving} onClick={saveNote} style={{ padding: '0.65rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: 9, background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>Guardar nota</button>
                <button type="button" disabled={saving || selected.status === 'ENTREGADO'} onClick={advanceStage} style={{ padding: '0.65rem 1rem', border: 0, borderRadius: 9, background: selected.status === 'ENTREGADO' ? '#cbd5e1' : '#2563eb', color: '#fff', fontWeight: 800, cursor: selected.status === 'ENTREGADO' ? 'not-allowed' : 'pointer' }}>
                  {selected.status === 'ENTREGADO' ? 'Proyecto entregado' : currentStage >= STAGE_NAMES.length - 1 ? 'Confirmar entrega' : 'Guardar y avanzar →'}
                </button>
              </div>
              {!!(selectedStage.photos || []).length && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginTop: 14 }}>
                  {selectedStage.photos.map((photo, index) => {
                    const src = imageUrl(photoPath(photo));
                    return <a key={`${src}-${index}`} href={src} target="_blank" rel="noreferrer"><img src={src} alt={`Evidencia ${index + 1} · ${STAGE_NAMES[activeStage]}`} style={{ width: 130, height: 95, objectFit: 'cover', borderRadius: 9, border: '1px solid #dbe3ec' }} /></a>;
                  })}
                </div>
              )}
            </div>
          </section>
        ) : !loading ? (
          <div style={{ padding: '2rem', color: '#64748b', textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16 }}>
            {filteredProjects.length
              ? 'Selecciona un proyecto para revisar su avance.'
              : projects.length && stageFilter !== null
                ? `No hay proyectos actualmente en la etapa “${STAGE_NAMES[stageFilter]}”.`
                : projects.length
                  ? 'No hay proyectos que coincidan con la búsqueda.'
                  : 'Los contratos se incorporan desde el módulo Clientes.'}
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default Pedidos;
