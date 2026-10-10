import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const API = '';

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
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {!showLogin ? (
        <button
          type="button"
          className="login-logo-launch"
          onClick={() => setShowLogin(true)}
          aria-label="Mostrar opciones de inicio de sesión"
        >
          <img src="/logo-rd.png" alt="RD Carpintería" />
        </button>
      ) : <div className="login-card">
        {/* Brand Logo/Text */}
        <div className="login-brand">
          <button type="button" className="login-brand-logo" onClick={() => setShowLogin(false)} aria-label="Volver al logo">
            <img src="/logo-rd.png" alt="" />
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#1e293b' }}>Bienvenido de nuevo</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>Ingresa tus credenciales para acceder</p>
        </div>

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

        <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          &copy; {new Date().getFullYear()} RD Carpintería. Todos los derechos reservados.
        </p>
      </div>}
    </div>
  );
}
