import React, { useState, useEffect } from 'react';
import './index.css';
import Dashboard from './Dashboard';
import Ventas from './Ventas';
import Pedidos from './Pedidos';
import Prospects from './Prospects';
import Contratos from './Contratos';
import Colaboradores from './Colaboradores';
import Accesos from './Accesos';
import Asistencia from './Asistencia';
import Login from './Login';

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [prospectsOpen, setProspectsOpen] = useState(false);
  const [contratosOpen, setContratosOpen] = useState(false);
  const [colaboradoresOpen, setColaboradoresOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [logoFrame, setLogoFrame] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Logo panel / cambiar contraseña
  const [showLogoPanel, setShowLogoPanel] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwMsg, setPwMsg] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);

  // Animate logo in main area
  useEffect(() => {
    const interval = setInterval(() => {
      setLogoFrame(f => f === 1 ? 2 : 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('rdadmin_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('rdadmin_user');
      }
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    localStorage.setItem('rdadmin_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('rdadmin_user');
    setUser(null);
    setShowLogoPanel(false);
  };

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (!pwCurrent || !pwNew || !pwConfirm) {
      setPwMsg({ type: 'error', text: 'Completa todos los campos.' }); return;
    }
    if (pwNew !== pwConfirm) {
      setPwMsg({ type: 'error', text: 'La nueva contraseña no coincide.' }); return;
    }
    if (pwNew.length < 4) {
      setPwMsg({ type: 'error', text: 'Mínimo 4 caracteres.' }); return;
    }
    setPwSaving(true);
    try {
      const verRes = await fetch(`/api/users/verify-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, password: pwCurrent })
      });
      if (!verRes.ok) {
        setPwMsg({ type: 'error', text: 'La contraseña actual es incorrecta.' });
        setPwSaving(false); return;
      }
      const upRes = await fetch(`/api/users/${user.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwNew })
      });
      if (!upRes.ok) throw new Error();
      setPwMsg({ type: 'ok', text: '¡Contraseña actualizada!' });
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
      setTimeout(() => { setChangingPassword(false); setPwMsg(null); }, 2000);
    } catch {
      setPwMsg({ type: 'error', text: 'Error al cambiar la contraseña.' });
    }
    setPwSaving(false);
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const hasAccess = (module) => {
    if (!user || !user.permissions) return false;
    return user.permissions.some(p => p.toLowerCase() === module.toLowerCase());
  };


  const handleProspectosClick = () => {
    setProspectsOpen(prev => !prev);
    setActiveTab('Prospectos');
  };

  const goTo = (tab) => {
    setActiveTab(tab);
    setProspectsOpen(false);
    setContratosOpen(false);
    setColaboradoresOpen(false);
    setSidebarOpen(false);
  };

  return (
    <div className="admin-container">
      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 40, display: 'block'
          }}
        />
      )}
      <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
        {/* ── LOGO CLICKABLE – arriba del sidebar ── */}
        <div
          onClick={() => { setShowLogoPanel(v => !v); setChangingPassword(false); setPwMsg(null); }}
          style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '0.75rem 0.5rem 0.6rem', cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '0.5rem',
          }}
          title="Información de sesión"
        >
          <img
            src="/logo-rd.png" alt="RD Carpintería"
            style={{ width: '176px', height: '176px', objectFit: 'contain',
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.55))', transition: 'transform 0.2s ease' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
        </div>

        {/* ── PANEL DE SESIÓN ── */}
        {showLogoPanel && (
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: '10px',
            margin: '0 0.5rem 0.75rem', padding: '0.85rem 0.9rem',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg,#ba4b24,#7c2d12)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', flexShrink: 0 }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: '700', fontSize: '0.85rem', lineHeight: 1.2 }}>{user.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem' }}>@{user.username} · {user.role}</div>
              </div>
            </div>

            {!changingPassword ? (
              <>
                <button onClick={() => setChangingPassword(true)} style={{
                  width: '100%', padding: '0.42rem 0.6rem', marginBottom: '0.4rem',
                  background: 'rgba(255,255,255,0.1)', color: 'white',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '0.76rem', fontWeight: '600', textAlign: 'left'
                }}>
                  🔑 Cambiar contraseña
                </button>
                <button onClick={handleLogout} style={{
                  width: '100%', padding: '0.42rem 0.6rem',
                  background: 'rgba(220,38,38,0.2)', color: '#fca5a5',
                  border: '1px solid rgba(220,38,38,0.3)', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '0.76rem', fontWeight: '600', textAlign: 'left'
                }}>
                  🚪 Cerrar sesión
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>
                {[
                  [pwCurrent, setPwCurrent, 'Contraseña actual'],
                  [pwNew, setPwNew, 'Nueva contraseña'],
                  [pwConfirm, setPwConfirm, 'Confirmar nueva'],
                ].map(([val, setter, ph]) => (
                  <input key={ph} type="password" placeholder={ph} value={val}
                    onChange={e => setter(e.target.value)}
                    style={{ padding: '0.38rem 0.6rem', borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.08)', color: 'white',
                      fontSize: '0.76rem', outline: 'none' }}
                  />
                ))}
                {pwMsg && (
                  <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '600',
                    color: pwMsg.type === 'ok' ? '#86efac' : '#fca5a5' }}>
                    {pwMsg.text}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button onClick={handleChangePassword} disabled={pwSaving} style={{
                    flex: 1, padding: '0.38rem', background: '#10b981', color: 'white',
                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.73rem', fontWeight: '700'
                  }}>{pwSaving ? 'Guardando...' : 'Guardar'}</button>
                  <button onClick={() => { setChangingPassword(false); setPwMsg(null); setPwCurrent(''); setPwNew(''); setPwConfirm(''); }} style={{
                    flex: 1, padding: '0.38rem', background: 'rgba(255,255,255,0.1)', color: 'white',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.73rem'
                  }}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Brand Header (Dashboard Link) ── */}
        {hasAccess('Dashboard') && (
          <div 
            onClick={() => { setActiveTab('Dashboard'); setProspectsOpen(false); setContratosOpen(false); setColaboradoresOpen(false); }}
            style={{
              padding: '0.75rem 0.5rem',
              marginBottom: '0.75rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              cursor: 'pointer',
              background: activeTab === 'Dashboard' ? 'rgba(255,255,255,0.05)' : 'transparent',
              borderRadius: '8px',
              transition: 'background 0.2s',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Monogram Badge */}
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #ba4b24 0%, #7c2d12 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '1.15rem',
                letterSpacing: '0.5px',
                boxShadow: '0 4px 12px rgba(186, 75, 36, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                flexShrink: 0
              }}>
                RD
              </div>

              {/* Brand Title & Subtitle */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                  <span style={{
                    fontSize: '1.45rem',
                    fontWeight: '800',
                    color: '#ffffff',
                    letterSpacing: '0.5px'
                  }}>
                    RD
                  </span>
                  <span style={{
                    fontSize: '1.45rem',
                    fontWeight: '300',
                    color: '#ba4b24',
                    letterSpacing: '0.5px'
                  }}>
                    admins
                  </span>
                </div>
                <span style={{
                  fontSize: '0.62rem',
                  color: 'rgba(255, 255, 255, 0.45)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}>
                  Agenda
                </span>
              </div>
            </div>
          </div>
        )}

        <nav style={{ paddingBottom: '2rem' }}>
          <ul>

            {/* Prospectos (con submenú) */}
            {hasAccess('Prospectos') && (
              <li
                className={activeTab === 'Prospectos' || activeTab === 'Ventas' ? 'active' : ''}
                onClick={handleProspectosClick}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <span><span style={{ marginRight: '0.5rem' }}>👥</span> Prospectos</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.7, transition: 'transform 0.2s', transform: prospectsOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
              </li>
            )}

            {/* Submenú: Valoración */}
            {prospectsOpen && hasAccess('Ventas') && (
              <li
                className={activeTab === 'Ventas' ? 'active' : ''}
                onClick={() => setActiveTab('Ventas')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem', opacity: activeTab === 'Ventas' ? 1 : 0.85 }}
              >
                <span style={{ marginRight: '0.5rem' }}>📈</span> Valoración
              </li>
            )}

            {/* Contratos (con submenú) */}
            {hasAccess('Contratos') && (
              <li
                className={activeTab === 'Contratos' || activeTab === 'Estimacion' ? 'active' : ''}
                onClick={() => { setContratosOpen(prev => !prev); setActiveTab('Contratos'); setProspectsOpen(false); setColaboradoresOpen(false); }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <span><span style={{ marginRight: '0.5rem' }}>📄</span> Clientes</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.7, transition: 'transform 0.2s', transform: contratosOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
              </li>
            )}

            {/* Submenú: Estimación */}
            {contratosOpen && hasAccess('Contratos') && (
              <li
                className={activeTab === 'Estimacion' ? 'active' : ''}
                onClick={() => setActiveTab('Estimacion')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem', opacity: activeTab === 'Estimacion' ? 1 : 0.85 }}
              >
                <span style={{ marginRight: '0.5rem' }}>📐</span> Estimación
              </li>
            )}

            {/* Colaboradores (con submenú) */}
            {(hasAccess('Colaboradores') || hasAccess('Asistencia') || hasAccess('Nomina')) && (
              <li
                className={['Colaboradores','Asistencia','Nomina','Tarifas'].includes(activeTab) ? 'active' : ''}
                onClick={() => { setColaboradoresOpen(prev => !prev); setActiveTab('Colaboradores'); setProspectsOpen(false); }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <span><span style={{ marginRight: '0.5rem' }}>👷‍♂️</span> Colaboradores</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.7, transition: 'transform 0.2s', transform: colaboradoresOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
              </li>
            )}

            {/* Submenú: Asistencia / Registro Diario */}
            {colaboradoresOpen && hasAccess('Asistencia') && (
              <li
                className={activeTab === 'Asistencia' ? 'active' : ''}
                onClick={() => setActiveTab('Asistencia')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem', opacity: activeTab === 'Asistencia' ? 1 : 0.85 }}
              >
                <span style={{ marginRight: '0.5rem' }}>⏱️</span> Asistencia
              </li>
            )}

            {/* Submenú: Corte de Nómina */}
            {colaboradoresOpen && hasAccess('Nomina') && (
              <li
                className={activeTab === 'Nomina' ? 'active' : ''}
                onClick={() => setActiveTab('Nomina')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem', opacity: activeTab === 'Nomina' ? 1 : 0.85 }}
              >
                <span style={{ marginRight: '0.5rem' }}>💰</span> Corte de Nómina
              </li>
            )}

            {/* Submenú: Tarifas por Hora */}
            {colaboradoresOpen && hasAccess('Nomina') && (
              <li
                className={activeTab === 'Tarifas' ? 'active' : ''}
                onClick={() => setActiveTab('Tarifas')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem', opacity: activeTab === 'Tarifas' ? 1 : 0.85 }}
              >
                <span style={{ marginRight: '0.5rem' }}>⚙️</span> Tarifas por Hora
              </li>
            )}

            {/* Pedidos */}
            {hasAccess('Pedidos') && (
              <li
                className={activeTab === 'Pedidos' ? 'active' : ''}
                onClick={() => { setActiveTab('Pedidos'); setProspectsOpen(false); }}
              >
                <span style={{ marginRight: '0.5rem' }}>📦</span> Pedidos
              </li>
            )}

            {/* Accesos */}
            {hasAccess('Accesos') && (
              <li
                className={activeTab === 'Accesos' ? 'active' : ''}
                onClick={() => { setActiveTab('Accesos'); setProspectsOpen(false); }}
              >
                <span style={{ marginRight: '0.5rem' }}>🔐</span> Accesos
              </li>
            )}
          </ul>
        </nav>
      </aside>

      <main className="main-content">
        <header>
          {/* ── Hamburger for mobile ── */}
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Menú"
            style={{
              display: 'none', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '1.5rem', padding: '0.3rem 0.5rem', borderRadius: '8px',
              color: '#1e293b', lineHeight: 1
            }}
          >
            ☰
          </button>
          <h1>
            {activeTab === 'Ventas' ? 'Valoración' : activeTab}
          </h1>
          <div style={{ position: 'relative' }}>
            <div 
              className="user-profile" 
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', userSelect: 'none' }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #ba4b24 0%, #7c2d12 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.2' }}>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{user.name.split(' ')[0]}</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{user.role}</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: '0.2rem' }}>▼</span>
            </div>
            
            {showUserMenu && (
              <div style={{
                position: 'absolute', top: '120%', right: 0, background: 'white', 
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', 
                borderRadius: '8px', overflow: 'hidden', minWidth: '150px', zIndex: 50, border: '1px solid #e2e8f0'
              }}>
                <button 
                  onClick={handleLogout}
                  style={{ width: '100%', padding: '0.8rem 1rem', background: 'white', border: 'none', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#dc2626', fontWeight: '600', fontSize: '0.85rem', textAlign: 'left' }}
                >
                  <span style={{ fontSize: '1rem' }}>🚪</span> Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </header>

        {activeTab === 'Dashboard'     && hasAccess('Dashboard')     && <Dashboard />}
        {activeTab === 'Ventas'        && hasAccess('Ventas')        && <Ventas />}
        {activeTab === 'Pedidos'       && hasAccess('Pedidos')       && <Pedidos />}
        {activeTab === 'Prospectos'    && hasAccess('Prospectos')    && <Prospects />}
        {activeTab === 'Contratos'     && hasAccess('Contratos')        && <Contratos startView="list" />}
        {activeTab === 'Estimacion'    && hasAccess('Contratos')        && <Contratos startView="estimacion_list" />}
        {activeTab === 'Colaboradores' && hasAccess('Colaboradores') && <Colaboradores />}
        {activeTab === 'Asistencia'    && hasAccess('Asistencia')    && <Asistencia view="registro" />}
        {activeTab === 'Nomina'        && hasAccess('Nomina')        && <Asistencia view="corte" />}
        {activeTab === 'Tarifas'       && hasAccess('Nomina')        && <Asistencia view="tarifas" />}
        {activeTab === 'Accesos'       && hasAccess('Accesos')       && <Accesos />}

        {/* ── Animated logo at the bottom of main work area ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem 0 1.5rem',
          gap: '0.6rem',
          opacity: 0.85,
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          <div style={{ position: 'relative', width: '250px', height: '200px' }}>
            <img
              src="/logo-anim-1.jpg"
              alt=""
              style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%',
                objectFit: 'contain',
                opacity: logoFrame === 1 ? 1 : 0,
                transition: 'opacity 0.12s ease-in-out'
              }}
            />
            <img
              src="/logo-anim-2.jpg"
              alt=""
              style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%',
                objectFit: 'contain',
                opacity: logoFrame === 2 ? 1 : 0,
                transition: 'opacity 0.12s ease-in-out'
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
