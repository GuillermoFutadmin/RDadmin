import React, { useEffect, useMemo, useState } from 'react';
import { ContratoDetail, getMeasureSections } from './Contratos';

const API = import.meta.env.VITE_API_URL || '';
const STAGE_NAMES = [
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
  if (production.stages.length === STAGE_NAMES.length + 1) {
    const legacyStage = Number.isInteger(production.current_stage) ? production.current_stage : 0;
    const firstStage = production.stages[0] || {};
    const secondStage = production.stages[1] || {};
    const notes = [firstStage.note, secondStage.note].filter(Boolean);
    return {
      ...production,
      current_stage: legacyStage <= 1 ? 0 : legacyStage - 1,
      stages: [
        {
          ...firstStage,
          name: STAGE_NAMES[0],
          entered_at: firstStage.entered_at || production.started_at || null,
          note: notes.join('\n'),
          photos: [...(firstStage.photos || []), ...(secondStage.photos || [])]
        },
        ...production.stages.slice(2).map((stage, index) => ({ ...stage, name: STAGE_NAMES[index + 1] }))
      ]
    };
  }
  if (production.stages.length === STAGE_NAMES.length) {
    return {
      ...production,
      stages: production.stages.map((stage, index) => ({ ...stage, name: STAGE_NAMES[index] }))
    };
  }
  return production;
};

const formatDate = (value) => value
  ? new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Pendiente';

const imageUrl = (url) => url?.startsWith('http') || url?.startsWith('data:') ? url : `${API}${url || ''}`;

