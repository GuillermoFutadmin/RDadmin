import React, { useState, useEffect } from 'react';
import './index.css';
import Dashboard from './Dashboard';
import Ventas from './Ventas';
import Pedidos from './Pedidos';
import Prospects from './Prospects';
import Colaboradores from './Colaboradores';
import Accesos from './Accesos';
import Asistencia from './Asistencia';
import Login from './Login';

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [prospectsOpen, setProspectsOpen] = useState(false);
  const [colaboradoresOpen, setColaboradoresOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  return (
    <div className="admin-container">
      <aside className="sidebar">
        {/* Brand Header Modernizado */}
        <div style={{
          padding: '0 0.25rem 1.5rem 0.25rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
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
                  admin
                </span>
              </div>
              <span style={{
                fontSize: '0.62rem',
                color: 'rgba(255, 255, 255, 0.45)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: '600'
              }}>
                Carpintería & Taller
              </span>
            </div>
          </div>
        </div>

        <nav style={{ paddingBottom: '13rem' }}>
          <ul>
            {/* Dashboard */}
            {hasAccess('Dashboard') && (
              <li
                className={activeTab === 'Dashboard' ? 'active' : ''}
                onClick={() => { setActiveTab('Dashboard'); setProspectsOpen(false); }}
              >
                <span style={{ marginRight: '0.5rem' }}>📊</span> Dashboard
              </li>
            )}

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

        {/* Logo al fondo del sidebar (Elevado con margen inferior cómodo) */}
        <div style={{
          position: 'absolute',
          bottom: '3.25rem',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 0.5rem',
          pointerEvents: 'none'
        }}>
          <img
            src="/logo-rd.png"
            alt="RD Carpintería"
            style={{
              width: '185px',
              height: '185px',
              objectFit: 'contain',
              display: 'block',
              filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.65))',
              transition: 'transform 0.3s ease'
            }}
          />
        </div>
      </aside>

      <main className="main-content">
        <header>
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
        {activeTab === 'Colaboradores' && hasAccess('Colaboradores') && <Colaboradores />}
        {activeTab === 'Asistencia'    && hasAccess('Asistencia')    && <Asistencia view="registro" />}
        {activeTab === 'Nomina'        && hasAccess('Nomina')        && <Asistencia view="corte" />}
        {activeTab === 'Tarifas'       && hasAccess('Nomina')        && <Asistencia view="tarifas" />}
        {activeTab === 'Accesos'       && hasAccess('Accesos')       && <Accesos />}
      </main>
    </div>
  );
}

export default App;
