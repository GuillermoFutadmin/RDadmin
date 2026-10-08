import React, { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || '';
const emptySupplier = { name: '', contact_name: '', phone: '', location: '', notes: '' };
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

  const filtered = suppliers.filter(supplier =>
    [supplier.name, supplier.contact_name, supplier.phone, supplier.location]
      .some(value => String(value || '').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  );

  return (
    <main style={{ padding: 'clamp(0.8rem, 2vw, 1.6rem)', color: '#1e293b' }}>
      <header style={{ marginBottom: 20 }}>
        <div style={{ color: '#2563a8', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Agenda de compras</div>
        <h1 style={{ margin: '0.2rem 0', fontSize: 'clamp(1.45rem, 3vw, 2rem)', color: '#14243a' }}>Proveedores</h1>
        <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Contactos y lugares de compra para los materiales de Producción.</div>
      </header>

      {message && <div role="status" style={{ marginBottom: 14, padding: '0.75rem 0.9rem', background: message.toLowerCase().includes('no se pudo') ? '#fef2f2' : '#eff6ff', color: message.toLowerCase().includes('no se pudo') ? '#b91c1c' : '#1d4f91', borderRadius: 10 }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(270px, 0.8fr) minmax(0, 1.2fr)', gap: 16, alignItems: 'start' }}>
        <form onSubmit={saveSupplier} style={{ display: 'grid', gap: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1rem' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#1d4f91' }}>{editingId ? 'Editar proveedor' : 'Agregar proveedor'}</h2>
          <label style={{ display: 'grid', gap: 5, fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
            Nombre del proveedor *
            <input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 5, fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
            Contacto
            <input value={form.contact_name} onChange={event => setForm({ ...form, contact_name: event.target.value })} style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 5, fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
            Teléfono
            <input type="tel" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 5, fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
            Tienda o ubicación
            <input value={form.location} onChange={event => setForm({ ...form, location: event.target.value })} style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 5, fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
            Notas
            <textarea rows={3} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.7rem', border: 0, borderRadius: 9, background: '#2563eb', color: '#fff', fontWeight: 800, cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar proveedor'}
            </button>
            {editingId && <button type="button" onClick={resetForm} style={{ padding: '0.7rem', border: '1px solid #cbd5e1', borderRadius: 9, background: '#fff', color: '#475569', fontWeight: 700 }}>Cancelar</button>}
          </div>
        </form>

        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '1rem', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', color: '#1d4f91' }}>Proveedores registrados ({suppliers.length})</h2>
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar proveedor" style={{ ...inputStyle, width: 'min(260px, 100%)' }} />
          </div>
          {loading ? <p style={{ padding: '1rem', color: '#64748b' }}>Cargando proveedores...</p> : filtered.length ? (
            <div style={{ display: 'grid', gap: 1, background: '#e2e8f0' }}>
              {filtered.map(supplier => (
                <article key={supplier.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', padding: '1rem', background: '#fff' }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 5px', color: '#1e3a5f', fontSize: '0.95rem' }}>{supplier.name}</h3>
                    <div style={{ display: 'grid', gap: 3, color: '#64748b', fontSize: '0.82rem' }}>
                      {supplier.contact_name && <span>Contacto: {supplier.contact_name}</span>}
                      {supplier.phone && <a href={`tel:${supplier.phone}`} style={{ color: '#2563eb' }}>Tel. {supplier.phone}</a>}
                      {supplier.location && <span>Ubicación: {supplier.location}</span>}
                      {supplier.notes && <span style={{ whiteSpace: 'pre-wrap' }}>{supplier.notes}</span>}
                    </div>
                  </div>
                  <button type="button" onClick={() => { setEditingId(supplier.id); setForm({ name: supplier.name || '', contact_name: supplier.contact_name || '', phone: supplier.phone || '', location: supplier.location || '', notes: supplier.notes || '' }); setMessage(''); }}
                    style={{ flex: 'none', padding: '0.5rem 0.7rem', border: '1px solid #bfdbfe', borderRadius: 8, background: '#eff6ff', color: '#1d4f91', fontWeight: 700, cursor: 'pointer' }}>Editar</button>
                </article>
              ))}
            </div>
          ) : <p style={{ padding: '1rem', margin: 0, color: '#64748b' }}>{suppliers.length ? 'No hay proveedores que coincidan con la búsqueda.' : 'Todavía no hay proveedores registrados.'}</p>}
        </section>
      </div>
    </main>
  );
}
