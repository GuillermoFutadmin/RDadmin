import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';
import Dashboard from './Dashboard';
import Ventas from './Ventas';
import Pedidos from './Pedidos';
import Prospects from './Prospects';
import Contratos from './Contratos';
import Colaboradores from './Colaboradores';
import Accesos from './Accesos';
import Asistencia from './Asistencia';
import Proveedores from './Proveedores';
import Login from './Login';
import { 
  IconUsers, IconTrendingUp, IconFileText, IconPenTool, 
  IconHardHat, IconClock, IconWallet, IconSettings, 
  IconPackage, IconLock, IconChevronRight, IconKey, IconLogOut
} from './icons';

const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
const IDLE_WARNING_MS = 5 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'rdadmin_last_activity';

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [prospectsOpen, setProspectsOpen] = useState(false);
  const [contratosOpen, setContratosOpen] = useState(false);
  const [colaboradoresOpen, setColaboradoresOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [logoFrame, setLogoFrame] = useState(1);
  const [logoAnimation, setLogoAnimation] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Logo panel / cambiar contraseña
  const [showLogoPanel, setShowLogoPanel] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwMsg, setPwMsg] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [photoMsg, setPhotoMsg] = useState('');
  const [photoSaving, setPhotoSaving] = useState(false);
  const [idleWarningVisible, setIdleWarningVisible] = useState(false);
  const [idleSecondsRemaining, setIdleSecondsRemaining] = useState(IDLE_WARNING_MS / 1000);
  const photoInputRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const lastActivityPersistRef = useRef(0);

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
        const parsedUser = JSON.parse(storedUser);
        const storedActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
        const now = Date.now();
        if (Number.isFinite(storedActivity) && storedActivity > 0 && now - storedActivity >= IDLE_TIMEOUT_MS) {
          localStorage.removeItem('rdadmin_user');
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          return;
        }
        const lastActivity = Number.isFinite(storedActivity) && storedActivity > 0 ? storedActivity : now;
        localStorage.setItem(LAST_ACTIVITY_KEY, String(lastActivity));
        lastActivityRef.current = lastActivity;
        lastActivityPersistRef.current = lastActivity;
        setUser(parsedUser);
      } catch (e) {
        localStorage.removeItem('rdadmin_user');
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      }
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    const now = Date.now();
    localStorage.setItem('rdadmin_user', JSON.stringify(userData));
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    lastActivityRef.current = now;
    lastActivityPersistRef.current = now;
    setUser(userData);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('rdadmin_user');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setUser(null);
    setShowLogoPanel(false);
    setIdleWarningVisible(false);
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const storedActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
    const initialActivity = Number.isFinite(storedActivity) && storedActivity > 0
      ? storedActivity
      : Date.now();
    lastActivityRef.current = Math.max(lastActivityRef.current, initialActivity);
    lastActivityPersistRef.current = initialActivity;

    let loggedOut = false;
    const registerActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      if (now - lastActivityPersistRef.current >= 10000) {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
        lastActivityPersistRef.current = now;
      }
      setIdleWarningVisible(false);
    };
    const checkIdleTime = () => {
      if (loggedOut) return;
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime >= IDLE_TIMEOUT_MS) {
        loggedOut = true;
        handleLogout();
        return;
      }
      const remaining = Math.ceil((IDLE_TIMEOUT_MS - idleTime) / 1000);
      setIdleSecondsRemaining(remaining);
      setIdleWarningVisible(idleTime >= IDLE_TIMEOUT_MS - IDLE_WARNING_MS);
    };
    const handleStorage = event => {
      if (event.key === LAST_ACTIVITY_KEY && event.newValue) {
        const timestamp = Number(event.newValue);
        if (Number.isFinite(timestamp) && timestamp > 0) {
          lastActivityRef.current = Math.max(lastActivityRef.current, timestamp);
          lastActivityPersistRef.current = Math.max(lastActivityPersistRef.current, timestamp);
        }
      } else if (event.key === 'rdadmin_user') {
        if (!event.newValue) {
          setUser(null);
          setIdleWarningVisible(false);
        } else {
          try {
            setUser(JSON.parse(event.newValue));
          } catch {
            handleLogout();
          }
        }
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkIdleTime();
    };

    const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel', 'scroll'];
    activityEvents.forEach(eventName => window.addEventListener(eventName, registerActivity, { passive: true }));
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const interval = window.setInterval(checkIdleTime, 1000);
    checkIdleTime();

    return () => {
      activityEvents.forEach(eventName => window.removeEventListener(eventName, registerActivity));
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(interval);
    };
  }, [user, handleLogout]);

  const continueSession = () => {
    const now = Date.now();
    lastActivityRef.current = now;
    lastActivityPersistRef.current = now;
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    setIdleSecondsRemaining(IDLE_WARNING_MS / 1000);
    setIdleWarningVisible(false);
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoMsg('Selecciona un archivo de imagen.');
      return;
    }

    setPhotoMsg('');
    setPhotoSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`/api/users/${user.id}/upload-photo`, {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'No se pudo guardar la foto.');

      const updatedUser = { ...user, photo_path: result.photo_path };
      localStorage.setItem('rdadmin_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setPhotoMsg('Foto de perfil actualizada.');
    } catch (error) {
      setPhotoMsg(error.message || 'Error al cargar la foto.');
    } finally {
      setPhotoSaving(false);
    }
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
  const hasProductionAccess = hasAccess('Pedidos') || hasAccess('Produccion');


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

  const toggleLogoPanel = () => {
    const opening = !showLogoPanel;
    setShowLogoPanel(opening);
    setLogoAnimation(opening ? 'logo-turn-open' : 'logo-turn-close');
    setChangingPassword(false);
    setPwMsg(null);
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
          className={`sidebar-logo-toggle ${logoAnimation}`}
          role="button"
          tabIndex={0}
          aria-label={showLogoPanel ? 'Cerrar opciones de usuario' : 'Abrir opciones de usuario'}
          aria-expanded={showLogoPanel}
          onClick={toggleLogoPanel}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggleLogoPanel();
            }
          }}
          style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '0.75rem 0.5rem 0.6rem', cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '0.5rem',
          }}
          title="Información de sesión"
        >
          <div className="sidebar-logo-stage">
            <img className="sidebar-logo-image" src="/logo-rd.png" alt="RD Carpintería" />
            {user.photo_path ? (
              <img className="sidebar-user-image" src={user.photo_path} alt={`Foto de ${user.name}`} />
            ) : (
              <div className="sidebar-user-image sidebar-user-placeholder" aria-label={`Perfil de ${user.name}`}>
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* ── PANEL DE SESIÓN ── */}
        {showLogoPanel && (
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: '10px',
            margin: '0 0.5rem 0.75rem', padding: '0.85rem 0.9rem',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div className="sidebar-profile-summary" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.75rem' }}>
              {user.photo_path ? (
                <img src={user.photo_path} alt={`Foto de ${user.name}`} style={{ width: '58px', height: '58px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.22)', boxShadow: '0 3px 12px rgba(0,0,0,0.28)' }} />
              ) : (
                <div style={{ width: '58px', height: '58px', borderRadius: '50%', background: 'linear-gradient(135deg,#ba4b24,#7c2d12)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.35rem', flexShrink: 0, border: '2px solid rgba(255,255,255,0.22)', boxShadow: '0 3px 12px rgba(0,0,0,0.28)' }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ color: 'white', fontWeight: '700', fontSize: '0.85rem', lineHeight: 1.2 }}>{user.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem' }}>@{user.username} · {user.role}</div>
              </div>
            </div>

            {!changingPassword ? (
              <>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                />
                <button type="button" onClick={() => photoInputRef.current?.click()} disabled={photoSaving} style={{
                  width: '100%', padding: '0.42rem 0.6rem', marginBottom: '0.25rem',
                  background: 'rgba(255,255,255,0.1)', color: 'white',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px',
                  cursor: photoSaving ? 'wait' : 'pointer', fontSize: '0.76rem', fontWeight: '600', textAlign: 'left'
                }}>
                  {photoSaving ? 'Guardando foto...' : 'Cambiar foto de perfil'}
                </button>
                {photoMsg && (
                  <p role="status" style={{ margin: '0 0 0.45rem', fontSize: '0.7rem', fontWeight: '600', color: photoMsg.includes('actualizada') ? '#86efac' : '#fca5a5' }}>
                    {photoMsg}
                  </p>
                )}
                <button onClick={() => setChangingPassword(true)} style={{
                  width: '100%', padding: '0.42rem 0.6rem', marginBottom: '0.4rem',
                  background: 'rgba(255,255,255,0.1)', color: 'white',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '0.76rem', fontWeight: '600', textAlign: 'left',
                  display: 'flex', alignItems: 'center'
                }}>
                  <IconKey style={{ width: '14px', height: '14px', marginRight: '0.4rem' }} /> Cambiar contraseña
                </button>
                <button onClick={handleLogout} style={{
                  width: '100%', padding: '0.42rem 0.6rem',
                  background: 'rgba(220,38,38,0.2)', color: '#fca5a5',
                  border: '1px solid rgba(220,38,38,0.3)', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '0.76rem', fontWeight: '600', textAlign: 'left',
                  display: 'flex', alignItems: 'center'
                }}>
                  <IconLogOut style={{ width: '14px', height: '14px', marginRight: '0.4rem' }} /> Cerrar sesión
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
                <span style={{ display: 'flex', alignItems: 'center' }}><IconUsers /> Prospectos</span>
                <IconChevronRight style={{ transform: prospectsOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', width: '14px', height: '14px' }} />
              </li>
            )}

            {/* Submenú: Valoración */}
            {prospectsOpen && hasAccess('Ventas') && (
              <li
                className={activeTab === 'Ventas' ? 'active' : ''}
                onClick={() => setActiveTab('Ventas')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem', opacity: activeTab === 'Ventas' ? 1 : 0.85, display: 'flex', alignItems: 'center' }}
              >
                <IconTrendingUp /> Valoración
              </li>
            )}

            {/* Contratos (con submenú) */}
            {hasAccess('Contratos') && (
              <li
                className={activeTab === 'Contratos' || activeTab === 'Estimacion' ? 'active' : ''}
                onClick={() => { setContratosOpen(prev => !prev); setActiveTab('Contratos'); setProspectsOpen(false); setColaboradoresOpen(false); }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}><IconFileText /> Clientes</span>
                <IconChevronRight style={{ transform: contratosOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', width: '14px', height: '14px' }} />
              </li>
            )}

            {/* Submenú: Estimación */}
            {contratosOpen && hasAccess('Contratos') && (
              <li
                className={activeTab === 'Estimacion' ? 'active' : ''}
                onClick={() => setActiveTab('Estimacion')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem', opacity: activeTab === 'Estimacion' ? 1 : 0.85, display: 'flex', alignItems: 'center' }}
              >
                <IconPenTool /> Estimación
              </li>
            )}

            {/* Producción: sección independiente de Clientes */}
            {hasProductionAccess && (
              <li
                className={activeTab === 'Produccion' ? 'active' : ''}
                onClick={() => { setActiveTab('Produccion'); setProspectsOpen(false); setContratosOpen(false); setColaboradoresOpen(false); }}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <IconPackage /> Producción
              </li>
            )}

            {hasAccess('Proveedores') && (
              <li
                className={activeTab === 'Proveedores' ? 'active' : ''}
                onClick={() => goTo('Proveedores')}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <IconPackage /> Proveedores
              </li>
            )}

            {/* Colaboradores (con submenú) */}
            {(hasAccess('Colaboradores') || hasAccess('Asistencia') || hasAccess('Nomina')) && (
              <li
                className={['Colaboradores','Asistencia','Nomina','Tarifas'].includes(activeTab) ? 'active' : ''}
                onClick={() => { setColaboradoresOpen(prev => !prev); setActiveTab('Colaboradores'); setProspectsOpen(false); }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}><IconHardHat /> Colaboradores</span>
                <IconChevronRight style={{ transform: colaboradoresOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', width: '14px', height: '14px' }} />
              </li>
            )}

            {/* Submenú: Asistencia / Registro Diario */}
            {colaboradoresOpen && hasAccess('Asistencia') && (
              <li
                className={activeTab === 'Asistencia' ? 'active' : ''}
                onClick={() => setActiveTab('Asistencia')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem', opacity: activeTab === 'Asistencia' ? 1 : 0.85, display: 'flex', alignItems: 'center' }}
              >
                <IconClock /> Asistencia
              </li>
            )}

            {/* Submenú: Corte de Nómina */}
            {colaboradoresOpen && hasAccess('Nomina') && (
              <li
                className={activeTab === 'Nomina' ? 'active' : ''}
                onClick={() => setActiveTab('Nomina')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem', opacity: activeTab === 'Nomina' ? 1 : 0.85, display: 'flex', alignItems: 'center' }}
              >
                <IconWallet /> Corte de Nómina
              </li>
            )}

            {/* Submenú: Tarifas por Hora */}
            {colaboradoresOpen && hasAccess('Nomina') && (
              <li
                className={activeTab === 'Tarifas' ? 'active' : ''}
                onClick={() => setActiveTab('Tarifas')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem', opacity: activeTab === 'Tarifas' ? 1 : 0.85, display: 'flex', alignItems: 'center' }}
              >
                <IconSettings /> Tarifas por Hora
              </li>
            )}

            {/* Accesos */}
            {hasAccess('Accesos') && (
              <li
                className={activeTab === 'Accesos' ? 'active' : ''}
                onClick={() => { setActiveTab('Accesos'); setProspectsOpen(false); }}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <IconLock /> Accesos
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
              {user.photo_path ? (
                <img src={user.photo_path} alt={user.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.1)' }} />
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #ba4b24 0%, #7c2d12 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
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
                  <IconLogOut style={{ width: '16px', height: '16px' }} /> Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </header>

        {activeTab === 'Dashboard'     && hasAccess('Dashboard')     && <Dashboard />}
        {activeTab === 'Ventas'        && hasAccess('Ventas')        && <Ventas />}
        {activeTab === 'Produccion'   && hasProductionAccess         && <Pedidos />}
        {activeTab === 'Proveedores' && hasAccess('Proveedores') && <Proveedores />}
        {activeTab === 'Prospectos'    && hasAccess('Prospectos')    && <Prospects />}
        {activeTab === 'Contratos'     && hasAccess('Contratos')        && <Contratos startView="list" onProductionStarted={() => setActiveTab('Produccion')} />}
        {activeTab === 'Estimacion'    && hasAccess('Contratos')        && <Contratos startView="estimacion_list" onProductionStarted={() => setActiveTab('Produccion')} />}
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
      {idleWarningVisible && user && (
        <div
          role="presentation"
          style={{
            position: 'fixed', inset: 0, zIndex: 2000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '1rem',
            background: 'rgba(15, 23, 42, 0.58)'
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="idle-warning-title"
            aria-describedby="idle-warning-description"
            style={{
              width: 'min(100%, 420px)', padding: '1.5rem', borderRadius: 16,
              background: '#fff', boxShadow: '0 24px 64px rgba(15,23,42,0.28)',
              border: '1px solid #e2e8f0'
            }}
          >
            <h2 id="idle-warning-title" style={{ margin: '0 0 0.6rem', color: '#1e293b', fontSize: '1.2rem' }}>
              La sesión está por cerrarse
            </h2>
            <p id="idle-warning-description" style={{ margin: '0 0 1.25rem', color: '#475569', lineHeight: 1.5 }}>
              Por seguridad, se cerrará por inactividad en{' '}
              <strong>
                {`${String(Math.floor(idleSecondsRemaining / 60)).padStart(2, '0')}:${String(idleSecondsRemaining % 60).padStart(2, '0')}`}
              </strong>.
              ¿Deseas continuar trabajando?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: '0.65rem 0.9rem', border: '1px solid #fecaca', borderRadius: 8,
                  background: '#fff7f7', color: '#b91c1c', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Cerrar sesión
              </button>
              <button
                type="button"
                onClick={continueSession}
                autoFocus
                style={{
                  padding: '0.65rem 0.9rem', border: 0, borderRadius: 8,
                  background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Seguir trabajando
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
