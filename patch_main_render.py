path = r'd:\RDadmin\backend\main.py'
with open(path, encoding='utf-8') as f:
    content = f.read()

old = '        try: conn.execute(text("ALTER TABLE prospects ADD COLUMN estimation_data VARCHAR;"))\n        except: pass'
new = '''        try: conn.execute(text("ALTER TABLE prospects ADD COLUMN estimation_data VARCHAR;"))
        except: pass
        try: conn.execute(text("ALTER TABLE prospects ADD COLUMN render_applies BOOLEAN;"))
        except: pass
        try: conn.execute(text("ALTER TABLE prospects ADD COLUMN render_price REAL;"))
        except: pass
        try: conn.execute(text("ALTER TABLE prospects ADD COLUMN render_total_price REAL;"))
        except: pass
        try: conn.execute(text("ALTER TABLE prospects ADD COLUMN render_image_path VARCHAR;"))
        except: pass'''

if old in content:
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated main.py OK')
else:
    # try CRLF variant
    old2 = old.replace('\n', '\r\n')
    if old2 in content:
        content = content.replace(old2, new)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('Updated main.py OK (CRLF)')
    else:
        print('Pattern NOT found')