const collectImageUrls = (...values) => {
  const urls = new Set();
  const visit = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (typeof value === 'object') {
      if (value.url || value.path || value.image) visit(value.url || value.path || value.image);
      else Object.values(value).forEach(visit);
    } else if (typeof value === 'string') {
      const normalized = value.trim();
      if (normalized.startsWith('data:')) {
        urls.add(normalized);
      } else {
        normalized.split(',').map(item => item.trim()).filter(Boolean).forEach(url => urls.add(url));
      }
    }
  };
  values.forEach(visit);
  return [...urls];
};

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
  const [exportingProjectPdf, setExportingProjectPdf] = useState(false);
  const [showPdfPrompt, setShowPdfPrompt] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierError, setSupplierError] = useState('');
  const [purchaseDrafts, setPurchaseDrafts] = useState({});
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [supplierForMaterial, setSupplierForMaterial] = useState(null);
  const [supplierForm, setSupplierForm] = useState({ name: '', contact_name: '', phone: '', location: '' });

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
  useEffect(() => {
    fetch(`${API}/api/suppliers`)
      .then(async response => {
        if (!response.ok) throw new Error(`No se pudieron cargar los proveedores (${response.status})`);
        setSuppliers(await response.json());
      })
      .catch(error => setSupplierError(error.message || 'No se pudieron cargar los proveedores.'));
  }, []);

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
  const renderPreview = selected ? collectImageUrls(selected.render_image_path)[0] : null;
  const production = normalizeProduction(selected?.production_data);
  const stages = Array.isArray(production.stages) ? production.stages : [];
  const currentStage = Number.isInteger(production.current_stage) ? production.current_stage : 0;
  const selectedStage = stages[activeStage] || { name: STAGE_NAMES[activeStage], note: '', photos: [] };
  const estimation = parseJson(selected?.estimation_data);
  const estimationSheets = Array.isArray(estimation.sheets) ? estimation.sheets : [];
  const estimationMaterialSheets = estimationSheets.some(sheet => Array.isArray(sheet.materials) && sheet.materials.length)
    ? estimationSheets
    : estimation.materials
      ? [{ type: selected?.project_type || 'Proyecto', materials: estimation.materials }]
      : estimationSheets;
  const valuation = parseJson(selected?.valuation_data);
  const valuationSheets = Array.isArray(valuation.sheets) && valuation.sheets.length
    ? valuation.sheets
    : valuation.materials
      ? [{ type: valuation.projectType || selected?.project_type || 'Proyecto', materials: valuation.materials }]
      : [];
  const projectDetails = estimation.projectDetails || {};
  const estimationMeasures = estimation.measures && typeof estimation.measures === 'object' ? estimation.measures : {};
  const estimationMeasurePhotos = estimation.photos && typeof estimation.photos === 'object' ? estimation.photos : {};
  const measurementLabels = new Map(getMeasureSections(selected?.project_type || '').flatMap(group =>
    group.sections.flatMap(section => section.fields.map(field => [
      `${section.key}_${field.id}`,
      { label: field.label, group: group._groupLabel || 'Medidas capturadas', suffix: field.suffix }
    ]))
  ));
  const measureKeys = new Set([...Object.keys(estimationMeasures), ...Object.keys(estimationMeasurePhotos)]);
  const measurementEntries = [...measureKeys].map(key => {
    const field = measurementLabels.get(key);
    const value = estimationMeasures[key];
    const photo = estimationMeasurePhotos[key];
    const hasValue = value !== null && value !== undefined && value !== '';
    const label = field?.label || key.replaceAll('_', ' ');
    const formattedValue = hasValue
      ? `${value}${field?.suffix === 'cm' ? ` ${estimation.unit || 'cm'}` : field?.suffix ? ` ${field.suffix}` : ''}`
      : '';
    return { key, label, group: field?.group || 'Medidas capturadas', value: formattedValue, photo };
  }).filter(entry => entry.value || entry.photo);
  const croquisImages = collectImageUrls(estimation.croquisPhotos, estimation.croquis_data);
  const materialSheets = estimationMaterialSheets.some(sheet => Array.isArray(sheet.materials) && sheet.materials.length)
    ? estimationMaterialSheets
    : valuationSheets;
  const projectMaterials = materialSheets.flatMap((sheet, sheetIndex) =>
    (Array.isArray(sheet.materials) ? sheet.materials : []).map((item, itemIndex) => ({
      ...item,
      sheetName: sheet.type || `Proyecto ${sheetIndex + 1}`,
      purchaseKey: `${sheetIndex}:${item.id ?? ''}:${itemIndex}`
    }))
  );
  const purchaseRecords = production.materialPurchases && typeof production.materialPurchases === 'object'
    ? production.materialPurchases
    : {};
  useEffect(() => {
    setPurchaseDrafts(production.materialPurchases && typeof production.materialPurchases === 'object'
      ? production.materialPurchases
      : {});
  }, [selectedId]);
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

  const saveMaterialPurchase = async (materialKey, record) => {
    const nextPurchases = { ...purchaseRecords, [materialKey]: record };
    const updated = await persist({ ...production, materialPurchases: nextPurchases });
    if (updated) {
      setPurchaseDrafts(nextPurchases);
      setMessage('Compra del material guardada.');
    }
  };

  const addSupplierFromProduction = async event => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${API}/api/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierForm)
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.detail || `No se pudo guardar el proveedor (${response.status})`);
      }
      const supplier = await response.json();
      setSuppliers(current => [...current, supplier].sort((a, b) => a.name.localeCompare(b.name)));
      const materialKey = supplierForMaterial;
      const record = {
        ...(purchaseDrafts[materialKey] || {}),
        supplier_id: String(supplier.id),
        purchase_place: supplier.location || ''
      };
      setPurchaseDrafts(current => ({ ...current, [materialKey]: record }));
      setShowSupplierForm(false);
      setSupplierForm({ name: '', contact_name: '', phone: '', location: '' });
      setSupplierError('');
      if (materialKey) await saveMaterialPurchase(materialKey, record);
      else setMessage('Proveedor agregado a la agenda.');
    } catch (error) {
      setMessage(error.message || 'No se pudo agregar el proveedor.');
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
      if (delivered) {
        setMessage('Proyecto marcado como entregado.');
        setShowPdfPrompt(true);
      }
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
      setShowPdfPrompt(true);
    }
  };

  const returnToPreviousStage = async () => {
    if (!selected || currentStage <= 0 || selected.status === 'ENTREGADO') return;
    const previousStage = currentStage - 1;
    const updated = await persist({
      ...production,
      current_stage: previousStage
    }, 'PRODUCCION');
    if (updated) {
      setActiveStage(previousStage);
      setNote(stages[previousStage]?.note || '');
      setMessage(`Proyecto regresado a ${STAGE_NAMES[previousStage]}. Se conservaron notas, fotos y compras.`);
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
  const projectReferenceImages = selected ? collectImageUrls(
    selected.space_image_path,
    selected.reference_image_path,
    selected.design_image_path,
    selected.quote_image_1,
    selected.quote_image_2,
    selected.quote_image_3,
    selected.quote_image_4,
    selected.render_image_path
  ) : [];
  const stageEvidence = stages.map((stage, index) => ({
    name: STAGE_NAMES[index],
    enteredAt: stage.entered_at,
    note: stage.note,
    photos: collectImageUrls(stage.photos)
  }));
  const generalMeasurements = selected
    ? Object.entries(selected)
      .filter(([key, value]) => /measurement/i.test(key) && value !== null && value !== undefined && value !== '' && typeof value !== 'object')
      .map(([key, value]) => [key === 'measurements' ? 'Medidas generales del cliente' : key.replaceAll('_', ' '), String(value)])
    : [];
  const clientSurname = selected?.name?.trim().split(/\s+/).slice(-1)[0] || 'Cliente';
  const projectSpecifications = Object.entries(projectDetails)
    .filter(([key, value]) => !/price|precio|total|margin|anticipo|cost|importe/i.test(key)
      && value !== null && value !== undefined && value !== ''
      && (typeof value !== 'object' || Array.isArray(value)))
    .map(([key, value]) => [key.replaceAll('_', ' '), Array.isArray(value) ? value.join(', ') : String(value)]);
  const handoffDetails = [
    ['Tipo de proyecto', selected?.project_type],
    ['Domicilio del proyecto', selected?.location],
    ['Tiempo de entrega', selected?.quote_delivery_time || selected?.project_timeline || selected?.delivery_date],
    ['Días de producción', selected?.production_days || projectDetails.production_days],
    ['Material / acabado', [selected?.material_type, selected?.material_type_2, selected?.furniture_color].filter(Boolean).join(' · ')],
    ['Render', selected?.render_applies === true ? 'Sí' : selected?.render_applies === false ? 'No aplica' : null],
    ['Observaciones de diseño', selected?.design_details],
    ['Notas de estimación', estimation.obsText],
    ...projectSpecifications,
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');

  const downloadProjectPdf = async () => {
    if (!selected) return;
    const element = document.getElementById('production-project-pdf');
    if (!element || typeof window.html2pdf !== 'function') {
      setMessage('No está disponible el generador de PDF. Actualiza la página e inténtalo de nuevo.');
      return;
    }
    setExportingProjectPdf(true);
    setMessage('');
    const originalStyle = element.getAttribute('style');
    try {
      Object.assign(element.style, {
        position: 'fixed',
        left: '0',
        top: '0',
        zIndex: '2147483647',
        width: '794px',
        minHeight: '100vh',
        overflow: 'visible'
      });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await Promise.all(Array.from(element.querySelectorAll('img')).map(image => {
        if (image.complete) {
          return image.naturalWidth > 0
            ? Promise.resolve()
            : Promise.reject(new Error('No se pudo cargar una de las fotos para el PDF.'));
        }
        return new Promise((resolve, reject) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', () => reject(new Error('No se pudo cargar una de las fotos para el PDF.')), { once: true });
        });
      }));
      const pdf = await window.html2pdf().set({
        margin: [10, 10, 12, 10],
        filename: `Proyecto_${selected.public_id || selected.id}_${clientSurname}.pdf`,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: {
          scale: 1.5,
          useCORS: true,
          allowTaint: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.production-pdf-photo'] }
      }).from(element).toPdf().get('pdf');
      pdf.save(`Proyecto_${selected.public_id || selected.id}_${clientSurname}.pdf`);
      setMessage('PDF del expediente descargado.');
    } catch (error) {
      setMessage(error.message || 'No se pudo generar el PDF del expediente.');
    } finally {
      if (originalStyle === null) element.removeAttribute('style');
      else element.setAttribute('style', originalStyle);
      setExportingProjectPdf(false);
    }
  };

  const downloadRenderPdf = async () => {
    if (!selected?.render_pdf_path) return;
    try {
      const response = await fetch(imageUrl(selected.render_pdf_path));
      if (!response.ok) throw new Error(`No se pudo descargar el PDF de render (${response.status})`);
      const fileUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `Render_${selected.public_id || selected.id}_${clientSurname}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
    } catch (error) {
      setMessage(error.message || 'No se pudo descargar el PDF de render.');
    }
  };

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
                    <button type="button" disabled={exportingProjectPdf} onClick={downloadProjectPdf} style={{ padding: '0.55rem 0.8rem', border: '1px solid #bfdbfe', borderRadius: 9, background: exportingProjectPdf ? '#f1f5f9' : '#eff6ff', color: exportingProjectPdf ? '#94a3b8' : '#1d4f91', fontWeight: 800, cursor: exportingProjectPdf ? 'not-allowed' : 'pointer' }}>
                      {exportingProjectPdf ? 'Preparando PDF...' : '⬇ Descargar machote completo'}
                    </button>
                    {renderPreview && (
                      <a href={imageUrl(renderPreview)} target="_blank" rel="noreferrer"
                        style={{ padding: '0.55rem 0.8rem', border: '1px solid #bbf7d0', borderRadius: 9, background: '#f0fdf4', color: '#15803d', fontWeight: 800, textDecoration: 'none' }}>
                        🎨 Render
                      </a>
                    )}
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
              <InfoCard label="Material / acabado">{[selected.material_type, selected.material_type_2, selected.furniture_color].filter(Boolean).join(' · ')}</InfoCard>
              <InfoCard label="Render">{selected.render_applies ? 'Sí' : selected.render_applies === false ? 'No aplica' : null}</InfoCard>
            </div>

            {generalMeasurements.length > 0 && (
              <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1rem', marginBottom: 14 }}>
                <h3 style={{ margin: '0 0 0.75rem', color: '#1d4f91', fontSize: '0.95rem' }}>Medidas generales del cliente</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 8 }}>
                  {generalMeasurements.map(([label, value], index) => <InfoCard key={`${label}-${index}`} label={label}>{value}</InfoCard>)}
                </div>
              </section>
            )}

            {currentStage >= 1 && (
              <section style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '1rem', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                  <div>
                    <h3 style={{ margin: '0 0 3px', color: '#1d4f91', fontSize: '0.95rem' }}>Materiales y compras</h3>
                    <div style={{ color: '#64748b', fontSize: '0.78rem' }}>Lista tomada de Estimación o del cotizador en vivo. Marca las compras conforme lleguen.</div>
                  </div>
                  <span style={{ padding: '0.35rem 0.65rem', borderRadius: 20, background: '#eff6ff', color: '#1d4f91', fontSize: '0.75rem', fontWeight: 800 }}>
                    {projectMaterials.filter(material => (purchaseDrafts[material.purchaseKey] || purchaseRecords[material.purchaseKey])?.acquired).length} / {projectMaterials.length} adquiridos
                  </span>
                </div>

                {supplierError && <div role="alert" style={{ marginBottom: 10, color: '#b91c1c', fontSize: '0.8rem' }}>{supplierError}</div>}
                {!projectMaterials.length ? (
                  <div style={{ padding: '0.8rem', background: '#f8fafc', borderRadius: 9, color: '#64748b', fontSize: '0.83rem' }}>La estimación no tiene materiales capturados todavía.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 9 }}>
                    {projectMaterials.map(material => {
                      const record = purchaseDrafts[material.purchaseKey] || purchaseRecords[material.purchaseKey] || {};
                      const supplier = suppliers.find(item => String(item.id) === String(record.supplier_id));
                      return (
                        <article key={material.purchaseKey} style={{ padding: '0.8rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 9 }}>
                            <div>
                              <div style={{ color: '#64748b', fontSize: '0.69rem', fontWeight: 800 }}>{material.sheetName}</div>
                              <div style={{ color: '#1e3a5f', fontSize: '0.86rem', fontWeight: 750 }}>
                                {material.desc || 'Material'}{Number(material.qty) > 0 ? ` · ${material.qty} ${material.unit || 'pza'}` : ''}
                              </div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 7, color: record.acquired ? '#15803d' : '#475569', fontSize: '0.78rem', fontWeight: 800, cursor: saving ? 'wait' : 'pointer' }}>
                              <input type="checkbox" checked={Boolean(record.acquired)} disabled={saving}
                                onChange={event => {
                                  const nextRecord = { ...record, acquired: event.target.checked };
                                  setPurchaseDrafts(current => ({ ...current, [material.purchaseKey]: nextRecord }));
                                  saveMaterialPurchase(material.purchaseKey, nextRecord);
                                }} />
                              Ya se adquirió
                            </label>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 8 }}>
                            <label style={{ display: 'grid', gap: 4, color: '#475569', fontSize: '0.72rem', fontWeight: 700 }}>
                              Precio pagado en tienda
                              <input type="number" min="0" step="0.01" value={record.store_price ?? ''}
                                onChange={event => setPurchaseDrafts(current => ({ ...current, [material.purchaseKey]: { ...record, store_price: event.target.value } }))}
                                onBlur={() => saveMaterialPurchase(material.purchaseKey, purchaseDrafts[material.purchaseKey] || record)}
                                placeholder="$ 0.00" style={{ boxSizing: 'border-box', width: '100%', padding: '0.55rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                            </label>
                            <label style={{ display: 'grid', gap: 4, color: '#475569', fontSize: '0.72rem', fontWeight: 700 }}>
                              Proveedor
                              <select value={record.supplier_id || ''}
                                onChange={event => {
                                  const selectedSupplier = suppliers.find(item => String(item.id) === event.target.value);
                                  const nextRecord = {
                                    ...record,
                                    supplier_id: event.target.value,
                                    purchase_place: record.purchase_place || selectedSupplier?.location || ''
                                  };
                                  setPurchaseDrafts(current => ({ ...current, [material.purchaseKey]: nextRecord }));
                                  saveMaterialPurchase(material.purchaseKey, nextRecord);
                                }}
                                style={{ boxSizing: 'border-box', width: '100%', padding: '0.55rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}>
                                <option value="">Seleccionar proveedor...</option>
                                {suppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                              </select>
                            </label>
                            <label style={{ display: 'grid', gap: 4, color: '#475569', fontSize: '0.72rem', fontWeight: 700 }}>
                              Tienda / sucursal donde se compró
                              <input value={record.purchase_place || ''}
                                onChange={event => setPurchaseDrafts(current => ({ ...current, [material.purchaseKey]: { ...record, purchase_place: event.target.value } }))}
                                onBlur={() => saveMaterialPurchase(material.purchaseKey, purchaseDrafts[material.purchaseKey] || record)}
                                placeholder="Nombre de tienda o sucursal" style={{ boxSizing: 'border-box', width: '100%', padding: '0.55rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                            </label>
                          </div>
                          {supplier && (supplier.contact_name || supplier.phone) && (
                            <div style={{ marginTop: 7, color: '#64748b', fontSize: '0.75rem' }}>
                              Contacto: {supplier.contact_name || '—'}{supplier.phone && <> · <a href={`tel:${supplier.phone}`} style={{ color: '#2563eb' }}>{supplier.phone}</a></>}
                            </div>
                          )}
                          <button type="button" onClick={() => { setSupplierForMaterial(material.purchaseKey); setShowSupplierForm(true); }}
                            style={{ marginTop: 8, padding: '0.42rem 0.6rem', border: '1px solid #bfdbfe', borderRadius: 8, background: '#fff', color: '#1d4f91', fontSize: '0.75rem', fontWeight: 750, cursor: 'pointer' }}>
                            + Agregar contacto de proveedor
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}

                {showSupplierForm && (
                  <form onSubmit={addSupplierFromProduction} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 8, marginTop: 12, padding: '0.8rem', background: '#eff6ff', borderRadius: 10 }}>
                    <strong style={{ gridColumn: '1 / -1', color: '#1d4f91', fontSize: '0.82rem' }}>Nuevo proveedor (también se guardará en la agenda)</strong>
                    <input required value={supplierForm.name} onChange={event => setSupplierForm(current => ({ ...current, name: event.target.value }))} placeholder="Nombre del proveedor *" style={{ padding: '0.55rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                    <input value={supplierForm.contact_name} onChange={event => setSupplierForm(current => ({ ...current, contact_name: event.target.value }))} placeholder="Nombre de contacto" style={{ padding: '0.55rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                    <input type="tel" value={supplierForm.phone} onChange={event => setSupplierForm(current => ({ ...current, phone: event.target.value }))} placeholder="Teléfono" style={{ padding: '0.55rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                    <input value={supplierForm.location} onChange={event => setSupplierForm(current => ({ ...current, location: event.target.value }))} placeholder="Tienda o ubicación" style={{ padding: '0.55rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                    <div style={{ display: 'flex', gap: 7 }}>
                      <button type="submit" disabled={saving} style={{ padding: '0.55rem 0.7rem', border: 0, borderRadius: 8, background: '#2563eb', color: '#fff', fontWeight: 800, cursor: saving ? 'wait' : 'pointer' }}>{saving ? 'Guardando...' : 'Guardar proveedor'}</button>
                      <button type="button" onClick={() => setShowSupplierForm(false)} style={{ padding: '0.55rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#475569', fontWeight: 700 }}>Cancelar</button>
                    </div>
                  </form>
                )}
                <div style={{ marginTop: 10, padding: '0.7rem 0.8rem', background: '#f0fdf4', color: '#166534', borderRadius: 9, fontSize: '0.78rem' }}>
                  Puedes iniciar Producción aunque falten materiales; marca las compras pendientes conforme se vayan adquiriendo.
                </div>
              </section>
            )}

            <details open style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, marginBottom: 14 }}>
              <summary style={{ padding: '0.9rem 1rem', color: '#1d4f91', fontWeight: 800, cursor: 'pointer' }}>Información de Estimación y materiales</summary>
              <div style={{ padding: '0 1rem 1rem' }}>
                {Object.keys(projectDetails).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <h3 style={{ fontSize: '0.82rem', color: '#334155' }}>Especificaciones del proyecto</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 8 }}>
                      {Object.entries(projectDetails).filter(([key, value]) => !/price|precio|total|margin|anticipo|cost/i.test(key) && typeof value !== 'object' && value !== '').map(([key, value]) => <InfoCard key={key} label={key.replaceAll('_', ' ')}>{String(value)}</InfoCard>)}
                    </div>
                  </div>
                )}
                {measurementEntries.length > 0 && (
                  <section style={{ marginBottom: 14 }}>
                    <h3 style={{ margin: '0 0 0.65rem', color: '#1d4f91', fontSize: '0.88rem' }}>Medidas y fotos de visita</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 8 }}>
                      {measurementEntries.map(entry => {
                        const photos = collectImageUrls(entry.photo);
                        return (
                          <article key={entry.key} style={{ minWidth: 0, padding: '0.75rem', background: '#f8fafc', border: '1px solid #dbe5f0', borderRadius: 10 }}>
                            <div style={{ color: '#64748b', fontSize: '0.66rem', fontWeight: 800, marginBottom: 4 }}>{entry.group}</div>
                            <div style={{ color: '#1e3a5f', fontSize: '0.78rem', fontWeight: 750 }}>{entry.label}</div>
                            {entry.value && <div style={{ color: '#334155', fontSize: '0.82rem', marginTop: 4, whiteSpace: 'pre-wrap' }}>{entry.value}</div>}
                            {photos.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                {photos.map((photo, index) => (
                                  <a key={`${entry.key}-${index}`} href={imageUrl(photo)} target="_blank" rel="noreferrer">
                                    <img src={imageUrl(photo)} alt={`Foto de ${entry.label}`} style={{ width: 116, height: 86, objectFit: 'cover', borderRadius: 7, border: '1px solid #bfdbfe' }} />
                                  </a>
                                ))}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                )}
                {estimationSheets.map((sheet, index) => (
                  <div key={`${sheet.type}-${index}`} style={{ margin: '0 0 14px', padding: '0.8rem', background: '#f8fafc', borderRadius: 10 }}>
                    <div style={{ fontWeight: 800, color: '#334155', marginBottom: 7 }}>{sheet.type || `Proyecto ${index + 1}`}</div>
                    {(Array.isArray(sheet.materials) ? sheet.materials : []).length > 0 && <div style={{ marginTop: 8 }}>
                      <div style={{ color: '#2563a8', fontSize: '0.72rem', fontWeight: 800, marginBottom: 4 }}>Materiales</div>
                      {sheet.materials.map((row, rowIndex) => <div key={row.id || rowIndex} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '0.3rem 0', borderBottom: '1px solid #e8edf3', color: '#475569', fontSize: '0.8rem' }}>
                        <span>{row.desc || 'Material'}{Number(row.qty) > 0 ? ` · ${row.qty} ${row.unit || 'pza'}` : ''}</span>
                      </div>)}
                    </div>}
                  </div>
                ))}
                {!projectMaterials.length && <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No hay materiales capturados en la estimación.</div>}
                {croquisImages.length > 0 && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: 'pointer', color: '#334155', fontSize: '0.82rem', fontWeight: 700 }}>Croquis del proyecto ({croquisImages.length})</summary>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 8 }}>
                      {croquisImages.map((photo, index) =>
                        <a key={index} href={imageUrl(photo)} target="_blank" rel="noreferrer"><img src={imageUrl(photo)} alt={`Referencia de estimación ${index + 1}`} style={{ width: 130, height: 95, objectFit: 'cover', borderRadius: 8, border: '1px solid #dbe3ec' }} /></a>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </details>

            {selected.render_pdf_path && (
              <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '0.9rem 1rem', marginBottom: 14 }}>
                <strong style={{ color: '#334155', fontSize: '0.85rem' }}>PDF de render disponible</strong>
                <a href={imageUrl(selected.render_pdf_path)} target="_blank" rel="noreferrer" style={{ padding: '0.5rem 0.75rem', borderRadius: 8, background: '#eff6ff', color: '#1d4f91', fontSize: '0.8rem', fontWeight: 800, textDecoration: 'none' }}>Ver PDF</a>
                <button type="button" onClick={downloadRenderPdf} style={{ padding: '0.5rem 0.75rem', border: 0, borderRadius: 8, background: '#1d4ed8', color: '#fff', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>Descargar PDF</button>
              </section>
            )}

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
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {currentStage > 0 && selected.status !== 'ENTREGADO' && (
                    <button type="button" disabled={saving} onClick={returnToPreviousStage}
                      style={{ padding: '0.65rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: 9, background: '#fff', color: '#475569', fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
                      ← Regresar a {STAGE_NAMES[currentStage - 1]}
                    </button>
                  )}
                  <button type="button" disabled={saving || selected.status === 'ENTREGADO'} onClick={advanceStage} style={{ padding: '0.65rem 1rem', border: 0, borderRadius: 9, background: selected.status === 'ENTREGADO' ? '#cbd5e1' : '#2563eb', color: '#fff', fontWeight: 800, cursor: selected.status === 'ENTREGADO' ? 'not-allowed' : 'pointer' }}>
                      {selected.status === 'ENTREGADO' ? 'Proyecto entregado' : currentStage >= STAGE_NAMES.length - 1 ? 'Confirmar entrega' : currentStage === 0 ? 'Pasar a Preparación de materiales →' : 'Guardar y avanzar →'}
                  </button>
                </div>
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
            <div id="production-project-pdf" style={{ position: 'fixed', left: '-10000px', top: 0, width: '794px', padding: '28px', background: '#fff', color: '#1e293b', fontFamily: 'Arial, sans-serif', fontSize: '12px', lineHeight: 1.5 }}>
              <h1 style={{ margin: '0 0 4px', color: '#1d4f91', fontSize: '22px' }}>Machote de trabajo — Producción</h1>
              <p style={{ margin: '0 0 16px', color: '#475569' }}>ID: {selected.public_id || selected.id} · Cliente: {clientSurname}</p>
              <h2 style={{ margin: '0 0 8px', fontSize: '15px' }}>Datos para las áreas</h2>
              {handoffDetails.length ? handoffDetails.map(([label, value], index) => (
                <p key={`handoff-${index}`} style={{ margin: '0 0 6px' }}><strong>{label}:</strong> {value}</p>
              )) : <p>Sin datos generales adicionales.</p>}
              <h2 style={{ margin: '0 0 8px', fontSize: '15px' }}>Medidas generales del cliente</h2>
              {generalMeasurements.length ? generalMeasurements.map(([label, value], index) => (
                <p key={`${label}-${index}`} style={{ margin: '0 0 6px' }}><strong>{label}:</strong> {value}</p>
              )) : <p style={{ margin: '0 0 14px' }}>Sin medidas generales capturadas.</p>}
              <h2 style={{ margin: '16px 0 8px', fontSize: '15px' }}>Medidas capturadas y fotos de visita</h2>
              {measurementEntries.length ? measurementEntries.map(entry => (
                <div key={entry.key} style={{ margin: '0 0 10px', padding: 8, border: '1px solid #dbe5f0', borderRadius: 6, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <p style={{ margin: '0 0 5px' }}>
                    <strong>{entry.group} — {entry.label}:</strong> {entry.value || 'Sin medida anotada'}
                  </p>
                  {collectImageUrls(entry.photo).map((photo, index) => (
                    <img key={`${entry.key}-${index}`} src={imageUrl(photo)} alt={`Foto de ${entry.label}`} style={{ display: 'block', maxWidth: '100%', maxHeight: '260px', objectFit: 'contain', marginTop: 5 }} />
                  ))}
                </div>
              )) : <p>Sin medidas de visita capturadas en Estimación.</p>}
              <h2 style={{ margin: '16px 0 8px', fontSize: '15px' }}>Materiales</h2>
              {projectMaterials.length ? projectMaterials.map((material, index) => (
                <p key={`${material.sheetName}-${material.id || index}`} style={{ margin: '0 0 4px' }}>
                  {material.sheetName}: {material.desc || 'Material'}{Number(material.qty) > 0 ? ` · ${material.qty} ${material.unit || 'pza'}` : ''}
                </p>
              )) : <p>Sin materiales capturados.</p>}
              {selected.render_pdf_path && (
                <p style={{ margin: '0 0 10px' }}>
                  <strong>PDF de render:</strong>{' '}
                  <a href={imageUrl(selected.render_pdf_path)}>{imageUrl(selected.render_pdf_path)}</a>
                </p>
              )}
              {croquisImages.length > 0 && (
                <>
                  <h2 style={{ margin: '16px 0 8px', fontSize: '15px' }}>Croquis del proyecto</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {croquisImages.map((photo, index) => (
                      <figure className="production-pdf-photo" key={`croquis-${index}`} style={{ margin: 0, padding: 8, border: '1px solid #cbd5e1', borderRadius: 8, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                        <img src={imageUrl(photo)} alt={`Croquis ${index + 1}`} style={{ display: 'block', width: '100%', maxHeight: '330px', objectFit: 'contain' }} />
                        <figcaption style={{ marginTop: 4, color: '#475569', fontSize: '10px' }}>Croquis {index + 1}</figcaption>
                      </figure>
                    ))}
                  </div>
                </>
              )}
              <h2 style={{ margin: '16px 0 8px', fontSize: '15px' }}>Fotos del proyecto</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {projectReferenceImages.map((photo, index) => (
                  <figure className="production-pdf-photo" key={`${photo.slice(0, 80)}-${index}`} style={{ margin: 0, padding: 8, border: '1px solid #cbd5e1', borderRadius: 8, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <img src={imageUrl(photo)} alt={photo === selected.render_image_path ? 'Render del proyecto' : `Foto de proyecto ${index + 1}`} style={{ display: 'block', width: '100%', maxHeight: '330px', objectFit: 'contain' }} />
                    <figcaption style={{ marginTop: 4, color: '#475569', fontSize: '10px' }}>{photo === selected.render_image_path ? 'Render del proyecto' : `Imagen ${index + 1}`}</figcaption>
                  </figure>
                ))}
              </div>
              {stageEvidence.some(stage => stage.note || stage.photos.length) && (
                <>
                  <h2 style={{ margin: '16px 0 8px', fontSize: '15px' }}>Avances de producción</h2>
                  {stageEvidence.map((stage, index) => (stage.note || stage.photos.length > 0) && (
                    <section key={`stage-${index}`} style={{ margin: '0 0 12px', padding: 8, border: '1px solid #cbd5e1', borderRadius: 8, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                      <h3 style={{ margin: '0 0 4px', color: '#1d4f91', fontSize: '13px' }}>{stage.name}</h3>
                      <p style={{ margin: '0 0 5px', color: '#64748b' }}>Ingreso: {formatDate(stage.enteredAt)}</p>
                      {stage.note && <p style={{ margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{stage.note}</p>}
                      {stage.photos.map((photo, photoIndex) => (
                        <img key={`stage-${index}-photo-${photoIndex}`} src={imageUrl(photo)} alt={`Evidencia ${photoIndex + 1} - ${stage.name}`} style={{ display: 'block', maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', margin: '6px 0' }} />
                      ))}
                    </section>
                  ))}
                </>
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

      {showPdfPrompt && selected && (
        <div role="presentation" onClick={() => setShowPdfPrompt(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15, 23, 42, 0.55)' }}>
          <section role="dialog" aria-modal="true" aria-labelledby="production-pdf-prompt-title"
            onClick={event => event.stopPropagation()}
            style={{ width: 'min(440px, 100%)', padding: '1.3rem', background: '#fff', borderRadius: 16, boxShadow: '0 20px 50px rgba(15,23,42,0.25)' }}>
            <h2 id="production-pdf-prompt-title" style={{ margin: '0 0 0.5rem', color: '#172b4d', fontSize: '1.1rem' }}>Etapa actualizada</h2>
            <p style={{ margin: '0 0 1.1rem', color: '#526174', lineHeight: 1.5 }}>
              El proyecto ya está en <strong>{STAGE_NAMES[currentStage]}</strong>. ¿Quieres descargar el machote completo para Compras y Carpintería?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" onClick={() => setShowPdfPrompt(false)}
                style={{ padding: '0.65rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: 9, background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>
                Continuar sin descargar
              </button>
              <button type="button" disabled={exportingProjectPdf} onClick={() => { setShowPdfPrompt(false); downloadProjectPdf(); }}
                style={{ padding: '0.65rem 0.9rem', border: 0, borderRadius: 9, background: '#2563eb', color: '#fff', fontWeight: 800, cursor: exportingProjectPdf ? 'wait' : 'pointer' }}>
                {exportingProjectPdf ? 'Preparando PDF...' : 'Sí, descargar PDF'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default Pedidos;
