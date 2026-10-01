import React, { useState, useEffect, useRef } from 'react';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (date) => date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
const fmtDate = (date) => date.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const fmtShort = (date) => date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
const diffHours = (a, b) => (b - a) / (1000 * 60 * 60);

// ─── Status labels & colors ──────────────────────────────────────────────────
const STATUS = {
  idle:         { label: 'Sin turno',       color: '#94a3b8', bg: '#f1f5f9' },
  working:      { label: 'En turno',        color: '#166534', bg: '#dcfce7' },
  meal:         { label: 'En comida',       color: '#92400e', bg: '#fef3c7' },
  back:         { label: 'De regreso',      color: '#1d4ed8', bg: '#dbeafe' },
  done:         { label: 'Turno cerrado',   color: '#6d28d9', bg: '#ede9fe' },
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Asistencia({ view = 'registro' }) {
  const [activeTab] = useState(view);
  const [collaborators, setCollaborators] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [now, setNow] = useState(new Date());

  // Corte state
  const [corteStartDate, setCorteStartDate] = useState('');
  const [corteEndDate, setCorteEndDate] = useState('');

  // Active sessions: { [collabId]: { status, startTime, mealStart, mealEnd, endTime, extraAuth } }
  const [sessions, setSessions] = useState({});
  const [selectedCollab, setSelectedCollab] = useState('');
  
  // Table view state
  const todayKey = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState(todayKey);

  // Delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { logId } | null
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Camera validation modal
  const [photoModal, setPhotoModal] = useState(null);
  const [cameraModal, setCameraModal] = useState(null);

  // Camera — always on
  const [cameraError, setCameraError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const API = '';

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchCollaborators();
    
    // Fetch state from server instead of local storage
    const fetchState = async () => {
      try {
        const resAtt = await fetch(`${API}/api/store/rd_attendance`, { cache: 'no-store' });
        if (resAtt.ok) {
          const data = await resAtt.json();
          if (data.value) setAttendanceLogs(JSON.parse(data.value));
        }
        
        const resSess = await fetch(`${API}/api/store/rd_sessions`, { cache: 'no-store' });
        if (resSess.ok) {
          const data = await resSess.json();
          if (data.value) setSessions(JSON.parse(data.value));
        }
      } catch (e) {
        console.error("Error loading sync data", e);
      }
    };
    fetchState();

    // Auto-start camera when entering registro view
    if (view === 'registro') {
      initCamera();
    }

    return () => stopCamera();
  }, []);

  const fetchCollaborators = async () => {
    try {
      const res = await fetch(`${API}/api/collaborators/`);
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data.map(c => ({
          ...c,
          name: c.full_name,       // API returns full_name
          role: c.position,         // API returns position
          hourlyRate: 50
        })));
      }
    } catch (err) { console.error(err); }
  };

  const saveLogs = async (newLogs) => {
    setAttendanceLogs(newLogs);
    try {
      await fetch(`${API}/api/store/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'rd_attendance', value: JSON.stringify(newLogs) })
      });
    } catch (e) {}
  };

  const saveSessions = async (newSess) => {
    setSessions(newSess);
    try {
      await fetch(`${API}/api/store/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'rd_sessions', value: JSON.stringify(newSess) })
      });
    } catch (e) {}
  };

  const collab = collaborators.find(c => String(c.id) === String(selectedCollab));
  const session = sessions[selectedCollab] || { status: 'idle' };

  // ── Password-protected delete ─────────────────────────────────────────────
  const handleDeleteWithPassword = async () => {
    if (!deletePassword) { setDeleteError('Ingrese su contraseña.'); return; }
    setDeleteLoading(true);
    setDeleteError('');
    try {
      // Siempre verificar contra la cuenta maestra de RDcarpinteria
            const masterUsername = 'rdcarpinteria@rdadmin.com.mx';

      const res = await fetch(`${API}/api/users/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: null, username: masterUsername, password: deletePassword })
      });
      if (!res.ok) { setDeleteError('Contraseña incorrecta.'); setDeleteLoading(false); return; }
      
      // Fetch latest before delete
      const resAtt = await fetch(`${API}/api/store/rd_attendance`, { cache: 'no-store' });
      let currentLogs = attendanceLogs;
      if (resAtt.ok) {
        const data = await resAtt.json();
        if (data.value) currentLogs = JSON.parse(data.value);
      }
      
      await saveLogs(currentLogs.filter(x => x.id !== deleteConfirm.logId));
      setDeleteConfirm(null);
      setDeletePassword('');
    } catch (e) {
      setDeleteError('Error de verificación.');
    }
    setDeleteLoading(false);
  };

  // ── Camera helpers ────────────────────────────────────────────────────────────
  const initCamera = async () => {
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      // videoRef might not be mounted yet — retry briefly
      const attachStream = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          setCameraActive(true);
        } else {
          setTimeout(attachStream, 200);
        }
      };
      attachStream();
    } catch (err) {
      setCameraError('Sin acceso a cámara. Verifique permisos del navegador.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Capture frame from live video and stamp date/time on it
  const captureWithTimestamp = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    // Mirror (selfie style)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();
    // Burn timestamp
    const stamp = new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium', hour12: true });
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, canvas.height - 32, canvas.width, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(stamp, 10, canvas.height - 10);
    return canvas.toDataURL('image/jpeg', 0.88);
  };

  // ── Session actions ──────────────────────────────────────────────────────────
  const startTurno = () => {
    const photo = captureWithTimestamp();
    const ts = new Date().toISOString();
    const prevAccum = session.accumulatedHours || 0;
    saveSessions({ ...sessions, [selectedCollab]: { status: 'working', startTime: ts, mealStart: null, mealEnd: null, endTime: null, extraAuth: session.extraAuth || false, accumulatedHours: prevAccum, entryPhoto: photo } });
  };

  const startMeal = () => {
    const photo = captureWithTimestamp();
    const ts = new Date().toISOString();
    saveSessions({ ...sessions, [selectedCollab]: { ...session, status: 'meal', mealStart: ts, mealStartPhoto: photo } });
  };

  const endMeal = () => {
    const photo = captureWithTimestamp();
    const ts = new Date().toISOString();
    saveSessions({ ...sessions, [selectedCollab]: { ...session, status: 'back', mealEnd: ts, mealEndPhoto: photo } });
  };

  const endTurno = () => {
    const photo = captureWithTimestamp();
    const ts = new Date().toISOString();
    const updated = { ...session, status: 'done', endTime: ts, exitPhoto: photo };
    saveSessions({ ...sessions, [selectedCollab]: updated });

    // Calculate this session's hours
    const start = new Date(updated.startTime);
    const end = new Date(ts);
    const ms = updated.mealStart ? new Date(updated.mealStart) : null;
    const me = updated.mealEnd ? new Date(updated.mealEnd) : null;

    let sessionHours = diffHours(start, end);
    if (ms && me) sessionHours -= diffHours(ms, me);
    if (sessionHours < 0) sessionHours = 0;

    // Add to any hours already accumulated today
    const prevAccum = updated.accumulatedHours || 0;
    let totalHours = prevAccum + sessionHours;
    if (!updated.extraAuth && totalHours > 8) totalHours = 8;

    // Find existing log for today and update it, or create new
    const existingLog = attendanceLogs.find(l => l.collabId === parseInt(selectedCollab) && l.date === todayKey);

    const newLog = {
      id: existingLog ? existingLog.id : Date.now(),
      date: todayKey,
      collabId: parseInt(selectedCollab),
      // Show first entry time if resuming
      entryTime: existingLog ? existingLog.entryTime : fmtShort(start),
      mealStart: ms ? fmtShort(ms) : (existingLog?.mealStart || '--'),
      mealEnd: me ? fmtShort(me) : (existingLog?.mealEnd || '--'),
      exitTime: fmtShort(end),
      extraAuthorized: updated.extraAuth,
      totalHours,
      sessions: (existingLog?.sessions || 0) + 1,
      entryPhoto: updated.entryPhoto || existingLog?.entryPhoto || null,
      mealStartPhoto: updated.mealStartPhoto || existingLog?.mealStartPhoto || null,
      mealEndPhoto: updated.mealEndPhoto || existingLog?.mealEndPhoto || null,
      exitPhoto: updated.exitPhoto || null
    };

    saveLogs(attendanceLogs, newLog);

    // Store accumulated hours in session so resume knows where to add from
    saveSessions({ ...sessions, [selectedCollab]: { ...updated, accumulatedHours: totalHours } });
  };

  const toggleExtra = () => {
    saveSessions({ ...sessions, [selectedCollab]: { ...session, extraAuth: !session.extraAuth } });
  };

  const resumeTurno = () => {
    const photo = captureWithTimestamp();
    _doResumeTurno(photo);
  };

  const _doResumeTurno = (photoDataUrl) => {
    const prevAccum = session.accumulatedHours || 0;
    const prevExtraAuth = session.extraAuth || false;
    saveSessions({ 
      ...sessions, 
      [selectedCollab]: { 
        status: 'working', 
        startTime: new Date().toISOString(), 
        mealStart: null, mealEnd: null, endTime: null,
        extraAuth: prevExtraAuth,
        accumulatedHours: prevAccum,
        entryPhoto: photoDataUrl
      } 
    });
  };

  const resetSession = () => {
    const newSess = { ...sessions };
    delete newSess[selectedCollab];
    saveSessions(newSess);
  };

  // ── Live elapsed time ──────────────────────────────────────────────────────
  const elapsed = (fromIso) => {
    if (!fromIso) return '00:00:00';
    const diff = now - new Date(fromIso);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const elapsedWorking = () => {
    if (!session.startTime) return '00:00:00';
    const start = new Date(session.startTime);

    // When turno is closed → freeze at endTime (don't keep counting)
    // When in meal → freeze working time (meal time runs separately)
    // When working or back → live counter
    const isDone = session.status === 'done';
    const isMeal = session.status === 'meal';

    const refNow = isDone && session.endTime ? new Date(session.endTime) : now;

    let totalMs = refNow - start;

    if (session.mealStart) {
      // If meal is over → use fixed mealEnd; if still eating → use refNow (pauses working counter)
      const mealEnd = session.mealEnd ? new Date(session.mealEnd) : refNow;
      totalMs -= (mealEnd - new Date(session.mealStart));
    }

    if (totalMs < 0) totalMs = 0;

    // Add accumulated hours from previous sessions today
    const accumMs = (session.accumulatedHours || 0) * 3600000;
    const grandTotal = totalMs + accumMs;

    const h = Math.floor(grandTotal / 3600000);
    const m = Math.floor((grandTotal % 3600000) / 60000);
    const s = Math.floor((grandTotal % 60000) / 1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  // ── Daily summary ────────────────────────────────────────────────────────────
  const displayedLogs = attendanceLogs.filter(l => l.date === filterDate);

  // ── Corte calculation ────────────────────────────────────────────────────────
  const changeRate = (collabId, newRate) => {
    setCollaborators(collaborators.map(c => c.id === collabId ? { ...c, hourlyRate: parseFloat(newRate) || 0 } : c));
  };

  const getCorteResults = () => {
    if (!corteStartDate || !corteEndDate) return [];
    const logsInRange = attendanceLogs.filter(l => l.date >= corteStartDate && l.date <= corteEndDate);
    return collaborators.map(c => {
      const cLogs = logsInRange.filter(l => l.collabId === c.id);
      let totalHours = 0;
      cLogs.forEach(l => totalHours += l.totalHours);
      let normalHours = totalHours, extraHours = 0;
      if (totalHours > 48) { normalHours = 48; extraHours = totalHours - 48; }
      const normalPay = normalHours * c.hourlyRate;
      const extraPay = extraHours * (c.hourlyRate * 1.3);
      return { collab: c, totalHours: totalHours.toFixed(2), normalHours: normalHours.toFixed(2), extraHours: extraHours.toFixed(2), normalPay: normalPay.toFixed(2), extraPay: extraPay.toFixed(2), totalPay: (normalPay + extraPay).toFixed(2), daysWorked: cLogs.length };
    }).filter(r => r.daysWorked > 0);
  };
  const corteResults = getCorteResults();

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        {view === 'registro' && <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.3rem 0' }}>⏱️ Registro de Asistencia</h1>}
        {view === 'corte'    && <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.3rem 0' }}>💰 Corte de Nómina</h1>}
        {view === 'tarifas' && <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.3rem 0' }}>⚙️ Tarifas por Hora</h1>}
        <p style={{ color: '#64748b', margin: 0 }}>
          {view === 'registro' ? fmtDate(now) : 'Cálculo de nómina por colaborador'}
        </p>
      </div>

      {/* ── REGISTRO VIEW ────────────────────────────────────────────────── */}
      {activeTab === 'registro' && (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '2rem', alignItems: 'start' }}>

          {/* LEFT: selector + clock panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Live clock card */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '16px', padding: '1.5rem', color: 'white', textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
              <div style={{ fontSize: '2.8rem', fontWeight: '900', letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(now)}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.3rem', textTransform: 'capitalize' }}>
                {fmtDate(now)}
              </div>
            </div>

            {/* Colaborador selector */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.6rem' }}>Seleccionar Colaborador</label>
              <select
                value={selectedCollab}
                onChange={e => setSelectedCollab(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontSize: '1rem', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="">-- Seleccione un colaborador --</option>
                {collaborators.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.role}
                  </option>
                ))}
              </select>
            </div>

            {/* Session panel — only when collab selected */}
            {selectedCollab && collab && (
              <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>

                {/* Collab info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #ba4b24, #7c2d12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '1.3rem' }}>
                    {collab.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#0f172a' }}>{collab.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{collab.role}</div>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span style={{ background: STATUS[session.status].bg, color: STATUS[session.status].color, padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700' }}>
                      {STATUS[session.status].label}
                    </span>
                  </div>
                </div>

                {/* Elapsed working time */}
                {session.status !== 'idle' && (() => {
                  const isDone = session.status === 'done';
                  const isMeal = session.status === 'meal';

                  // Meal elapsed: freeze when meal ended
                  const mealElapsed = () => {
                    if (!session.mealStart) return '00:00:00';
                    const mealStart = new Date(session.mealStart);
                    const mealEnd = session.mealEnd ? new Date(session.mealEnd) : now;
                    const diff = mealEnd - mealStart;
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
                  };

                  return (
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                      {/* When in meal: show meal timer on top, working beneath */}
                      {isMeal ? (
                        <>
                          <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: '700', marginBottom: '0.2rem' }}>⏸ PAUSA — EN COMIDA</div>
                          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#92400e', fontVariantNumeric: 'tabular-nums' }}>
                            🍽️ {mealElapsed()}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                            Trabajado antes: {elapsedWorking()}
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '0.72rem', color: isDone ? '#6d28d9' : '#94a3b8', fontWeight: '700', marginBottom: '0.3rem' }}>
                            {isDone ? '🔴 TURNO CERRADO · TIEMPO TOTAL' : '▶ TIEMPO TRABAJADO'}
                          </div>
                          <div style={{ fontSize: '2.2rem', fontWeight: '900', color: isDone ? '#6d28d9' : '#0f172a', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em' }}>
                            {elapsedWorking()}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}


                {/* Timeline stamps */}
                {session.startTime && (
                  <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.8rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ color: '#475569' }}>🟢 Inicio de turno:</span>
                      <span style={{ fontWeight: '700' }}>{fmtShort(new Date(session.startTime))}</span>
                    </div>
                    {session.mealStart && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span style={{ color: '#475569' }}>🍽️ Inicio comida:</span>
                        <span style={{ fontWeight: '700' }}>{fmtShort(new Date(session.mealStart))}</span>
                      </div>
                    )}
                    {session.mealEnd && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span style={{ color: '#475569' }}>✅ Fin comida:</span>
                        <span style={{ fontWeight: '700' }}>{fmtShort(new Date(session.mealEnd))}</span>
                      </div>
                    )}
                    {session.endTime && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#475569' }}>🔴 Fin de turno:</span>
                        <span style={{ fontWeight: '700' }}>{fmtShort(new Date(session.endTime))}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                  {/* START TURNO */}
                  {session.status === 'idle' && (
                    <button onClick={startTurno} style={{ padding: '0.9rem', background: 'linear-gradient(135deg, #16a34a, #166534)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}>
                      🟢 Iniciar Turno
                    </button>
                  )}

                  {/* MEAL buttons */}
                  {session.status === 'working' && (
                    <button onClick={startMeal} style={{ padding: '0.9rem', background: 'linear-gradient(135deg, #d97706, #92400e)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer' }}>
                      🍽️ Salida a Comida
                    </button>
                  )}

                  {session.status === 'meal' && (
                    <button onClick={endMeal} style={{ padding: '0.9rem', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer' }}>
                      ✅ Regreso de Comida
                    </button>
                  )}

                  {/* FIN TURNO */}
                  {(session.status === 'back' || session.status === 'working') && (
                    <button onClick={endTurno} style={{ padding: '0.9rem', background: 'linear-gradient(135deg, #ba4b24, #7c2d12)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(186,75,36,0.3)' }}>
                      🔴 Cerrar Turno
                    </button>
                  )}

                  {/* HORAS EXTRA toggle */}
                  {session.status !== 'idle' && session.status !== 'done' && (
                    <div
                      onClick={toggleExtra}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.8rem', borderRadius: '8px', border: `1px solid ${session.extraAuth ? '#fed7aa' : '#e2e8f0'}`, background: session.extraAuth ? '#fff5f0' : '#f8fafc', cursor: 'pointer' }}
                    >
                      <input type="checkbox" checked={!!session.extraAuth} readOnly style={{ accentColor: '#ba4b24' }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: '600', color: session.extraAuth ? '#9a3412' : '#64748b' }}>Horas extra autorizadas por Coordinador</span>
                    </div>
                  )}

                  {/* DONE summary */}
                  {session.status === 'done' && (() => {
                    const log = attendanceLogs.find(l => l.collabId === parseInt(selectedCollab) && l.date === todayKey);
                    return log ? (
                      <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '1rem', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '700', marginBottom: '0.3rem' }}>
                          TOTAL ACUMULADO HOY {log.sessions > 1 ? `· ${log.sessions} sesiones` : ''}
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '900', color: '#15803d' }}>{log.totalHours.toFixed(2)} hrs</div>
                        <div style={{ fontSize: '0.78rem', color: '#4ade80' }}>Turno guardado correctamente</div>
                      </div>
                    ) : null;
                  })()}

                  {/* Reanudar Turno — permiso / salida temprana */}
                  {session.status === 'done' && (
                    <button onClick={resumeTurno} style={{ padding: '0.9rem', background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }}>
                      🔄 Reanudar Turno (Regreso de Permiso)
                    </button>
                  )}

                  {/* Cerrar dia completo */}
                  {session.status === 'done' && (
                    <button onClick={resetSession} style={{ padding: '0.6rem', background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', fontWeight: '600', cursor: 'pointer', fontSize: '0.82rem' }}>
                      ✓ Día completo — limpiar pantalla
                    </button>
                  )}

                </div>
              </div>
            )}
          </div>

          {/* RIGHT: camera + log table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* LIVE CAMERA */}
            <div style={{ background: '#0f172a', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
              <div style={{ padding: '0.8rem 1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: cameraActive ? '#22c55e' : '#ef4444', display: 'inline-block', boxShadow: cameraActive ? '0 0 6px #22c55e' : 'none' }} />
                  <span style={{ color: 'white', fontWeight: '700', fontSize: '0.85rem' }}>📷 Cámara en vivo</span>
                </div>
                {!cameraActive && (
                  <button onClick={initCamera} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '0.35rem 0.8rem', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}>Activar</button>
                )}
              </div>
              <div style={{ position: 'relative', width: '100%', height: '360px', background: '#1e293b' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: cameraActive ? 'block' : 'none' }}
                />
                {cameraActive && (
                  <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '6px', color: 'white', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1rem', zIndex: 10 }}>
                    🔴 REC · {fmtDate(now)} {fmt(now)}
                  </div>
                )}
                {!cameraActive && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569', padding: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📷</div>
                    {cameraError
                      ? <div style={{ color: '#f87171', fontSize: '0.82rem', textAlign: 'center' }}>⚠️ {cameraError}</div>
                      : <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Iniciando cámara...</div>
                    }
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {/* Registros del día */}
            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontWeight: '700' }}>📋 Registros del día</h3>
                <input 
                  type="date" 
                  value={filterDate} 
                  onChange={e => setFilterDate(e.target.value)} 
                  style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}
                />
              </div>
              <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700' }}>{displayedLogs.length} colaboradores</span>
            </div>

            {displayedLogs.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                <div>No hay registros en esta fecha.</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>COLABORADOR</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>HORARIO</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>ENTRADA</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>SALIDA A COMIDA</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>REGRESO COMIDA</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>SALIDA</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'right' }}>TOTAL HRS</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {displayedLogs.map(l => {
                    const c = collaborators.find(x => x.id === l.collabId);
                    return (
                      <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.8rem 1rem' }}>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{c?.name || 'Desconocido'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c?.role}</div>
                        </td>
                        <td style={{ padding: '0.8rem 1rem' }}>
                          {(c?.entry_time || c?.exit_time) ? (
                            <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: '1.4' }}>
                              {c?.entry_time && <div>🟢 <strong>{c.entry_time}</strong></div>}
                              {c?.exit_time && <div>🔴 <strong>{c.exit_time}</strong></div>}
                            </div>
                          ) : <span style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>—</span>}
                        </td>
                        <td style={{ padding: '0.8rem 1rem', fontSize: '0.88rem', color: '#166534', fontWeight: '600' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {l.entryPhoto && <img src={l.entryPhoto} onClick={() => setPhotoModal(l.entryPhoto)} style={{ width: 32, height: 32, borderRadius: '4px', cursor: 'pointer', objectFit: 'cover', border: '1px solid #e2e8f0' }} title="Ver foto" />}
                            {l.entryTime}
                          </div>
                        </td>
                        <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: '#92400e' }}>
                          {l.mealStart !== '--' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {l.mealStartPhoto && <img src={l.mealStartPhoto} onClick={() => setPhotoModal(l.mealStartPhoto)} style={{ width: 32, height: 32, borderRadius: '4px', cursor: 'pointer', objectFit: 'cover', border: '1px solid #e2e8f0' }} title="Ver foto" />}
                              {l.mealStart}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: '#2563eb' }}>
                          {l.mealEnd !== '--' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {l.mealEndPhoto && <img src={l.mealEndPhoto} onClick={() => setPhotoModal(l.mealEndPhoto)} style={{ width: 32, height: 32, borderRadius: '4px', cursor: 'pointer', objectFit: 'cover', border: '1px solid #e2e8f0' }} title="Ver foto" />}
                              {l.mealEnd}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.8rem 1rem', fontSize: '0.88rem', color: '#dc2626', fontWeight: '600' }}>
                          {l.exitTime !== '--' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {l.exitPhoto && <img src={l.exitPhoto} onClick={() => setPhotoModal(l.exitPhoto)} style={{ width: 32, height: 32, borderRadius: '4px', cursor: 'pointer', objectFit: 'cover', border: '1px solid #e2e8f0' }} title="Ver foto" />}
                              {l.exitTime}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: '900', fontSize: '1.1rem', color: '#0f172a' }}>{l.totalHours.toFixed(2)}</td>
                        <td style={{ padding: '0.8rem 1rem' }}>
                          <button onClick={() => { setDeleteConfirm({ logId: l.id }); setDeletePassword(''); setDeleteError(''); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '700' }}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            </div>
          </div>
        </div>
      )}

      {/* ── CORTE VIEW ──────────────────────────────────────────────────────── */}
      {activeTab === 'corte' && (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', marginBottom: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>Fecha Inicio del Corte</label>
              <input type="date" value={corteStartDate} onChange={e => setCorteStartDate(e.target.value)} style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>Fecha Fin (Viernes antes de mediodía)</label>
              <input type="date" value={corteEndDate} onChange={e => setCorteEndDate(e.target.value)} style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          {(!corteStartDate || !corteEndDate) ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Seleccione un rango de fechas para generar el corte.</div>
          ) : corteResults.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No hay registros en ese rango de fechas.</div>
          ) : (
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: 'white' }}>
                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>COLABORADOR</th>
                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>TARIFA/HR</th>
                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>DÍAS</th>
                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>HRS TOTALES</th>
                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>HRS NORMALES (≤48)</th>
                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>HRS EXTRA ({'>'}48 · x1.3)</th>
                    <th style={{ padding: '1rem', fontSize: '0.85rem', textAlign: 'right', background: '#ba4b24' }}>PAGO TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {corteResults.map(r => (
                    <tr key={r.collab.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem', fontWeight: '700' }}>{r.collab.name}<br /><span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>{r.collab.role}</span></td>
                      <td style={{ padding: '1rem', color: '#475569' }}>${r.collab.hourlyRate}/hr</td>
                      <td style={{ padding: '1rem' }}>{r.daysWorked}</td>
                      <td style={{ padding: '1rem', fontWeight: '600' }}>{r.totalHours} hrs</td>
                      <td style={{ padding: '1rem', color: '#166534' }}>{r.normalHours} hrs<br /><span style={{ fontSize: '0.75rem' }}>(${r.normalPay})</span></td>
                      <td style={{ padding: '1rem', color: parseFloat(r.extraHours) > 0 ? '#9a3412' : '#94a3b8' }}>{r.extraHours} hrs<br /><span style={{ fontSize: '0.75rem' }}>(${r.extraPay})</span></td>
                      <td style={{ padding: '1.2rem 1rem', textAlign: 'right', fontSize: '1.2rem', fontWeight: '900', color: '#0f172a', background: '#f8fafc' }}>${r.totalPay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ background: '#ecfdf5', padding: '1rem 2rem', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1.1rem', color: '#065f46', fontWeight: '600' }}>Nómina Total a Pagar:</span>
                  <span style={{ fontSize: '2rem', color: '#047857', fontWeight: '900' }}>
                    ${corteResults.reduce((acc, r) => acc + parseFloat(r.totalPay), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TARIFAS VIEW ────────────────────────────────────────────────────── */}
      {activeTab === 'tarifas' && (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', padding: '1.5rem', maxWidth: '600px' }}>
          <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '2rem', margin: '0 0 1.5rem' }}>
            Define el pago por hora normal de cada colaborador. Las horas extra (después de 48 hrs semanales) se calculan automáticamente a <strong>x1.3</strong>.
          </p>
          {collaborators.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No hay colaboradores registrados.</div>
          ) : collaborators.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#475569' }}>{c.name.charAt(0)}</div>
                <div>
                  <div style={{ fontWeight: '700', color: '#0f172a' }}>{c.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{c.role}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#475569', fontWeight: '600' }}>$</span>
                <input type="number" value={c.hourlyRate} onChange={e => changeRate(c.id, e.target.value)} style={{ width: '90px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: '700', fontSize: '1rem' }} />
                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>/ hr</span>
                <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '0.5rem' }}>Extra: ${(c.hourlyRate * 1.3).toFixed(2)}/hr</span>
              </div>
            </div>
          ))}
        </div>
      )}

      
      {/* ── PHOTO VIEWER MODAL ─────────────────────────────────────────── */}
      {photoModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
        }} onClick={() => setPhotoModal(null)}>
          <div style={{ position: 'relative', maxWidth: '800px', width: '100%' }}>
            <button onClick={() => setPhotoModal(null)} style={{ position: 'absolute', top: '-40px', right: '0', background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>✕ Cerrar</button>
            <img src={photoModal} alt="Captura ampliada" style={{ width: '100%', height: 'auto', borderRadius: '12px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }} />
          </div>
        </div>
      )}

      {/* ── CAMERA VERIFICATION MODAL ─────────────────────────────────────────── */}
      {cameraModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '480px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', border: '1px solid #1e293b' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>📸</div>
              <h3 style={{ margin: 0, color: 'white', fontWeight: '800', fontSize: '1.3rem' }}>Verificación de Identidad</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.4rem', marginBottom: 0 }}>
                {collab?.name} — {cameraModal.action === 'resume' ? 'Reanudando turno' : 'Iniciando turno'}
              </p>
            </div>

            {/* Camera / Preview area */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#1e293b', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}>
              {/* Video element — always in DOM so ref works */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: (cameraActive && !capturedPhoto) ? 'block' : 'none' }}
              />
              {/* Captured photo preview */}
              {capturedPhoto && (
                <img src={capturedPhoto} alt="Foto capturada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              {/* Placeholder before camera starts */}
              {!cameraActive && !capturedPhoto && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>📷</div>
                  <div style={{ fontSize: '0.85rem' }}>Presiona &quot;Activar Cámara&quot;</div>
                </div>
              )}
              {/* Overlay face guide */}
              {cameraActive && !capturedPhoto && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ width: '160px', height: '200px', border: '2px solid rgba(255,255,255,0.4)', borderRadius: '50%', boxShadow: '0 0 0 9999px rgba(0,0,0,0.25)' }} />
                </div>
              )}
            </div>

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Error */}
            {cameraError && (
              <div style={{ color: '#f87171', fontSize: '0.82rem', textAlign: 'center', marginBottom: '1rem', background: 'rgba(239,68,68,0.1)', padding: '0.6rem', borderRadius: '8px' }}>
                ⚠️ {cameraError}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {!cameraActive && !capturedPhoto && (
                <button onClick={startCamera} style={{ padding: '0.9rem', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>
                  📷 Activar Cámara
                </button>
              )}
              {cameraActive && !capturedPhoto && (
                <button onClick={takePicture} style={{ padding: '0.9rem', background: 'linear-gradient(135deg, #16a34a, #166534)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(22,163,74,0.4)' }}>
                  🟢 Tomar Foto
                </button>
              )}
              {capturedPhoto && (
                <>
                  <button onClick={confirmWithPhoto} style={{ padding: '0.9rem', background: 'linear-gradient(135deg, #16a34a, #166534)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}>
                    ✅ Confirmar y Registrar Turno
                  </button>
                  <button onClick={retakePicture} style={{ padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: '8px', color: '#94a3b8', fontWeight: '600', cursor: 'pointer', fontSize: '0.88rem' }}>
                    🔄 Tomar de nuevo
                  </button>
                </>
              )}
              <button onClick={cancelCamera} style={{ padding: '0.65rem', background: 'none', border: '1px solid #334155', borderRadius: '8px', color: '#64748b', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ─────────────────────────────────────────── */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '2rem', width: '360px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔐</div>
              <h3 style={{ margin: 0, color: '#0f172a', fontWeight: '800' }}>Confirmar Eliminación</h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.4rem' }}>
                Ingrese su contraseña de RD Carpintería para continuar.
              </p>
            </div>
            <input
              type="password"
              placeholder="Contraseña"
              autoFocus
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDeleteWithPassword()}
              style={{
                width: '100%', padding: '0.75rem 1rem', borderRadius: '8px',
                border: `1px solid ${deleteError ? '#ef4444' : '#cbd5e1'}`,
                fontSize: '1rem', outline: 'none', boxSizing: 'border-box', marginBottom: '0.5rem'
              }}
            />
            {deleteError && (
              <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                ⚠️ {deleteError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, padding: '0.75rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteWithPassword}
                disabled={deleteLoading}
                style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', border: 'none', borderRadius: '8px', fontWeight: '700', color: 'white', cursor: 'pointer', opacity: deleteLoading ? 0.7 : 1 }}
              >
                {deleteLoading ? 'Verificando...' : '🗑️ Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
