import sys

with open("frontend/src/Contratos.jsx", "r", encoding="utf-8") as f:
    content = f.read()

target = "{sec.key === 'materiales' ? ("
replacement = "{sec.key.includes('materiales') ? ("

if target in content:
    content = content.replace(target, replacement)
    with open("frontend/src/Contratos.jsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Patch aplicado.")
else:
    print("Target no encontrado.")
