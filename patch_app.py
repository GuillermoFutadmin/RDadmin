import sys

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old1 = "import Prospects from './Prospects';"
new1 = "import Prospects from './Prospects';\nimport Contratos from './Contratos';"

old2 = "{/* Pedidos */}"
new2 = '''{/* Contratos */}
            {hasAccess('Ventas') && (
              <li
                className={activeTab === 'Contratos' ? 'active' : ''}
                onClick={() => { setActiveTab('Contratos'); setProspectsOpen(false); }}
              >
                <span style={{ marginRight: '0.5rem' }}>📄</span> Contratos
              </li>
            )}

            {/* Pedidos */}'''

old3 = "{activeTab === 'Prospectos'    && hasAccess('Prospectos')    && <Prospects />}"
new3 = '''{activeTab === 'Prospectos'    && hasAccess('Prospectos')    && <Prospects />}
        {activeTab === 'Contratos'     && hasAccess('Ventas')        && <Contratos />}'''


content = content.replace(old1, new1)
content = content.replace(old2, new2)
content = content.replace(old3, new3)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS App.jsx patched")
