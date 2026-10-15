import React, { useEffect, useMemo, useState } from 'react';
import useAutoRefresh from './useAutoRefresh';
import { IconCamera, IconCalendar, IconSearch, IconXCircle, IconCheckCircle, IconTrash, IconEdit } from './icons';

const API = import.meta.env.VITE_API_URL || '';

const parseJson = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

const getDateKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatReadableDate = (dateKey) => {
  if (!dateKey) return '';
  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(year, month - 1, day, 12);
  return d.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const imageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${API}${url}`;
};

export default function Avances() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [searchProject, setSearchProject] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1, 12);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => getDateKey(new Date()));

  // Formulario de avance
  const [advanceFiles, setAdvanceFiles] = useState([]);
  const [advanceComment, setAdvanceComment] = useState('');
  const [advancePublished, setAdvancePublished] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // Edición de comentario
  const [editingAdvanceId, setEditingAdvanceId] = useState(null);
  const [editingComment, setEditingComment] = useState('');

  // Lightbox / visor grande
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const fetchProjects = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API}/api/prospects?light=true`);
      if (!res.ok) throw new Error(`Error al cargar proyectos (${res.status})`);
      const data = await res.json();
      const inProd = data.filter(p => p.is_contract && ['PRODUCCION', 'ENTREGADO'].includes(p.status));
      setProjects(inProd);
      if (!selectedProjectId && inProd.length > 0) {
        setSelectedProjectId(inProd[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);
  useAutoRefresh(() => fetchProjects({ silent: true }));

  // Proyecto actualmente seleccionado
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Lista de proyectos filtrada para el selector
  const filteredProjects = useMemo(() => {
    const q = searchProject.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.public_id || '').toLowerCase().includes(q) ||
      (p.project_type || '').toLowerCase().includes(q)
    );
  }, [projects, searchProject]);

  // Avances diarios del proyecto seleccionado
  const advances = useMemo(() => {
    if (!selectedProject) return [];
    const prod = parseJson(selectedProject.production_data, {});
    const list = Array.isArray(prod.daily_advances) ? prod.daily_advances : [];
    // Ordenar descendente por fecha/hora
    return [...list].sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
  }, [selectedProject]);

  // Mapa de avances agrupados por fecha (YYYY-MM-DD)
  const advancesByDate = useMemo(() => {
    const map = new Map();
    advances.forEach(adv => {
      const k = adv.date || getDateKey(adv.created_at);
      if (!k) return;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(adv);
    });
    return map;
  }, [advances]);

  // Avances para el día seleccionado
  const currentDayAdvances = useMemo(() => {
    return advancesByDate.get(selectedDateKey) || [];
  }, [advancesByDate, selectedDateKey]);

  // Ciclo de vida del proyecto seleccionado (Prospecto -> Cliente -> Producción)
  const projectLifecycle = useMemo(() => {
    if (!selectedProject) return null;
    const prod = parseJson(selectedProject.production_data, {});
    const pProspectDate = selectedProject.capture_date
      ? new Date(selectedProject.capture_date + 'T12:00:00')
      : (selectedProject.created_at ? new Date(selectedProject.created_at) : null);
    const pContractDate = selectedProject.contract_date
      ? new Date(selectedProject.contract_date + 'T12:00:00')
      : null;
    const pProdStartDate = prod.started_at
      ? new Date(prod.started_at + 'T12:00:00')
      : (pContractDate || new Date());

    let prospectDays = 0;
    if (pProspectDate && pContractDate) {
      prospectDays = Math.max(1, Math.round((pContractDate.getTime() - pProspectDate.getTime()) / (1000 * 60 * 60 * 24)));
    } else if (pProspectDate) {
      prospectDays = Math.max(1, Math.round((new Date().getTime() - pProspectDate.getTime()) / (1000 * 60 * 60 * 24)));
    }

    let clientPrepDays = 0;
    if (pContractDate && pProdStartDate) {
      clientPrepDays = Math.max(0, Math.round((pProdStartDate.getTime() - pContractDate.getTime()) / (1000 * 60 * 60 * 24)));
    }

    const prodDaysTotal = Number.parseInt(selectedProject.production_days, 10) || 30;
    const elapsedProdDays = pProdStartDate
      ? Math.max(0, Math.round((new Date().getTime() - pProdStartDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    const totalLifecycleDays = (prospectDays || 0) + (clientPrepDays || 0) + elapsedProdDays;

    return {
      prospectDays,
      pProspectDate,
      pContractDate,
      clientPrepDays,
      pProdStartDate,
      prodDaysTotal,
      elapsedProdDays,
      totalLifecycleDays
    };
  }, [selectedProject]);

  // Días del mes para el calendario (42 celdas: 6 semanas)
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1, 12);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay()); // Domingo inicial
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [calendarMonth]);

  const todayKey = getDateKey(new Date());

  // Subir avance diario
  const handleUploadAdvance = async (e) => {
    e.preventDefault();
    if (!advanceFiles.length) {
      setActionMessage('⚠️ Selecciona al menos una fotografía.');
      return;
    }
    if (!selectedProjectId) {
      setActionMessage('⚠️ Selecciona un proyecto primero.');
      return;
    }
    setUploading(true);
    setActionMessage('');
    try {
      let lastResult = null;
      for (const file of advanceFiles) {
        const selProj = projects.find(p => p.id === selectedProjectId);
        const selProd = parseJson(selProj?.production_data, {});
        const curStage = selProd.current_stage !== undefined ? selProd.current_stage : 2;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('date', selectedDateKey);
        fd.append('comment', advanceComment);
        fd.append('published', advancePublished ? 'true' : 'false');
        fd.append('stage', String(curStage));

        const res = await fetch(`${API}/api/prospects/${selectedProjectId}/daily-advances`, {
          method: 'POST',
          body: fd
        });
        if (!res.ok) throw new Error('Error al guardar el avance');
        lastResult = await res.json();
      }

      if (lastResult) {
        setProjects(cur => cur.map(p => p.id === selectedProjectId ? { ...p, production_data: lastResult.production_data } : p));
      }

      setAdvanceFiles([]);
      setAdvanceComment('');
      setActionMessage(`✅ ${advanceFiles.length} foto(s) guardada(s) correctamente.`);
      setTimeout(() => setActionMessage(''), 4000);
    } catch (err) {
      setActionMessage('❌ ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Alternar publicación al cliente
  const handleTogglePublish = async (advance) => {
    try {
      const res = await fetch(`${API}/api/prospects/${selectedProjectId}/daily-advances/${advance.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !advance.published })
      });
      if (!res.ok) throw new Error('No se pudo actualizar la visibilidad');
      const result = await res.json();
      setProjects(cur => cur.map(p => p.id === selectedProjectId ? { ...p, production_data: result.production_data } : p));
    } catch (err) {
      setActionMessage('❌ ' + err.message);
    }
  };

  // Guardar comentario editado
  const handleSaveComment = async (advanceId) => {
    try {
      const res = await fetch(`${API}/api/prospects/${selectedProjectId}/daily-advances/${advanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: editingComment })
      });
      if (!res.ok) throw new Error('No se pudo guardar el comentario');
      const result = await res.json();
      setProjects(cur => cur.map(p => p.id === selectedProjectId ? { ...p, production_data: result.production_data } : p));
      setEditingAdvanceId(null);
      setEditingComment('');
    } catch (err) {
      setActionMessage('❌ ' + err.message);
    }
  };

  // Eliminar avance
  const handleDeleteAdvance = async (advanceId) => {
    if (!window.confirm('¿Deseas eliminar esta foto de avance?')) return;
    try {
      const res = await fetch(`${API}/api/prospects/${selectedProjectId}/daily-advances/${advanceId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('No se pudo eliminar el avance');
      const result = await res.json();
      setProjects(cur => cur.map(p => p.id === selectedProjectId ? { ...p, production_data: result.production_data } : p));
      setActionMessage('Foto eliminada.');
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      setActionMessage('❌ ' + err.message);
    }
  };

  return (
    <div style={{ padding: '1rem', maxWidth: 1400, margin: '0 auto', fontFamily: 'inherit' }}>
      
      {/* ── ENCABEZADO SUPERIOR ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.5rem', background: '#e0f2fe', padding: '6px 10px', borderRadius: 10 }}>📷</span>
            <div>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.35rem', fontWeight: 800 }}>
                Avances Diarios de Carpintería
              </h2>
              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                Registro fotográfico y bitácora de producción por día para cada proyecto
              </span>
            </div>
          </div>
        </div>

        {/* Buscador de proyectos rápido */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: 260 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
              <IconSearch style={{ width: 15, height: 15 }} />
            </span>
            <input
              type="text"
              placeholder="Buscar proyecto / cliente..."
              value={searchProject}
              onChange={e => setSearchProject(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 2rem',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontSize: '0.82rem',
                background: '#fff'
              }}
            />
          </div>
        </div>
      </div>

      {/* ── SELECTOR DE PROYECTO (CHIPS / TARJETAS HORIZONTALES) ── */}
      <div style={{ marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: 6 }}>
        <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
          {filteredProjects.map(p => {
            const isSelected = p.id === selectedProjectId;
            const pProd = parseJson(p.production_data, {});
            const advCount = Array.isArray(pProd.daily_advances) ? pProd.daily_advances.length : 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedProjectId(p.id);
                  setActionMessage('');
                }}
                style={{
                  padding: '0.55rem 0.9rem',
                  borderRadius: 10,
                  border: `2px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  color: isSelected ? '#1d4ed8' : '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>{p.name}</span>
                  {advCount > 0 && (
                    <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: isSelected ? '#bfdbfe' : '#f1f5f9', borderRadius: 999, fontWeight: 700 }}>
                      📸 {advCount}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.68rem', color: isSelected ? '#3b82f6' : '#64748b' }}>
                  {p.project_type || 'Proyecto'} · {p.public_id || `#${p.id}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CICLO DE VIDA COMPLETO DEL PROYECTO SELECCIONADO ── */}
      {projectLifecycle && (
        <div style={{
          marginBottom: '1.25rem',
          padding: '0.9rem 1.1rem',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 14,
          border: '1px solid #334155',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Ciclo de Vida del Proyecto · {selectedProject?.name}
              </div>
              <div style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 900, marginTop: 2 }}>
                Línea de tiempo histórica y avance en carpintería
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0.35rem 0.8rem',
              background: '#090d16',
              border: '1px solid #3b82f655',
              borderRadius: 999
            }}>
              <span style={{ fontSize: '0.78rem' }}>⏱️</span>
              <span style={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 900 }}>
                Total acumulado: {projectLifecycle.totalLifecycleDays} días
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
            {/* FASE 1: PROSPECTO */}
            <div style={{
              background: '#131b2e',
              border: '1px solid #f59e0b55',
              borderLeft: '4px solid #f59e0b',
              borderRadius: 8,
              padding: '0.6rem 0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ color: '#fbbf24', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase' }}>
                  🎯 Fase 1 · Prospecto
                </span>
                <span style={{ background: '#f59e0b22', color: '#fbbf24', fontSize: '0.68rem', fontWeight: 900, padding: '1px 6px', borderRadius: 4, border: '1px solid #f59e0b44' }}>
                  {projectLifecycle.prospectDays} {projectLifecycle.prospectDays === 1 ? 'día' : 'días'}
                </span>
              </div>
              <div style={{ color: '#ffffff', fontSize: '0.74rem', fontWeight: 700 }}>
                Captación & Cotización
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.62rem', marginTop: 3 }}>
                {projectLifecycle.pProspectDate ? projectLifecycle.pProspectDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Captura'} ➔ {projectLifecycle.pContractDate ? projectLifecycle.pContractDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Firma'}
              </div>
            </div>

            {/* FASE 2: CLIENTE */}
            <div style={{
              background: '#131b2e',
              border: '1px solid #38bdf855',
              borderLeft: '4px solid #38bdf8',
              borderRadius: 8,
              padding: '0.6rem 0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ color: '#38bdf8', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase' }}>
                  ✍️ Fase 2 · Cliente
                </span>
                <span style={{ background: '#38bdf822', color: '#38bdf8', fontSize: '0.68rem', fontWeight: 900, padding: '1px 6px', borderRadius: 4, border: '1px solid #38bdf844' }}>
                  {projectLifecycle.clientPrepDays} {projectLifecycle.clientPrepDays === 1 ? 'día' : 'días'}
                </span>
              </div>
              <div style={{ color: '#ffffff', fontSize: '0.74rem', fontWeight: 700 }}>
                Firma & Preparación Taller
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.62rem', marginTop: 3 }}>
                {projectLifecycle.pContractDate ? projectLifecycle.pContractDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Contrato'} ➔ {projectLifecycle.pProdStartDate ? projectLifecycle.pProdStartDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Taller'}
              </div>
            </div>

            {/* FASE 3: PRODUCCIÓN */}
            <div style={{
              background: '#131b2e',
              border: '1px solid #10b98155',
              borderLeft: '4px solid #10b981',
              borderRadius: 8,
              padding: '0.6rem 0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ color: '#34d399', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase' }}>
                  🔨 Fase 3 · Producción
                </span>
                <span style={{ background: '#10b98122', color: '#34d399', fontSize: '0.68rem', fontWeight: 900, padding: '1px 6px', borderRadius: 4, border: '1px solid #10b98144' }}>
                  {projectLifecycle.prodDaysTotal} días contratados
                </span>
              </div>
              <div style={{ color: '#ffffff', fontSize: '0.74rem', fontWeight: 700 }}>
                {projectLifecycle.elapsedProdDays} días transcurridos en taller
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.62rem', marginTop: 3 }}>
                Arranque: {projectLifecycle.pProdStartDate ? projectLifecycle.pProdStartDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin inicio'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CUERPO PRINCIPAL: 2 COLUMNAS (CALENDARIO + PANEL DE AVANCES) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.15fr) minmax(360px, 1.85fr)', gap: 18, alignItems: 'start' }}>

        {/* ── COLUMNA 1: CALENDARIO INTERACTIVO ── */}
        <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '1.2rem', boxShadow: '0 4px 16px rgba(15,23,42,0.04)' }}>
          {/* Navegación del mes */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <strong style={{ fontSize: '1rem', color: '#0f172a', textTransform: 'capitalize' }}>
                {calendarMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
              </strong>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1, 12))}
                style={{ width: 32, height: 32, border: '1px solid #cbd5e1', borderRadius: 8, background: '#f8fafc', cursor: 'pointer', fontSize: '1rem' }}
                title="Mes anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1, 12));
                  setSelectedDateKey(getDateKey(now));
                }}
                style={{ padding: '0 10px', height: 32, border: '1px solid #cbd5e1', borderRadius: 8, background: '#f8fafc', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1, 12))}
                style={{ width: 32, height: 32, border: '1px solid #cbd5e1', borderRadius: 8, background: '#f8fafc', cursor: 'pointer', fontSize: '1rem' }}
                title="Mes siguiente"
              >
                ›
              </button>
            </div>
          </div>

          {/* Días de la semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', marginBottom: 6 }}>
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <span key={d} style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                {d}
              </span>
            ))}
          </div>

          {/* Rejilla de días */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {calendarDays.map((dayDate, i) => {
              const dKey = getDateKey(dayDate);
              const isCurrentMonth = dayDate.getMonth() === calendarMonth.getMonth();
              const isSelected = dKey === selectedDateKey;
              const isToday = dKey === todayKey;
              const dayAdvances = advancesByDate.get(dKey) || [];
              const count = dayAdvances.length;
              const hasPublished = dayAdvances.some(a => a.published !== false);

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSelectedDateKey(dKey);
                    setActionMessage('');
                  }}
                  style={{
                    minHeight: 58,
                    padding: '4px',
                    borderRadius: 9,
                    border: isSelected
                      ? '2px solid #2563eb'
                      : isToday
                        ? '2px solid #38bdf8'
                        : '1px solid #f1f5f9',
                    background: isSelected
                      ? '#eff6ff'
                      : isToday
                        ? '#f0f9ff'
                        : isCurrentMonth
                          ? '#ffffff'
                          : '#fafafa',
                    opacity: isCurrentMonth ? 1 : 0.45,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    transition: 'all 0.1s ease'
                  }}
                >
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: isToday || isSelected ? 800 : 600,
                    color: isSelected ? '#1d4ed8' : isToday ? '#0284c7' : '#1e293b'
                  }}>
                    {dayDate.getDate()}
                  </span>

                  {count > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      padding: '2px 5px',
                      borderRadius: 6,
                      background: hasPublished ? '#dcfce7' : '#f1f5f9',
                      border: `1px solid ${hasPublished ? '#86efac' : '#cbd5e1'}`,
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      color: hasPublished ? '#166534' : '#475569'
                    }}>
                      <span>📷 {count}</span>
                    </div>
                  )}

                  {count === 0 && <div style={{ height: 16 }} />}
                </button>
              );
            })}
          </div>

          {/* Leyenda del calendario */}
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.68rem', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} /> Hoy
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} /> Con fotos al cliente
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#64748b', display: 'inline-block' }} /> Solo fotos internas
            </span>
          </div>
        </div>

        {/* ── COLUMNA 2: PANEL DE AVANCES DEL DÍA SELECCIONADO ── */}
        <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(15,23,42,0.04)' }}>

          {/* Encabezado del día seleccionado */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <div style={{ color: '#2563eb', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Día seleccionado
              </div>
              <h3 style={{ margin: '2px 0 0', color: '#0f172a', fontSize: '1.15rem', fontWeight: 800, textTransform: 'capitalize' }}>
                {formatReadableDate(selectedDateKey)}
              </h3>
            </div>
            {selectedProject && (
              <div style={{ textAlign: 'right' }}>
                <span style={{ padding: '0.25rem 0.65rem', background: '#f1f5f9', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>
                  {selectedProject.name}
                </span>
              </div>
            )}
          </div>

          {/* ── FORMULARIO: SUBIR AVANCE (FOTO + COMENTARIO) ── */}
          <form onSubmit={handleUploadAdvance} style={{ background: '#f8fafc', padding: '1rem', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: '0.9rem' }}>🔨</span>
              <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>Registrar nuevo avance para este día</strong>
            </div>

            {/* Selector de fotos / cámara */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Fotografía(s) del trabajo:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0.45rem 0.9rem',
                  background: '#ffffff',
                  border: '1.5px dashed #3b82f6',
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: '#2563eb',
                  fontSize: '0.76rem',
                  fontWeight: 700
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => setAdvanceFiles(Array.from(e.target.files))}
                  />
                  <span>📷 Tomar foto o elegir de galería</span>
                </label>
                {advanceFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAdvanceFiles([])}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 700 }}
                  >
                    ✕ Limpiar selección ({advanceFiles.length})
                  </button>
                )}
              </div>
              {advanceFiles.length > 0 && (
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 8, paddingBottom: 4 }}>
                  {advanceFiles.map((f, fi) => (
                    <div key={fi} style={{ position: 'relative', width: 52, height: 52, borderRadius: 6, overflow: 'hidden', flex: 'none', border: '1.5px solid #3b82f6' }}>
                      <img
                        src={URL.createObjectURL(f)}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => setAdvanceFiles(cur => cur.filter((_, idx) => idx !== fi))}
                        style={{
                          position: 'absolute', top: 0, right: 0,
                          background: 'rgba(239,68,68,0.9)', color: '#fff',
                          border: 'none', width: 16, height: 16, fontSize: '0.6rem',
                          display: 'grid', placeItems: 'center', cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Campo de Comentarios */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Comentarios / Descripción del avance:
              </label>
              <textarea
                rows={2}
                placeholder="Escribe lo realizado (ej: armado de estructura, corte de frentes, lijado, fondeo...)"
                value={advanceComment}
                onChange={e => setAdvanceComment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Checkbox para mostrar al cliente */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={advancePublished}
                  onChange={e => setAdvancePublished(e.target.checked)}
                  style={{ width: 15, height: 15, cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 600 }}>Mostrar estas fotos en el portal del cliente</span>
              </label>

              {/* Botón Guardar */}
              <button
                type="submit"
                disabled={uploading || !advanceFiles.length}
                style={{
                  padding: '0.45rem 1.1rem',
                  borderRadius: 8,
                  border: 'none',
                  background: uploading || !advanceFiles.length ? '#94a3b8' : '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: uploading || !advanceFiles.length ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.25)'
                }}
              >
                {uploading ? '⏳ Guardando...' : 'Guardar avance del día'}
              </button>
            </div>

            {actionMessage && (
              <div style={{ marginTop: 8, fontSize: '0.74rem', fontWeight: 700, color: actionMessage.startsWith('✅') ? '#16a34a' : actionMessage.startsWith('⚠️') ? '#d97706' : '#dc2626' }}>
                {actionMessage}
              </div>
            )}
          </form>

          {/* ── GALERÍA DE AVANCES DEL DÍA ── */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>
                Evidencias registradas este día ({currentDayAdvances.length})
              </strong>
            </div>

            {currentDayAdvances.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1', color: '#64748b' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>📷</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>No hay fotos registradas para este día</div>
                <div style={{ fontSize: '0.7rem', marginTop: 2 }}>Los carpinteros pueden usar el formulario de arriba para cargar el avance.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {currentDayAdvances.map((adv, idx) => {
                  const isPub = adv.published !== false;
                  const isEditing = editingAdvanceId === adv.id;

                  return (
                    <div
                      key={adv.id || idx}
                      style={{
                        borderRadius: 10,
                        border: `1.5px solid ${isPub ? '#86efac' : '#cbd5e1'}`,
                        overflow: 'hidden',
                        background: '#ffffff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      {/* Imagen con click para ampliar */}
                      <div style={{ position: 'relative', height: 130, background: '#0f172a', cursor: 'pointer' }} onClick={() => setLightboxIndex(idx)}>
                        <img
                          src={imageUrl(adv.url)}
                          alt={adv.comment || `Avance ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        <span style={{
                          position: 'absolute',
                          bottom: 4,
                          right: 4,
                          padding: '2px 6px',
                          background: 'rgba(15,23,42,0.85)',
                          color: '#fff',
                          fontSize: '0.55rem',
                          borderRadius: 4,
                          fontWeight: 700
                        }}>
                          🔍 Ampliar
                        </span>
                      </div>

                      {/* Cuerpo de la tarjeta */}
                      <div style={{ padding: '0.65rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          {/* Estado de publicación */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: 999,
                              background: isPub ? '#dcfce7' : '#f1f5f9',
                              color: isPub ? '#166534' : '#64748b'
                            }}>
                              {isPub ? '🟢 Visible al cliente' : '⚪ Solo taller'}
                            </span>
                            <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>
                              {adv.created_at ? new Date(adv.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>

                          {/* Comentario */}
                          {isEditing ? (
                            <div style={{ marginBottom: 6 }}>
                              <textarea
                                rows={2}
                                value={editingComment}
                                onChange={e => setEditingComment(e.target.value)}
                                style={{ width: '100%', fontSize: '0.72rem', padding: 4, borderRadius: 6, border: '1px solid #3b82f6', boxSizing: 'border-box' }}
                              />
                              <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                                <button
                                  type="button"
                                  onClick={() => handleSaveComment(adv.id)}
                                  style={{ padding: '2px 6px', fontSize: '0.65rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingAdvanceId(null)}
                                  style={{ padding: '2px 6px', fontSize: '0.65rem', background: '#94a3b8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p style={{ margin: '0 0 6px', fontSize: '0.74rem', color: '#334155', lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>
                              {adv.comment || <em style={{ color: '#94a3b8' }}>Sin comentarios</em>}
                            </p>
                          )}
                        </div>

                        {/* Botones de acción */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(adv)}
                            title={isPub ? 'Ocultar al cliente' : 'Publicar al cliente'}
                            style={{
                              padding: '2px 6px',
                              borderRadius: 5,
                              border: `1px solid ${isPub ? '#86efac' : '#cbd5e1'}`,
                              background: isPub ? '#f0fdf4' : '#fff',
                              color: isPub ? '#166534' : '#475569',
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {isPub ? '✓ Publicada' : '▶ Publicar'}
                          </button>

                          <div style={{ display: 'flex', gap: 4 }}>
                            {!isEditing && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAdvanceId(adv.id);
                                  setEditingComment(adv.comment || '');
                                }}
                                title="Editar comentario"
                                style={{ width: 22, height: 22, border: '1px solid #cbd5e1', borderRadius: 4, background: '#fff', color: '#475569', cursor: 'pointer', fontSize: '0.65rem' }}
                              >
                                ✏️
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteAdvance(adv.id)}
                              title="Eliminar foto"
                              style={{ width: 22, height: 22, border: '1px solid #fca5a5', borderRadius: 4, background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 800 }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ── MODAL / LIGHTBOX DE IMAGEN EN PANTALLA COMPLETA ── */}
      {lightboxIndex !== null && currentDayAdvances[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxIndex(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(2, 6, 23, 0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: 'min(92vw, 860px)',
              maxHeight: '90vh',
              background: '#0f172a',
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
              border: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header del lightbox */}
            <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', color: '#fff' }}>
              <div>
                <strong style={{ fontSize: '0.88rem' }}>{selectedProject?.name}</strong>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 8 }}>
                  Foto {lightboxIndex + 1} de {currentDayAdvances.length} · {formatReadableDate(selectedDateKey)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Imagen central */}
            <div style={{ position: 'relative', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '65vh' }}>
              <img
                src={imageUrl(currentDayAdvances[lightboxIndex].url)}
                alt=""
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', display: 'block' }}
              />

              {/* Botón anterior */}
              {currentDayAdvances.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex((lightboxIndex - 1 + currentDayAdvances.length) % currentDayAdvances.length)}
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'rgba(15,23,42,0.85)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    fontSize: '1.3rem',
                    cursor: 'pointer'
                  }}
                >
                  ‹
                </button>
              )}

              {/* Botón siguiente */}
              {currentDayAdvances.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex((lightboxIndex + 1) % currentDayAdvances.length)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'rgba(15,23,42,0.85)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    fontSize: '1.3rem',
                    cursor: 'pointer'
                  }}
                >
                  ›
                </button>
              )}
            </div>

            {/* Footer con comentario */}
            {currentDayAdvances[lightboxIndex].comment && (
              <div style={{ padding: '0.75rem 1rem', background: '#0f172a', borderTop: '1px solid #1e293b', color: '#e2e8f0', fontSize: '0.8rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Comentario:</span>
                {currentDayAdvances[lightboxIndex].comment}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
