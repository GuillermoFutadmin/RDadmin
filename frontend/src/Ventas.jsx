import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API = '';
const UNITS = ['pza', 'metro', 'ml', 'kilo', 'litro', 'pie', 'm2', 'par', 'rollo', 'caja', 'día'];
const TEMPLATE_KEYS = ['Cocina', 'Clóset', 'Puerta Sólida', 'Puerta Tambor'];

function formatCurrency(val) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
}

// ─── Estilos compartidos de modal ────────────────────────────────────────────
const labelSt = {
  display: 'flex', flexDirection: 'column', gap: '4px',
  fontSize: '0.82rem', fontWeight: '600', color: '#475569',
};
const inputSt = {
  padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1',
  fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box',
};

// ─── Modal: Editar ítem durante cotización ───────────────────────────────────
function EditItemModal({ item, onSave, onClose }) {
  const [desc,           setDesc]           = useState(item.desc);
  const [price,          setPrice]          = useState(item.price);
  const [unit,           setUnit]           = useState(item.unit || 'pza');
  const [saveToTemplate, setSaveToTemplate] = useState(false);
  const backdropRef = useRef(null);

  return (
    <div
      ref={backdropRef}
      onClick={e => { if (e.target === backdropRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      }}
    >
      <div style={{
        background: 'white', borderRadius: '14px', padding: '1.8rem 2rem',
        width: '390px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        fontFamily: 'sans-serif',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h3 style={{ margin: 0, color: '#8b5a2b', fontSize: '1rem' }}>✏️ Editar ítem</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#888' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {/* Descripción */}
          <label style={labelSt}>
            Descripción
            <input value={desc} onChange={e => setDesc(e.target.value)} style={inputSt} placeholder="Nombre del ítem" />
          </label>

          {/* Precio + Unidad */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
            <label style={labelSt}>
              Precio unitario
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>$</span>
                <input
                  type="number" value={price}
                  onChange={e => setPrice(e.target.value)}
                  style={{ ...inputSt, width: '100%' }} placeholder="0"
                />
              </div>
            </label>
            <label style={labelSt}>
              Unidad
              <select value={unit} onChange={e => setUnit(e.target.value)} style={{ ...inputSt, cursor: 'pointer' }}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
          </div>

          {/* Guardar al machote */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            cursor: 'pointer', padding: '10px 12px', borderRadius: '8px',
            background: saveToTemplate ? '#fff7ed' : '#f8fafc',
            border: `1px solid ${saveToTemplate ? '#fed7aa' : '#e2e8f0'}`,
            transition: 'all 0.15s',
          }}>
            <input
              type="checkbox" checked={saveToTemplate}
              onChange={e => setSaveToTemplate(e.target.checked)}
              style={{ marginTop: '2px', accentColor: '#8b5a2b', width: '15px', height: '15px', flexShrink: 0 }}
            />
            <span style={{ fontSize: '0.85rem', color: '#374151', lineHeight: '1.4' }}>
              <strong>Guardar en el machote base</strong>
              <br />
              <span style={{ color: '#6b7280', fontSize: '0.78rem' }}>
                El precio actualizado se usará en valoraciones futuras
              </span>
            </span>
          </label>

          <button
            onClick={() => onSave({ desc, price: Number(price), unit, saveToTemplate })}
            style={{
              padding: '0.7rem', background: '#8b5a2b', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontWeight: '700', fontSize: '0.95rem',
            }}
          >
            ✔ Aplicar cambio
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Elegir machote para nueva hoja ───────────────────────────────────
function AddSheetModal({ templatesDb, onAdd, onClose }) {
  const backdropRef = useRef(null);
  return (
    <div
      ref={backdropRef}
      onClick={e => { if (e.target === backdropRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      }}
    >
      <div style={{
        background: 'white', borderRadius: '14px', padding: '2rem',
        width: '420px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        fontFamily: 'sans-serif',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: '#8b5a2b' }}>➕ Agregar hoja</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.2rem 0' }}>
          Selecciona el tipo de proyecto para la nueva hoja:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {TEMPLATE_KEYS.map(type => {
            const available = !!templatesDb[type];
            return (
              <button
                key={type}
                onClick={() => available && onAdd(type)}
                style={{
                  padding: '16px 12px', fontSize: '0.95rem',
                  background: 'white', border: '2px solid #8b5a2b',
                  borderRadius: '10px', color: '#8b5a2b',
                  cursor: available ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold', opacity: available ? 1 : 0.4,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (available) e.currentTarget.style.background = '#fff7ed'; }}
                onMouseLeave={e => { if (available) e.currentTarget.style.background = 'white'; }}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
function Ventas() {
  const [mode, setMode] = useState('capture'); // 'capture' | 'edit' | 'history'
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState(null); // { msg, type }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Templates DB ──────────────────────────────────────────────────────────
  const [templatesDb, setTemplatesDb] = useState({});

  // ── MULTI-SHEET STATE (modo capture) ─────────────────────────────────────
  const [sheets,          setSheets]          = useState([]);
  const [activeSheetIdx,  setActiveSheetIdx]  = useState(0); // number | 'summary'
  const [globalMargin,    setGlobalMargin]    = useState(30);

  // ── EDIT MODE STATE (modo edit) ───────────────────────────────────────────
  const [editProjectType, setEditProjectType] = useState('');
  const [editMaterials,   setEditMaterials]   = useState([]);
  const [editLabor,       setEditLabor]       = useState([]);
  const [editConcepts,    setEditConcepts]    = useState([]);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [editingItem,      setEditingItem]      = useState(null); // { sheetIdx, section, id }
  const [showAddSheet,     setShowAddSheet]     = useState(false);

  // ── Link / Prospecto ──────────────────────────────────────────────────────
  const [prospects,            setProspects]            = useState([]);
  const [standaloneValuations, setStandaloneValuations] = useState([]);
  const [selectedProspectId,   setSelectedProspectId]   = useState('');
  const [linkToProspect,       setLinkToProspect]       = useState('yes');
  const [standaloneName,       setStandaloneName]       = useState('');
  const [isSaving,             setIsSaving]             = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => { fetchTemplates(); fetchProspects(); }, [mode]);

  const fetchTemplates = async () => {
    try {
      const res  = await fetch(`${API}/api/templates/`);
      const data = await res.json();
      const tpls = {};
      // Normalizar nombres: buscar el TEMPLATE_KEY más parecido ignorando acentos y tildes
      const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      data.forEach(t => {
        const matched = TEMPLATE_KEYS.find(k => normalize(k) === normalize(t.name));
        const key = matched || t.name;
        tpls[key] = JSON.parse(t.data);
      });
      setTemplatesDb(tpls);
    } catch (err) { console.error('fetchTemplates:', err); }
  };

  const fetchProspects = async () => {
    try {
      const res  = await fetch(`${API}/api/prospects`);
      const data = await res.json();
      // Solo mostrar prospectos SIN valoración guardada; los que ya tienen valuation_data quedan ocultos
      setProspects(data.filter(p => p.status !== 'Valoración' && p.status !== 'Valoracion' && p.status !== 'Cotización' && !p.valuation_data));
      setStandaloneValuations(data.filter(p => p.status === 'Valoración' || p.status === 'Valoracion'));
    } catch (err) { console.error('fetchProspects:', err); }
  };

  const normalizeItem = i => ({ ...i, unit: i.unit || 'pza', qty: '' });

  // ── Estándares para Mano de obra y Conceptos ──────────────────────────────
  const STD_LABOR = [
    { desc: 'Carpintero', unit: 'pza' },
    { desc: 'Ayudante', unit: 'pza' },
    { desc: 'Pintor', unit: 'pza' },
    { desc: 'Instalación/Traslado', unit: 'dia' }
  ];
  const STD_CONCEPTS = [
    { desc: 'Taller/Renta', unit: 'dia' },
    { desc: 'Luz', unit: 'dia' },
    { desc: 'Agua', unit: 'dia' },
    { desc: 'Gasolina', unit: 'dia' },
    { desc: 'Herramienta', unit: 'dia' }
  ];

  const mergeWithStandards = (existing, standards) => {
    const arr = [...(existing || [])];
    standards.forEach(std => {
      if (!arr.some(item => (item.desc || '').trim().toLowerCase() === std.desc.toLowerCase())) {
        arr.push({ id: Date.now() + Math.random(), desc: std.desc, price: 0, unit: std.unit || 'pza' });
      }
    });
    return arr;
  };

  // ── Hojas: agregar / eliminar ─────────────────────────────────────────────
  const buildSheet = (type) => {
    const tpl = templatesDb[type];
    if (!tpl) return null;
    return {
      id:        Date.now() + Math.random(),
      type,
      materials: tpl.materiales.map(normalizeItem),
      labor:     mergeWithStandards(tpl.mano_obra, STD_LABOR).map(normalizeItem),
      concepts:  mergeWithStandards(tpl.conceptos, STD_CONCEPTS).map(normalizeItem),
    };
  };

  const addSheet = (type) => {
    const sheet = buildSheet(type);
    if (!sheet) return;
    setSheets(prev => {
      // Copiar precios de labor y concepts de la primera hoja existente
      if (prev.length > 0) {
        const src = prev[0];
        const copyPrices = (newArr, srcArr) =>
          newArr.map(item => {
            const match = srcArr.find(s => (s.desc || '').trim().toLowerCase() === (item.desc || '').trim().toLowerCase());
            return match ? { ...item, price: match.price } : item;
          });
        sheet.labor    = copyPrices(sheet.labor,    src.labor);
        sheet.concepts = copyPrices(sheet.concepts, src.concepts);
      }
      const next = [...prev, sheet];
      setActiveSheetIdx(next.length - 1);
      return next;
    });
    setShowAddSheet(false);
  };

  const removeSheet = (idx) => {
    setSheets(prev => {
      const next = prev.filter((_, i) => i !== idx);
      setActiveSheetIdx(ai => {
        if (ai === 'summary') return next.length > 0 ? 'summary' : 0;
        if (ai >= next.length) return Math.max(0, next.length - 1);
        if (ai > idx) return ai - 1;
        return ai;
      });
      return next;
    });
  };

  // ── Iniciar primera hoja (captura) ────────────────────────────────────────
  const initFirstSheet = (type) => {
    if (linkToProspect === 'yes' && !selectedProspectId) {
      alert('Por favor selecciona un prospecto primero.');
      return;
    }
    if (linkToProspect === 'no' && !standaloneName) {
      alert('Por favor ingresa un nombre o alias para el respaldo.');
      return;
    }
    const sheet = buildSheet(type);
    if (!sheet) return;
    setSheets([sheet]);
    setActiveSheetIdx(0);
    setStep(2);
  };

  // ── Iniciar edit mode ─────────────────────────────────────────────────────
  const initEditTemplate = (type) => {
    const tpl = templatesDb[type];
    if (!tpl) return;
    setEditMaterials(tpl.materiales.map(i => ({ ...i, unit: i.unit || 'pza' })));
    setEditLabor(mergeWithStandards(tpl.mano_obra, STD_LABOR).map(i   => ({ ...i, unit: i.unit || 'pza' })));
    setEditConcepts(mergeWithStandards(tpl.conceptos, STD_CONCEPTS).map(i => ({ ...i, unit: i.unit || 'pza' })));
    setEditProjectType(type);
    setStep(2);
  };

  // ── Actualizar ítem en una hoja (sincroniza labor/concepts a todas las hojas) ────
  const updateSheetItem = (sheetIdx, section, id, field, value) => {
    setSheets(prev => {
      // Primero obtenemos el desc del item que se modifica
      const srcSheet = prev[sheetIdx];
      let desc = null;
      if (srcSheet) {
        const srcArr = section === 'mat' ? srcSheet.materials : section === 'lab' ? srcSheet.labor : srcSheet.concepts;
        const srcItem = srcArr?.find(m => m.id === id);
        if (srcItem) desc = (srcItem.desc || '').trim().toLowerCase();
      }

      return prev.map((sheet, si) => {
        // Para materiales: solo actualizar la hoja editada
        if (section === 'mat') {
          if (si !== sheetIdx) return sheet;
          return { ...sheet, materials: sheet.materials.map(m => m.id === id ? { ...m, [field]: value } : m) };
        }

        // Para labor/concepts con campo 'price': sincronizar a todas las hojas por descripción
        const syncArr = (arr) => arr.map(m => {
          if (si === sheetIdx && m.id === id) return { ...m, [field]: value };
          // Sincronizar precio a otras hojas si es el mismo concepto
          if (si !== sheetIdx && field === 'price' && desc && (m.desc || '').trim().toLowerCase() === desc) {
            return { ...m, price: value };
          }
          return m;
        });

        if (section === 'lab') return { ...sheet, labor:    syncArr(sheet.labor) };
        if (section === 'con') return { ...sheet, concepts: syncArr(sheet.concepts) };
        return sheet;
      });
    });
  };

  // ── Modal editar ítem ─────────────────────────────────────────────────────
  const openEditModal  = (sheetIdx, section, id) => setEditingItem({ sheetIdx, section, id });
  const closeEditModal = () => setEditingItem(null);

  const applyItemEdit = async ({ desc, price, unit, saveToTemplate }) => {
    const { sheetIdx, section, id } = editingItem;

    // Actualizar local en la hoja — si es labor/concepts sincronizar precio a todas las hojas
    setSheets(prev => {
      // Obtener la desc original del item
      const srcSheet = prev[sheetIdx];
      const srcArr = section === 'mat' ? srcSheet?.materials : section === 'lab' ? srcSheet?.labor : srcSheet?.concepts;
      const srcItem = srcArr?.find(m => m.id === id);
      const origDesc = (srcItem?.desc || desc || '').trim().toLowerCase();

      return prev.map((sheet, si) => {
        // Materiales: solo actualizar la hoja editada
        if (section === 'mat') {
          if (si !== sheetIdx) return sheet;
          return { ...sheet, materials: sheet.materials.map(m => m.id === id ? { ...m, desc, price, unit } : m) };
        }
        // Labor/Concepts: aplicar cambio completo en la hoja editada, solo precio en las demás
        const syncArr = (arr) => arr.map(m => {
          if (si === sheetIdx && m.id === id) return { ...m, desc, price, unit };
          if (si !== sheetIdx && origDesc && (m.desc || '').trim().toLowerCase() === origDesc) return { ...m, price };
          return m;
        });
        if (section === 'lab') return { ...sheet, labor:    syncArr(sheet.labor) };
        if (section === 'con') return { ...sheet, concepts: syncArr(sheet.concepts) };
        return sheet;
      });
    });

    // Guardar al machote si se pidió
    if (saveToTemplate) {
      const tplType   = sheets[sheetIdx]?.type;
      const currentTpl = templatesDb[tplType];
      if (currentTpl) {
        const upd = arr => arr.map(m => m.id === id ? { ...m, desc, price, unit } : m);
        const updatedData = {
          materiales: section === 'mat' ? upd(currentTpl.materiales) : currentTpl.materiales,
          mano_obra:  section === 'lab' ? upd(currentTpl.mano_obra)  : currentTpl.mano_obra,
          conceptos:  section === 'con' ? upd(currentTpl.conceptos)  : currentTpl.conceptos,
        };
        try {
          await fetch(`${API}/api/templates/${tplType}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: tplType, data: JSON.stringify(updatedData) }),
          });
          await fetchTemplates();
        } catch (err) {
          console.error('Error guardando al machote:', err);
        }
      }
    }
    closeEditModal();
  };

  // ── Edit mode: handlers ───────────────────────────────────────────────────
  const mkEditChanger = (setter) => (id, field, value) =>
    setter(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));

  const addEditRow = (type) => {
    const row = { id: Date.now().toString(), desc: '', price: 0, unit: 'pza' };
    if (type === 'mat') setEditMaterials(p => [...p, row]);
    if (type === 'lab') setEditLabor(p    => [...p, row]);
    if (type === 'con') setEditConcepts(p => [...p, row]);
  };

  const removeEditRow = (type, id) => {
    if (type === 'mat') setEditMaterials(p => p.filter(m => m.id !== id));
    if (type === 'lab') setEditLabor(p    => p.filter(m => m.id !== id));
    if (type === 'con') setEditConcepts(p => p.filter(m => m.id !== id));
  };

  const saveTemplateEdits = async () => {
    setIsSaving(true);
    const updatedData = {
      materiales: editMaterials.map(m => ({ id: m.id, desc: m.desc, price: Number(m.price), unit: m.unit || 'pza' })),
      mano_obra:  editLabor.map(m    => ({ id: m.id, desc: m.desc, price: Number(m.price), unit: m.unit || 'pza' })),
      conceptos:  editConcepts.map(m => ({ id: m.id, desc: m.desc, price: Number(m.price), unit: m.unit || 'pza' })),
    };
    try {
      await fetch(`${API}/api/templates/${editProjectType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editProjectType, data: JSON.stringify(updatedData) }),
      });
      alert('Machote actualizado correctamente');
      await fetchTemplates();
      setStep(1);
    } catch (err) {
      console.error(err);
      alert('Error al guardar machote');
    }
    setIsSaving(false);
  };

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const getSheetTotals = (sheet) => {
    const sum = arr => arr.reduce((s, i) => s + parseFloat(i.qty || 0) * parseFloat(i.price || 0), 0);
    const mat  = sum(sheet.materials);
    const lab  = sum(sheet.labor);
    const con  = sum(sheet.concepts);
    const cost = mat + lab + con;
    const mg   = cost * (globalMargin / 100);
    return { mat, lab, con, cost, mg, total: cost + mg };
  };

  const grandCost  = sheets.reduce((s, sh) => s + getSheetTotals(sh).cost, 0);
  const grandMg    = grandCost * (globalMargin / 100);
  const grandTotal = grandCost + grandMg;

  // ── Guardar cotización ────────────────────────────────────────────────────
  const handleSaveCapture = async () => {
    if (sheets.length === 0) { showToast('No hay hojas de cotización.', 'error'); return; }
    setIsSaving(true);
    const valuationDataObj = {
      sheets: sheets.map(sh => ({
        type:      sh.type,
        materials: sh.materials,
        labor:     sh.labor,
        concepts:  sh.concepts,
        totals:    getSheetTotals(sh),
      })),
      globalMargin,
      grandTotal,
    };
    try {
      if (linkToProspect === 'yes' && selectedProspectId) {
        const current = prospects.find(p => p.id === Number(selectedProspectId));
        if (!current) throw new Error('Prospecto no encontrado');
        const updated = {
          ...current,
          status:          'Valoración',
          estimated_price: grandTotal.toString(),
          valuation_data:  JSON.stringify(valuationDataObj),
        };
        const res = await fetch(`${API}/api/prospects/${selectedProspectId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showToast('Valoración guardada — prospecto avanzó a etapa Valoración ✓', 'success');
      } else {
        const newP = {
          name:            standaloneName || 'Valoración WhatsApp',
          project_type:    sheets.map(s => s.type).join(', '),
          estimated_price: grandTotal.toString(),
          status:          'Valoración',
          valuation_data:  JSON.stringify(valuationDataObj),
        };
        const res = await fetch(`${API}/api/prospects`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newP),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showToast('Valoración guardada como respaldo.', 'success');
      }
      setStep(1);
      setSheets([]);
      setActiveSheetIdx(0);
      setLinkToProspect('yes');
      setSelectedProspectId('');
      setStandaloneName('');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar: ' + err.message, 'error');
    }
    setIsSaving(false);
  };

  const deleteStandalone = async (id) => {
    if (!window.confirm('¿Eliminar este respaldo?')) return;
    try {
      await fetch(`${API}/api/prospects/${id}`, { method: 'DELETE' });
      fetchProspects();
    } catch (e) { alert('Error al eliminar'); }
  };

  // ── Datos del modal de edición ────────────────────────────────────────────
  const getEditingItemData = () => {
    if (!editingItem) return null;
    const { sheetIdx, section, id } = editingItem;
    const sheet = sheets[sheetIdx];
    if (!sheet) return null;
    if (section === 'mat') return sheet.materials.find(m => m.id === id);
    if (section === 'lab') return sheet.labor.find(m    => m.id === id);
    if (section === 'con') return sheet.concepts.find(m => m.id === id);
    return null;
  };

  const activeProspect = linkToProspect === 'yes' && selectedProspectId
    ? prospects.find(p => p.id === Number(selectedProspectId))
    : null;

  // ── Estilos de tabla ──────────────────────────────────────────────────────
  const tblSt  = { width: '100%', borderCollapse: 'collapse', marginBottom: '1.4rem' };
  const thSt   = { background: '#8b5a2b', color: 'white', padding: '10px', textAlign: 'left', border: '1px solid #ddd' };
  const tdSt   = { padding: '8px', border: '1px solid #ddd', verticalAlign: 'middle' };
  const subRow = { background: '#d18c4c', color: 'white', fontWeight: 'bold' };

  // ── Render: fila de captura ───────────────────────────────────────────────
  const renderCaptureRow = (item, sheetIdx, section) => (
    <tr key={item.id}>
      {/* Desc */}
      <td style={tdSt}>{item.desc}</td>

      {/* Cantidad + unidad */}
      <td style={tdSt}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="number" value={item.qty} placeholder="0" min="0"
            onChange={e => updateSheetItem(sheetIdx, section, item.id, 'qty', e.target.value)}
            style={{ width: '72px', padding: '4px', flexShrink: 0 }}
          />
          <span style={{
            background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '5px',
            padding: '2px 7px', fontSize: '0.75rem', color: '#475569',
            fontWeight: '600', whiteSpace: 'nowrap',
          }}>{item.unit || 'pza'}</span>
        </div>
      </td>

      {/* Precio + botón editar */}
      <td style={tdSt}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
          <span>{formatCurrency(item.price)}</span>
          <button
            title="Editar ítem"
            onClick={() => openEditModal(sheetIdx, section, item.id)}
            style={{
              background: 'none', border: '1px solid #cbd5e1', borderRadius: '5px',
              cursor: 'pointer', padding: '2px 6px', fontSize: '0.75rem', color: '#8b5a2b', lineHeight: 1,
            }}
          >✏️</button>
        </div>
      </td>

      {/* Total */}
      <td style={{ ...tdSt, textAlign: 'right', fontWeight: '600' }}>
        {formatCurrency(parseFloat(item.qty || 0) * parseFloat(item.price || 0))}
      </td>
    </tr>
  );

  // ── Render: fila de edit mode ─────────────────────────────────────────────
  const renderEditRow = (item, changer, type) => (
    <tr key={item.id}>
      <td style={tdSt}>
        <input type="text" value={item.desc}
          onChange={e => changer(item.id, 'desc', e.target.value)}
          style={{ width: '100%', padding: '4px', boxSizing: 'border-box' }} />
      </td>
      <td style={tdSt}>
        <input type="number" value={item.price}
          onChange={e => changer(item.id, 'price', e.target.value)}
          style={{ width: '90px', padding: '4px' }} />
      </td>
      <td style={tdSt}>
        <select value={item.unit || 'pza'} onChange={e => changer(item.id, 'unit', e.target.value)}
          style={{ padding: '4px 6px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '0.85rem' }}>
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      <td style={tdSt}>
        <button onClick={() => removeEditRow(type, item.id)}
          style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem' }}>
          ❌
        </button>
      </td>
    </tr>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px', maxWidth: '1040px', margin: '0 auto', fontFamily: 'sans-serif' }}>

      {/* ── MODALES ── */}
      {editingItem && getEditingItemData() && (
        <EditItemModal item={getEditingItemData()} onSave={applyItemEdit} onClose={closeEditModal} />
      )}
      {showAddSheet && (
        <AddSheetModal templatesDb={templatesDb} onAdd={addSheet} onClose={() => setShowAddSheet(false)} />
      )}

      {/* ────────────────────── STEP 1 ────────────────────── */}
      {step === 1 && (
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <h1 style={{ color: '#8b5a2b' }}>Cotizador Detallado</h1>
          <p style={{ color: '#555', marginBottom: '24px' }}>
            {mode === 'capture' ? 'Configura el prospecto y selecciona el primer machote'
              : mode === 'edit'  ? 'Selecciona el machote que deseas editar'
              : 'Historial de valoraciones sueltas (WhatsApp)'}
          </p>

          {/* Tabs de modo */}
          <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
            {[['capture','💰 Cotizar'],['edit','⚙️ Configurar'],['history','🗂 Respaldos']].map(([key, lbl]) => (
              <button key={key} onClick={() => { setMode(key); setStep(1); }}
                style={{
                  padding: '10px 20px', background: mode === key ? '#8b5a2b' : '#eee',
                  color: mode === key ? 'white' : '#333', border: 'none',
                  borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold',
                }}>{lbl}</button>
            ))}
          </div>

          {/* ── Paso 1: Prospecto ── */}
          {mode === 'capture' && (
            <div style={{ background: 'white', padding: '22px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '28px', textAlign: 'left', maxWidth: '640px', margin: '0 auto 28px auto' }}>
              <h3 style={{ color: '#8b5a2b', marginTop: 0 }}>Paso 1: Asignar prospecto</h3>
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.2rem' }}>
                {[['yes','Prospecto existente'],['no','Respaldo WhatsApp']].map(([val, lbl]) => (
                  <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="radio" checked={linkToProspect === val} onChange={() => setLinkToProspect(val)} />
                    {lbl}
                  </label>
                ))}
              </div>
              {linkToProspect === 'yes' && (
                <>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Seleccionar Prospecto:</label>
                  <select value={selectedProspectId} onChange={e => setSelectedProspectId(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
                    <option value="">-- Selecciona --</option>
                    {prospects.map(p => (
                      <option key={p.id} value={p.id}>
                        Folio {p.public_id || p.id} – {p.name} ({p.project_type || 'Sin tipo'})
                      </option>
                    ))}
                  </select>
                </>
              )}
              {linkToProspect === 'no' && (
                <>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Alias / Nombre:</label>
                  <input type="text" value={standaloneName} onChange={e => setStandaloneName(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                    placeholder="Ej. Juan WhatsApp" />
                </>
              )}
            </div>
          )}

          {/* ── Selección de machote ── */}
          {(mode === 'capture' || mode === 'edit') && (
            <div>
              <h3 style={{ color: '#8b5a2b', marginBottom: '18px' }}>
                {mode === 'capture' ? 'Paso 2: Selecciona el primer machote' : 'Selecciona el machote a editar'}
              </h3>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {TEMPLATE_KEYS.map(type => (
                  <button key={type}
                    onClick={() => mode === 'capture' ? initFirstSheet(type) : initEditTemplate(type)}
                    style={{
                      padding: '20px 36px', fontSize: '1.1rem', background: 'white',
                      border: mode === 'edit' ? '2px dashed #8b5a2b' : '2px solid #8b5a2b',
                      borderRadius: '10px', color: '#8b5a2b', cursor: 'pointer', fontWeight: 'bold',
                    }}>
                    {type}{mode === 'edit' ? ' ✏️' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Historial ── */}
          {mode === 'history' && (
            <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <table style={tblSt}>
                <thead>
                  <tr>{['Nombre','Tipo','Precio Estimado','Fecha','Acciones'].map(h => <th key={h} style={thSt}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {standaloneValuations.length === 0 ? (
                    <tr><td colSpan="5" style={{ ...tdSt, textAlign: 'center', color: '#94a3b8' }}>No hay respaldos guardados.</td></tr>
                  ) : standaloneValuations.map(sv => (
                    <tr key={sv.id}>
                      <td style={tdSt}><strong>{sv.name}</strong></td>
                      <td style={tdSt}>{sv.project_type || 'N/A'}</td>
                      <td style={tdSt}>{formatCurrency(sv.estimated_price)}</td>
                      <td style={tdSt}>{new Date(sv.capture_date).toLocaleDateString()}</td>
                      <td style={tdSt}>
                        <button onClick={() => alert(sv.valuation_data ? JSON.stringify(JSON.parse(sv.valuation_data), null, 2) : 'Sin datos')}
                          style={{ padding: '5px 10px', background: '#eab308', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '6px' }}>
                          Ver
                        </button>
                        <button onClick={() => deleteStandalone(sv.id)}
                          style={{ padding: '5px 10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────── STEP 2 · CAPTURE MODE ────────────────────── */}
      {step === 2 && mode === 'capture' && (
        <div>
          {/* Banner prospecto */}
          {activeProspect ? (
            <div style={{ background: '#fff7ed', padding: '10px 16px', borderRadius: '8px', border: '1px solid #fdba74', marginBottom: '14px', fontSize: '0.88rem' }}>
              <strong style={{ color: '#c2410c' }}>📋 {activeProspect.name}</strong>
              {activeProspect.project_type && <span style={{ color: '#92400e' }}> · {activeProspect.project_type}</span>}
              {activeProspect.contact_info && <span style={{ color: '#78350f' }}> · {activeProspect.contact_info}</span>}
            </div>
          ) : standaloneName ? (
            <div style={{ background: '#f0fdf4', padding: '10px 16px', borderRadius: '8px', border: '1px solid #86efac', marginBottom: '14px', fontSize: '0.88rem' }}>
              <strong>Respaldo WhatsApp:</strong> {standaloneName}
            </div>
          ) : null}

          {/* ── BARRA DE TABS ── */}
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: '4px',
            overflowX: 'auto', paddingBottom: '0',
            borderBottom: '2px solid #8b5a2b',
            scrollbarWidth: 'thin',
          }}>
            {/* Tabs de hojas */}
            {sheets.map((sheet, idx) => {
              const isActive = activeSheetIdx === idx;
              return (
                <div key={sheet.id}
                  onClick={() => setActiveSheetIdx(idx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px 10px 14px',
                    borderRadius: '8px 8px 0 0',
                    background: isActive ? '#8b5a2b' : '#f1f5f9',
                    color: isActive ? 'white' : '#475569',
                    cursor: 'pointer', fontWeight: '600', fontSize: '0.87rem',
                    border: `1px solid ${isActive ? '#8b5a2b' : '#e2e8f0'}`,
                    borderBottom: isActive ? '2px solid #8b5a2b' : '1px solid #e2e8f0',
                    marginBottom: isActive ? '-2px' : '0',
                    flexShrink: 0, transition: 'all 0.12s',
                    boxShadow: isActive ? '0 -2px 8px rgba(139,90,43,0.15)' : 'none',
                  }}>
                  <span style={{ fontSize: '0.78rem', opacity: 0.7 }}>#{idx + 1}</span>
                  <span>{sheet.type}</span>
                  {/* Subtotal mini en tab */}
                  <span style={{
                    background: isActive ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    borderRadius: '10px', padding: '1px 7px', fontSize: '0.7rem',
                    color: isActive ? 'white' : '#64748b', fontWeight: '700',
                  }}>
                    {formatCurrency(getSheetTotals(sheet).cost)}
                  </span>
                  {/* Botón cerrar */}
                  <button
                    onClick={e => { e.stopPropagation(); removeSheet(idx); }}
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.22)' : '#e2e8f0',
                      border: 'none', borderRadius: '50%', width: '18px', height: '18px',
                      cursor: 'pointer', fontSize: '0.65rem',
                      color: isActive ? 'white' : '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, lineHeight: 1,
                    }}>✕</button>
                </div>
              );
            })}

            {/* ＋ Agregar hoja */}
            <button onClick={() => setShowAddSheet(true)}
              style={{
                padding: '8px 14px 10px 14px', borderRadius: '8px 8px 0 0',
                background: 'transparent', border: '1px dashed #8b5a2b',
                color: '#8b5a2b', cursor: 'pointer', fontWeight: '700',
                fontSize: '0.87rem', flexShrink: 0, marginBottom: '0',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fff7ed'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              ＋ Hoja
            </button>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Tab Resumen */}
            <div
              onClick={() => setActiveSheetIdx('summary')}
              style={{
                padding: '8px 16px 10px 16px', borderRadius: '8px 8px 0 0',
                background: activeSheetIdx === 'summary' ? '#1e40af' : '#dbeafe',
                color: activeSheetIdx === 'summary' ? 'white' : '#1d4ed8',
                cursor: 'pointer', fontWeight: '700', fontSize: '0.87rem',
                border: `1px solid ${activeSheetIdx === 'summary' ? '#1e40af' : '#bfdbfe'}`,
                borderBottom: activeSheetIdx === 'summary' ? '2px solid #1e40af' : '1px solid #bfdbfe',
                marginBottom: activeSheetIdx === 'summary' ? '-2px' : '0',
                flexShrink: 0, transition: 'all 0.12s',
              }}>
              📊 Resumen
              {sheets.length > 0 && (
                <span style={{
                  marginLeft: '8px', background: activeSheetIdx === 'summary' ? 'rgba(255,255,255,0.25)' : '#93c5fd',
                  borderRadius: '10px', padding: '1px 7px', fontSize: '0.7rem',
                  color: activeSheetIdx === 'summary' ? 'white' : '#1e3a8a', fontWeight: '700',
                }}>
                  {formatCurrency(grandTotal)}
                </span>
              )}
            </div>

            {/* Volver */}
            <button onClick={() => setStep(1)}
              style={{
                padding: '6px 12px', background: '#e2e8f0', border: 'none',
                borderRadius: '6px 6px 0 0', cursor: 'pointer', fontSize: '0.82rem',
                color: '#475569', alignSelf: 'flex-end', marginBottom: '0',
              }}>← Volver</button>
          </div>

          {/* ── CONTENIDO ── */}
          <div style={{
            background: 'white', borderRadius: '0 0 10px 10px',
            padding: '24px', border: '1px solid #e2e8f0', borderTop: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.07)', minHeight: '420px',
          }}>

            {/* ── Hoja de proyecto ── */}
            {activeSheetIdx !== 'summary' && sheets[activeSheetIdx] && (() => {
              const sheet = sheets[activeSheetIdx];
              const t     = getSheetTotals(sheet);
              const mkTh  = (label, qtyLabel) => (
                <thead><tr>
                  <th style={thSt}>{label}</th>
                  <th style={{ ...thSt, width: '145px' }}>{qtyLabel}</th>
                  <th style={thSt}>Precio unit.</th>
                  <th style={{ ...thSt, textAlign: 'right', width: '120px' }}>Total</th>
                </tr></thead>
              );

              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <h2 style={{ margin: 0, color: '#8b5a2b', fontSize: '1.1rem' }}>
                      Hoja {activeSheetIdx + 1} — {sheet.type}
                    </h2>
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '5px 12px', fontSize: '0.8rem', color: '#166534' }}>
                      💡 Clic en <strong>✏️</strong> para editar precio, nombre o unidad
                    </div>
                  </div>

                  {/* MATERIALES */}
                  <table style={tblSt}>
                    {mkTh('Materiales', 'Cantidad')}
                    <tbody>
                      {sheet.materials.map(m => renderCaptureRow(m, activeSheetIdx, 'mat'))}
                      <tr style={subRow}>
                        <td colSpan="3" style={{ ...tdSt, textAlign: 'center' }}>Subtotal Materiales</td>
                        <td style={{ ...tdSt, textAlign: 'right' }}>{formatCurrency(t.mat)}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* MANO DE OBRA */}
                  <table style={tblSt}>
                    {mkTh('Mano de obra', 'Tiempo / Cant.')}
                    <tbody>
                      {sheet.labor.map(m => renderCaptureRow(m, activeSheetIdx, 'lab'))}
                      <tr style={subRow}>
                        <td colSpan="3" style={{ ...tdSt, textAlign: 'center' }}>Total Mano de obra</td>
                        <td style={{ ...tdSt, textAlign: 'right' }}>{formatCurrency(t.lab)}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* CONCEPTOS */}
                  <table style={tblSt}>
                    {mkTh('Conceptos', 'Días / Cant.')}
                    <tbody>
                      {sheet.concepts.map(m => renderCaptureRow(m, activeSheetIdx, 'con'))}
                      <tr style={subRow}>
                        <td colSpan="3" style={{ ...tdSt, textAlign: 'center' }}>Total Conceptos</td>
                        <td style={{ ...tdSt, textAlign: 'right' }}>{formatCurrency(t.con)}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Costo de esta hoja */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                    <div style={{
                      background: '#f5deb3', borderRadius: '8px', padding: '10px 20px',
                      fontWeight: '800', fontSize: '1rem', border: '2px solid #8b5a2b',
                      color: '#4a2c0a',
                    }}>
                      Costo hoja: {formatCurrency(t.cost)}
                    </div>
                  </div>

                  {/* Navegación */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                    <button
                      onClick={() => setActiveSheetIdx(Math.max(0, activeSheetIdx - 1))}
                      disabled={activeSheetIdx === 0}
                      style={{
                        padding: '8px 18px', fontWeight: 'bold',
                        background: activeSheetIdx === 0 ? '#e2e8f0' : '#8b5a2b',
                        color: activeSheetIdx === 0 ? '#94a3b8' : 'white',
                        border: 'none', borderRadius: '6px',
                        cursor: activeSheetIdx === 0 ? 'default' : 'pointer',
                      }}>
                      ← Hoja anterior
                    </button>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {sheets.map((_, i) => (
                        <div key={i}
                          onClick={() => setActiveSheetIdx(i)}
                          style={{
                            width: '10px', height: '10px', borderRadius: '50%',
                            background: i === activeSheetIdx ? '#8b5a2b' : '#cbd5e1',
                            cursor: 'pointer', transition: 'background 0.15s',
                          }} />
                      ))}
                    </div>

                    {activeSheetIdx < sheets.length - 1 ? (
                      <button onClick={() => setActiveSheetIdx(activeSheetIdx + 1)}
                        style={{ padding: '8px 18px', fontWeight: 'bold', background: '#8b5a2b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                        Siguiente hoja →
                      </button>
                    ) : (
                      <button onClick={() => setActiveSheetIdx('summary')}
                        style={{ padding: '8px 18px', fontWeight: 'bold', background: '#1e40af', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                        Ver resumen 📊 →
                      </button>
                    )}
                  </div>
                </>
              );
            })()}

            {/* ── TAB RESUMEN ── */}
            {activeSheetIdx === 'summary' && (
              <div>
                <h2 style={{ color: '#1e40af', marginTop: 0, marginBottom: '1.2rem' }}>
                  📊 Resumen de Cotización
                </h2>

                {sheets.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem 1rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📋</div>
                    <p>No hay hojas de cotización.</p>
                    <button onClick={() => setShowAddSheet(true)}
                      style={{ padding: '10px 22px', background: '#8b5a2b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ＋ Agregar primera hoja
                    </button>
                  </div>
                ) : (
                  <>
                    {/* ── DESGLOSE DETALLADO POR HOJA ── */}
                    {sheets.map((sheet, shIdx) => {
                      const t = getSheetTotals(sheet);
                      const sheetColors = ['#8b5a2b', '#1e40af', '#065f46', '#7c3aed', '#b45309'];
                      const color = sheetColors[shIdx % sheetColors.length];
                      const renderItems = (items) => items
                        .filter(m => parseFloat(m.qty) > 0)
                        .map(m => (
                          <tr key={m.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '5px 10px', fontSize: '0.83rem' }}>{m.desc}</td>
                            <td style={{ padding: '5px 10px', fontSize: '0.83rem', textAlign: 'center' }}>{m.qty} {m.unit || 'pza'}</td>
                            <td style={{ padding: '5px 10px', fontSize: '0.83rem', textAlign: 'right' }}>{formatCurrency(m.price)}</td>
                            <td style={{ padding: '5px 10px', fontSize: '0.83rem', textAlign: 'right', fontWeight: '600' }}>
                              {formatCurrency(parseFloat(m.qty || 0) * parseFloat(m.price || 0))}
                            </td>
                          </tr>
                        ));
                      return (
                        <div key={shIdx} style={{ marginBottom: '1.5rem', border: `2px solid ${color}`, borderRadius: '10px', overflow: 'hidden' }}>
                          {/* Header de hoja */}
                          <div style={{ background: color, color: 'white', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '800', fontSize: '1rem' }}>
                              #{shIdx + 1} {sheet.type}
                            </span>
                            <span style={{ fontWeight: '700', fontSize: '1.05rem', opacity: 0.9 }}>
                              Costo: {formatCurrency(t.cost)}
                            </span>
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc' }}>
                                {['Concepto', 'Cantidad', 'Precio Unit.', 'Total'].map(h => (
                                  <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Concepto' ? 'left' : 'right', fontSize: '0.78rem', color: '#475569', fontWeight: '700', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {/* Materiales */}
                              {sheet.materials.some(m => parseFloat(m.qty) > 0) && (
                                <tr><td colSpan="4" style={{ background: '#fef3c7', fontWeight: '700', padding: '4px 10px', fontSize: '0.78rem', color: '#92400e' }}>📦 Materiales — Subtotal: {formatCurrency(t.mat)}</td></tr>
                              )}
                              {renderItems(sheet.materials)}
                              {/* Mano de Obra */}
                              {sheet.labor.some(m => parseFloat(m.qty) > 0) && (
                                <tr><td colSpan="4" style={{ background: '#dbeafe', fontWeight: '700', padding: '4px 10px', fontSize: '0.78rem', color: '#1e40af' }}>🔨 Mano de Obra — Subtotal: {formatCurrency(t.lab)}</td></tr>
                              )}
                              {renderItems(sheet.labor)}
                              {/* Conceptos */}
                              {sheet.concepts.some(m => parseFloat(m.qty) > 0) && (
                                <tr><td colSpan="4" style={{ background: '#dcfce7', fontWeight: '700', padding: '4px 10px', fontSize: '0.78rem', color: '#065f46' }}>💡 Conceptos Adicionales — Subtotal: {formatCurrency(t.con)}</td></tr>
                              )}
                              {renderItems(sheet.concepts)}
                              {/* Total hoja */}
                              <tr style={{ background: color }}>
                                <td colSpan="3" style={{ padding: '8px 10px', color: 'white', fontWeight: '800', fontSize: '0.9rem', textAlign: 'right' }}>
                                  TOTAL COSTO {sheet.type.toUpperCase()}
                                </td>
                                <td style={{ padding: '8px 10px', color: 'white', fontWeight: '800', fontSize: '1rem', textAlign: 'right' }}>
                                  {formatCurrency(t.cost)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    })}

                    {/* ── TABLA RESUMEN COMPACTA ── */}
                    <table style={{ ...tblSt, border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginTop: '1rem' }}>
                      <thead>
                        <tr>
                          {['#','Proyecto / Hoja','Materiales','Mano de Obra','Conceptos','Costo fabricación'].map(h => (
                            <th key={h} style={{ ...thSt, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sheets.map((sheet, idx) => {
                          const t = getSheetTotals(sheet);
                          return (
                            <tr key={sheet.id} onClick={() => setActiveSheetIdx(idx)}
                              style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#fff7ed'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                              <td style={{ ...tdSt, textAlign: 'center', color: '#94a3b8', fontWeight: '700', fontSize: '0.85rem' }}>{idx + 1}</td>
                              <td style={{ ...tdSt, fontWeight: '700', color: '#8b5a2b' }}>
                                {sheet.type}
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: '6px' }}>↗ editar</span>
                              </td>
                              <td style={{ ...tdSt, textAlign: 'right' }}>{formatCurrency(t.mat)}</td>
                              <td style={{ ...tdSt, textAlign: 'right' }}>{formatCurrency(t.lab)}</td>
                              <td style={{ ...tdSt, textAlign: 'right' }}>{formatCurrency(t.con)}</td>
                              <td style={{ ...tdSt, textAlign: 'right', fontWeight: '700', fontSize: '1rem' }}>{formatCurrency(t.cost)}</td>
                            </tr>
                          );
                        })}

                        {/* Fila total fabricación */}
                        <tr style={{ background: '#f5deb3', fontWeight: 'bold' }}>
                          <td colSpan="5" style={{ ...tdSt, textAlign: 'right', fontWeight: '800' }}>TOTAL FABRICACIÓN</td>
                          <td style={{ ...tdSt, textAlign: 'right', fontWeight: '800', fontSize: '1.05rem' }}>{formatCurrency(grandCost)}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Tabla de totales finales */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <table style={{ width: '400px', borderCollapse: 'collapse', border: '2px solid #8b5a2b', borderRadius: '8px', overflow: 'hidden' }}>
                        <tbody>
                          <tr style={{ background: '#f5deb3' }}>
                            <td style={{ ...tdSt, fontWeight: '800', fontSize: '1rem' }}>Costo total de fabricación</td>
                            <td style={{ ...tdSt, fontWeight: '800', fontSize: '1rem', textAlign: 'right' }}>{formatCurrency(grandCost)}</td>
                          </tr>
                          <tr>
                            <td style={{ ...tdSt, fontWeight: '700', verticalAlign: 'middle' }}>
                              Ganancia
                              <select value={globalMargin} onChange={e => setGlobalMargin(Number(e.target.value))}
                                style={{ marginLeft: '10px', padding: '5px 8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                {[20,25,30,35,40,45,50].map(v => <option key={v} value={v}>{v}%</option>)}
                              </select>
                            </td>
                            <td style={{ ...tdSt, textAlign: 'right', color: '#16a34a', fontWeight: '700', fontSize: '1rem' }}>
                              + {formatCurrency(grandMg)}
                            </td>
                          </tr>
                          <tr style={{ background: '#8b5a2b', color: 'white' }}>
                            <td style={{ ...tdSt, fontWeight: '800', fontSize: '1.3rem' }}>TOTAL A PAGAR</td>
                            <td style={{ ...tdSt, fontWeight: '800', fontSize: '1.3rem', textAlign: 'right' }}>
                              {formatCurrency(grandTotal)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Botón enviar */}
                    <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                      <button onClick={handleSaveCapture} disabled={isSaving}
                        style={{
                          padding: '16px 48px', background: '#16a34a', color: 'white',
                          border: 'none', borderRadius: '10px', fontSize: '1.1rem',
                          cursor: isSaving ? 'wait' : 'pointer', fontWeight: '800',
                          boxShadow: '0 4px 14px rgba(22,163,74,0.35)',
                          transition: 'transform 0.1s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
                        {isSaving ? '⏳ Guardando...' : '💾 Enviar a Cotizaciones'}
                      </button>
                      <p style={{ marginTop: '10px', fontSize: '0.82rem', color: '#64748b' }}>
                        Se guardará la valoración completa de {sheets.length} hoja{sheets.length !== 1 ? 's' : ''} en el prospecto seleccionado.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────── STEP 2 · EDIT MODE ────────────────────── */}
      {step === 2 && mode === 'edit' && (
        <div style={{ background: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#8b5a2b', margin: 0 }}>✏️ Editando Machote: {editProjectType}</h2>
            <button onClick={() => setStep(1)}
              style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              ← Volver
            </button>
          </div>

          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
            padding: '10px 16px', marginBottom: '20px', color: '#dc2626',
            fontSize: '0.85rem', fontWeight: '700', textAlign: 'center', letterSpacing: '1px',
          }}>
            ⚠️ ESTÁS EDITANDO LA PLANTILLA GLOBAL — LOS CAMBIOS AFECTARÁN LAS PRÓXIMAS COTIZACIONES
          </div>

          {[
            { label: 'Materiales',   items: editMaterials, changer: mkEditChanger(setEditMaterials), type: 'mat' },
            { label: 'Mano de obra', items: editLabor,     changer: mkEditChanger(setEditLabor),     type: 'lab' },
            { label: 'Conceptos',    items: editConcepts,  changer: mkEditChanger(setEditConcepts),  type: 'con' },
          ].map(({ label, items, changer, type }) => (
            <table key={type} style={tblSt}>
              <thead><tr>
                <th style={thSt}>{label}</th>
                <th style={{ ...thSt, width: '120px' }}>Precio unit.</th>
                <th style={{ ...thSt, width: '110px' }}>Unidad</th>
                <th style={{ ...thSt, width: '50px' }}></th>
              </tr></thead>
              <tbody>
                {items.map(item => renderEditRow(item, changer, type))}
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '10px' }}>
                    <button onClick={() => addEditRow(type)}
                      style={{ padding: '5px 14px', background: '#eee', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>
                      + Agregar {label.toLowerCase()}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          ))}

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button onClick={saveTemplateEdits} disabled={isSaving}
              style={{
                padding: '14px 32px', background: '#eab308', color: 'white',
                border: 'none', borderRadius: '8px', fontSize: '1.1rem',
                cursor: 'pointer', fontWeight: 'bold',
              }}>
              {isSaving ? 'Guardando...' : '💾 Guardar Plantilla Base'}
            </button>
          </div>
        </div>
      )}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px', 
          background: toast.type === 'success' ? '#22c55e' : '#ef4444', 
          color: 'white', padding: '1rem 1.5rem', borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)', fontWeight: '600',
          zIndex: 10000, display: 'flex', alignItems: 'center', gap: '0.5rem',
          animation: 'slideUp 0.3s ease-out', fontSize: '0.95rem'
        }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

    </div>
  );
}

export default Ventas;
