import React, { useState, useEffect } from 'react';

export default function Accesos() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API = '';

  const defaultForm = {
    name: '',
    username: '',
    password: '',
    role: 'Ventas',
    status: 'Activo',
    permissions: [],
    photoFile: null,
    photoPreview: null
  };
  const [formData, setFormData] = useState(defaultForm);

  const availablePermissions = [
    { id: 'Dashboard', label: '📊 RD admins, agenda' },
    { id: 'Prospectos', label: '👥 Prospectos' },
    { id: 'Ventas', label: '📈 Valoración / Cotizaciones' },
    { id: 'Contratos', label: '📄 Contratos' },
    { id: 'Colaboradores', label: '👷‍♂️ Colaboradores' },
    { id: 'Asistencia', label: '⏱️ Asistencia' },
    { id: 'Nomina', label: '💰 Nómina y Tarifas' },
    { id: 'Pedidos', label: '📦 Pedidos' },
    { id: 'Accesos', label: '🔐 Accesos' },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({ ...user, password: '', photoFile: null, photoPreview: user.photo_path || null });
    } else {
      setEditingUser(null);
      setFormData(defaultForm);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleTogglePermission = (permId) => {
    setFormData(prev => {
      const perms = prev.permissions;
      if (perms.includes(permId)) {
        return { ...prev, permissions: perms.filter(p => p !== permId) };
      } else {
        return { ...prev, permissions: [...perms, permId] };
      }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const url = editingUser ? `${API}/api/users/${editingUser.id}` : `${API}/api/users`;
      const method = editingUser ? 'PUT' : 'POST';
      
      const payload = { ...formData };
      if (editingUser && !payload.password) {
        delete payload.password; // Don't send empty password on edit
      }
      delete payload.photoFile;
      delete payload.photoPreview;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Error al guardar usuario');
        return;
      }
      
      const savedUser = await res.json();

      if (formData.photoFile) {
        const photoData = new FormData();
        photoData.append('file', formData.photoFile);
        await fetch(`${API}/api/users/${savedUser.id}/upload-photo`, {
          method: 'POST',
          body: photoData
        });
      }

      fetchUsers();
      handleCloseModal();
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar esta cuenta? El usuario ya no podrá acceder al sistema.')) {
      try {
        const res = await fetch(`${API}/api/users/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json();
          alert(err.detail || 'Error al eliminar');
          return;
        }
        setUsers(users.filter(u => u.id !== id));
      } catch (err) {
        console.error(err);
        alert('Error de conexión');
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.3rem 0' }}>🔐 Accesos y Permisos</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Administración de cuentas de usuario, roles y niveles de acceso al sistema.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          style={{ 
            background: 'linear-gradient(135deg, #ba4b24 0%, #7c2d12 100%)', 
            color: 'white', border: 'none', padding: '0.7rem 1.5rem', 
            borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(186, 75, 36, 0.25)',
            display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s'
          }}
        >
          <span>+</span> Nueva Cuenta
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
          <input 
            type="text" 
            placeholder="Buscar por nombre o usuario..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando usuarios...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: '600', fontSize: '0.85rem' }}>USUARIO</th>
                <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: '600', fontSize: '0.85rem' }}>ROL</th>
                <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: '600', fontSize: '0.85rem' }}>PERMISOS</th>
                <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: '600', fontSize: '0.85rem' }}>ESTADO</th>
                <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: '600', fontSize: '0.85rem', textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      {user.photo_path ? (
                        <img src={user.photo_path} alt={user.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.95rem' }}>{user.name}</div>
                        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ 
                      background: user.role === 'Administrador' ? '#fee2e2' : user.role === 'Gerente' ? '#fef3c7' : '#e0e7ff', 
                      color: user.role === 'Administrador' ? '#991b1b' : user.role === 'Gerente' ? '#92400e' : '#3730a3', 
                      padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700' 
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '250px' }}>
                      {user.permissions.slice(0, 3).map(p => (
                        <span key={p} style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', border: '1px solid #e2e8f0' }}>
                          {p}
                        </span>
                      ))}
                      {user.permissions.length > 3 && (
                        <span style={{ background: '#f8fafc', color: '#94a3b8', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                          +{user.permissions.length - 3} más
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: user.status === 'Activo' ? '#16a34a' : '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: user.status === 'Activo' ? '#22c55e' : '#cbd5e1' }}></span>
                      {user.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <button onClick={() => handleOpenModal(user)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', marginRight: '0.8rem', fontWeight: '600', fontSize: '0.85rem' }}>Editar</button>
                    <button onClick={() => handleDelete(user.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    No se encontraron cuentas que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nueva / Editar Cuenta */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a' }}>{editingUser ? 'Editar Cuenta' : 'Nueva Cuenta de Acceso'}</h2>
              <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '2rem' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div 
                  style={{ 
                    width: '80px', height: '80px', borderRadius: '50%', background: '#f1f5f9', 
                    border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', 
                    justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' 
                  }}
                  onClick={() => document.getElementById('photoInput').click()}
                >
                  {formData.photoPreview ? (
                    <img src={formData.photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '1.5rem', color: '#94a3b8' }}>📷</span>
                  )}
                  <input 
                    id="photoInput" type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setFormData({ ...formData, photoFile: file, photoPreview: URL.createObjectURL(file) });
                      }
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Nombre Completo</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', minWidth: '250px', padding: '0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} placeholder="Ej. Juan Pérez" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', marginBottom: '1.5rem' }}>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Usuario / Correo</label>
                  <input type="text" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} placeholder="usuario_rd" />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>
                    {editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}
                  </label>
                  <input type={editingUser ? "password" : "text"} required={!editingUser} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} placeholder={editingUser ? "Dejar en blanco para no cambiar" : "******"} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Rol en el Sistema</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', background: 'white' }}>
                    <option value="Administrador">Administrador</option>
                    <option value="Gerente">Gerente</option>
                    <option value="Ventas">Ventas</option>
                    <option value="Producción">Producción</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Estado de Cuenta</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', background: 'white' }}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo / Suspendido</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.8rem', fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>Permisos de Acceso Módulos</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  {availablePermissions.map(perm => {
                    const isChecked = formData.permissions.includes(perm.id);
                    return (
                      <div 
                        key={perm.id} 
                        onClick={() => handleTogglePermission(perm.id)}
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '0.5rem', 
                          padding: '0.8rem', borderRadius: '8px', 
                          border: `1px solid ${isChecked ? '#ba4b24' : '#e2e8f0'}`, 
                          background: isChecked ? '#fff5f0' : '#f8fafc',
                          cursor: 'pointer', transition: 'all 0.2s'
                        }}
                      >
                        <input type="checkbox" checked={isChecked} readOnly style={{ cursor: 'pointer', accentColor: '#ba4b24' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: isChecked ? '600' : '500', color: isChecked ? '#7c2d12' : '#475569' }}>
                          {perm.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                <button type="button" onClick={handleCloseModal} style={{ padding: '0.7rem 1.5rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ padding: '0.7rem 2rem', background: 'linear-gradient(135deg, #ba4b24 0%, #7c2d12 100%)', border: 'none', borderRadius: '8px', fontWeight: '600', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(186, 75, 36, 0.25)' }}>
                  Guardar Cuenta
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
