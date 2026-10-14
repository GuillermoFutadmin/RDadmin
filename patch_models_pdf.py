import sys
path = r'd:\RDadmin\backend\models.py'
with open(path, encoding='utf-8') as f:
    content = f.read()

old = '    render_image_path = Column(String, nullable=True) # Imagen del render cargada'
new = '''    render_image_path = Column(String, nullable=True) # Imagen del render cargada
    render_pdf_path = Column(String, nullable=True)      # PDF de la cotizacion de render'''

if old in content:
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated models.py")
else:
    print("Pattern not found in models.py")
