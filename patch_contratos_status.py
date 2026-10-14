import re

path = r'd:\RDadmin\frontend\src\Contratos.jsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

# Add getStatus helper
if 'const getStatus = (c)' not in content:
    helper = """  const getStatus = (c) => {
    const validStates = ['APROBADO', 'RENDER SI/NO', 'ESTIMACIÓN', 'CONTRATO'];
    if (c.status && validStates.includes(c.status)) return c.status;
    return 'APROBADO';
  };
"""
    content = content.replace("const statusBadge = (s) => {", helper + "\n  const statusBadge = (s) => {")

# Replace in filtered array
old_filtered = """    if (filterStatus && (c.status || 'APROBADO') !== filterStatus) return false;"""
new_filtered = """    if (filterStatus && getStatus(c) !== filterStatus) return false;"""
content = content.replace(old_filtered, new_filtered)

# Replace in Pipeline Tabs
old_tabs = """          { key: 'APROBADO',  label: 'Aprobado',  count: contratos.filter(c => (c.status || 'APROBADO') === 'APROBADO').length,  color: '#166534', bg: '#dcfce7', icon: '✅' },
          { key: 'RENDER SI/NO', label: 'Render SI/NO', count: contratos.filter(c => c.status === 'RENDER SI/NO').length, color: '#92400e', bg: '#fef3c7', icon: '🎨' },
          { key: 'ESTIMACIÓN', label: 'Estimación', count: contratos.filter(c => c.status === 'ESTIMACIÓN').length,  color: '#3730a3', bg: '#e0e7ff', icon: '📐' },
          { key: 'CONTRATO', label: 'Contrato', count: contratos.filter(c => c.status === 'CONTRATO').length,  color: '#9d174d', bg: '#fce7f3', icon: '📝' },"""
new_tabs = """          { key: 'APROBADO',  label: 'Aprobado',  count: contratos.filter(c => getStatus(c) === 'APROBADO').length,  color: '#166534', bg: '#dcfce7', icon: '✅' },
          { key: 'RENDER SI/NO', label: 'Render SI/NO', count: contratos.filter(c => getStatus(c) === 'RENDER SI/NO').length, color: '#92400e', bg: '#fef3c7', icon: '🎨' },
          { key: 'ESTIMACIÓN', label: 'Estimación', count: contratos.filter(c => getStatus(c) === 'ESTIMACIÓN').length,  color: '#3730a3', bg: '#e0e7ff', icon: '📐' },
          { key: 'CONTRATO', label: 'Contrato', count: contratos.filter(c => getStatus(c) === 'CONTRATO').length,  color: '#9d174d', bg: '#fce7f3', icon: '📝' },"""
content = content.replace(old_tabs, new_tabs)

# Replace in table render
old_table_status = """<td style={{ padding:'0.7rem 0.8rem', color:'#64748b' }}>{statusBadge(c.status)}</td>"""
new_table_status = """<td style={{ padding:'0.7rem 0.8rem', color:'#64748b' }}>{statusBadge(getStatus(c))}</td>"""
content = content.replace(old_table_status, new_table_status)

# Replace in actions column
old_action_1 = """{ (c.status || 'APROBADO') === 'APROBADO' && ("""
new_action_1 = """{ getStatus(c) === 'APROBADO' && ("""
content = content.replace(old_action_1, new_action_1)

old_action_2 = """{ c.status === 'RENDER SI/NO' && ("""
new_action_2 = """{ getStatus(c) === 'RENDER SI/NO' && ("""
content = content.replace(old_action_2, new_action_2)

old_action_3 = """{ c.status === 'ESTIMACIÓN' && ("""
new_action_3 = """{ getStatus(c) === 'ESTIMACIÓN' && ("""
content = content.replace(old_action_3, new_action_3)


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
