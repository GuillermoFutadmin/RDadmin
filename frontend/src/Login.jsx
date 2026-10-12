import React, { useEffect, useRef, useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoginOptions, setShowLoginOptions] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginMode, setLoginMode] = useState('staff');
  const [clientPortalHeight, setClientPortalHeight] = useState(240);
  const clientPortalFrame = useRef(null);

  const API = '';
  const clientPortalUrl = import.meta.env.VITE_CLIENT_PORTAL_URL || 'https://lavish-happiness-production-e277.up.railway.app';

  useEffect(() => {
    if (!clientPortalUrl) return undefined;

    const clientPortalOrigin = new URL(clientPortalUrl).origin;
    const handleClientPortalMessage = (event) => {
      if (event.origin !== clientPortalOrigin || event.source !== clientPortalFrame.current?.contentWindow) return;
      if (event.data?.type !== 'rdadmin-client-portal-height' || !Number.isFinite(event.data.height)) return;

      const nextH = Math.max(260, Math.ceil(event.data.height));
      setClientPortalHeight(prev => (Math.abs(prev - nextH) >= 8 ? nextH : prev));
    };

    window.addEventListener('message', handleClientPortalMessage);
    return () => window.removeEventListener('message', handleClientPortalMessage);
  }, [clientPortalUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Error al iniciar sesión');
      }

      const data = await res.json();
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: loginMode === 'client' ? 'flex-start' : 'center',
      boxSizing: 'border-box',
      padding: loginMode === 'client' ? '1.5rem 0.75rem 2.5rem' : '1rem',
      background: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {!showLogin ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.1rem' }}>
          <button
            type="button"
            className="login-logo-launch"
            onClick={() => setShowLoginOptions(true)}
            aria-label="Mostrar opciones de acceso"
            aria-expanded={showLoginOptions}
          >
            <img src="/logo-rd.png" alt="RD Carpintería" />
          </button>
          {showLoginOptions && <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" onClick={() => { setLoginMode('staff'); setShowLogin(true); }} style={{ padding: '0.75rem 1rem', background: '#fff', color: '#7c2d12', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
              Acceso personal RD
            </button>
            <button type="button" onClick={() => { setLoginMode('client'); setShowLogin(true); }} style={{ padding: '0.75rem 1rem', background: '#7c2d12', color: '#fff', border: 0, borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
              Soy cliente
            </button>
          </div>}
        </div>
      ) : <div className={`login-card${loginMode === 'client' ? ' login-card-client' : ''}`}>
        {/* Brand Logo/Text */}
        <div className="login-brand">
          <button type="button" className="login-brand-logo" onClick={() => setShowLogin(false)} aria-label="Volver al logo">
            <img src="/logo-rd.png" alt="" />
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#1e293b' }}>
            {loginMode === 'client' ? 'Acceso de clientes' : 'Bienvenido de nuevo'}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            {loginMode === 'client' ? 'Consulta los avances de tu proyecto.' : 'Ingresa tus credenciales para acceder'}
          </p>
        </div>

        <div role="tablist" aria-label="Tipo de acceso" style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
          <button type="button" role="tab" aria-selected={loginMode === 'staff'} onClick={() => { setLoginMode('staff'); setError(''); }} style={{ flex: 1, padding: '0.7rem 0.5rem', color: loginMode === 'staff' ? '#fff' : '#475569', background: loginMode === 'staff' ? '#7c2d12' : '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
            Personal RD
          </button>
          <button type="button" role="tab" aria-selected={loginMode === 'client'} onClick={() => { setLoginMode('client'); setError(''); }} style={{ flex: 1, padding: '0.7rem 0.5rem', color: loginMode === 'client' ? '#fff' : '#475569', background: loginMode === 'client' ? '#7c2d12' : '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
            Soy cliente
          </button>
        </div>

        {loginMode === 'client' ? (
          clientPortalUrl ? (
            <iframe
              ref={clientPortalFrame}
              title="Acceso al portal de clientes"
              src={clientPortalUrl}
              style={{ display: 'block', width: '100%', height: clientPortalHeight, border: 0, background: 'transparent' }}
            />
          ) : (
            <div role="alert" style={{ padding: '1rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
              El acceso de clientes aún no está configurado. Contacta al administrador.
            </div>
          )
        ) : <>
        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: '500' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Usuario</label>
            <input 
              type="text" 
              required
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '0.95rem' }} 
              placeholder="tu_usuario" 
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Contraseña</label>
            <input 
              type="password" 
              required
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '0.95rem' }} 
              placeholder="••••••••" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '0.9rem', 
              background: 'linear-gradient(135deg, #ba4b24 0%, #7c2d12 100%)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              fontWeight: '700', 
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(186, 75, 36, 0.25)',
              transition: 'transform 0.1s'
            }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
        </>}

        <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          &copy; {new Date().getFullYear()} RD Carpintería. Todos los derechos reservados.
        </p>
      </div>}
    </div>
  );
}
