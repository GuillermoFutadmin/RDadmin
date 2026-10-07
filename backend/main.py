from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import models, os, shutil, uuid
from database import engine, get_db
import cloudinary
import cloudinary.uploader

# Cloudinary: el SDK lee CLOUDINARY_URL del entorno automáticamente al importar.
# NO llamar cloudinary.config() cuando CLOUDINARY_URL ya está en el env —
# hacerlo sobreescribe las credenciales y causa Invalid Signature.
CLOUDINARY_URL = os.environ.get("CLOUDINARY_URL")

try:
    models.Base.metadata.create_all(bind=engine)
    from sqlalchemy import text
    
    def safe_alter(sql):
        try:
            with engine.begin() as conn:
                conn.execute(text(sql))
        except:
            pass

    safe_alter("ALTER TABLE prospects ADD COLUMN is_contract BOOLEAN DEFAULT FALSE;")
    safe_alter("ALTER TABLE prospects ADD COLUMN is_papelera BOOLEAN DEFAULT FALSE;")
    safe_alter("ALTER TABLE prospects ADD COLUMN papelera_reason VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN contract_date TIMESTAMP;")
    safe_alter("ALTER TABLE prospects ADD COLUMN estimation_data VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN render_applies BOOLEAN;")
    safe_alter("ALTER TABLE prospects ADD COLUMN render_price REAL;")
    safe_alter("ALTER TABLE prospects ADD COLUMN render_total_price REAL;")
    safe_alter("ALTER TABLE prospects ADD COLUMN render_image_path VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN render_pdf_path VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN render_delivery_time VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN render_comments VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN contract_password VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN contract_signature_rep VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN contract_signature_client VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN contract_photo_rep VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN contract_photo_client VARCHAR;")
    safe_alter("ALTER TABLE users ADD COLUMN photo_path VARCHAR;")
except Exception as e:
    print(f"WARNING: No se pudo conectar a la base de datos al iniciar: {e}")
    print("   El servidor arrancará de todas formas. Verifica que PostgreSQL esté corriendo.")


UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="RDadmin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import users
import collaborators
import store
app.include_router(users.router)
app.include_router(collaborators.router)
app.include_router(store.router)

