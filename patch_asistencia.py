import re
import sys

with open('frontend/src/Asistencia.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add photoModal state
code = code.replace(
    "const [cameraModal, setCameraModal] = useState(null);",
    "const [photoModal, setPhotoModal] = useState(null);\n  const [cameraModal, setCameraModal] = useState(null);"
)

# 2. Fix saveLogs
saveLogs_new = """  const saveLogs = async (newLogs, appendedLog = null) => {
    try {
      const resAtt = await fetch(`${API}/api/store/rd_attendance`, { cache: 'no-store' });
      let currentServerLogs = [];
      if (resAtt.ok) {
        const data = await resAtt.json();
        if (data.value) currentServerLogs = JSON.parse(data.value);
      }
      
      let logsToSave = newLogs;
      if (appendedLog) {
        const filtered = currentServerLogs.filter(l => !(l.collabId === appendedLog.collabId && l.date === appendedLog.date));
        logsToSave = [...filtered, appendedLog];
      }

      setAttendanceLogs(logsToSave);
      
      await fetch(`${API}/api/store/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'rd_attendance', value: JSON.stringify(logsToSave) })
      });
    } catch (e) { console.error(e); }
  };"""
code = re.sub(r"const saveLogs = async \([^}]+} catch \(e\) {}\n  };", saveLogs_new, code, flags=re.DOTALL)

# 3. Fix handleDeleteWithPassword
handleDelete_new = """      const masterUsername = 'rdcarpinteria@rdadmin.com.mx';

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
      setDeleteConfirm(null);"""
code = re.sub(r"const masterUsername.*?setDeleteConfirm\(null\);", handleDelete_new, code, flags=re.DOTALL)

# 4. Modify session actions to take photos
actions_old = """  const startTurno = () => {
    const photo = captureWithTimestamp();
    _doStartTurno(photo);
  };

  const _doStartTurno = (photoDataUrl) => {
    const ts = new Date().toISOString();
    const prevAccum = session.accumulatedHours || 0;
    saveSessions({ ...sessions, [selectedCollab]: { status: 'working', startTime: ts, mealStart: null, mealEnd: null, endTime: null, extraAuth: session.extraAuth || false, accumulatedHours: prevAccum, entryPhoto: photoDataUrl } });
  };

  const startMeal = () => {
    const ts = new Date().toISOString();
    saveSessions({ ...sessions, [selectedCollab]: { ...session, status: 'meal', mealStart: ts } });
  };

  const endMeal = () => {
    const ts = new Date().toISOString();
    saveSessions({ ...sessions, [selectedCollab]: { ...session, status: 'back', mealEnd: ts } });
  };

  const endTurno = () => {
    const ts = new Date().toISOString();
    const updated = { ...session, status: 'done', endTime: ts };"""
actions_new = """  const startTurno = () => {
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
    const updated = { ...session, status: 'done', endTime: ts, exitPhoto: photo };"""
code = code.replace(actions_old, actions_new)

# 5. Fix endTurno newLog photos and saveLogs call
endTurno_log_old = """      // Keep the entry photo from first session (or latest)
      entryPhoto: updated.entryPhoto || existingLog?.entryPhoto || null
    };

    const filtered = attendanceLogs.filter(l => !(l.collabId === newLog.collabId && l.date === newLog.date));
    saveLogs([...filtered, newLog]);"""
endTurno_log_new = """      entryPhoto: updated.entryPhoto || existingLog?.entryPhoto || null,
      mealStartPhoto: updated.mealStartPhoto || existingLog?.mealStartPhoto || null,
      mealEndPhoto: updated.mealEndPhoto || existingLog?.mealEndPhoto || null,
      exitPhoto: updated.exitPhoto || null
    };

    saveLogs(attendanceLogs, newLog);"""
code = code.replace(endTurno_log_old, endTurno_log_new)

# 6. Change Camera UI
camera_ui_old = """              <div style={{ position: 'relative', width: '100%', height: '240px', background: '#1e293b' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: cameraActive ? 'block' : 'none' }}
                />
                {!cameraActive && ("""
camera_ui_new = """              <div style={{ position: 'relative', width: '100%', height: '360px', background: '#1e293b' }}>
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
                {!cameraActive && ("""
code = code.replace(camera_ui_old, camera_ui_new)

# 7. Update Table UI
table_th_old = """                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>FOTO</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>COLABORADOR</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>HORARIO</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>ENTRADA</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>COMIDA</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>SALIDA</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'right' }}>TOTAL HRS</th>"""
table_th_new = """                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>COLABORADOR</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>HORARIO</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>ENTRADA</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>SALIDA A COMIDA</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>REGRESO COMIDA</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'left' }}>SALIDA</th>
                    <th style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'right' }}>TOTAL HRS</th>"""
code = code.replace(table_th_old, table_th_new)

table_tr_old = """                        <td style={{ padding: '0.5rem 1rem' }}>
                          {l.entryPhoto ? (
                            <img src={l.entryPhoto} alt="Foto entrada" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #dcfce7', display: 'block' }} />
                          ) : (
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.4rem' }}>👤</div>
                          )}
                        </td>
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
                        <td style={{ padding: '0.8rem 1rem', fontSize: '0.88rem', color: '#166534', fontWeight: '600' }}>{l.entryTime}</td>
                        <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: '#92400e' }}>{l.mealStart} – {l.mealEnd}</td>
                        <td style={{ padding: '0.8rem 1rem', fontSize: '0.88rem', color: '#dc2626', fontWeight: '600' }}>{l.exitTime}</td>
                        <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: '900', fontSize: '1.1rem', color: '#0f172a' }}>{l.totalHours.toFixed(2)}</td>"""
table_tr_new = """                        <td style={{ padding: '0.8rem 1rem' }}>
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
                        <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: '900', fontSize: '1.1rem', color: '#0f172a' }}>{l.totalHours.toFixed(2)}</td>"""
code = code.replace(table_tr_old, table_tr_new)

# 8. Add Photo Modal component
photo_modal = """
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
"""
code = code.replace("{/* ── CAMERA VERIFICATION MODAL ─────────────────────────────────────────── */}", photo_modal + "\n      {/* ── CAMERA VERIFICATION MODAL ─────────────────────────────────────────── */}")

with open('frontend/src/Asistencia.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched Asistencia.jsx successfully.")
