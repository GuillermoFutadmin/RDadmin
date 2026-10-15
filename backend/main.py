from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime, timedelta
import models, os, shutil, uuid
import imagestore
import auth
from database import engine, get_db
import cloudinary
import cloudinary.uploader
import cloudinary.utils

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
    safe_alter("ALTER TABLE prospects ADD COLUMN production_data VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN render_applies BOOLEAN;")
    safe_alter("ALTER TABLE prospects ADD COLUMN render_price REAL;")
    safe_alter("ALTER TABLE prospects ADD COLUMN render_total_price REAL;")
    safe_alter("ALTER TABLE prospects ADD COLUMN render_image_path VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN render_pdf_path VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN render_pdf_data BYTEA;")
    safe_alter("ALTER TABLE prospects ADD COLUMN render_delivery_time VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN render_comments VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN project_timeline VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN contract_password VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN contract_signature_rep VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN contract_signature_client VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN contract_photo_rep VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN contract_photo_client VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN other_projects VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN updated_at TIMESTAMP;")
    safe_alter("UPDATE prospects SET updated_at = capture_date WHERE updated_at IS NULL;")
    safe_alter("ALTER TABLE users ADD COLUMN photo_path VARCHAR;")
except Exception as e:
    print(f"WARNING: No se pudo conectar a la base de datos al iniciar: {e}")
    print("   El servidor arrancará de todas formas. Verifica que PostgreSQL esté corriendo.")


UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="RDadmin API")

app.add_middleware(GZipMiddleware, minimum_size=1024)
app.middleware("http")(auth.auth_middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "https://futadmin.com.mx,https://www.futadmin.com.mx,http://localhost:5173,http://localhost:8000").split(",") if o.strip()],
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
async def migrate_images_on_startup():
    """Mueve a Cloudinary las imágenes base64 existentes (con respaldo previo)."""
    imagestore.start_background_migration()


@app.get("/api/admin/images-status")
def images_status(db: Session = Depends(get_db)):
    from sqlalchemy import text
    pending = db.execute(text("SELECT COUNT(*) FROM prospects WHERE estimation_data LIKE '%data:image%'")).scalar()
    backups = db.execute(text("SELECT COUNT(*) FROM prospects_images_backup")).scalar()
    return {"pending_base64_records": pending, "backup_rows": backups, "cloudinary": imagestore.cloudinary_ready()}


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
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"), headers={"Cache-Control": "no-cache"})
    
    @app.get("/")
    def serve_react_app():
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"), headers={"Cache-Control": "no-cache"})

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "ok"}


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
    other_projects: Optional[str] = None
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
    project_timeline: Optional[str] = None
    production_days: Optional[int] = None
    public_id: Optional[str] = None
    capture_date: Optional[datetime] = None
    updated_at: Optional[datetime] = None
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
    production_data: Optional[str] = None
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
    is_light: bool = False
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


class SupplierCreate(BaseModel):
    name: str
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class SupplierResponse(SupplierCreate):
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


@app.get("/api/suppliers", response_model=List[SupplierResponse])
def get_suppliers(db: Session = Depends(get_db)):
    return db.query(models.Supplier).order_by(models.Supplier.name).all()


@app.post("/api/suppliers", response_model=SupplierResponse)
def create_supplier(supplier: SupplierCreate, db: Session = Depends(get_db)):
    if not supplier.name.strip():
        raise HTTPException(status_code=422, detail="El nombre del proveedor es obligatorio")
    db_supplier = models.Supplier(**supplier.dict(exclude={"name"}), name=supplier.name.strip())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@app.put("/api/suppliers/{supplier_id}", response_model=SupplierResponse)
def update_supplier(supplier_id: int, supplier: SupplierCreate, db: Session = Depends(get_db)):
    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    if not supplier.name.strip():
        raise HTTPException(status_code=422, detail="El nombre del proveedor es obligatorio")
    for key, value in supplier.dict().items():
        setattr(db_supplier, key, value.strip() if key == "name" else value)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@app.get("/api/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    return {
        "sales_count": db.query(models.Sale).count(),
        "orders_count": db.query(models.Order).count(),
        "prospects_count": db.query(models.Prospect).count()
    }


# ── PROSPECTS ────────────────────────────────────────────────

# Campos con imágenes base64 que hacen pesadísimo el listado (varios MB).
HEAVY_PROSPECT_FIELDS = (
    "estimation_data", "contract_photo_rep", "contract_photo_client",
    "contract_signature_rep", "contract_signature_client",
)

