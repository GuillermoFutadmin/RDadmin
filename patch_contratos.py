import re

path = r'd:\RDadmin\frontend\src\Contratos.jsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

# 1. Fix handleApprove to set status=APROBADO
old_approve = "body: JSON.stringify({ is_contract:true, contract_date:new Date().toISOString() })"
new_approve = "body: JSON.stringify({ is_contract:true, contract_date:new Date().toISOString(), status:'APROBADO' })"
if old_approve in content:
    content = content.replace(old_approve, new_approve, 1)
    print('1. handleApprove patched')
else:
    print('1. handleApprove NOT found - searching...')
    idx = content.find('is_contract:true')
    print(f'   is_contract:true found at idx {idx}: {repr(content[idx-5:idx+80])}')

# 2. Replace the actions <td> to add a status dropdown + Estimación button
old_actions = """                  <td style={{ padding:'0.7rem 0.8rem' }}>
                    <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                      <button onClick={() => { setSelected(c); setView('estimacion'); }}
                        style={{ padding:'0.3rem 0.7rem', background:'#3b82f6', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.85rem' }}>
                        📐 Estimación
                      </button>
                    </div>
                  </td>"""

new_actions = """                  <td style={{ padding:'0.7rem 0.8rem' }}>
                    <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap', alignItems:'center' }}>
                      <select
                        value={c.status && ['APROBADO','RENDER SI/NO','ESTIMACIÓN','CONTRATO'].includes(c.status) ? c.status : 'APROBADO'}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          await fetch(`${API}/api/prospects/${c.id}`, {
                            method: 'PUT', headers:{'Content-Type':'application/json'},
                            body: JSON.stringify({ status: newStatus })
                          });
                          fetchContratos();
                        }}
                        style={{ padding:'0.3rem 0.5rem', borderRadius:'6px', border:'1px solid #cbd5e1', fontSize:'0.78rem', outline:'none', background:'white', color:'#475569', cursor:'pointer' }}
                      >
                        <option value="APROBADO">APROBADO</option>
                        <option value="RENDER SI/NO">RENDER SI/NO</option>
                        <option value="ESTIMACIÓN">ESTIMACIÓN</option>
                        <option value="CONTRATO">CONTRATO</option>
                      </select>
                      <button onClick={() => { setSelected(c); setView('estimacion'); }}
                        style={{ padding:'0.3rem 0.7rem', background:'#3b82f6', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.85rem' }}>
                        📐 Estimación
                      </button>
                    </div>
                  </td>"""

# Normalize: the file may have \r\n
old_normalized = old_actions.replace('\n', '\r\n')
if old_normalized in content:
    content = content.replace(old_normalized, new_actions, 1)
    print('2. Actions td patched (CRLF)')
elif old_actions in content:
    content = content.replace(old_actions, new_actions, 1)
    print('2. Actions td patched (LF)')
else:
    # Try flexible regex
    pattern = re.compile(
        r'<td style=\{\{ padding:\'0\.7rem 0\.8rem\' \}\}>\s*'
        r'<div style=\{\{ display:\'flex\', gap:\'0\.4rem\', flexWrap:\'wrap\' \}\}>\s*'
        r'<button onClick=\{\(\) => \{ setSelected\(c\); setView\(\'estimacion\'\); \}\}.*?'
        r'</div>\s*</td>',
        re.DOTALL
    )
    m = pattern.search(content)
    if m:
        content = content[:m.start()] + new_actions + content[m.end():]
        print('2. Actions td patched (regex)')
    else:
        print('2. Actions td NOT found')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('File saved.')