@app.on_event("startup")
async def seed_on_startup():
    """Siembra los machotes automáticamente si la base de datos está vacía."""
    try:
        import json
        from sqlalchemy.orm import Session
        db = Session(bind=models.engine if hasattr(models, 'engine') else __import__('database').engine)
        from database import engine as _engine
        db = Session(bind=_engine)
        from models import Template
        if db.query(Template).count() == 0:
            TEMPLATES = {
                'Cocina': {'materiales': [{'id':1,'desc':'Madera MDF 15mm','price':450,'unit':'m2'},{'id':2,'desc':'Madera MDF 18mm','price':520,'unit':'m2'},{'id':3,'desc':'Melanina','price':380,'unit':'m2'},{'id':4,'desc':'Bisagras','price':35,'unit':'pza'},{'id':5,'desc':'Corredera telescopica','price':120,'unit':'par'},{'id':6,'desc':'Jaladera','price':55,'unit':'pza'},{'id':7,'desc':'Tornillos y herrajes','price':200,'unit':'pza'},{'id':8,'desc':'Pegamento','price':180,'unit':'litro'},{'id':9,'desc':'Sellador','price':220,'unit':'litro'},{'id':10,'desc':'Pintura','price':280,'unit':'litro'}],'mano_obra':[{'id':11,'desc':'Carpintero','price':800,'unit':'dia'},{'id':12,'desc':'Ayudante','price':400,'unit':'dia'},{'id':13,'desc':'Pintor','price':600,'unit':'dia'},{'id':14,'desc':'Instalacion/Traslado','price':500,'unit':'dia'}],'conceptos':[{'id':15,'desc':'Taller/Renta','price':300,'unit':'dia'},{'id':16,'desc':'Luz','price':50,'unit':'dia'},{'id':17,'desc':'Agua','price':30,'unit':'dia'},{'id':18,'desc':'Gasolina','price':150,'unit':'dia'},{'id':19,'desc':'Herramienta','price':100,'unit':'dia'}]},
                'Closet': {'materiales': [{'id':1,'desc':'Madera MDF 15mm','price':450,'unit':'m2'},{'id':2,'desc':'Madera MDF 18mm','price':520,'unit':'m2'},{'id':3,'desc':'Melanina','price':380,'unit':'m2'},{'id':4,'desc':'Riel para cajones','price':90,'unit':'par'},{'id':5,'desc':'Bisagras','price':35,'unit':'pza'},{'id':6,'desc':'Jaladera','price':55,'unit':'pza'},{'id':7,'desc':'Tornillos y herrajes','price':200,'unit':'pza'},{'id':8,'desc':'Pegamento','price':180,'unit':'litro'}],'mano_obra':[{'id':11,'desc':'Carpintero','price':800,'unit':'dia'},{'id':12,'desc':'Ayudante','price':400,'unit':'dia'},{'id':13,'desc':'Pintor','price':600,'unit':'dia'},{'id':14,'desc':'Instalacion/Traslado','price':500,'unit':'dia'}],'conceptos':[{'id':15,'desc':'Taller/Renta','price':300,'unit':'dia'},{'id':16,'desc':'Luz','price':50,'unit':'dia'},{'id':17,'desc':'Agua','price':30,'unit':'dia'},{'id':18,'desc':'Gasolina','price':150,'unit':'dia'},{'id':19,'desc':'Herramienta','price':100,'unit':'dia'}]},
                'Puerta Solida': {'materiales': [{'id':1,'desc':'Madera maciza','price':850,'unit':'m2'},{'id':2,'desc':'Chapa/Cerradura','price':350,'unit':'pza'},{'id':3,'desc':'Bisagras 3.5 pulgadas','price':65,'unit':'pza'},{'id':4,'desc':'Sellador','price':220,'unit':'litro'},{'id':5,'desc':'Barniz','price':310,'unit':'litro'},{'id':6,'desc':'Lija','price':45,'unit':'pza'},{'id':7,'desc':'Tornillos y herrajes','price':200,'unit':'pza'}],'mano_obra':[{'id':11,'desc':'Carpintero','price':800,'unit':'dia'},{'id':12,'desc':'Ayudante','price':400,'unit':'dia'},{'id':13,'desc':'Pintor','price':600,'unit':'dia'},{'id':14,'desc':'Instalacion/Traslado','price':500,'unit':'dia'}],'conceptos':[{'id':15,'desc':'Taller/Renta','price':300,'unit':'dia'},{'id':16,'desc':'Luz','price':50,'unit':'dia'},{'id':17,'desc':'Agua','price':30,'unit':'dia'},{'id':18,'desc':'Gasolina','price':150,'unit':'dia'},{'id':19,'desc':'Herramienta','price':100,'unit':'dia'}]},
                'Puerta Tambor': {'materiales': [{'id':1,'desc':'Madera MDF 15mm','price':450,'unit':'m2'},{'id':2,'desc':'Alma de madera (tablas)','price':280,'unit':'m2'},{'id':3,'desc':'Chapa/Cerradura','price':280,'unit':'pza'},{'id':4,'desc':'Bisagras 3.5 pulgadas','price':65,'unit':'pza'},{'id':5,'desc':'Cola blanca','price':150,'unit':'litro'},{'id':6,'desc':'Sellador','price':220,'unit':'litro'},{'id':7,'desc':'Pintura','price':280,'unit':'litro'},{'id':8,'desc':'Tornillos y herrajes','price':200,'unit':'pza'}],'mano_obra':[{'id':11,'desc':'Carpintero','price':800,'unit':'dia'},{'id':12,'desc':'Ayudante','price':400,'unit':'dia'},{'id':13,'desc':'Pintor','price':600,'unit':'dia'},{'id':14,'desc':'Instalacion/Traslado','price':500,'unit':'dia'}],'conceptos':[{'id':15,'desc':'Taller/Renta','price':300,'unit':'dia'},{'id':16,'desc':'Luz','price':50,'unit':'dia'},{'id':17,'desc':'Agua','price':30,'unit':'dia'},{'id':18,'desc':'Gasolina','price':150,'unit':'dia'},{'id':19,'desc':'Herramienta','price':100,'unit':'dia'}]},
            }
            for name, data in TEMPLATES.items():
                db.add(Template(name=name, data=json.dumps(data)))
            db.commit()
            print("✅ Machotes sembrados automáticamente")
        db.close()
    except Exception as e:
        print(f"⚠️ Error al sembrar machotes: {e}")


