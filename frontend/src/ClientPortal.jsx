import React, { useCallback, useEffect, useState } from 'react';
import ProjectTracking, { getProjectTrackingProgress } from './ProjectTracking';
import useAutoRefresh from './useAutoRefresh';

const MONTHLY_HIGHLIGHTS = [
  {
    month: 'enero',
    theme: 'winter',
    icon: '✨',
    celebrations: [
      { date: '1 de enero', title: 'Año Nuevo', detail: 'Un momento para compartir buenos deseos y nuevos proyectos.' },
      { date: '6 de enero', title: 'Día de Reyes', detail: 'En México se comparte la tradicional Rosca de Reyes.' }
    ],
    curiosity: 'La figura del niño escondida en la rosca se relaciona con la celebración del Día de la Candelaria, el 2 de febrero.'
  },
  {
    month: 'febrero',
    theme: 'candle',
    icon: '🕯️',
    celebrations: [
      { date: '2 de febrero', title: 'Día de la Candelaria', detail: 'Una tradición mexicana para reunirse y compartir tamales.' },
      { date: '5 de febrero', title: 'Día de la Constitución', detail: 'Se conmemora la Constitución mexicana de 1917.' }
    ],
    curiosity: 'La Constitución de 1917 se promulgó en Querétaro y fue pionera en incluir derechos sociales.'
  },
  {
    month: 'marzo',
    theme: 'spring',
    icon: '🌱',
    celebrations: [
      { date: '21 de marzo', title: 'Natalicio de Benito Juárez', detail: 'Una fecha para recordar al expresidente mexicano nacido en Oaxaca.' },
      { date: '20 o 21 de marzo', title: 'Equinoccio de primavera', detail: 'La fecha exacta puede variar cada año.' }
    ],
    curiosity: 'Benito Juárez nació en 1806 en San Pablo Guelatao, en el estado de Oaxaca.'
  },
  {
    month: 'abril',
    theme: 'earth',
    icon: '🌼',
    celebrations: [
      { date: '22 de abril', title: 'Día de la Tierra', detail: 'Una invitación a cuidar el planeta y sus recursos.' },
      { date: '30 de abril', title: 'Día de la Niña y el Niño', detail: 'En México se celebra a las infancias.' }
    ],
    curiosity: 'El Día de la Tierra se conmemora internacionalmente cada 22 de abril.'
  },
  {
    month: 'mayo',
    theme: 'family',
    icon: '🌷',
    celebrations: [
      { date: '1 de mayo', title: 'Día del Trabajo', detail: 'Una fecha dedicada a reconocer los derechos laborales.' },
      { date: '10 de mayo', title: 'Día de las Madres', detail: 'En México se celebra en una fecha fija cada año.' }
    ],
    curiosity: 'A diferencia de muchos países, en México el Día de las Madres se celebra cada 10 de mayo.'
  },
  {
    month: 'junio',
    theme: 'ocean',
    icon: '☀️',
    celebrations: [
      { date: '5 de junio', title: 'Día Mundial del Medio Ambiente', detail: 'Una fecha para impulsar el cuidado de la naturaleza.' },
      { date: 'Tercer domingo', title: 'Día del Padre', detail: 'En México se celebra el tercer domingo de junio.' }
    ],
    curiosity: 'El solsticio de junio marca el inicio del verano astronómico en el hemisferio norte.'
  },
  {
    month: 'julio',
    theme: 'summer',
    icon: '🌞',
    celebrations: [
      { date: '20 de julio', title: 'Llegada a la Luna', detail: 'En 1969, la misión Apollo 11 llegó a la superficie lunar.' },
      { date: '30 de julio', title: 'Día Internacional de la Amistad', detail: 'Una ocasión para celebrar los lazos que nos unen.' }
    ],
    curiosity: 'El 20 de julio de 1969, Neil Armstrong fue la primera persona en caminar sobre la Luna.'
  },
  {
    month: 'agosto',
    theme: 'sunflower',
    icon: '🌻',
    celebrations: [
      { date: '12 de agosto', title: 'Día Internacional de la Juventud', detail: 'La ONU reconoce la participación de las juventudes.' },
      { date: '28 de agosto', title: 'Día de las Personas Adultas Mayores', detail: 'En México se reconoce su experiencia y aportaciones.' }
    ],
    curiosity: 'El nombre agosto honra al emperador romano Augusto.'
  },
  {
    month: 'septiembre',
    theme: 'independence',
    icon: '🎉',
    celebrations: [
      { date: '15 de septiembre', title: 'Noche del Grito', detail: 'La celebración cívica se realiza la noche previa al día de la Independencia.' },
      { date: '16 de septiembre', title: 'Día de la Independencia', detail: 'Se conmemora el inicio de la lucha por la Independencia de México.' }
    ],
    curiosity: 'El Grito de Dolores, que dio inicio al movimiento de Independencia, ocurrió en 1810.'
  },
  {
    month: 'octubre',
    theme: 'autumn',
    icon: '🍁',
    celebrations: [
      { date: '12 de octubre', title: 'Día de la Nación Pluricultural', detail: 'Una fecha para reconocer la diversidad cultural de México.' },
      { date: '31 de octubre', title: 'Noche de Halloween', detail: 'En México coincide con los días previos a las celebraciones de Día de Muertos.' }
    ],
    curiosity: 'Octubre debe su nombre a octo, que significa ocho: en el antiguo calendario romano era el octavo mes.'
  },
  {
    month: 'noviembre',
    theme: 'remembrance',
    icon: '🕯️',
    celebrations: [
      { date: '1 y 2 de noviembre', title: 'Día de Muertos', detail: 'Tradiciones para recordar y honrar a quienes ya no están.' },
      { date: '20 de noviembre', title: 'Revolución Mexicana', detail: 'Se conmemora el inicio del movimiento revolucionario de 1910.' }
    ],
    curiosity: 'La celebración indígena dedicada a los muertos en México fue inscrita por la UNESCO en 2008 como Patrimonio Cultural Inmaterial de la Humanidad.'
  },
  {
    month: 'diciembre',
    theme: 'holidays',
    icon: '⭐',
    celebrations: [
      { date: 'Del 16 al 24', title: 'Las Posadas', detail: 'Nueve noches de reuniones y tradiciones populares mexicanas.' },
      { date: '25 de diciembre', title: 'Navidad', detail: 'Una fecha para compartir en familia y comunidad.' }
    ],
    curiosity: 'Las Posadas mexicanas se celebran durante los nueve días previos a la Navidad.'
  }
];

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
  const [showMonthlyCuriosity, setShowMonthlyCuriosity] = useState(false);
  const [monthlyContext, setMonthlyContext] = useState(null);

  useEffect(() => {
    const updateMonthlyContext = () => {
      const today = new Date();
      const isPreviewingNextMonth = today.getDate() >= 25;
      const monthIndex = (today.getMonth() + Number(isPreviewingNextMonth)) % MONTHLY_HIGHLIGHTS.length;
      setMonthlyContext({ isPreviewingNextMonth, monthIndex });
    };

    updateMonthlyContext();
    const intervalId = window.setInterval(updateMonthlyContext, 60 * 60 * 1000);
    return () => window.clearInterval(intervalId);
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
      let result = null;
      try {
        result = await response.json();
      } catch {
        throw new Error(response.status >= 500 ? 'El servidor del portal de clientes no pudo procesar la solicitud en este momento. Intenta nuevamente.' : `Error de comunicación (${response.status})`);
      }
      if (!response.ok) throw new Error(result?.detail || 'No se pudo validar el acceso.');
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

  const isEmbedded = typeof window !== 'undefined' && window.parent !== window;

  if (!project) {
    return (
      <main className="client-portal-login" style={{ minHeight: isEmbedded ? 'auto' : '100vh', padding: isEmbedded ? '0.25rem 0' : '1.5rem 0' }}>
        <section id="client-portal-container" className="client-portal-login-form">
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
  const tracking = getProjectTrackingProgress(project);
  const hasProductionStages = tracking.production.stages.length > 0
    || tracking.workItems.some(item => Array.isArray(item.production_data?.stages) && item.production_data.stages.length > 0);
  const monthlyHighlight = monthlyContext ? MONTHLY_HIGHLIGHTS[monthlyContext.monthIndex] : null;

  return (
    <main style={{
      minHeight: isEmbedded ? 'auto' : '100vh',
      padding: isEmbedded ? '0.25rem 0 1rem' : '1.25rem',
      background: isEmbedded ? 'transparent' : '#f1f5f9',
      fontFamily: 'Inter, system-ui, sans-serif',
      boxSizing: 'border-box'
    }}>
      <div id="client-portal-container" style={{ width: 'min(100%, 960px)', margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '0.9rem 1rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo-rd-oficial.png?v=2" alt="RD Carpintería" style={{ height: 48, width: 'auto', maxWidth: 80, objectFit: 'contain', display: 'block' }} />
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

        <ProjectTracking prospect={project} showEvidence requestDetails={projectDetails} />

        {!hasProductionStages && (
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
        )}

        {monthlyHighlight && <section className={`client-monthly-highlight client-monthly-highlight--${monthlyHighlight.theme}`} aria-labelledby="client-monthly-title">
          <div className="client-monthly-heading">
            <span className="client-monthly-icon" aria-hidden="true">{monthlyHighlight.icon}</span>
            <div>
              <div className="client-monthly-eyebrow">{monthlyContext.isPreviewingNextMonth ? 'Se acerca' : 'Este mes'}</div>
              <h2 id="client-monthly-title">Tradiciones de {monthlyHighlight.month}</h2>
            </div>
          </div>
          <div className="client-monthly-events">
            {monthlyHighlight.celebrations.map(event => (
              <article className="client-monthly-event" key={event.title}>
                <span className="client-monthly-date">{event.date}</span>
                <div>
                  <h3>{event.title}</h3>
                  <p>{event.detail}</p>
                </div>
              </article>
            ))}
          </div>
          <button
            type="button"
            className="client-monthly-toggle"
            aria-expanded={showMonthlyCuriosity}
            aria-controls="client-monthly-curiosity"
            onClick={() => setShowMonthlyCuriosity(value => !value)}
          >
            {showMonthlyCuriosity ? 'Ocultar dato curioso' : 'Descubrir dato curioso'}
            <span aria-hidden="true">{showMonthlyCuriosity ? '−' : '+'}</span>
          </button>
          {showMonthlyCuriosity && (
            <p className="client-monthly-curiosity" id="client-monthly-curiosity">
              <strong>¿Sabías que?</strong> {monthlyHighlight.curiosity}
            </p>
          )}
        </section>}

        <p style={{ margin: '1rem 0', color: '#94a3b8', textAlign: 'center', fontSize: '0.72rem' }}>
          La información de avance se actualiza automáticamente.
        </p>
      </div>
    </main>
  );
}
