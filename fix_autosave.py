import sys
import re

with open("frontend/src/Contratos.jsx", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(
    r"await fetch\(\/api\/prospects\/, \{",
    "await fetch(`${API}/api/prospects/${prospect.id}`, {",
    content
)

with open("frontend/src/Contratos.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fix template string aplicado.")