# Serve uploaded images as static files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "../frontend/dist")

if os.path.exists(FRONTEND_DIST):
    # Mount assets normally just in case
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")
    
    @app.exception_handler(404)
    async def not_found_handler(request, exc):
        if request.url.path.startswith("/api/"):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        # Check if it's a file request that might exist in dist (like /melaminas/espiga.jpg)
        file_path = os.path.join(FRONTEND_DIST, request.url.path.lstrip("/"))
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # Fallback to index.html for SPA routing
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
    
    @app.get("/")
    def serve_react_app():
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))


class ProspectCreate(BaseModel):
    name: Optional[str] = None
    project_type: Optional[str] = None
    project_type_other: Optional[str] = None
    restoration_details: Optional[str] = None
    kitchen_layout: Optional[str] = None
    kitchen_addons: Optional[str] = None
    closet_layout: Optional[str] = None
    closet_addons: Optional[str] = None
    kitchen_measurements: Optional[str] = None
    kitchen_island_measurements: Optional[str] = None
    kitchen_peninsula_measurements: Optional[str] = None
    closet_measurements: Optional[str] = None
    closet_island_measurements: Optional[str] = None
    closet_vanity_measurements: Optional[str] = None
    door_solid_measurements: Optional[str] = None
    door_tambor_measurements: Optional[str] = None
    restoration_measurements: Optional[str] = None
    other_measurements: Optional[str] = None
    contact_info: Optional[str] = None
    location: Optional[str] = None
    project_priorities: Optional[str] = None
    expectations: Optional[str] = None
    has_design: bool = False
    design_details: Optional[str] = None
    measurements: Optional[str] = None
    hardware_details: Optional[str] = None
    start_date: Optional[date] = None
    delivery_date: Optional[date] = None
    material_type: Optional[str] = None
    material_type_2: Optional[str] = None
    furniture_color: Optional[str] = None

    interior_color_type: Optional[str] = None
    interior_color_code: Optional[str] = None
    exterior_inf_color_type: Optional[str] = None
    exterior_inf_color_code: Optional[str] = None
    exterior_sup_color_type: Optional[str] = None
    exterior_sup_color_code: Optional[str] = None
    estimated_price: Optional[str] = None
    production_days: Optional[int] = None
    public_id: Optional[str] = None
    capture_date: Optional[datetime] = None
    countertop_type: Optional[str] = None
    inhabited_house: Optional[str] = None
    how_found: Optional[str] = None
    valuation_data: Optional[str] = None
    space_image_path: Optional[str] = None
    reference_image_path: Optional[str] = None
    has_quote: bool = False
    status: Optional[str] = None
    is_contract: bool = False
    is_papelera: bool = False
    papelera_reason: Optional[str] = None
    contract_date: Optional[datetime] = None
    estimation_data: Optional[str] = None
    quote_saludo: Optional[str] = None
    quote_title: Optional[str] = None
    quote_description: Optional[str] = None
    quote_total_price: Optional[str] = None
    quote_delivery_time: Optional[str] = None
    quote_validez: Optional[str] = None
    quote_anticipo: Optional[str] = None
    quote_image_1: Optional[str] = None
    quote_image_2: Optional[str] = None
    quote_image_3: Optional[str] = None
    quote_image_4: Optional[str] = None
    render_applies: Optional[bool] = None
    render_price: Optional[float] = None
    render_total_price: Optional[float] = None
    render_image_path: Optional[str] = None
    render_pdf_path: Optional[str] = None
    render_delivery_time: Optional[str] = None
    render_comments: Optional[str] = None
    contract_password: Optional[str] = None
    contract_signature_rep: Optional[str] = None
    contract_signature_client: Optional[str] = None
    contract_photo_rep: Optional[str] = None
    contract_photo_client: Optional[str] = None

