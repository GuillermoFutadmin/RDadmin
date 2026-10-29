import React, { useEffect, useState } from 'react';
import { IconCamera, IconFileText, IconTrash, IconEdit, IconCheckCircle, IconSearch } from './icons';

const API = import.meta.env.VITE_API_URL || '';
const emptySupplier = {
  name: '',
  contact_name: '',
  phone: '',
  location: '',
  notes: '',
  has_invoice: false,
  rfc: '',
  business_name: '',
  invoice_email: '',
  logo_url: ''
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.65rem 0.75rem',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  font: 'inherit',
  fontSize: '0.88rem'
};

export default function Proveedores() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptySupplier);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState('');

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/suppliers`);
      if (!response.ok) throw new Error(`No se pudo cargar la agenda de proveedores (${response.status})`);
      setSuppliers(await response.json());
    } catch (error) {
      setMessage(error.message || 'No se pudo cargar la agenda de proveedores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSuppliers(); }, []);

  const resetForm = () => {
    setForm(emptySupplier);
    setEditingId(null);
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Por favor selecciona una imagen válida (PNG, JPG, WebP).');
      return;
    }

    setUploadingLogo(true);
    setMessage('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${API}/api/suppliers/upload-logo`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        throw new Error(`Error al subir el logo (${response.status})`);
      }
      const data = await response.json();
      setForm(prev => ({ ...prev, logo_url: data.logo_url }));
      setMessage('Logo cargado correctamente.');
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'No se pudo subir el logo del proveedor.');
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setForm(prev => ({ ...prev, logo_url: '' }));
  };

  const saveSupplier = async event => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${API}/api/suppliers${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.detail || `No se pudo guardar el proveedor (${response.status})`);
      }
      const saved = await response.json();
      setSuppliers(current => editingId
        ? current.map(item => item.id === saved.id ? saved : item).sort((a, b) => a.name.localeCompare(b.name))
        : [...current, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setMessage(editingId ? 'Proveedor actualizado.' : 'Proveedor agregado a la agenda.');
      resetForm();
    } catch (error) {
      setMessage(error.message || 'No se pudo guardar el proveedor.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name || '',
      contact_name: supplier.contact_name || '',
      phone: supplier.phone || '',
      location: supplier.location || '',
      notes: supplier.notes || '',
      has_invoice: Boolean(supplier.has_invoice),
      rfc: supplier.rfc || '',
      business_name: supplier.business_name || '',
      invoice_email: supplier.invoice_email || '',
      logo_url: supplier.logo_url || ''
    });
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteSupplier = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar al proveedor "${name}"?`)) return;
    try {
      const response = await fetch(`${API}/api/suppliers/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('No se pudo eliminar el proveedor');
      setSuppliers(current => current.filter(s => s.id !== id));
      if (editingId === id) resetForm();
      setMessage(`Proveedor "${name}" eliminado.`);
    } catch (err) {
      setMessage(err.message || 'Error al eliminar proveedor.');
    }
  };

  const filtered = suppliers.filter(supplier =>
    [supplier.name, supplier.contact_name, supplier.phone, supplier.location, supplier.rfc, supplier.business_name]
      .some(value => String(value || '').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  );

  return (
    <main style={{ padding: 'clamp(0.8rem, 2vw, 1.6rem)', color: '#1e293b' }}>
      <header style={{ marginBottom: 20 }}>
        <div style={{ color: '#2563a8', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Agenda de compras</div>
        <h1 style={{ margin: '0.2rem 0', fontSize: 'clamp(1.45rem, 3vw, 2rem)', color: '#14243a' }}>Proveedores</h1>
        <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Contactos, datos de facturación y lugares de compra para los materiales de Producción.</div>
      </header>

      {message && (
        <div role="status" style={{
          marginBottom: 14,
          padding: '0.75rem 0.9rem',
          background: message.toLowerCase().includes('no se pudo') || message.toLowerCase().includes('error') ? '#fef2f2' : '#eff6ff',
          color: message.toLowerCase().includes('no se pudo') || message.toLowerCase().includes('error') ? '#b91c1c' : '#1d4f91',
          borderRadius: 10,
          fontWeight: 600,
          fontSize: '0.88rem'
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(290px, 0.85fr) minmax(0, 1.15fr)', gap: 16, alignItems: 'start' }}>
        {/* Formulario */}
        <form onSubmit={saveSupplier} style={{ display: 'grid', gap: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <h2 style={{ margin: '0 0 2px', fontSize: '1.05rem', color: '#1d4f91', fontWeight: 800 }}>
            {editingId ? 'Editar proveedor' : 'Agregar proveedor'}
          </h2>

          {/* Logo del proveedor */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            padding: '0.65rem 0.85rem',
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: 10
          }}>
            {form.logo_url ? (
              <div style={{
                position: 'relative',
                width: 58,
                height: 58,
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                padding: 3
              }}>
                <img src={form.logo_url} alt="Logo preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{
                width: 58,
                height: 58,
                borderRadius: 8,
                background: '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                flexShrink: 0
              }}>
                <IconCamera style={{ width: 24, height: 24, marginRight: 0 }} />
              </div>
            )}

            <div style={{ display: 'grid', gap: 4, flex: 1 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 750, color: '#475569' }}>Logo del proveedor</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 11px',
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 7,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  cursor: uploadingLogo ? 'wait' : 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  {uploadingLogo ? 'Subiendo...' : (form.logo_url ? 'Cambiar logo' : '+ Subir logo')}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingLogo}
                    onChange={handleLogoUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                {form.logo_url && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    style={{
                      padding: '5px 8px',
                      background: '#fee2e2',
                      border: '1px solid #fecaca',
                      borderRadius: 7,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#dc2626',
                      cursor: 'pointer'
                    }}>
                    Quitar
                  </button>
                )}
              </div>
            </div>
          </div>

          <label style={{ display: 'grid', gap: 5, fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
            Nombre del proveedor *
            <input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ej. LaFerre, Maderas y Herrajes..." style={inputStyle} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            <label style={{ display: 'grid', gap: 5, fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
              Contacto
              <input value={form.contact_name} onChange={event => setForm({ ...form, contact_name: event.target.value })} placeholder="Persona de contacto" style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
              Teléfono
              <input type="tel" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder="664-000-0000" style={inputStyle} />
            </label>
          </div>

          <label style={{ display: 'grid', gap: 5, fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
            Tienda o ubicación
            <input value={form.location} onChange={event => setForm({ ...form, location: event.target.value })} placeholder="Sucursal, dirección o zona" style={inputStyle} />
          </label>

          {/* Bloque Factura */}
          <div style={{
            background: form.has_invoice ? '#f0fdf4' : '#f8fafc',
            border: `1.5px solid ${form.has_invoice ? '#86efac' : '#e2e8f0'}`,
            borderRadius: 10,
            padding: '0.85rem',
            display: 'grid',
            gap: '0.75rem',
            transition: 'all 0.2s'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.84rem', fontWeight: 800, color: form.has_invoice ? '#15803d' : '#334155' }}>
                <IconFileText style={{ width: '16px', height: '16px', marginRight: 0, color: form.has_invoice ? '#16a34a' : '#64748b' }} />
                <span>¿Emite factura?</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, has_invoice: false })}
                  style={{
                    padding: '4px 11px',
                    borderRadius: 6,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: !form.has_invoice ? '#94a3b8' : '#cbd5e1',
                    background: !form.has_invoice ? '#fff' : 'transparent',
                    color: !form.has_invoice ? '#0f172a' : '#64748b',
                    cursor: 'pointer'
                  }}>
                  No
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, has_invoice: true })}
                  style={{
                    padding: '4px 13px',
                    borderRadius: 6,
                    fontSize: '0.78rem',
                    fontWeight: 750,
                    border: '1px solid',
                    borderColor: form.has_invoice ? '#16a34a' : '#cbd5e1',
                    background: form.has_invoice ? '#16a34a' : 'transparent',
                    color: form.has_invoice ? '#fff' : '#64748b',
                    cursor: 'pointer'
                  }}>
                  ✓ Sí factura
                </button>
              </div>
            </div>

            {form.has_invoice && (
              <div style={{ display: 'grid', gap: '0.65rem', marginTop: 2, paddingTop: '0.6rem', borderTop: '1px solid #bbf7d0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                  <label style={{ display: 'grid', gap: 4, fontSize: '0.74rem', fontWeight: 700, color: '#166534' }}>
                    RFC
                    <input
                      value={form.rfc}
                      onChange={e => setForm({ ...form, rfc: e.target.value.toUpperCase() })}
                      placeholder="XAXX010101000"
                      style={{ ...inputStyle, background: '#fff', textTransform: 'uppercase' }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 4, fontSize: '0.74rem', fontWeight: 700, color: '#166534' }}>
                    Correo de facturación
                    <input
                      type="email"
                      value={form.invoice_email}
                      onChange={e => setForm({ ...form, invoice_email: e.target.value })}
                      placeholder="facturas@empresa.com"
                      style={{ ...inputStyle, background: '#fff' }}
                    />
                  </label>
                </div>
                <label style={{ display: 'grid', gap: 4, fontSize: '0.74rem', fontWeight: 700, color: '#166534' }}>
                  Razón social / Nombre fiscal
                  <input
                    value={form.business_name}
                    onChange={e => setForm({ ...form, business_name: e.target.value })}
                    placeholder="Razón social en la constancia"
                    style={{ ...inputStyle, background: '#fff' }}
                  />
                </label>
              </div>
            )}
          </div>

          <label style={{ display: 'grid', gap: 5, fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
            Notas
            <textarea rows={3} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} placeholder="Condiciones de pago, créditos, horarios..." style={{ ...inputStyle, resize: 'vertical' }} />
          </label>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.75rem', border: 0, borderRadius: 9, background: '#2563eb', color: '#fff', fontWeight: 800, cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar proveedor'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} style={{ padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: 9, background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
            )}
          </div>
        </form>

        {/* Listado de proveedores */}
        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '1rem', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', color: '#1d4f91', fontWeight: 800 }}>Proveedores registrados ({suppliers.length})</h2>
            <div style={{ position: 'relative', width: 'min(260px, 100%)' }}>
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar proveedor o RFC..." style={{ ...inputStyle, paddingLeft: '2rem' }} />
              <IconSearch style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94a3b8', pointerEvents: 'none', marginRight: 0 }} />
            </div>
          </div>

          {loading ? (
            <p style={{ padding: '1.5rem', color: '#64748b', textAlign: 'center' }}>Cargando proveedores...</p>
          ) : filtered.length ? (
            <div style={{ display: 'grid', gap: 1, background: '#e2e8f0' }}>
              {filtered.map(supplier => (
                <article key={supplier.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', padding: '1.1rem', background: '#fff' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
                    {/* Logo / Avatar */}
                    {supplier.logo_url ? (
                      <div style={{
                        width: 54,
                        height: 54,
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                        padding: 3,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                      }}>
                        <img src={supplier.logo_url} alt={supplier.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                    ) : (
                      <div style={{
                        width: 54,
                        height: 54,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                        border: '1px solid #bfdbfe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1d4f91',
                        fontWeight: 800,
                        fontSize: '1.25rem',
                        flexShrink: 0
                      }}>
                        {supplier.name ? supplier.name.charAt(0).toUpperCase() : 'P'}
                      </div>
                    )}

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <h3 style={{ margin: 0, color: '#1e3a5f', fontSize: '1rem', fontWeight: 800 }}>{supplier.name}</h3>
                        {supplier.has_invoice ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: '#dcfce7',
                            border: '1px solid #86efac',
                            color: '#166534',
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}>
                            ✓ Factura
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 7px',
                            borderRadius: 999,
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            color: '#64748b',
                            fontSize: '0.7rem',
                            fontWeight: 600
                          }}>
                            Sin factura
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gap: 3, color: '#64748b', fontSize: '0.82rem' }}>
                        {supplier.contact_name && <span><strong>Contacto:</strong> {supplier.contact_name}</span>}
                        {supplier.phone && (
                          <span>
                            <strong>Tel:</strong> <a href={`tel:${supplier.phone}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>{supplier.phone}</a>
                          </span>
                        )}
                        {supplier.location && <span><strong>Ubicación:</strong> {supplier.location}</span>}

                        {/* Datos de facturación si cuenta con factura */}
                        {supplier.has_invoice && (supplier.rfc || supplier.business_name || supplier.invoice_email) && (
                          <div style={{
                            marginTop: 4,
                            padding: '0.45rem 0.65rem',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 7,
                            display: 'grid',
                            gap: 2,
                            fontSize: '0.78rem',
                            color: '#334155'
                          }}>
                            {supplier.rfc && <span><strong>RFC:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{supplier.rfc}</span></span>}
                            {supplier.business_name && <span><strong>Razón Social:</strong> {supplier.business_name}</span>}
                            {supplier.invoice_email && <span><strong>Email Facturas:</strong> <a href={`mailto:${supplier.invoice_email}`} style={{ color: '#2563eb' }}>{supplier.invoice_email}</a></span>}
                          </div>
                        )}

                        {supplier.notes && <span style={{ whiteSpace: 'pre-wrap', marginTop: 2, color: '#475569' }}><strong>Notas:</strong> {supplier.notes}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => startEdit(supplier)}
                      title="Editar proveedor"
                      style={{
                        padding: '0.45rem 0.65rem',
                        border: '1px solid #bfdbfe',
                        borderRadius: 8,
                        background: '#eff6ff',
                        color: '#1d4f91',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3
                      }}>
                      <IconEdit style={{ width: 13, height: 13, marginRight: 0 }} /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSupplier(supplier.id, supplier.name)}
                      title="Eliminar proveedor"
                      style={{
                        padding: '0.45rem 0.65rem',
                        border: '1px solid #fecaca',
                        borderRadius: 8,
                        background: '#fef2f2',
                        color: '#b91c1c',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3
                      }}>
                      <IconTrash style={{ width: 13, height: 13, marginRight: 0 }} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p style={{ padding: '1.5rem', margin: 0, color: '#64748b', textAlign: 'center' }}>
              {suppliers.length ? 'No hay proveedores que coincidan con la búsqueda.' : 'Todavía no hay proveedores registrados.'}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
