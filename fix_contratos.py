import sys

with open("frontend/src/Contratos.jsx", "r", encoding="utf-8") as f:
    content = f.read()

import re
content = re.sub(r"\{prospect\.interior_color_type \? .*\ \:\ 'N/A'\}", "{prospect.interior_color_type ? `${prospect.interior_color_type} · ${prospect.interior_color_code}` : 'N/A'}", content)
content = re.sub(r"\{prospect\.exterior_inf_color_type \? .*\ \:\ 'N/A'\}", "{prospect.exterior_inf_color_type ? `${prospect.exterior_inf_color_type} · ${prospect.exterior_inf_color_code}` : 'N/A'}", content)
content = re.sub(r"\{prospect\.exterior_sup_color_type \? .*\ \:\ 'N/A'\}", "{prospect.exterior_sup_color_type ? `${prospect.exterior_sup_color_type} · ${prospect.exterior_sup_color_code}` : 'N/A'}", content)

with open("frontend/src/Contratos.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fix aplicado con exito.")
