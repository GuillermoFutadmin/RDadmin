import React, { useState, useEffect, useMemo, useRef } from 'react';

// Sugerencias iniciales (el usuario puede escribir cualquier texto libremente)
const SUGGESTED_DEPARTMENTS = [
  'Producción / Taller',
  'Instalación en Sitio',
  'Acabados y Barniz',
  'Diseño y Proyectos',
  'Administración y Ventas',
  'Logística y Chofer',
  'Tapicería y Forjado',
  'Mantenimiento'
];

const SUGGESTED_POSITIONS = [
  'Maestro Carpintero',
  'Oficial Carpintero',
  'Armador / Ensamblador',
  'Instalador en Sitio',
  'Barnizador / Lacador',
  'Operador Sierra / Maquinaria',
  'Diseñador / Proyectista',
  'Ayudante de Carpintería',
  'Herrero',
  'Tapicero',
  'Chofer / Logística',
  'Encargado de Taller',
  'Administración / RH'
];

const SUGGESTED_CONTRACT_TYPES = [
  'Tiempo Completo',
  'Por Obra / Destajo',
  'Medio Tiempo',
  'Eventual / Prueba',
  'Honorarios'
];

const SUGGESTED_SALARY_PERIODS = [
  'Semanal',
  'Quincenal',
  'Mensual',
  'Por Día / Jornada',
  'Por Pieza / Metro'
];

const SUGGESTED_STATUSES = [
  'Activo',
  'De Vacaciones',
  'Incapacidad',
  'Inactivo',
  'Periodo de Prueba'
];

