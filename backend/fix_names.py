import sys, os
os.chdir('D:/RDadmin/backend')
sys.path.insert(0, 'D:/RDadmin/backend')
from database import engine
from models import Template
from sqlalchemy.orm import Session

db = Session(bind=engine)
try:
    c = db.query(Template).filter(Template.name == 'Closet').first()
    if c:
        c.name = 'Cl\u00f3set'
        print('Closet -> Clóset OK')

    p = db.query(Template).filter(Template.name == 'Puerta Solida').first()
    if p:
        p.name = 'Puerta S\u00f3lida'
        print('Puerta Solida -> Puerta Sólida OK')

    db.commit()
    print('Nombres actualizados')
finally:
    db.close()
