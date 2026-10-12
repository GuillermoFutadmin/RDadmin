import React, { useCallback, useEffect, useState } from 'react';
import ProjectTracking from './ProjectTracking';
import useAutoRefresh from './useAutoRefresh';

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
};

export default function ClientPortal() {
  const [project, setProject] = useState(null);
  const [publicId, setPublicId] = useState('');
  const [password, setPassword] = useState('');
  const [credentials, setCredentials] = useState(null);
  const [syncError, setSyncError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.parent === window || !document.referrer) return undefined;

    const parentOrigin = new URL(document.referrer).origin;
    const reportHeight = () => {
      window.parent.postMessage({
        type: 'rdadmin-client-portal-height',
        height: document.documentElement.scrollHeight
      }, parentOrigin);
    };
    const resizeObserver = new ResizeObserver(reportHeight);

    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(document.body);
    window.addEventListener('load', reportHeight);
    reportHeight();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('load', reportHeight);
    };
  }, []);

  const refreshProject = useCallback(async () => {
    if (!credentials) return;
    try {
      const response = await fetch('/api/client-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      if (response.status === 401) {
        setProject(null);
        setCredentials(null);
        setPassword('');
        setLoginError('La contraseña cambió o el acceso fue revocado. Ingresa de nuevo.');
        return;
      }
      if (!response.ok) throw new Error('No se pudo actualizar el proyecto.');
      setProject(await response.json());
      setSyncError('');
    } catch (error) {
      setSyncError(error.message || 'No se pudo actualizar el proyecto.');
    }
  }, [credentials]);

  useAutoRefresh(refreshProject, { enabled: Boolean(credentials), intervalMs: 30000 });

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      const loginCredentials = { public_id: publicId.trim().toUpperCase(), password };
      const response = await fetch('/api/client-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginCredentials)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'No se pudo validar el acceso.');
      setCredentials(loginCredentials);
      setProject(result);
      setPassword('');
      setSyncError('');
    } catch (error) {
      setLoginError(error.message || 'No se pudo validar el acceso.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCredentials(null);
    setProject(null);
    setPassword('');
    setLoginError('');
    setSyncError('');
  };

  if (!project) {
    return (
      <main className="client-portal-login">
        <section className="client-portal-login-form">
          {loginError && <div role="alert" style={{ marginBottom: 14, padding: '0.7rem 0.8rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.82rem' }}>{loginError}</div>}
          <form onSubmit={handleLogin}>
            <label htmlFor="client-public-id" style={{ display: 'block', marginBottom: 5, color: '#475569', fontSize: '0.82rem', fontWeight: 700 }}>ID del contrato</label>
            <input id="client-public-id" type="text" required autoCapitalize="characters" autoComplete="username" value={publicId} onChange={event => setPublicId(event.target.value)} placeholder="Ej. DSN49X"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.78rem 0.85rem', marginBottom: 14, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.95rem' }} />
            <label htmlFor="client-password" style={{ display: 'block', marginBottom: 5, color: '#475569', fontSize: '0.82rem', fontWeight: 700 }}>Contraseña de acceso</label>
            <input id="client-password" type="password" required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Tu contraseña"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.78rem 0.85rem', marginBottom: 18, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.95rem' }} />
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.82rem', background: 'linear-gradient(135deg, #ba4b24 0%, #7c2d12 100%)', color: '#fff', border: 0, borderRadius: 8, fontWeight: 800, fontSize: '0.95rem', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Validando...' : 'Ver mi proyecto'}
            </button>
          </form>
        </section>
      </main>
    );
  }

  const projectDetails = [
    ['Tipo de proyecto', project.project_type],
    ['Detalle solicitado', project.project_type_other],
    ['Descripción del proyecto', project.restoration_details],
    ['Descripción acordada', project.quote_description],
    ['Prioridades', project.project_priorities],
    ['Lo que esperas del proyecto', project.expectations]
  ].map(([label, value]) => [label, displayValue(value)]).filter(([, value]) => value);

  return (
    <main style={{ minHeight: '100vh', padding: '1.25rem', background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: 'min(100%, 960px)', margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '0.9rem 1rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo-rd.png" alt="RD Carpintería" style={{ width: 52, height: 52, objectFit: 'contain' }} />
            <div>
              <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Portal de clientes</div>
              <h1 style={{ margin: '0.15rem 0 0', color: '#172b4d', fontSize: '1.2rem' }}>Hola, {project.name || 'cliente'}</h1>
              <div style={{ marginTop: 3, color: '#64748b', fontSize: '0.76rem' }}>ID de contrato: <strong>{project.public_id}</strong></div>
            </div>
          </div>
          <button type="button" onClick={handleLogout} style={{ padding: '0.55rem 0.85rem', background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
            Cerrar sesión
          </button>
        </header>

        {syncError && (
          <div role="status" style={{ marginTop: 12, padding: '0.7rem 0.85rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, fontSize: '0.82rem' }}>
            {syncError} Se volverá a intentar automáticamente.
          </div>
        )}

        <ProjectTracking prospect={project} showEvidence />

        <section style={{ marginTop: 12, padding: '1rem', background: '#fff', border: '1px solid #dbe5ef', borderRadius: 14, boxShadow: '0 3px 12px rgba(15, 23, 42, 0.04)' }}>
          <h2 style={{ margin: '0 0 0.75rem', color: '#172b4d', fontSize: '1rem' }}>Lo que solicitaste</h2>
          {projectDetails.length ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {projectDetails.map(([label, value]) => (
                <div key={label}>
                  <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                  <div style={{ marginTop: 3, color: '#334155', fontSize: '0.86rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{value}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.84rem' }}>Aún no hay una descripción capturada para este proyecto.</p>
          )}
        </section>

        <p style={{ margin: '1rem 0', color: '#94a3b8', textAlign: 'center', fontSize: '0.72rem' }}>
          La información de avance se actualiza automáticamente.
        </p>
      </div>
    </main>
  );
}
