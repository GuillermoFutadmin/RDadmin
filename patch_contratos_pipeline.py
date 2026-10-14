import re
import sys

path = r'd:\RDadmin\frontend\src\Contratos.jsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

# 1. Add filterStatus to state
if 'const [filterStatus, setFilterStatus] = useState(\'\');' not in content:
    content = content.replace(
        "const [filterType, setFilterType] = useState('');",
        "const [filterType, setFilterType] = useState('');\n  const [filterStatus, setFilterStatus] = useState('');"
    )

# 2. Update filtered array
old_filtered = """  const filtered = contratos.filter(c => {
    if (txt && !((c.name||'').toLowerCase().includes(txt) || (c.public_id||'').toLowerCase().includes(txt) || (c.contact_info||'').toLowerCase().includes(txt) || (c.project_type||'').toLowerCase().includes(txt))) return false;
    if (filterType && c.project_type !== filterType) return false;
    return true;
  });"""
new_filtered = """  const filtered = contratos.filter(c => {
    if (txt && !((c.name||'').toLowerCase().includes(txt) || (c.public_id||'').toLowerCase().includes(txt) || (c.contact_info||'').toLowerCase().includes(txt) || (c.project_type||'').toLowerCase().includes(txt))) return false;
    if (filterType && c.project_type !== filterType) return false;
    if (filterStatus && (c.status || 'APROBADO') !== filterStatus) return false;
    return true;
  });"""
content = content.replace(old_filtered, new_filtered)
# 2b (LF)
old_filtered_lf = old_filtered.replace('\n', '\r\n')
content = content.replace(old_filtered_lf, new_filtered)


# 3. Add Pipeline tabs before Filters
pipeline_ui = """
      {/* ── ETAPAS PIPELINE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.8rem', marginBottom: '1.2rem' }}>
        {[
          { key: '', label: 'Todos', count: contratos.length, color: '#475569', bg: '#f1f5f9', icon: '📋' },
          { key: 'APROBADO',  label: 'Aprobado',  count: contratos.filter(c => (c.status || 'APROBADO') === 'APROBADO').length,  color: '#166534', bg: '#dcfce7', icon: '✅' },
          { key: 'RENDER SI/NO', label: 'Render SI/NO', count: contratos.filter(c => c.status === 'RENDER SI/NO').length, color: '#92400e', bg: '#fef3c7', icon: '🎨' },
          { key: 'ESTIMACIÓN', label: 'Estimación', count: contratos.filter(c => c.status === 'ESTIMACIÓN').length,  color: '#3730a3', bg: '#e0e7ff', icon: '📐' },
          { key: 'CONTRATO', label: 'Contrato', count: contratos.filter(c => c.status === 'CONTRATO').length,  color: '#9d174d', bg: '#fce7f3', icon: '📝' },
        ].map(({ key, label, count, color, bg, icon }) => {
          const isActive = filterStatus === key;
          return (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              style={{
                background: isActive ? bg : 'white',
                border: `2px solid ${isActive ? color : '#e2e8f0'}`,
                borderRadius: '10px',
                padding: '0.7rem 0.6rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.3rem',
                transition: 'all 0.2s',
                boxShadow: isActive ? `0 4px 12px ${color}33` : '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ fontSize: '1.2rem' }}>{icon}</div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: isActive ? color : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '900', color: isActive ? color : '#1e293b' }}>{count}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}"""

content = content.replace('{/* Filters */}', pipeline_ui)


# 4. Replace Dropdown with buttons in Actions
# Regex search the actions <td>
pattern = re.compile(r'<td style=\{\{\s*padding:\'0\.7rem 0\.8rem\'\s*\}\}>\s*<div style=\{\{\s*display:\'flex\', gap:\'0\.4rem\', flexWrap:\'wrap\', alignItems:\'center\'\s*\}\}>.*?📐 Estimación\s*</button>\s*</div>\s*</td>', re.DOTALL)

new_actions = """<td style={{ padding:'0.7rem 0.8rem' }}>
                    <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap', alignItems:'center' }}>
                      { (c.status || 'APROBADO') === 'APROBADO' && (
                        <button onClick={async () => {
                          await fetch(`${API}/api/prospects/${c.id}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: 'RENDER SI/NO' }) });
                          fetchContratos();
                        }} style={{ padding:'0.3rem 0.7rem', background:'#f59e0b', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.8rem' }}>
                          Avanzar a Render
                        </button>
                      )}
                      { c.status === 'RENDER SI/NO' && (
                        <button onClick={async () => {
                          await fetch(`${API}/api/prospects/${c.id}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: 'ESTIMACIÓN' }) });
                          fetchContratos();
                        }} style={{ padding:'0.3rem 0.7rem', background:'#4f46e5', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.8rem' }}>
                          Avanzar a Estimación
                        </button>
                      )}
                      { c.status === 'ESTIMACIÓN' && (
                        <button onClick={async () => {
                          await fetch(`${API}/api/prospects/${c.id}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: 'CONTRATO' }) });
                          fetchContratos();
                        }} style={{ padding:'0.3rem 0.7rem', background:'#ec4899', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.8rem' }}>
                          Avanzar a Contrato
                        </button>
                      )}
                      <button onClick={() => { setSelected(c); setView('estimacion'); }}
                        style={{ padding:'0.3rem 0.7rem', background:'#3b82f6', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.85rem' }}>
                        📐 Estimación
                      </button>
                    </div>
                  </td>"""

m = pattern.search(content)
if m:
    content = content[:m.start()] + new_actions + content[m.end():]
    print('Actions updated.')
else:
    print('Regex for actions not found!')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done.')