class ProspectUpdate(ProspectCreate):
    pass

class ProspectResponse(ProspectCreate):
    id: int
    status: Optional[str] = 'Prospecto'
    design_image_path: Optional[str] = None
    space_image_path: Optional[str] = None
    reference_image_path: Optional[str] = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.strftime('%Y-%m-%dT%H:%M:%S') + 'Z'
        }


class TemplateCreate(BaseModel):
    name: str
    data: str

class TemplateResponse(TemplateCreate):
    id: int
    class Config:
        from_attributes = True


@app.get("/")
def read_root():
    return {"message": "Welcome to RDadmin API"}

# --- Templates Endpoints ---

@app.get("/api/templates/", response_model=List[TemplateResponse])
def get_templates(db: Session = Depends(get_db)):
    return db.query(models.Template).all()

@app.put("/api/templates/{name}", response_model=TemplateResponse)
def update_template(name: str, template: TemplateCreate, db: Session = Depends(get_db)):
    db_template = db.query(models.Template).filter(models.Template.name == name).first()
    if db_template:
        db_template.data = template.data
        db.commit()
        db.refresh(db_template)
        return db_template
    else:
        new_template = models.Template(name=name, data=template.data)
        db.add(new_template)
        db.commit()
        db.refresh(new_template)
        return new_template

@app.delete("/api/templates/{name}")
def delete_template(name: str, db: Session = Depends(get_db)):
    db_template = db.query(models.Template).filter(models.Template.name == name).first()
    if not db_template:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(db_template)
    db.commit()
    return {"ok": True}


@app.get("/api/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    return {
        "sales_count": db.query(models.Sale).count(),
        "orders_count": db.query(models.Order).count(),
        "prospects_count": db.query(models.Prospect).count()
    }


# ── PROSPECTS ────────────────────────────────────────────────

@app.get("/api/prospects", response_model=List[ProspectResponse])
def get_prospects(db: Session = Depends(get_db)):
    return db.query(models.Prospect).all()


import string
import random

def generate_public_id():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@app.post("/api/prospects", response_model=ProspectResponse)
def create_prospect(prospect: ProspectCreate, db: Session = Depends(get_db)):
    db_prospect = models.Prospect(**prospect.dict())
    db_prospect.public_id = generate_public_id()
    db_prospect.capture_date = datetime.utcnow()
    db.add(db_prospect)
    db.commit()
    db.refresh(db_prospect)
    return db_prospect


@app.put("/api/prospects/{prospect_id}", response_model=ProspectResponse)
def update_prospect(prospect_id: int, prospect: ProspectUpdate, db: Session = Depends(get_db)):
    db_prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not db_prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    for key, value in prospect.dict(exclude_unset=True).items():
        # Prevent overriding read-only fields on update if they happen to be in the payload
        if key not in ['id', 'public_id', 'capture_date']:
            setattr(db_prospect, key, value)
    db.commit()
    db.refresh(db_prospect)
    return db_prospect


@app.delete("/api/prospects/{prospect_id}")
def delete_prospect(prospect_id: int, db: Session = Depends(get_db)):
    db_prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not db_prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    # Delete image file if exists
    if db_prospect.design_image_path:
        file_path = db_prospect.design_image_path.replace("/uploads/", f"{UPLOAD_DIR}/")
        if os.path.exists(file_path):
            os.remove(file_path)
    db.delete(db_prospect)
    db.commit()
    return {"message": "Prospect deleted successfully"}


