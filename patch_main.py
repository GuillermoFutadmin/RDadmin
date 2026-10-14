import sys

content = open('backend/main.py', 'rb').read()

old = b'''try:
    models.Base.metadata.create_all(bind=engine)
except Exception as e:'''

new = b'''try:
    models.Base.metadata.create_all(bind=engine)
    from sqlalchemy import text
    with engine.begin() as conn:
        try: conn.execute(text("ALTER TABLE prospects ADD COLUMN is_contract BOOLEAN DEFAULT FALSE;"))
        except: pass
        try: conn.execute(text("ALTER TABLE prospects ADD COLUMN is_papelera BOOLEAN DEFAULT FALSE;"))
        except: pass
        try: conn.execute(text("ALTER TABLE prospects ADD COLUMN contract_date TIMESTAMP;"))
        except: pass
        try: conn.execute(text("ALTER TABLE prospects ADD COLUMN estimation_data VARCHAR;"))
        except: pass
except Exception as e:'''

# Try with \r\n
old_win = old.replace(b'\n', b'\r\n')
new_win = new.replace(b'\n', b'\r\n')

if old_win in content:
    content = content.replace(old_win, new_win, 1)
elif old in content:
    content = content.replace(old, new, 1)
else:
    print("NOT FOUND")
    sys.exit(1)

open('backend/main.py', 'wb').write(content)
print("SUCCESS")
