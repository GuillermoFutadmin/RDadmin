import sys

# Patch Accesos.jsx
with open('frontend/src/Accesos.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old1 = "{ id: 'Ventas', label: '📈 Valoración / Cotizaciones' },"
new1 = "{ id: 'Ventas', label: '📈 Valoración / Cotizaciones' },\n    { id: 'Contratos', label: '📄 Contratos' },"

content = content.replace(old1, new1)

with open('frontend/src/Accesos.jsx', 'w', encoding='utf-8') as f:
    f.write(content)


# Patch App.jsx
with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content2 = f.read()

old2 = "{/* Contratos */}\n            {hasAccess('Ventas') && ("
new2 = "{/* Contratos */}\n            {hasAccess('Contratos') && ("

old3 = "{activeTab === 'Contratos'     && hasAccess('Ventas')        && <Contratos />}"
new3 = "{activeTab === 'Contratos'     && hasAccess('Contratos')        && <Contratos />}"

content2 = content2.replace(old2, new2)
content2 = content2.replace(old3, new3)

# Handle potential CRLF
old2_crlf = "{/* Contratos */}\r\n            {hasAccess('Ventas') && ("
new2_crlf = "{/* Contratos */}\r\n            {hasAccess('Contratos') && ("
content2 = content2.replace(old2_crlf, new2_crlf)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content2)

print("SUCCESS: Accesos and App patched for Contratos permissions")