async def upload_to_storage(file: UploadFile, prefix: str) -> str:
    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{prefix}_{uuid.uuid4()}{ext}"
    
    # Leer contenido del archivo primero (importante para evitar stream ya consumido)
    contents = await file.read()

    # Si Cloudinary está configurado, subimos ahí
    if CLOUDINARY_URL or (os.environ.get("CLOUDINARY_CLOUD_NAME") and os.environ.get("CLOUDINARY_API_KEY")):
        try:
            import io
            result = cloudinary.uploader.upload(io.BytesIO(contents), public_id=unique_name, folder="rdadmin", resource_type="auto")
            return result.get("secure_url")
        except Exception as e:
            print(f"Error subiendo a Cloudinary: {e}")
            raise HTTPException(status_code=500, detail=f"Error en Cloudinary: {str(e)}")
            
    # Fallback: guardar en disco local (carpeta /uploads)
    save_path = os.path.join(UPLOAD_DIR, unique_name)
    with open(save_path, "wb") as buffer:
        buffer.write(contents)
    return f"/uploads/{unique_name}"


@app.post("/api/prospects/{prospect_id}/upload-image")
async def upload_design_image(prospect_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not db_prospect: raise HTTPException(status_code=404, detail="Prospect not found")

    new_url = await upload_to_storage(file, "design")
    db_prospect.design_image_path = new_url
    db.commit()
    db.refresh(db_prospect)
    return {"image_path": db_prospect.design_image_path}

@app.post("/api/prospects/{prospect_id}/upload-space-image")
async def upload_space_image(prospect_id: int, files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    db_prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not db_prospect: raise HTTPException(status_code=404, detail="Prospect not found")

    urls = []
    for file in files:
        new_url = await upload_to_storage(file, "space")
        urls.append(new_url)
        
    db_prospect.space_image_path = ",".join(urls)
    db.commit()
    db.refresh(db_prospect)
    return {"image_path": db_prospect.space_image_path}

@app.post("/api/prospects/{prospect_id}/upload-reference-image")
async def upload_reference_image(prospect_id: int, files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    db_prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not db_prospect: raise HTTPException(status_code=404, detail="Prospect not found")

    urls = []
    for file in files:
        new_url = await upload_to_storage(file, "ref")
        urls.append(new_url)
        
    db_prospect.reference_image_path = ",".join(urls)
    if not db_prospect.design_image_path and urls:
        db_prospect.design_image_path = urls[0]
    db.commit()
    db.refresh(db_prospect)
    return {"image_path": db_prospect.reference_image_path}

@app.post("/api/prospects/{prospect_id}/upload-quote-image/{index}")
async def upload_quote_image(prospect_id: int, index: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if index < 1 or index > 4: raise HTTPException(status_code=400, detail="Invalid image index")
    db_prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not db_prospect: raise HTTPException(status_code=404, detail="Prospect not found")

    new_url = await upload_to_storage(file, f"quote_{index}")
    attr_name = f"quote_image_{index}"
    setattr(db_prospect, attr_name, new_url)
    db.commit()
    db.refresh(db_prospect)
    return {"image_path": getattr(db_prospect, attr_name)}

# ── COLABORADORES (Módulo aislado e independiente) ───────────
try:
    from collaborators import router as collaborators_router
    app.include_router(collaborators_router)
except Exception as e:
    print(f"Error cargando módulo de colaboradores: {e}")

@app.get("/api/debug/cloudinary")
def debug_cloudinary():
    import os
    return {
        "url_set": bool(os.environ.get("CLOUDINARY_URL")),
        "cloud_name_set": bool(os.environ.get("CLOUDINARY_CLOUD_NAME")),
        "api_key_set": bool(os.environ.get("CLOUDINARY_API_KEY"))
    }

@app.post("/api/prospects/{prospect_id}/upload-render")
async def upload_render_file(prospect_id: int, files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    db_prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not db_prospect: raise HTTPException(status_code=404, detail="Prospect not found")

    urls = []
    for file in files:
        new_url = await upload_to_storage(file, "render")
        urls.append(new_url)

    db_prospect.render_image_path = ",".join(urls)
    db.commit()
    db.refresh(db_prospect)
    return {"image_path": db_prospect.render_image_path}

@app.post("/api/users/{user_id}/upload-photo")
async def upload_user_photo(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user: raise HTTPException(status_code=404, detail="User not found")
    new_url = await upload_to_storage(file, "user_photo")
    db_user.photo_path = new_url
    db.commit()
    db.refresh(db_user)
    return {"photo_path": db_user.photo_path}