export default function Colaboradores() {
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Modal Form State (Crear / Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollab, setEditingCollab] = useState(null);
  const [activeFormTab, setActiveFormTab] = useState('general'); // 'general' | 'laboral' | 'archivos' | 'adicional'
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // File Upload staging in Modal
  const [stagedPhotoFile, setStagedPhotoFile] = useState(null);
  const [stagedPhotoPreview, setStagedPhotoPreview] = useState(null);
  const [stagedCvFile, setStagedCvFile] = useState(null);
  const photoInputRef = useRef(null);
  const cvInputRef = useRef(null);

  // Modal View Expediente (Ficha de Colaborador)
  const [viewExpedienteCollab, setViewExpedienteCollab] = useState(null);

  // Form Initial Data
  const defaultFormData = {
    full_name: '',
    phone: '',
    email: '',
    position: 'Maestro Carpintero',
    department: 'Producción / Taller',
    status: 'Activo',
    contract_type: 'Tiempo Completo',
    hire_date: '',
    salary: '',
    salary_period: 'Semanal',
    nss_rfc: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    skills: '',
    notes: '',
    photo_url: '',
    cv_url: '',
    cv_filename: ''
  };

  const [formData, setFormData] = useState(defaultFormData);

  // Load collaborators from API
  const fetchColaboradores = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/collaborators');
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      setColaboradores(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching colaboradores:', err);
      setErrorMsg('No se pudieron cargar los colaboradores. Verifica la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColaboradores();
  }, []);

  // Lista dinámica de departamentos para el filtro superior
  const dynamicDepartments = useMemo(() => {
    const set = new Set(SUGGESTED_DEPARTMENTS);
    colaboradores.forEach(c => {
      if (c.department && c.department.trim()) set.add(c.department.trim());
    });
    return ['Todos', ...Array.from(set)];
  }, [colaboradores]);

  // Lista dinámica de estatus para el filtro superior
  const dynamicStatuses = useMemo(() => {
    const set = new Set(SUGGESTED_STATUSES);
    colaboradores.forEach(c => {
      if (c.status && c.status.trim()) set.add(c.status.trim());
    });
    return ['Todos', ...Array.from(set)];
  }, [colaboradores]);

  // Lista filtrada
  const filteredColaboradores = useMemo(() => {
    return colaboradores.filter(c => {
      const searchMatch = !searchTerm.trim() || 
        c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.skills?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contract_type?.toLowerCase().includes(searchTerm.toLowerCase());

      const deptMatch = filterDepartment === 'Todos' || c.department === filterDepartment;
      const statusMatch = filterStatus === 'Todos' || c.status === filterStatus;

      return searchMatch && deptMatch && statusMatch;
    });
  }, [colaboradores, searchTerm, filterDepartment, filterStatus]);

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const total = colaboradores.length;
    const activos = colaboradores.filter(c => (c.status || '').toLowerCase() === 'activo').length;
    const conCv = colaboradores.filter(c => !!c.cv_url).length;
    const taller = colaboradores.filter(c => (c.department || '').toLowerCase().includes('taller') || (c.department || '').toLowerCase().includes('producción')).length;
    return { total, activos, conCv, taller };
  }, [colaboradores]);

  // Abrir Modal Crear
  const handleOpenCreate = () => {
    setEditingCollab(null);
    setFormData(defaultFormData);
    setStagedPhotoFile(null);
    setStagedPhotoPreview(null);
    setStagedCvFile(null);
    setFormError('');
    setActiveFormTab('general');
    setIsModalOpen(true);
  };

  // Abrir Modal Editar
  const handleOpenEdit = (collab) => {
    setEditingCollab(collab);
    setFormData({
      full_name: collab.full_name || '',
      phone: collab.phone || '',
      email: collab.email || '',
      position: collab.position || 'Maestro Carpintero',
      department: collab.department || 'Producción / Taller',
      status: collab.status || 'Activo',
      contract_type: collab.contract_type || 'Tiempo Completo',
      hire_date: collab.hire_date || '',
      salary: collab.salary || '',
      salary_period: collab.salary_period || 'Semanal',
      nss_rfc: collab.nss_rfc || '',
      address: collab.address || '',
      emergency_contact_name: collab.emergency_contact_name || '',
      emergency_contact_phone: collab.emergency_contact_phone || '',
      skills: collab.skills || '',
      notes: collab.notes || '',
      photo_url: collab.photo_url || '',
      cv_url: collab.cv_url || '',
      cv_filename: collab.cv_filename || ''
    });
    setStagedPhotoFile(null);
    setStagedPhotoPreview(collab.photo_url || null);
    setStagedCvFile(null);
    setFormError('');
    setActiveFormTab('general');
    setIsModalOpen(true);
  };

  // Eliminar Colaborador
  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar al colaborador "${name}"? Esta acción borrará sus archivos asociados.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/collaborators/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setColaboradores(prev => prev.filter(c => c.id !== id));
      if (viewExpedienteCollab?.id === id) {
        setViewExpedienteCollab(null);
      }
    } catch (err) {
      alert('Error eliminando colaborador: ' + err.message);
    }
  };

  // Selección de Foto
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setStagedPhotoFile(file);
      setStagedPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Selección de CV
  const handleCvSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setStagedCvFile(file);
    }
  };

  // Guardar formulario
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.full_name.trim()) {
      setFormError('El nombre completo es obligatorio');
      setActiveFormTab('general');
      return;
    }
    if (!formData.position.trim()) {
      setFormError('El puesto o cargo es obligatorio');
      setActiveFormTab('laboral');
      return;
    }

    setIsSaving(true);
    try {
      // Sanitizar fecha para evitar 422: si viene vacía mandar null
      const payload = {
        ...formData,
        hire_date: formData.hire_date && formData.hire_date.trim() !== '' ? formData.hire_date.trim() : null
      };

      let savedCollab = null;
      if (editingCollab) {
        // UPDATE
        const res = await fetch(`/api/collaborators/${editingCollab.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const detail = Array.isArray(errData.detail)
            ? errData.detail.map(d => d.msg || d.message).join(', ')
            : (errData.detail || 'Error al actualizar colaborador');
          throw new Error(detail);
        }
        savedCollab = await res.json();
      } else {
        // CREATE
        const res = await fetch('/api/collaborators', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const detail = Array.isArray(errData.detail)
            ? errData.detail.map(d => d.msg || d.message).join(', ')
            : (errData.detail || 'Error al registrar colaborador');
          throw new Error(detail);
        }
        savedCollab = await res.json();
      }

      const collabId = savedCollab.id;

      // Subir Foto si fue seleccionada
      if (stagedPhotoFile) {
        const photoData = new FormData();
        photoData.append('file', stagedPhotoFile);
        const photoRes = await fetch(`/api/collaborators/${collabId}/upload-photo`, {
          method: 'POST',
          body: photoData
        });
        if (photoRes.ok) {
          const photoJson = await photoRes.json();
          savedCollab.photo_url = photoJson.photo_url;
        }
      }

      // Subir CV si fue seleccionado
      if (stagedCvFile) {
        const cvData = new FormData();
        cvData.append('file', stagedCvFile);
        const cvRes = await fetch(`/api/collaborators/${collabId}/upload-cv`, {
          method: 'POST',
          body: cvData
        });
        if (cvRes.ok) {
          const cvJson = await cvRes.json();
          savedCollab.cv_url = cvJson.cv_url;
          savedCollab.cv_filename = cvJson.cv_filename;
        }
      }

      // Actualizar listado local
      if (editingCollab) {
        setColaboradores(prev => prev.map(c => c.id === collabId ? savedCollab : c));
        if (viewExpedienteCollab?.id === collabId) {
          setViewExpedienteCollab(savedCollab);
        }
      } else {
        setColaboradores(prev => [savedCollab, ...prev]);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Error al guardar:', err);
      setFormError('Error al guardar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Badge de Estatus visual
  const getStatusBadge = (statusName = 'Activo') => {
    const sLower = (statusName || '').toLowerCase();
    let color = '#2563eb';
    let bg = '#eff6ff';

    if (sLower.includes('activo')) {
      color = '#16a34a'; bg = '#dcfce7';
    } else if (sLower.includes('vacaci')) {
      color = '#d97706'; bg = '#fef3c7';
    } else if (sLower.includes('incapac')) {
      color = '#9333ea'; bg = '#f3e8ff';
    } else if (sLower.includes('inactiv') || sLower.includes('baja')) {
      color = '#dc2626'; bg = '#fee2e2';
    } else if (sLower.includes('prueba')) {
      color = '#0284c7'; bg = '#e0f2fe';
    }

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: color,
        backgroundColor: bg,
        border: `1px solid ${color}33`
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color }}></span>
        {statusName}
      </span>
    );
  };

  // Avatar con imagen o iniciales
  const renderAvatar = (collab, size = 64) => {
    const initials = collab.full_name
      ? collab.full_name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()
      : 'CO';
    if (collab.photo_url) {
      return (
        <img
          src={collab.photo_url}
          alt={collab.full_name}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '3px solid #ba4b24',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    return (
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: '#29211d',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${size * 0.38}px`,
        fontWeight: '700',
        border: '3px solid #ba4b24',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        letterSpacing: '0.5px'
      }}>
        {initials}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* ── DATALISTS GLOBALES PARA CAMPOS EDITABLES CON AUTOCOMPLETADO ── */}
      <datalist id="collab-puestos-list">
        {SUGGESTED_POSITIONS.map(p => <option key={p} value={p} />)}
      </datalist>

      <datalist id="collab-deptos-list">
        {SUGGESTED_DEPARTMENTS.map(d => <option key={d} value={d} />)}
      </datalist>

      <datalist id="collab-contratos-list">
        {SUGGESTED_CONTRACT_TYPES.map(c => <option key={c} value={c} />)}
      </datalist>

      <datalist id="collab-periodos-list">
        {SUGGESTED_SALARY_PERIODS.map(p => <option key={p} value={p} />)}
      </datalist>

      <datalist id="collab-estatus-list">
        {SUGGESTED_STATUSES.map(s => <option key={s} value={s} />)}
      </datalist>

      {/* ── ESTADÍSTICAS RÁPIDAS ── */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        <div className="card" style={{ padding: '1.25rem', borderTop: '4px solid #ba4b24' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '600' }}>Total Colaboradores</span>
            <span style={{ fontSize: '1.4rem' }}>👥</span>
          </div>
          <p style={{ fontSize: '1.85rem', fontWeight: '700', margin: '0.5rem 0 0 0', color: '#212529' }}>
            {stats.total}
          </p>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderTop: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '600' }}>Personal Activo</span>
            <span style={{ fontSize: '1.4rem' }}>✅</span>
          </div>
          <p style={{ fontSize: '1.85rem', fontWeight: '700', margin: '0.5rem 0 0 0', color: '#16a34a' }}>
            {stats.activos}
          </p>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderTop: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '600' }}>En Taller / Obra</span>
            <span style={{ fontSize: '1.4rem' }}>🪵</span>
          </div>
          <p style={{ fontSize: '1.85rem', fontWeight: '700', margin: '0.5rem 0 0 0', color: '#2563eb' }}>
            {stats.taller}
          </p>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderTop: '4px solid #9333ea' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '600' }}>Con CV Registrado</span>
            <span style={{ fontSize: '1.4rem' }}>📄</span>
          </div>
          <p style={{ fontSize: '1.85rem', fontWeight: '700', margin: '0.5rem 0 0 0', color: '#9333ea' }}>
            {stats.conCv}
          </p>
        </div>
      </section>

      {/* ── BARRA DE BÚSQUEDA Y ACCIONES ── */}
      <div style={{
        background: '#ffffff',
        padding: '1.25rem 1.5rem',
        borderRadius: '12px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
        marginBottom: '1.75rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', flex: 1, minWidth: '300px' }}>
          {/* Buscador */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              placeholder="Buscar por nombre, puesto, teléfono, habilidades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.4rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
            <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
              🔍
            </span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9ca3af'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro Departamento Dinámico */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '0.88rem',
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            {dynamicDepartments.map(d => (
              <option key={d} value={d}>Área: {d}</option>
            ))}
          </select>

          {/* Filtro Estatus Dinámico */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '0.88rem',
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            {dynamicStatuses.map(s => (
              <option key={s} value={s}>Estatus: {s}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            display: 'flex',
            background: '#f3f4f6',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <button
              onClick={() => setViewMode('cards')}
              title="Vista de Tarjetas"
              style={{
                background: viewMode === 'cards' ? '#ffffff' : 'transparent',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.85rem',
                color: viewMode === 'cards' ? '#ba4b24' : '#6b7280',
                boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              📇 Tarjetas
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Vista de Lista / Tabla"
              style={{
                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.85rem',
                color: viewMode === 'table' ? '#ba4b24' : '#6b7280',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              📋 Tabla
            </button>
          </div>

          <button
            onClick={handleOpenCreate}
            style={{
              backgroundColor: '#ba4b24',
              color: '#ffffff',
              border: 'none',
              padding: '0.68rem 1.3rem',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(186,75,36,0.3)',
              transition: 'all 0.2s'
            }}
          >
            <span>➕</span> Nuevo Colaborador
          </button>
        </div>
      </div>

      {/* ── ERROR GLOBAL DE CARGA ── */}
      {errorMsg && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #f87171',
          color: '#991b1b',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚠️ {errorMsg}</span>
          <button
            onClick={fetchColaboradores}
            style={{
              background: '#991b1b',
              color: '#ffffff',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#6b7280' }}>
          <div style={{ fontSize: '2rem' }}>⏳</div>
          <p style={{ marginTop: '0.75rem', fontWeight: '500' }}>Cargando colaboradores...</p>
        </div>
      ) : filteredColaboradores.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👷‍♂️</div>
          <h3 style={{ fontSize: '1.25rem', color: '#1f2937', marginBottom: '0.5rem' }}>
            {searchTerm || filterDepartment !== 'Todos' || filterStatus !== 'Todos'
              ? 'No se encontraron colaboradores con los filtros aplicados'
              : 'Aún no hay colaboradores registrados'}
          </h3>
          <p style={{ maxWidth: '420px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
            {searchTerm || filterDepartment !== 'Todos' || filterStatus !== 'Todos'
              ? 'Intenta restablecer los filtros de búsqueda o cambiar de criterio.'
              : 'Registra a tu equipo de taller, instaladores, barnizadores o personal administrativo.'}
          </p>
          <button
            onClick={handleOpenCreate}
            style={{
              backgroundColor: '#ba4b24',
              color: '#ffffff',
              border: 'none',
              padding: '0.65rem 1.4rem',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ➕ Registrar Primer Colaborador
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* ── VISTA DE TARJETAS ── */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {filteredColaboradores.map(c => {
            const hasCv = !!c.cv_url;
            const cleanPhone = c.phone ? c.phone.replace(/[^0-9]/g, '') : '';
            return (
              <div
                key={c.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
                  border: '1px solid #e5e7eb',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative'
                }}
              >
                <div>
                  {/* Encabezado Colaborador */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      {renderAvatar(c, 62)}
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                          {c.full_name}
                        </h3>
                        <div style={{
                          display: 'inline-block',
                          backgroundColor: '#f3f4f6',
                          color: '#4b5563',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          marginTop: '4px'
                        }}>
                          {c.position}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(c.status)}
                  </div>

                  {/* Datos Clave */}
                  <div style={{
                    backgroundColor: '#fafaf9',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    fontSize: '0.84rem',
                    color: '#44403c',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    border: '1px solid #f0eeea'
                  }}>
                    {/* Teléfono */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#78716c' }}>📞 Teléfono:</span>
                      {c.phone ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontWeight: '600' }}>{c.phone}</span>
                          <a
                            href={`https://wa.me/${cleanPhone.length === 10 ? '52' + cleanPhone : cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Enviar WhatsApp"
                            style={{
                              textDecoration: 'none',
                              backgroundColor: '#25D366',
                              color: 'white',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}
                          >
                            WA
                          </a>
                          <a
                            href={`tel:${c.phone}`}
                            title="Llamar"
                            style={{
                              textDecoration: 'none',
                              backgroundColor: '#e5e7eb',
                              color: '#374151',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '0.75rem'
                            }}
                          >
                            Llamar
                          </a>
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin registrar</span>
                      )}
                    </div>

                    {/* Área / Departamento */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#78716c' }}>🏢 Área:</span>
                      <span style={{ fontWeight: '600' }}>{c.department || 'Taller'}</span>
                    </div>

                    {/* Sueldo / Contrato */}
                    {(c.salary || c.contract_type) && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: '#78716c' }}>💰 Contrato / Sueldo:</span>
                        <span style={{ fontWeight: '600', color: '#15803d' }}>
                          {c.salary ? `$${c.salary} (${c.salary_period || 'Semanal'})` : c.contract_type}
                        </span>
                      </div>
                    )}

                    {/* Fecha de ingreso */}
                    {c.hire_date && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: '#78716c' }}>🗓️ Ingreso:</span>
                        <span>{c.hire_date}</span>
                      </div>
                    )}
                  </div>

                  {/* Skills / Habilidades */}
                  {c.skills && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#78716c', fontWeight: '600', marginBottom: '4px' }}>
                        HABILIDADES & ESPECIALIDADES:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {c.skills.split(',').map((skill, idx) => (
                          <span
                            key={idx}
                            style={{
                              backgroundColor: '#f3e8ff',
                              color: '#7e22ce',
                              fontSize: '0.73rem',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontWeight: '500'
                            }}
                          >
                            {skill.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CV Indicator Banner */}
                  <div style={{
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    backgroundColor: hasCv ? '#f0fdf4' : '#f9fafb',
                    border: hasCv ? '1px solid #bbf7d0' : '1px dashed #d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                    fontSize: '0.83rem'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasCv ? '#15803d' : '#6b7280' }}>
                      <span>{hasCv ? '📄' : '📎'}</span>
                      <strong style={{ fontWeight: '600' }}>
                        {hasCv ? (c.cv_filename || 'Currículum Vitae adjunto') : 'Sin CV registrado'}
                      </strong>
                    </span>
                    {hasCv ? (
                      <a
                        href={c.cv_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          textDecoration: 'none',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: '600'
                        }}
                      >
                        Ver CV ↗
                      </a>
                    ) : (
                      <button
                        onClick={() => handleOpenEdit(c)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ba4b24',
                          fontWeight: '600',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        + Adjuntar
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer de Acciones */}
                <div style={{
                  borderTop: '1px solid #f3f4f6',
                  paddingTop: '0.85rem',
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'space-between'
                }}>
                  <button
                    onClick={() => setViewExpedienteCollab(c)}
                    style={{
                      flex: 1,
                      backgroundColor: '#29211d',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>🪪</span> Expediente
                  </button>

                  <button
                    onClick={() => handleOpenEdit(c)}
                    title="Editar datos"
                    style={{
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      padding: '0.55rem 0.8rem',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Editar
                  </button>

                  <button
                    onClick={() => handleDelete(c.id, c.full_name)}
                    title="Eliminar colaborador"
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #fca5a5',
                      padding: '0.55rem 0.8rem',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── VISTA DE TABLA ── */
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
          overflowX: 'auto',
          border: '1px solid #e5e7eb'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#29211d', color: '#ffffff', borderBottom: '2px solid #ba4b24' }}>
                <th style={{ padding: '0.9rem 1rem' }}>Colaborador</th>
                <th style={{ padding: '0.9rem 1rem' }}>Puesto y Área</th>
                <th style={{ padding: '0.9rem 1rem' }}>Teléfono</th>
                <th style={{ padding: '0.9rem 1rem' }}>Contrato / Sueldo</th>
                <th style={{ padding: '0.9rem 1rem' }}>Estado</th>
                <th style={{ padding: '0.9rem 1rem' }}>CV</th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredColaboradores.map((c, idx) => {
                const cleanPhone = c.phone ? c.phone.replace(/[^0-9]/g, '') : '';
                return (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      transition: 'background-color 0.15s'
                    }}
                  >
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {renderAvatar(c, 42)}
                        <div>
                          <div style={{ fontWeight: '700', color: '#111827' }}>{c.full_name}</div>
                          {c.email && (
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{c.email}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '0.8rem 1rem' }}>
                      <div style={{ fontWeight: '600', color: '#374151' }}>{c.position}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{c.department || 'Taller'}</div>
                    </td>

                    <td style={{ padding: '0.8rem 1rem' }}>
                      {c.phone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{c.phone}</span>
                          <a
                            href={`https://wa.me/${cleanPhone.length === 10 ? '52' + cleanPhone : cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              textDecoration: 'none',
                              backgroundColor: '#25D366',
                              color: 'white',
                              borderRadius: '4px',
                              padding: '2px 5px',
                              fontSize: '0.7rem',
                              fontWeight: '600'
                            }}
                          >
                            WA
                          </a>
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '0.8rem 1rem' }}>
                      <div style={{ fontWeight: '600', color: '#15803d' }}>
                        {c.salary ? `$${c.salary}` : '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {c.contract_type || 'Tiempo Completo'}
                      </div>
                    </td>

                    <td style={{ padding: '0.8rem 1rem' }}>
                      {getStatusBadge(c.status)}
                    </td>

                    <td style={{ padding: '0.8rem 1rem' }}>
                      {c.cv_url ? (
                        <a
                          href={c.cv_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#16a34a',
                            fontWeight: '600',
                            textDecoration: 'none',
                            fontSize: '0.82rem',
                            backgroundColor: '#f0fdf4',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #bbf7d0'
                          }}
                        >
                          📄 Abrir CV
                        </a>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>Sin CV</span>
                      )}
                    </td>

                    <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => setViewExpedienteCollab(c)}
                          title="Ver Expediente"
                          style={{
                            backgroundColor: '#29211d',
                            color: '#ffffff',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.78rem'
                          }}
                        >
                          🪪 Ver
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          title="Editar"
                          style={{
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.78rem'
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.full_name)}
                          title="Eliminar"
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fca5a5',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.78rem'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL DE CREAR / EDITAR COLABORADOR ── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            borderTop: '5px solid #ba4b24'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.75rem',
              backgroundColor: '#29211d',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{editingCollab ? '✏️' : '➕'}</span>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: '#ffffff' }}>
                    {editingCollab ? `Editar Colaborador: ${editingCollab.full_name}` : 'Registrar Nuevo Colaborador'}
                  </h2>
                  <span style={{ fontSize: '0.78rem', color: '#d1d5db' }}>
                    Todos los campos de puesto, área, contrato y estatus son 100% editables y libres
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  opacity: 0.8
                }}
              >
                ✕
              </button>
            </div>

            {/* Pestañas del Formulario */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              {[
                { id: 'general', label: '👤 Personal y Contacto' },
                { id: 'laboral', label: '🪵 Puesto y Condiciones' },
                { id: 'archivos', label: '📷 Foto y CV' },
                { id: 'adicional', label: '🛠️ Habilidades y Extra' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFormTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '0.85rem 0.5rem',
                    border: 'none',
                    borderBottom: activeFormTab === tab.id ? '3px solid #ba4b24' : '3px solid transparent',
                    background: activeFormTab === tab.id ? '#ffffff' : 'transparent',
                    color: activeFormTab === tab.id ? '#ba4b24' : '#4b5563',
                    fontWeight: activeFormTab === tab.id ? '700' : '500',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Alerta de Error en el Formulario */}
            {formError && (
              <div style={{
                backgroundColor: '#fee2e2',
                borderBottom: '1px solid #f87171',
                color: '#991b1b',
                padding: '0.75rem 1.5rem',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚠️</span>
                <span>{formError}</span>
              </div>
            )}

            {/* Form Content */}
            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                {/* ── TAB 1: GENERAL & CONTACTO ── */}
                {activeFormTab === 'general' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                        Nombre Completo <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Juan Carlos Rodríguez Mendoza"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.92rem'
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                          Número Telefónico / Celular
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. 3312345678"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.92rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                          Correo Electrónico
                        </label>
                        <input
                          type="email"
                          placeholder="colaborador@correo.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.92rem'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                          NSS / RFC / CURP / Identificación
                        </label>
                        <input
                          type="text"
                          placeholder="Identificación fiscal o seguro social"
                          value={formData.nss_rfc}
                          onChange={(e) => setFormData({ ...formData, nss_rfc: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.92rem'
                          }}
                        />
                      </div>

                      {/* Estatus Laboral - 100% EDITABLE / PERSONALIZABLE */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>
                            Estatus Laboral
                          </label>
                          <span style={{ fontSize: '0.72rem', color: '#ba4b24', fontWeight: '600' }}>Editable libremente</span>
                        </div>
                        <input
                          type="text"
                          list="collab-estatus-list"
                          placeholder="Escribe o selecciona (Activo, Vacaciones, etc.)"
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.92rem',
                            background: '#ffffff'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                        Dirección / Domicilio
                      </label>
                      <input
                        type="text"
                        placeholder="Calle, número, colonia, municipio..."
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.92rem'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* ── TAB 2: PUESTO & CONDICIONES (CAMPOS 100% EDITABLES) ── */}
                {activeFormTab === 'laboral' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Nota explicativa de campos editables */}
                    <div style={{
                      backgroundColor: '#fff7ed',
                      border: '1px solid #fed7aa',
                      borderRadius: '8px',
                      padding: '0.6rem 0.9rem',
                      fontSize: '0.8rem',
                      color: '#9a3412',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>💡</span>
                      <span>Puedes elegir una de las sugerencias o <strong>escribir el nombre exacto que desees</strong> en cada campo.</span>
                    </div>

                    {/* Puesto / Cargo & Área / Departamento */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {/* PUESTO / CARGO EDITABLE */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>
                            Puesto / Cargo <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <span style={{ fontSize: '0.72rem', color: '#ba4b24', fontWeight: '600' }}>Editable libremente</span>
                        </div>
                        <input
                          type="text"
                          required
                          list="collab-puestos-list"
                          placeholder="Escribe o elige un puesto..."
                          value={formData.position}
                          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.92rem',
                            background: '#ffffff'
                          }}
                        />
                      </div>

                      {/* ÁREA / DEPARTAMENTO EDITABLE */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>
                            Área / Departamento
                          </label>
                          <span style={{ fontSize: '0.72rem', color: '#ba4b24', fontWeight: '600' }}>Editable libremente</span>
                        </div>
                        <input
                          type="text"
                          list="collab-deptos-list"
                          placeholder="Escribe o elige un área..."
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.92rem',
                            background: '#ffffff'
                          }}
                        />
                      </div>
                    </div>

                    {/* Tipo de Contrato & Fecha de Ingreso */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {/* TIPO DE CONTRATO EDITABLE */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>
                            Tipo de Contrato
                          </label>
                          <span style={{ fontSize: '0.72rem', color: '#ba4b24', fontWeight: '600' }}>Editable libremente</span>
                        </div>
                        <input
                          type="text"
                          list="collab-contratos-list"
                          placeholder="Escribe o elige (Tiempo Completo, Por Destajo...)"
                          value={formData.contract_type}
                          onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.92rem',
                            background: '#ffffff'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                          Fecha de Ingreso (Opcional)
                        </label>
                        <input
                          type="date"
                          value={formData.hire_date || ''}
                          onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.92rem'
                          }}
                        />
                      </div>
                    </div>

                    {/* Sueldo / Tarifa & Periodicidad */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                          Sueldo / Tarifa ($)
                        </label>
                        <input
                          type="text"
                          list="sueldos-list"
                          placeholder="Ej. 4500 o 400"
                          value={formData.salary}
                          onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.92rem'
                          }}
                        />
                        <datalist id="sueldos-list">
                          <option value="100" />
                          <option value="150" />
                          <option value="200" />
                          <option value="250" />
                          <option value="300" />
                          <option value="350" />
                          <option value="400" />
                          <option value="450" />
                          <option value="500" />
                        </datalist>
                        {formData.salary && !isNaN(parseFloat(formData.salary)) && (
                          <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '4px', fontWeight: '600' }}>
                            Hora Extra (x1.5): ${(parseFloat(formData.salary) * 1.5).toFixed(2)}
                          </div>
                        )}
                      </div>

                      {/* PERIODICIDAD EDITABLE */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>
                            Periodicidad
                          </label>
                          <span style={{ fontSize: '0.72rem', color: '#ba4b24', fontWeight: '600' }}>Editable</span>
                        </div>
                        <input
                          type="text"
                          list="collab-periodos-list"
                          placeholder="Semanal, Quincenal..."
                          value={formData.salary_period}
                          onChange={(e) => setFormData({ ...formData, salary_period: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.92rem',
                            background: '#ffffff'
                          }}
                        />
                      </div>
                    </div>

                    {/* HORARIO (Entrada y Salida) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                          Hora de Entrada
                        </label>
                        <input
                          type="time"
                          value={formData.entry_time || ''}
                          onChange={(e) => setFormData({ ...formData, entry_time: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.92rem'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                          Hora de Salida
                        </label>
                        <input
                          type="time"
                          value={formData.exit_time || ''}
                          onChange={(e) => setFormData({ ...formData, exit_time: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.92rem'
                          }}
                        />
                      </div>
                    </div>

                  </div>
                )}

                {/* ── TAB 3: FOTO Y CV ── */}
                {activeFormTab === 'archivos' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Sección Foto */}
                    <div style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      backgroundColor: '#fafaf9'
                    }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#29211d', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📷 Fotografía del Colaborador
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{
                          width: '84px',
                          height: '84px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          backgroundColor: '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '3px solid #ba4b24',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          {stagedPhotoPreview ? (
                            <img
                              src={stagedPhotoPreview}
                              alt="Preview"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <span style={{ fontSize: '2rem' }}>👤</span>
                          )}
                        </div>
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            ref={photoInputRef}
                            style={{ display: 'none' }}
                            onChange={handlePhotoSelect}
                          />
                          <button
                            type="button"
                            onClick={() => photoInputRef.current?.click()}
                            style={{
                              backgroundColor: '#ba4b24',
                              color: '#ffffff',
                              border: 'none',
                              padding: '0.55rem 1rem',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            {stagedPhotoPreview ? 'Cambiar Foto' : 'Subir Foto'}
                          </button>
                          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px' }}>
                            Formatos soportados: JPG, PNG o WEBP.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Sección CV */}
                    <div style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      backgroundColor: '#fafaf9'
                    }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#29211d', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📄 Currículum Vitae (CV) / Hoja de Vida
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: '#4b5563', marginBottom: '0.75rem' }}>
                        Adjunta el CV en formato PDF, Word o imagen en caso de tenerlo disponible:
                      </p>

                      <div style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: '10px',
                        padding: '1.25rem',
                        textAlign: 'center',
                        backgroundColor: '#ffffff'
                      }}>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,image/*"
                          ref={cvInputRef}
                          style={{ display: 'none' }}
                          onChange={handleCvSelect}
                        />

                        {stagedCvFile ? (
                          <div>
                            <div style={{ fontSize: '2rem', marginBottom: '4px' }}>📄</div>
                            <strong style={{ color: '#16a34a', display: 'block', fontSize: '0.9rem' }}>
                              Archivo seleccionado: {stagedCvFile.name}
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              ({(stagedCvFile.size / 1024).toFixed(1)} KB) - Se cargará al guardar
                            </span>
                            <div style={{ marginTop: '0.5rem' }}>
                              <button
                                type="button"
                                onClick={() => cvInputRef.current?.click()}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ba4b24',
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  fontSize: '0.82rem'
                                }}
                              >
                                Reemplazar archivo
                              </button>
                            </div>
                          </div>
                        ) : formData.cv_url ? (
                          <div>
                            <div style={{ fontSize: '2rem', marginBottom: '4px' }}>✅</div>
                            <strong style={{ color: '#16a34a', display: 'block', fontSize: '0.9rem' }}>
                              CV actual registrado: {formData.cv_filename || 'Currículum Vitae'}
                            </strong>
                            <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                              <a
                                href={formData.cv_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: '#2563eb',
                                  textDecoration: 'none',
                                  fontSize: '0.82rem',
                                  fontWeight: '600'
                                }}
                              >
                                Ver documento actual ↗
                              </a>
                              <button
                                type="button"
                                onClick={() => cvInputRef.current?.click()}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ba4b24',
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  fontSize: '0.82rem'
                                }}
                              >
                                Reemplazar con nuevo archivo
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize: '2.2rem', marginBottom: '6px' }}>📎</div>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.88rem', fontWeight: '500', color: '#374151' }}>
                              Sin archivo adjunto
                            </p>
                            <button
                              type="button"
                              onClick={() => cvInputRef.current?.click()}
                              style={{
                                backgroundColor: '#29211d',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.55rem 1.1rem',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              Seleccionar Archivo CV
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 4: HABILIDADES & NOTAS ADICIONALES ── */}
                {activeFormTab === 'adicional' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                        Habilidades y Especialidades (separadas por comas)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Melamina, Barniz poliuretano, Sierra escuadradora, Canteado, Router CNC"
                        value={formData.skills}
                        onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.92rem'
                        }}
                      />
                      <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>
                        Aparecerán como etiquetas y facilitarán buscar colaboradores calificados para proyectos específicos.
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                          Contacto de Emergencia (Nombre y Parentesco)
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. María Sánchez (Esposa)"
                          value={formData.emergency_contact_name}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.92rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                          Teléfono de Emergencia
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. 3398765432"
                          value={formData.emergency_contact_phone}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.92rem'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                        Observaciones / Historial / Notas Internas
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Herramientas personales asignadas, acuerdos laborales, experiencia previa, referencias..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.92rem',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '1rem 1.75rem',
                borderTop: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    fontWeight: '600',
                    color: '#4b5563',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {activeFormTab !== 'general' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs = ['general', 'laboral', 'archivos', 'adicional'];
                        const curIdx = tabs.indexOf(activeFormTab);
                        if (curIdx > 0) setActiveFormTab(tabs[curIdx - 1]);
                      }}
                      style={{
                        backgroundColor: '#e5e7eb',
                        border: 'none',
                        padding: '0.65rem 1.1rem',
                        borderRadius: '8px',
                        fontWeight: '600',
                        color: '#374151',
                        cursor: 'pointer'
                      }}
                    >
                      ← Anterior
                    </button>
                  )}

                  {activeFormTab !== 'adicional' ? (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs = ['general', 'laboral', 'archivos', 'adicional'];
                        const curIdx = tabs.indexOf(activeFormTab);
                        if (curIdx < tabs.length - 1) setActiveFormTab(tabs[curIdx + 1]);
                      }}
                      style={{
                        backgroundColor: '#29211d',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.65rem 1.25rem',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Siguiente →
                    </button>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{
                      backgroundColor: '#ba4b24',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.65rem 1.5rem',
                      borderRadius: '8px',
                      fontWeight: '700',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      opacity: isSaving ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>💾</span> {isSaving ? 'Guardando...' : (editingCollab ? 'Actualizar' : 'Guardar Colaborador')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL FICHA TÉCNICA / EXPEDIENTE COMPLETO ── */}
      {viewExpedienteCollab && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            borderTop: '5px solid #ba4b24'
          }}>
            {/* Header del Expediente */}
            <div style={{
              backgroundColor: '#29211d',
              padding: '1.5rem',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {renderAvatar(viewExpedienteCollab, 68)}
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: '700', margin: 0, color: '#ffffff' }}>
                    {viewExpedienteCollab.full_name}
                  </h2>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ backgroundColor: '#ba4b24', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: '600' }}>
                      {viewExpedienteCollab.position}
                    </span>
                    <span style={{ color: '#d1d5db', fontSize: '0.8rem' }}>
                      • {viewExpedienteCollab.department || 'Producción'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewExpedienteCollab(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '1.4rem',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Contenido del Expediente */}
            <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Estado Laboral Actual:</span>
                {getStatusBadge(viewExpedienteCollab.status)}
              </div>

              {/* Grid 2 Columnas: Contacto & Laboral */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div style={{ backgroundColor: '#fafaf9', padding: '1rem', borderRadius: '10px', border: '1px solid #e7e5e4' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#78716c', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.5px' }}>
                    📞 Contacto
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
                    <div>
                      <strong style={{ color: '#44403c' }}>Teléfono: </strong>
                      {viewExpedienteCollab.phone ? (
                        <a href={`tel:${viewExpedienteCollab.phone}`} style={{ color: '#ba4b24', fontWeight: '600', textDecoration: 'none' }}>
                          {viewExpedienteCollab.phone}
                        </a>
                      ) : 'No especificado'}
                    </div>
                    <div>
                      <strong style={{ color: '#44403c' }}>Email: </strong>
                      {viewExpedienteCollab.email || 'No especificado'}
                    </div>
                    <div>
                      <strong style={{ color: '#44403c' }}>Dirección: </strong>
                      {viewExpedienteCollab.address || 'No especificado'}
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#fafaf9', padding: '1rem', borderRadius: '10px', border: '1px solid #e7e5e4' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#78716c', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.5px' }}>
                    🪵 Datos Laborales
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
                    <div>
                      <strong style={{ color: '#44403c' }}>Puesto: </strong>
                      {viewExpedienteCollab.position}
                    </div>
                    <div>
                      <strong style={{ color: '#44403c' }}>Área: </strong>
                      {viewExpedienteCollab.department || 'Taller'}
                    </div>
                    <div>
                      <strong style={{ color: '#44403c' }}>Tipo de Contrato: </strong>
                      {viewExpedienteCollab.contract_type || 'Tiempo Completo'}
                    </div>
                    <div>
                      <strong style={{ color: '#44403c' }}>Fecha Ingreso: </strong>
                      {viewExpedienteCollab.hire_date || 'No registrada'}
                    </div>
                    <div>
                      <strong style={{ color: '#44403c' }}>Sueldo / Tarifa: </strong>
                      <span style={{ color: '#15803d', fontWeight: '700' }}>
                        {viewExpedienteCollab.salary ? `$${viewExpedienteCollab.salary} (${viewExpedienteCollab.salary_period || 'Semanal'})` : 'No asignado'}
                      </span>
                    </div>
                    <div>
                      <strong style={{ color: '#44403c' }}>NSS / RFC: </strong>
                      {viewExpedienteCollab.nss_rfc || 'No registrado'}
                    </div>
                  </div>
                </div>
              </div>

              {/* CV Banner */}
              <div style={{
                backgroundColor: viewExpedienteCollab.cv_url ? '#f0fdf4' : '#f9fafb',
                border: viewExpedienteCollab.cv_url ? '1px solid #86efac' : '1px dashed #d1d5db',
                padding: '1rem',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong style={{ color: viewExpedienteCollab.cv_url ? '#166534' : '#6b7280', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📄 {viewExpedienteCollab.cv_url ? 'Currículum Vitae (CV) Disponible' : 'Sin Currículum Vitae cargado'}
                  </strong>
                  {viewExpedienteCollab.cv_filename && (
                    <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                      Archivo: {viewExpedienteCollab.cv_filename}
                    </span>
                  )}
                </div>
                {viewExpedienteCollab.cv_url ? (
                  <a
                    href={viewExpedienteCollab.cv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      textDecoration: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '700'
                    }}
                  >
                    Ver / Descargar CV ↗
                  </a>
                ) : (
                  <button
                    onClick={() => {
                      setViewExpedienteCollab(null);
                      handleOpenEdit(viewExpedienteCollab);
                    }}
                    style={{
                      backgroundColor: '#ba4b24',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.45rem 0.9rem',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    + Cargar CV
                  </button>
                )}
              </div>

              {/* Especialidades */}
              {viewExpedienteCollab.skills && (
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: '#78716c', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                    🛠️ Especialidades y Habilidades
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {viewExpedienteCollab.skills.split(',').map((s, idx) => (
                      <span key={idx} style={{ backgroundColor: '#f3e8ff', color: '#6b21a8', padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' }}>
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contacto de Emergencia */}
              {(viewExpedienteCollab.emergency_contact_name || viewExpedienteCollab.emergency_contact_phone) && (
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '0.9rem 1rem', borderRadius: '10px' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
                    🚨 En Caso de Emergencia
                  </h4>
                  <div style={{ fontSize: '0.88rem', color: '#78350f', display: 'flex', gap: '1.5rem' }}>
                    <span><strong>Contacto:</strong> {viewExpedienteCollab.emergency_contact_name || 'No especificado'}</span>
                    <span><strong>Teléfono:</strong> {viewExpedienteCollab.emergency_contact_phone || 'No especificado'}</span>
                  </div>
                </div>
              )}

              {/* Observaciones */}
              {viewExpedienteCollab.notes && (
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: '#78716c', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
                    📝 Observaciones Internas
                  </h4>
                  <p style={{ backgroundColor: '#f9fafb', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.88rem', color: '#374151', margin: 0, whiteSpace: 'pre-line' }}>
                    {viewExpedienteCollab.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Footer Expediente */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <button
                onClick={() => {
                  const toEdit = viewExpedienteCollab;
                  setViewExpedienteCollab(null);
                  handleOpenEdit(toEdit);
                }}
                style={{
                  backgroundColor: '#ba4b24',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ✏️ Editar Expediente
              </button>

              <button
                onClick={() => setViewExpedienteCollab(null)}
                style={{
                  backgroundColor: '#e5e7eb',
                  border: 'none',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '6px',
                  fontWeight: '600',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
