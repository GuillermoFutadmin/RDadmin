import sys
path = r'd:\RDadmin\backend\main.py'
with open(path, encoding='utf-8') as f:
    content = f.read()

old_mig = '    safe_alter("ALTER TABLE prospects ADD COLUMN render_image_path VARCHAR;")'
new_mig = '''    safe_alter("ALTER TABLE prospects ADD COLUMN render_image_path VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN render_pdf_path VARCHAR;")'''
content = content.replace(old_mig, new_mig)

old_schema = '    render_image_path: Optional[str] = None'
new_schema = '''    render_image_path: Optional[str] = None
    render_pdf_path: Optional[str] = None'''
content = content.replace(old_schema, new_schema)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated main.py")