@app.get("/api/prospects", response_model=List[ProspectResponse])
def get_prospects(light: bool = False, db: Session = Depends(get_db)):
    if not light:
        return db.query(models.Prospect).order_by(models.Prospect.capture_date.desc().nullslast(), models.Prospect.id.desc()).all()
    # Modo ligero: no se leen de la BD los campos pesados; estimation_data se
    # sustituye por un marcador para que los botones sigan sabiendo si existe.
    cols = [c for c in models.Prospect.__table__.columns if c.name not in HEAVY_PROSPECT_FIELDS]
    has_est = models.Prospect.estimation_data.isnot(None).label("_has_estimation")
    rows = db.query(*cols, has_est).order_by(models.Prospect.capture_date.desc().nullslast(), models.Prospect.id.desc()).all()
    result = []
    for row in rows:
        data = dict(row._mapping)
        has = data.pop("_has_estimation")
        data["estimation_data"] = '{"_light":true}' if has else None
        data["is_light"] = True
        result.append(ProspectResponse(**data))
    return result


@app.get("/api/prospects/{prospect_id}", response_model=ProspectResponse)
def get_prospect(prospect_id: int, db: Session = Depends(get_db)):
    db_prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not db_prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    return db_prospect


import string
import random

def generate_public_id():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@app.post("/api/prospects", response_model=ProspectResponse)
def create_prospect(prospect: ProspectCreate, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    # Protección anti-duplicados por doble clic: si se creó un prospecto con el mismo nombre y contacto en los últimos 20 segundos, retornar el existente
    if prospect.name and prospect.contact_info:
        recent_duplicate = (
            db.query(models.Prospect)
            .filter(
                models.Prospect.name == prospect.name.strip(),
                models.Prospect.contact_info == prospect.contact_info.strip(),
                models.Prospect.capture_date >= now - timedelta(seconds=20)
            )
            .order_by(models.Prospect.id.desc())
            .first()
        )
        if recent_duplicate:
            return recent_duplicate

    db_prospect = models.Prospect(**prospect.dict())
    db_prospect.public_id = generate_public_id()
    db_prospect.capture_date = now
    db_prospect.updated_at = now
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
        if key not in ['id', 'public_id', 'capture_date', 'updated_at']:
            if key == 'estimation_data' and isinstance(value, str) and 'data:image' in value:
                # Las fotos y croquis nuevos se guardan en Cloudinary; si fallan, se conserva el base64.
                value, _, _ = imagestore.externalize_json(value, prospect_id)
            setattr(db_prospect, key, value)
    db_prospect.updated_at = datetime.utcnow()
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
    ext = os.path.splitext(file.filename or "")[1].lower()
    unique_name = f"{prefix}_{uuid.uuid4()}{ext}"

    # Leer contenido del archivo primero (importante para evitar stream ya consumido)
    contents = await file.read()

    # Los PDFs se suben como resource_type="raw" para que Cloudinary los sirva
    # directamente sin la restricción de entrega de PDFs que aplica a image/upload.
    import io
    is_pdf = ext == ".pdf" or (file.content_type or "").lower() == "application/pdf"
    resource_type = "raw" if is_pdf else "auto"

    # Si Cloudinary está configurado, subimos ahí
    if CLOUDINARY_URL or (os.environ.get("CLOUDINARY_CLOUD_NAME") and os.environ.get("CLOUDINARY_API_KEY")):
        try:
            result = cloudinary.uploader.upload(
                io.BytesIO(contents),
                public_id=unique_name,
                folder="rdadmin",
                resource_type=resource_type,
            )
            return result.get("secure_url")
        except Exception as e:
            err_str = str(e)
            print(f"Error subiendo a Cloudinary: {err_str}")
            # Cloudinary rechaza archivos mayores a 10 MB en el plan gratuito
            if "File size too large" in err_str or "10485760" in err_str or "Maximum is" in err_str:
                raise HTTPException(
                    status_code=413,
                    detail=(
                        "El archivo es demasiado grande para Cloudinary (límite: 10 MB). "
                        "Comprima el PDF en ilovepdf.com y vuelva a intentarlo."
                    )
                )
            raise HTTPException(status_code=500, detail=f"Error en Cloudinary: {err_str}")

    # Fallback: guardar en disco local (carpeta /uploads)
    save_path = os.path.join(UPLOAD_DIR, unique_name)
    with open(save_path, "wb") as buffer:
        buffer.write(contents)
    return f"/uploads/{unique_name}"


@app.post("/api/prospects/{prospect_id}/production-evidence/{stage_index}")
async def upload_production_evidence(
    prospect_id: int,
    stage_index: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if stage_index < 0 or stage_index > 5:
        raise HTTPException(status_code=400, detail="Invalid production stage")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image evidence is allowed")

    prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    if not prospect.production_data:
        raise HTTPException(status_code=409, detail="Production has not been started")

    import json
    try:
        production = json.loads(prospect.production_data)
    except (TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=409, detail="Production data is invalid") from exc

    stages = production.get("stages")
    if isinstance(stages, list) and len(stages) == 7:
        legacy_stage = production.get("current_stage") or 0
        first_stage = stages[0]
        second_stage = stages[1]
        notes = [note for note in (first_stage.get("note"), second_stage.get("note")) if note]
        stages = [
            {
                **first_stage,
                "name": "Generando información",
                "entered_at": first_stage.get("entered_at") or production.get("started_at"),
                "note": "\n".join(notes),
                "photos": first_stage.get("photos", []) + second_stage.get("photos", []),
            },
            *stages[2:],
        ]
        production["current_stage"] = 0 if legacy_stage <= 1 else legacy_stage - 1
    if not isinstance(stages, list) or len(stages) != 6:
        raise HTTPException(status_code=409, detail="Production stages are invalid")

    stage_names = [
        "Generando información",
        "Preparación de materiales",
        "Producción iniciada",
        "Avance 1",
        "Avance 2 / revisión",
        "Entrega del proyecto",
    ]
    stages[0]["name"] = stage_names[0]
    for index, stage in enumerate(stages):
        stage["name"] = stage_names[index]
    production["stages"] = stages

    image_url = await upload_to_storage(file, f"production_{prospect_id}_{stage_index}")
    photos = stages[stage_index].setdefault("photos", [])
    photos.append({"url": image_url, "uploaded_at": datetime.utcnow().isoformat() + "Z"})
    prospect.production_data = json.dumps(production, ensure_ascii=False)
    prospect.updated_at = datetime.utcnow()
    db.commit()
    return {"image_path": image_url, "production_data": prospect.production_data}


@app.post("/api/prospects/{prospect_id}/week-photos")
async def upload_week_photo(
    prospect_id: int,
    week: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image evidence is allowed")

    prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    import json
    production = {}
    if prospect.production_data:
        try:
            production = json.loads(prospect.production_data)
        except Exception:
            production = {}

    image_url = await upload_to_storage(file, f"week_{prospect_id}_{week}")
    week_photos = production.setdefault("week_photos", [])
    photo_entry = {
        "id": str(uuid.uuid4()),
        "url": image_url,
        "week": week.strip(),
        "uploaded_at": datetime.utcnow().isoformat() + "Z",
        "published": True
    }
    week_photos.append(photo_entry)
    prospect.production_data = json.dumps(production, ensure_ascii=False)
    prospect.updated_at = datetime.utcnow()
    db.commit()
    return {"photo": photo_entry, "production_data": prospect.production_data}


@app.delete("/api/prospects/{prospect_id}/week-photos/{photo_id}")
def delete_week_photo(prospect_id: int, photo_id: str, db: Session = Depends(get_db)):
    prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    import json
    production = {}
    if prospect.production_data:
        try:
            production = json.loads(prospect.production_data)
        except Exception:
            production = {}

    week_photos = production.get("week_photos", [])
    production["week_photos"] = [p for p in week_photos if str(p.get("id")) != photo_id and p.get("url") != photo_id]
    prospect.production_data = json.dumps(production, ensure_ascii=False)
    prospect.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Foto eliminada", "production_data": prospect.production_data}


@app.put("/api/prospects/{prospect_id}/week-photos/{photo_id}/publish")
def toggle_publish_week_photo(prospect_id: int, photo_id: str, db: Session = Depends(get_db)):
    prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    import json
    production = {}
    if prospect.production_data:
        try:
            production = json.loads(prospect.production_data)
        except Exception:
            production = {}

    week_photos = production.get("week_photos", [])
    for p in week_photos:
        if str(p.get("id")) == photo_id or p.get("url") == photo_id:
            p["published"] = not p.get("published", True)

    prospect.production_data = json.dumps(production, ensure_ascii=False)
    prospect.updated_at = datetime.utcnow()
    db.commit()
    return {"production_data": prospect.production_data}


# ── AVANCES DIARIOS DE PRODUCCIÓN (CARPINTERÍA) ────────────────
@app.post("/api/prospects/{prospect_id}/daily-advances")
async def upload_daily_advance(
    prospect_id: int,
    date: str = Form(...),
    comment: str = Form(""),
    published: bool = Form(True),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos de imagen")

    prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    import json
    production = {}
    if prospect.production_data:
        try:
            production = json.loads(prospect.production_data)
        except Exception:
            production = {}

    clean_date = date.strip()[:10]
    image_url = await upload_to_storage(file, f"advance_{prospect_id}_{clean_date}")
    advances = production.setdefault("daily_advances", [])
    advance_entry = {
        "id": str(uuid.uuid4()),
        "date": clean_date,
        "url": image_url,
        "comment": comment.strip(),
        "published": bool(published),
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    advances.append(advance_entry)
    prospect.production_data = json.dumps(production, ensure_ascii=False)
    prospect.updated_at = datetime.utcnow()
    db.commit()
    return {"advance": advance_entry, "production_data": prospect.production_data}


@app.delete("/api/prospects/{prospect_id}/daily-advances/{advance_id}")
def delete_daily_advance(prospect_id: int, advance_id: str, db: Session = Depends(get_db)):
    prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    import json
    production = {}
    if prospect.production_data:
        try:
            production = json.loads(prospect.production_data)
        except Exception:
            production = {}

    advances = production.get("daily_advances", [])
    production["daily_advances"] = [a for a in advances if str(a.get("id")) != advance_id and a.get("url") != advance_id]
    prospect.production_data = json.dumps(production, ensure_ascii=False)
    prospect.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Avance eliminado", "production_data": prospect.production_data}


class DailyAdvanceUpdate(BaseModel):
    comment: Optional[str] = None
    published: Optional[bool] = None


@app.put("/api/prospects/{prospect_id}/daily-advances/{advance_id}")
def update_daily_advance(prospect_id: int, advance_id: str, data: DailyAdvanceUpdate, db: Session = Depends(get_db)):
    prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    import json
    production = {}
    if prospect.production_data:
        try:
            production = json.loads(prospect.production_data)
        except Exception:
            production = {}

    advances = production.get("daily_advances", [])
    updated = False
    for a in advances:
        if str(a.get("id")) == advance_id or a.get("url") == advance_id:
            if data.published is not None:
                a["published"] = data.published
            else:
                a["published"] = not a.get("published", True)
            if data.comment is not None:
                a["comment"] = data.comment
            updated = True

    if not updated:
        raise HTTPException(status_code=404, detail="Avance no encontrado")

    prospect.production_data = json.dumps(production, ensure_ascii=False)
    prospect.updated_at = datetime.utcnow()
    db.commit()
    return {"production_data": prospect.production_data}


@app.post("/api/prospects/{prospect_id}/upload-image")
async def upload_design_image(prospect_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not db_prospect: raise HTTPException(status_code=404, detail="Prospect not found")

    new_url = await upload_to_storage(file, "design")
    db_prospect.design_image_path = new_url
    db_prospect.updated_at = datetime.utcnow()
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
    db_prospect.updated_at = datetime.utcnow()
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
    db_prospect.updated_at = datetime.utcnow()
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
    db_prospect.updated_at = datetime.utcnow()
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
    if not db_prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    import io
    image_urls = []
    pdf_urls = []
    for file in files:
        contents = await file.read()
        filename_lower = (file.filename or "").lower()
        content_type = (file.content_type or "").lower()
        is_pdf = filename_lower.endswith(".pdf") or "pdf" in content_type

        if is_pdf:
            # 1. Guardar los bytes del PDF directamente en PostgreSQL (BYTEA)
            # Esto garantiza disponibilidad 100% permanente sin depender de restricciones de Cloudinary
            db_prospect.render_pdf_data = contents
            pdf_endpoint_url = f"/api/prospects/{prospect_id}/render-pdf"
            pdf_urls.append(pdf_endpoint_url)

            # Intentar también guardar en Cloudinary como respaldo si es posible
            try:
                temp_file = UploadFile(filename=file.filename, file=io.BytesIO(contents))
                cloud_url = await upload_to_storage(temp_file, "render")
                # Si sube bien a Cloudinary, mantenemos la referencia
                db_prospect.render_pdf_path = cloud_url
            except Exception as e:
                print(f"[upload-render] Respaldo Cloudinary omitido (archivo guardado en BD): {e}")
                db_prospect.render_pdf_path = pdf_endpoint_url
        else:
            temp_file = UploadFile(filename=file.filename, file=io.BytesIO(contents))
            new_url = await upload_to_storage(temp_file, "render")
            image_urls.append(new_url)

    if pdf_urls and not db_prospect.render_pdf_path:
        db_prospect.render_pdf_path = pdf_urls[-1]
    if image_urls:
        db_prospect.render_image_path = image_urls[-1]

    db_prospect.render_applies = True
    db_prospect.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_prospect)
    return {
        "image_path": db_prospect.render_image_path,
        "pdf_path": db_prospect.render_pdf_path,
        "render_applies": db_prospect.render_applies
    }


@app.get("/api/prospects/{prospect_id}/render-pdf")
async def stream_render_pdf(prospect_id: int, db: Session = Depends(get_db)):
    """Sirve el PDF del render.
    
    1. Si está guardado en PostgreSQL (render_pdf_data), se responde inmediatamente.
    2. Si es archivo local (/uploads/...), se transmite directamente.
    3. Si está en Cloudinary, se descarga y se respalda en la base de datos.
    """
    prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # 1. Directo desde la base de datos (PostgreSQL BYTEA)
    pdf_data = getattr(prospect, "render_pdf_data", None)
    if pdf_data:
        return Response(
            content=bytes(pdf_data),
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="render_{prospect_id}.pdf"'},
        )

    if not prospect.render_pdf_path:
        raise HTTPException(status_code=404, detail="Este proyecto no tiene render PDF")

    pdf_url = prospect.render_pdf_path

    # Si la URL apunta a este mismo endpoint pero no hay render_pdf_data
    if pdf_url == f"/api/prospects/{prospect_id}/render-pdf":
        raise HTTPException(status_code=404, detail="Render PDF no disponible. Por favor reemplace el render.")

    # 2. Archivo local
    if pdf_url.startswith("/uploads/"):
        local_path = pdf_url.lstrip("/")
        if not os.path.exists(local_path):
            raise HTTPException(status_code=404, detail="Archivo local no encontrado")
        def local_iter():
            with open(local_path, "rb") as f:
                yield from iter(lambda: f.read(65536), b"")
        return StreamingResponse(
            local_iter(),
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="render_{prospect_id}.pdf"'},
        )

    # 3. Cloudinary
    if "cloudinary.com" in pdf_url:
        import httpx
        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
                resp = await client.get(pdf_url)
                if resp.status_code == 200:
                    # Guardarlo en la base de datos para futuras consultas
                    try:
                        prospect.render_pdf_data = resp.content
                        db.commit()
                    except Exception as cache_err:
                        print(f"[render-pdf] Error guardando cache en BD: {cache_err}")
                    return Response(
                        content=resp.content,
                        media_type="application/pdf",
                        headers={"Content-Disposition": f'inline; filename="render_{prospect_id}.pdf"'},
                    )
                print(f"[render-pdf] Cloudinary retornó {resp.status_code} al solicitar {pdf_url[:60]}...")
        except Exception as exc:
            print(f"[render-pdf] Error de red al solicitar Cloudinary: {exc}")

        raise HTTPException(
            status_code=502,
            detail="El archivo PDF anterior está restringido por Cloudinary. Por favor use el botón 'Reemplazar Render' para cargarlo directamente al sistema."
        )

    raise HTTPException(
        status_code=404,
        detail="PDF de render no encontrado. Suba el render nuevamente."
    )


@app.get("/api/client-portal/{public_id}/render-pdf")
async def client_portal_stream_render_pdf(public_id: str, db: Session = Depends(get_db)):
    """Permite al portal de clientes consultar y descargar el PDF del render directamente."""
    pid = public_id.strip().upper()
    prospect = db.query(models.Prospect).filter(models.Prospect.public_id == pid).first()
    if not prospect:
        from sqlalchemy import func
        prospect = db.query(models.Prospect).filter(func.upper(func.trim(models.Prospect.public_id)) == pid).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    pdf_data = getattr(prospect, "render_pdf_data", None)
    if pdf_data:
        return Response(
            content=bytes(pdf_data),
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="render_{pid}.pdf"'},
        )

    if not prospect.render_pdf_path:
        raise HTTPException(status_code=404, detail="Este proyecto no tiene render PDF")

    pdf_url = prospect.render_pdf_path
    if pdf_url.startswith("/uploads/"):
        local_path = pdf_url.lstrip("/")
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                return Response(
                    content=f.read(),
                    media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="render_{pid}.pdf"'},
                )

    if "cloudinary.com" in pdf_url:
        import httpx
        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
                resp = await client.get(pdf_url)
                if resp.status_code == 200:
                    return Response(
                        content=resp.content,
                        media_type="application/pdf",
                        headers={"Content-Disposition": f'inline; filename="render_{pid}.pdf"'},
                    )
        except Exception:
            pass

    raise HTTPException(status_code=404, detail="Render PDF no disponible")



@app.post("/api/users/{user_id}/upload-photo")
async def upload_user_photo(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user: raise HTTPException(status_code=404, detail="User not found")
    new_url = await upload_to_storage(file, "user_photo")
    db_user.photo_path = new_url
    db.commit()
    db.refresh(db_user)
    return {"photo_path": db_user.photo_path}
