import sys

def patch():
    path = "d:/RDadmin/frontend/src/Contratos.jsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update State Variables
    old_state = """  const [materials, setMaterials] = useState([mkRow('Tablero de melamina')]);
  const [labor, setLabor]       = useState([mkRow('Mano de obra carpintería')]);
  const [concepts, setConcepts] = useState([mkRow('Flete / Transporte')]);"""
    new_state = """  const [sheets, setSheets] = useState([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);"""
    if old_state in content:
        content = content.replace(old_state, new_state)
    else:
        print("Warning: old state not found")

    # 2. Update useEffect for loading existing estimation_data
    old_load = """        if (d.materials?.length) setMaterials(d.materials);
        if (d.labor?.length)     setLabor(d.labor);
        if (d.concepts?.length)  setConcepts(d.concepts);"""
    new_load = """        if (d.sheets && d.sheets.length > 0) {
          setSheets(d.sheets);
        } else if (d.materials || d.labor || d.concepts) {
          setSheets([{ type: prospect.project_type || 'Proyecto', materials: d.materials || [], labor: d.labor || [], concepts: d.concepts || [] }]);
        }"""
    if old_load in content:
        content = content.replace(old_load, new_load)

    # 3. Update useEffect for fallback (no estimation_data)
    old_fallback_start = """  // Cargar machote por CADA tipo de proyecto detectado en project_type
  useEffect(() => {
    if (templateLoaded || prospect.estimation_data) return;
    const normalize = s => s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();"""
    new_fallback_start = """  // Cargar desde valuation_data o machotes
  useEffect(() => {
    if (templateLoaded || prospect.estimation_data) return;

    if (prospect.valuation_data) {
      try {
        const rawVal = JSON.parse(prospect.valuation_data);
        if (rawVal.sheets && rawVal.sheets.length > 0) {
          setSheets(rawVal.sheets);
          if (rawVal.globalMargin) setMargin(rawVal.globalMargin);
        } else if (rawVal.materials || rawVal.labor || rawVal.concepts) {
          setSheets([{ type: rawVal.projectType || 'Proyecto', materials: rawVal.materials || [], labor: rawVal.labor || [], concepts: rawVal.concepts || [] }]);
          if (rawVal.margin) setMargin(rawVal.margin);
        }
        setTemplateLoaded(true);
        return;
      } catch(e) {}
    }

    const normalize = s => s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();"""
    if old_fallback_start in content:
        content = content.replace(old_fallback_start, new_fallback_start)

    old_fallback_end = """      .then(data => {
        const allMat = [], allLab = [], allCon = [];
        matchedKeys.forEach(key => {
          const tpl = data.find(t => normalize(t.name) === normalize(key));
          if (!tpl) return;
          try {
            const parsed = JSON.parse(tpl.data);
            const mapItem = it => ({
              id: Date.now() + Math.random(),
              desc: '[' + key + '] ' + (it.desc || ''),
              qty: 1, price: Number(it.price) || 0, unit: it.unit || 'pza'
            });
            if (parsed?.materiales?.length) allMat.push(...parsed.materiales.map(mapItem));
            if (parsed?.mano_obra?.length)  allLab.push(...parsed.mano_obra.map(mapItem));
            if (parsed?.conceptos?.length)  allCon.push(...parsed.conceptos.map(mapItem));
          } catch {}
        });
        if (allMat.length) setMaterials(allMat);
        if (allLab.length) setLabor(allLab);
        if (allCon.length) setConcepts(allCon);
        setTemplateLoaded(true);
      })"""
    new_fallback_end = """      .then(data => {
        const newSheets = [];
        matchedKeys.forEach(key => {
          const tpl = data.find(t => normalize(t.name) === normalize(key));
          if (!tpl) return;
          try {
            const parsed = JSON.parse(tpl.data);
            const mapItem = it => ({
              id: Date.now() + Math.random(),
              desc: it.desc || '',
              qty: 1, price: Number(it.price) || 0, unit: it.unit || 'pza'
            });
            newSheets.push({
              type: key,
              materials: parsed?.materiales ? parsed.materiales.map(mapItem) : [],
              labor: parsed?.mano_obra ? parsed.mano_obra.map(mapItem) : [],
              concepts: parsed?.conceptos ? parsed.conceptos.map(mapItem) : []
            });
          } catch {}
        });
        if (newSheets.length > 0) setSheets(newSheets);
        setTemplateLoaded(true);
      })"""
    if old_fallback_end in content:
        content = content.replace(old_fallback_end, new_fallback_end)

    # 4. Totals Calculation
    old_totals = """  const totalCost = [...materials, ...labor, ...concepts].reduce((s, r) => s + Number(r.qty) * Number(r.price), 0);
  const totalWithMargin = totalCost * (1 + margin / 100);"""
    new_totals = """  const getSheetCost = (sh) => {
    const sum = arr => (arr||[]).reduce((s, r) => s + Number(r.qty||0) * Number(r.price||0), 0);
    return sum(sh.materials) + sum(sh.labor) + sum(sh.concepts);
  };
  const totalCost = sheets.reduce((s, sh) => s + getSheetCost(sh), 0);
  const totalWithMargin = totalCost * (1 + margin / 100);"""
    if old_totals in content:
        content = content.replace(old_totals, new_totals)

    # 5. Row manipulation logic
    old_row_logic = """  const saveItemEdit = (updates) => {
    const { section, id } = editingItem;
    const updFn = prev => prev.map(r => r.id === id ? { ...r, ...updates } : r);
    if (section === 'mat') setMaterials(updFn);
    if (section === 'lab') setLabor(updFn);
    if (section === 'con') setConcepts(updFn);
    setEditingItem(null);
  };
  
  const addRow = (section, desc) => {
    const mk = () => [...(section==='mat'?materials:section==='lab'?labor:concepts), mkRow(desc)];
    if (section === 'mat') setMaterials(mk());
    if (section === 'lab') setLabor(mk());
    if (section === 'con') setConcepts(mk());
  };
  
  const delRow = (section, id) => {
    const flt = arr => arr.filter(r => r.id !== id);
    if (section === 'mat') setMaterials(flt(materials));
    if (section === 'lab') setLabor(flt(labor));
    if (section === 'con') setConcepts(flt(concepts));
  };

  const renderValRow = (item, section) => (
    <tr key={item.id}>
      <td style={tdSt}><strong>{item.desc}</strong></td>
      <td style={tdSt}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input type="number" value={item.qty} min="0"
            onChange={e => {
               const val = e.target.value;
               const updFn = prev => prev.map(r => r.id === item.id ? { ...r, qty: val } : r);
               if (section === 'mat') setMaterials(updFn);
               if (section === 'lab') setLabor(updFn);
               if (section === 'con') setConcepts(updFn);
            }}
            style={{ width: '72px', padding: '4px', border:'1px solid #cbd5e1', borderRadius:'4px' }}
          />
          <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '2px 7px', fontSize: '0.75rem', color: '#475569', fontWeight: '600' }}>
            {item.unit || 'pza'}
          </span>
        </div>
      </td>
      <td style={tdSt}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{formatCurrency(item.price)}</span>
          <button onClick={() => handleEditItem(section, item)} style={{ background:'white', border:'1px solid #cbd5e1', borderRadius:'5px', cursor:'pointer', padding:'3px 6px', fontSize:'0.8rem' }}>✏️</button>
        </div>
      </td>
      <td style={{ ...tdSt, textAlign: 'right', fontWeight: 'bold' }}>
        {formatCurrency(Number(item.qty)*Number(item.price))}
        <button onClick={() => delRow(section, item.id)} style={{ marginLeft:'8px', background:'none', border:'none', color:'#ef4444', cursor:'pointer' }}>✕</button>
      </td>
    </tr>
  );"""
  
    new_row_logic = """  const saveItemEdit = (updates) => {
    const { section, id } = editingItem;
    setSheets(prev => {
      const nw = [...prev];
      const sh = {...nw[activeSheetIdx]};
      const arrKey = section === 'mat' ? 'materials' : section === 'lab' ? 'labor' : 'concepts';
      sh[arrKey] = sh[arrKey].map(r => r.id === id ? { ...r, ...updates } : r);
      nw[activeSheetIdx] = sh;
      return nw;
    });
    setEditingItem(null);
  };
  
  const addRow = (section, desc) => {
    setSheets(prev => {
      const nw = [...prev];
      const sh = {...nw[activeSheetIdx]};
      const arrKey = section === 'mat' ? 'materials' : section === 'lab' ? 'labor' : 'concepts';
      sh[arrKey] = [...(sh[arrKey]||[]), mkRow(desc)];
      nw[activeSheetIdx] = sh;
      return nw;
    });
  };
  
  const delRow = (section, id) => {
    setSheets(prev => {
      const nw = [...prev];
      const sh = {...nw[activeSheetIdx]};
      const arrKey = section === 'mat' ? 'materials' : section === 'lab' ? 'labor' : 'concepts';
      sh[arrKey] = sh[arrKey].filter(r => r.id !== id);
      nw[activeSheetIdx] = sh;
      return nw;
    });
  };

  const renderValRow = (item, section) => (
    <tr key={item.id}>
      <td style={tdSt}><strong>{item.desc}</strong></td>
      <td style={tdSt}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input type="number" value={item.qty} min="0"
            onChange={e => {
               const val = e.target.value;
               setSheets(prev => {
                 const nw = [...prev];
                 const sh = {...nw[activeSheetIdx]};
                 const arrKey = section === 'mat' ? 'materials' : section === 'lab' ? 'labor' : 'concepts';
                 sh[arrKey] = sh[arrKey].map(r => r.id === item.id ? { ...r, qty: val } : r);
                 nw[activeSheetIdx] = sh;
                 return nw;
               });
            }}
            style={{ width: '72px', padding: '4px', border:'1px solid #cbd5e1', borderRadius:'4px' }}
          />
          <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '2px 7px', fontSize: '0.75rem', color: '#475569', fontWeight: '600' }}>
            {item.unit || 'pza'}
          </span>
        </div>
      </td>
      <td style={tdSt}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{formatCurrency(item.price)}</span>
          <button onClick={() => handleEditItem(section, item)} style={{ background:'white', border:'1px solid #cbd5e1', borderRadius:'5px', cursor:'pointer', padding:'3px 6px', fontSize:'0.8rem' }}>✏️</button>
        </div>
      </td>
      <td style={{ ...tdSt, textAlign: 'right', fontWeight: 'bold' }}>
        {formatCurrency(Number(item.qty)*Number(item.price))}
        <button onClick={() => delRow(section, item.id)} style={{ marginLeft:'8px', background:'none', border:'none', color:'#ef4444', cursor:'pointer' }}>✕</button>
      </td>
    </tr>
  );"""
    if old_row_logic in content:
        content = content.replace(old_row_logic, new_row_logic)

    # 6. handleSave
    old_save = """    const data = { 
      materials, labor, concepts, margin, measures, obsText, totalWithMargin, photos, croquisPhotos,
      croquis_data: croquisRef.current?.getSketchData()
    };"""
    new_save = """    const data = { 
      sheets, margin, measures, obsText, totalWithMargin, photos, croquisPhotos,
      croquis_data: croquisRef.current?.getSketchData()
    };"""
    if old_save in content:
        content = content.replace(old_save, new_save)


    # 7. Rendering the Cotizador en Vivo Tables
    old_tables = """        {renderQuoteTable('Materiales', materials, 'mat', 'Material')}
        {renderQuoteTable('Mano de obra', labor, 'lab', 'Mano de obra')}
        {renderQuoteTable('Conceptos / Otros', concepts, 'con', 'Concepto')}"""
    
    new_tables = """        {sheets.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '1.2rem', paddingBottom: '4px' }}>
              {sheets.map((sh, idx) => {
                const sheetCost = getSheetCost(sh);
                const isActive = activeSheetIdx === idx;
                return (
                  <button key={idx} onClick={() => setActiveSheetIdx(idx)}
                    style={{
                      padding: '8px 16px', background: isActive ? '#8b5a2b' : '#f1f5f9',
                      color: isActive ? 'white' : '#475569', border: isActive ? 'none' : '1px solid #cbd5e1',
                      borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem',
                      display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap'
                    }}>
                    #{idx+1} {sh.type} <span style={{ background: isActive ? 'rgba(255,255,255,0.2)' : '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>{formatCurrency(sheetCost)}</span>
                  </button>
                );
              })}
            </div>
            {sheets[activeSheetIdx] && (
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                   <h4 style={{ margin:0, color:'#8b5a2b', fontSize:'1rem' }}>Hoja: {sheets[activeSheetIdx].type}</h4>
                   <button onClick={() => {
                     if(!window.confirm('¿Eliminar esta hoja?')) return;
                     setSheets(prev => {
                       const nw = [...prev];
                       nw.splice(activeSheetIdx, 1);
                       return nw;
                     });
                     setActiveSheetIdx(0);
                   }} style={{ background:'#ef4444', color:'white', border:'none', borderRadius:'6px', padding:'4px 8px', fontSize:'0.75rem', cursor:'pointer' }}>Eliminar hoja</button>
                </div>
                {renderQuoteTable('Materiales', sheets[activeSheetIdx].materials || [], 'mat', 'Material')}
                {renderQuoteTable('Mano de obra', sheets[activeSheetIdx].labor || [], 'lab', 'Mano de obra')}
                {renderQuoteTable('Conceptos / Otros', sheets[activeSheetIdx].concepts || [], 'con', 'Concepto')}
              </div>
            )}
          </>
        )}
        {sheets.length === 0 && <p style={{ color:'#64748b' }}>No hay hojas de cotización. Regresa el contrato a prospecto y realiza la Valoración.</p>}"""
    
    if old_tables in content:
        content = content.replace(old_tables, new_tables)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    print("Patch applied successfully")

if __name__ == "__main__":
    patch()
