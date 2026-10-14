import sys

with open("frontend/src/Contratos.jsx", "r", encoding="utf-8") as f:
    content = f.read()

target = "  const [saveMsg, setSaveMsg] = useState('');"
replacement = """  const [saveMsg, setSaveMsg] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState('');

  // Auto-guardado al servidor en segundo plano
  useEffect(() => {
    if (!templateLoaded) return;
    setAutoSaveStatus('⏳ Guardando borrador...');
    const timer = setTimeout(async () => {
      const data = { 
        sheets, margin, measures, obsText, totalWithMargin, photos, croquisPhotos,
        croquis_data: croquisRef.current?.getSketchData()
      };
      try {
        await fetch(${API}/api/prospects/, {
          method:'PUT', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ estimation_data: JSON.stringify(data) }) // Guardado silencioso sin cambiar status
        });
        setAutoSaveStatus('✅ Borrador auto-guardado');
        setTimeout(() => setAutoSaveStatus(''), 4000);
      } catch {
        setAutoSaveStatus('❌ Error al guardar borrador');
      }
    }, 2000); // Esperar 2 segundos después de escribir/subir foto
    return () => clearTimeout(timer);
  }, [sheets, margin, measures, obsText, photos, croquisPhotos, templateLoaded]);
"""

target_header = """        <div>
          <h2 style={{ margin:0, color:'#1e293b', fontSize:'1.3rem', fontWeight:'800' }}>📐 Estimación · {prospect.name}</h2>
          <p style={{ margin:0, color:'#64748b', fontSize:'0.83rem' }}>{prospect.project_type} · {prospect.public_id}</p>
        </div>"""
replacement_header = """        <div>
          <h2 style={{ margin:0, color:'#1e293b', fontSize:'1.3rem', fontWeight:'800' }}>
            📐 Estimación · {prospect.name}
            {autoSaveStatus && <span style={{ marginLeft: '12px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '12px', verticalAlign: 'middle' }}>{autoSaveStatus}</span>}
          </h2>
          <p style={{ margin:0, color:'#64748b', fontSize:'0.83rem' }}>{prospect.project_type} · {prospect.public_id}</p>
        </div>"""

if target in content and target_header in content:
    content = content.replace(target, replacement)
    content = content.replace(target_header, replacement_header)
    with open("frontend/src/Contratos.jsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Patch aplicado con éxito.")
else:
    print("Target no encontrado.")
