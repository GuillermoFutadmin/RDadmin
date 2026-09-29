import sys, json
import os

# Conectar directo a la DB sin HTTP
from database import engine, get_db
from models import Base, Template
from sqlalchemy.orm import Session

Base.metadata.create_all(bind=engine)

TEMPLATES = {
    'Cocina': {
        'materiales': [
            {'id': 1, 'desc': 'Madera MDF 15mm', 'price': 450, 'unit': 'm2'},
            {'id': 2, 'desc': 'Madera MDF 18mm', 'price': 520, 'unit': 'm2'},
            {'id': 3, 'desc': 'Melanina', 'price': 380, 'unit': 'm2'},
            {'id': 4, 'desc': 'Bisagras', 'price': 35, 'unit': 'pza'},
            {'id': 5, 'desc': 'Corredera telescopica', 'price': 120, 'unit': 'par'},
            {'id': 6, 'desc': 'Jaladera', 'price': 55, 'unit': 'pza'},
            {'id': 7, 'desc': 'Tornillos y herrajes', 'price': 200, 'unit': 'pza'},
            {'id': 8, 'desc': 'Pegamento', 'price': 180, 'unit': 'litro'},
            {'id': 9, 'desc': 'Sellador', 'price': 220, 'unit': 'litro'},
            {'id': 10, 'desc': 'Pintura', 'price': 280, 'unit': 'litro'},
        ],
        'mano_obra': [
            {'id': 11, 'desc': 'Carpintero', 'price': 800, 'unit': 'dia'},
            {'id': 12, 'desc': 'Ayudante', 'price': 400, 'unit': 'dia'},
            {'id': 13, 'desc': 'Pintor', 'price': 600, 'unit': 'dia'},
            {'id': 14, 'desc': 'Instalacion/Traslado', 'price': 500, 'unit': 'dia'},
        ],
        'conceptos': [
            {'id': 15, 'desc': 'Taller/Renta', 'price': 300, 'unit': 'dia'},
            {'id': 16, 'desc': 'Luz', 'price': 50, 'unit': 'dia'},
            {'id': 17, 'desc': 'Agua', 'price': 30, 'unit': 'dia'},
            {'id': 18, 'desc': 'Gasolina', 'price': 150, 'unit': 'dia'},
            {'id': 19, 'desc': 'Herramienta', 'price': 100, 'unit': 'dia'},
        ],
    },
    'Closet': {
        'materiales': [
            {'id': 1, 'desc': 'Madera MDF 15mm', 'price': 450, 'unit': 'm2'},
            {'id': 2, 'desc': 'Madera MDF 18mm', 'price': 520, 'unit': 'm2'},
            {'id': 3, 'desc': 'Melanina', 'price': 380, 'unit': 'm2'},
            {'id': 4, 'desc': 'Riel para cajones', 'price': 90, 'unit': 'par'},
            {'id': 5, 'desc': 'Bisagras', 'price': 35, 'unit': 'pza'},
            {'id': 6, 'desc': 'Jaladera', 'price': 55, 'unit': 'pza'},
            {'id': 7, 'desc': 'Tornillos y herrajes', 'price': 200, 'unit': 'pza'},
            {'id': 8, 'desc': 'Pegamento', 'price': 180, 'unit': 'litro'},
        ],
        'mano_obra': [
            {'id': 11, 'desc': 'Carpintero', 'price': 800, 'unit': 'dia'},
            {'id': 12, 'desc': 'Ayudante', 'price': 400, 'unit': 'dia'},
            {'id': 13, 'desc': 'Pintor', 'price': 600, 'unit': 'dia'},
            {'id': 14, 'desc': 'Instalacion/Traslado', 'price': 500, 'unit': 'dia'},
        ],
        'conceptos': [
            {'id': 15, 'desc': 'Taller/Renta', 'price': 300, 'unit': 'dia'},
            {'id': 16, 'desc': 'Luz', 'price': 50, 'unit': 'dia'},
            {'id': 17, 'desc': 'Agua', 'price': 30, 'unit': 'dia'},
            {'id': 18, 'desc': 'Gasolina', 'price': 150, 'unit': 'dia'},
            {'id': 19, 'desc': 'Herramienta', 'price': 100, 'unit': 'dia'},
        ],
    },
    'Puerta Solida': {
        'materiales': [
            {'id': 1, 'desc': 'Madera maciza', 'price': 850, 'unit': 'm2'},
            {'id': 2, 'desc': 'Chapa/Cerradura', 'price': 350, 'unit': 'pza'},
            {'id': 3, 'desc': 'Bisagras 3.5 pulgadas', 'price': 65, 'unit': 'pza'},
            {'id': 4, 'desc': 'Sellador', 'price': 220, 'unit': 'litro'},
            {'id': 5, 'desc': 'Barniz', 'price': 310, 'unit': 'litro'},
            {'id': 6, 'desc': 'Lija', 'price': 45, 'unit': 'pza'},
            {'id': 7, 'desc': 'Tornillos y herrajes', 'price': 200, 'unit': 'pza'},
        ],
        'mano_obra': [
            {'id': 11, 'desc': 'Carpintero', 'price': 800, 'unit': 'dia'},
            {'id': 12, 'desc': 'Ayudante', 'price': 400, 'unit': 'dia'},
            {'id': 13, 'desc': 'Pintor', 'price': 600, 'unit': 'dia'},
            {'id': 14, 'desc': 'Instalacion/Traslado', 'price': 500, 'unit': 'dia'},
        ],
        'conceptos': [
            {'id': 15, 'desc': 'Taller/Renta', 'price': 300, 'unit': 'dia'},
            {'id': 16, 'desc': 'Luz', 'price': 50, 'unit': 'dia'},
            {'id': 17, 'desc': 'Agua', 'price': 30, 'unit': 'dia'},
            {'id': 18, 'desc': 'Gasolina', 'price': 150, 'unit': 'dia'},
            {'id': 19, 'desc': 'Herramienta', 'price': 100, 'unit': 'dia'},
        ],
    },
    'Puerta Tambor': {
        'materiales': [
            {'id': 1, 'desc': 'Madera MDF 15mm', 'price': 450, 'unit': 'm2'},
            {'id': 2, 'desc': 'Alma de madera (tablas)', 'price': 280, 'unit': 'm2'},
            {'id': 3, 'desc': 'Chapa/Cerradura', 'price': 280, 'unit': 'pza'},
            {'id': 4, 'desc': 'Bisagras 3.5 pulgadas', 'price': 65, 'unit': 'pza'},
            {'id': 5, 'desc': 'Cola blanca', 'price': 150, 'unit': 'litro'},
            {'id': 6, 'desc': 'Sellador', 'price': 220, 'unit': 'litro'},
            {'id': 7, 'desc': 'Pintura', 'price': 280, 'unit': 'litro'},
            {'id': 8, 'desc': 'Tornillos y herrajes', 'price': 200, 'unit': 'pza'},
        ],
        'mano_obra': [
            {'id': 11, 'desc': 'Carpintero', 'price': 800, 'unit': 'dia'},
            {'id': 12, 'desc': 'Ayudante', 'price': 400, 'unit': 'dia'},
            {'id': 13, 'desc': 'Pintor', 'price': 600, 'unit': 'dia'},
            {'id': 14, 'desc': 'Instalacion/Traslado', 'price': 500, 'unit': 'dia'},
        ],
        'conceptos': [
            {'id': 15, 'desc': 'Taller/Renta', 'price': 300, 'unit': 'dia'},
            {'id': 16, 'desc': 'Luz', 'price': 50, 'unit': 'dia'},
            {'id': 17, 'desc': 'Agua', 'price': 30, 'unit': 'dia'},
            {'id': 18, 'desc': 'Gasolina', 'price': 150, 'unit': 'dia'},
            {'id': 19, 'desc': 'Herramienta', 'price': 100, 'unit': 'dia'},
        ],
    },
}

db = Session(bind=engine)
try:
    for name, data in TEMPLATES.items():
        existing = db.query(Template).filter(Template.name == name).first()
        data_str = json.dumps(data)
        if existing:
            existing.data = data_str
            print(f'Actualizado: {name}')
        else:
            db.add(Template(name=name, data=data_str))
            print(f'Creado: {name}')
    db.commit()
    print('LISTO - todos los machotes sembrados correctamente')
finally:
    db.close()
