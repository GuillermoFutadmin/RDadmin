from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime, timedelta
import json, models, os, shutil, uuid
import imagestore
import auth
from web_security import security_headers
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
    safe_alter("ALTER TABLE prospects ADD COLUMN contract_work_item_ids VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN work_flow VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN source_prospect_id INTEGER;")
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
    safe_alter("ALTER TABLE prospects ADD COLUMN portal_access_active BOOLEAN DEFAULT TRUE;")
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
app.middleware("http")(security_headers)

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
async def run_db_migrations():
    """Ejecuta migraciones críticas de base de datos de manera garantizada."""
    from sqlalchemy import text
    statements = [
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS is_contract BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS contract_date TIMESTAMP;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS render_applies BOOLEAN;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS render_price REAL;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS render_total_price REAL;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS render_image_path VARCHAR;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS render_pdf_path VARCHAR;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS render_pdf_data BYTEA;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS other_projects VARCHAR;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS production_days INTEGER;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS contract_work_item_ids VARCHAR;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS work_flow VARCHAR;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS source_prospect_id INTEGER;"
    ]
    for sql in statements:
        try:
            with engine.begin() as conn:
                conn.execute(text(sql))
        except Exception as e:
            print(f"[migration] {sql[:45]}: {e}")

    # Otorgar permisos al rol de portal de cliente (rdadmin_client_portal u otros)
    grant_sqls = [
        "GRANT SELECT ON prospects TO rdadmin_client_portal;",
        "GRANT SELECT (render_pdf_path, render_image_path, render_applies, render_pdf_data, other_projects, production_days) ON prospects TO rdadmin_client_portal;",
        """
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN SELECT rolname FROM pg_roles WHERE rolname NOT LIKE 'pg_%' AND rolname != current_user LOOP
                BEGIN
                    EXECUTE format('GRANT SELECT ON prospects TO %I', r.rolname);
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END LOOP;
        END $$;
        """
    ]
    for gsql in grant_sqls:
        try:
            with engine.begin() as conn:
                conn.execute(text(gsql))
            print(f"[migration] GRANT ejecutado")
        except Exception as ge:
            print(f"[migration] Aviso GRANT: {ge}")

    # Sincronizar render_pdf_path hacia production_data (accesible sin restricciones de columna)
    try:
        from database import SessionLocal
        with SessionLocal() as s:
            rows = s.query(models.Prospect).filter(
                (models.Prospect.render_pdf_path.isnot(None)) | (models.Prospect.render_image_path.isnot(None))
            ).all()
            for p in rows:
                p_dict = {}
                if p.production_data:
                    try:
                        p_dict = json.loads(p.production_data)
                    except Exception:
                        p_dict = {}
                if not isinstance(p_dict, dict):
                    p_dict = {}
                dirty = False
                if p.render_pdf_path and p_dict.get("render_pdf_path") != p.render_pdf_path:
                    p_dict["render_pdf_path"] = p.render_pdf_path
                    dirty = True
                if p.render_image_path and p_dict.get("render_image_path") != p.render_image_path:
                    p_dict["render_image_path"] = p.render_image_path
                    dirty = True
                if dirty:
                    p_dict["render_applies"] = True
                    p.production_data = json.dumps(p_dict, ensure_ascii=False)
            s.commit()
            print(f"[migration] Sincronizados renders hacia production_data")
    except Exception as se:
        print(f"[migration] Aviso sincronización production_data: {se}")

    # Sincronizar stage en los avances diarios existentes que no tengan stage asignado
    try:
        from database import SessionLocal
        with SessionLocal() as s:
            rows = s.query(models.Prospect).filter(models.Prospect.production_data.isnot(None)).all()
            updated_adv = 0
            for p in rows:
                p_dict = {}
                try:
                    p_dict = json.loads(p.production_data)
                except Exception:
                    continue
                if not isinstance(p_dict, dict):
                    continue
                advs = p_dict.get("daily_advances")
                if not isinstance(advs, list) or not advs:
                    continue

                cur_stage = p_dict.get("current_stage", 0)
                stages_list = p_dict.get("stages", [])
                changed = False
                for a in advs:
                    if not isinstance(a, dict):
                        continue
                    adv_created = str(a.get("created_at") or a.get("date") or "")
                    adv_date_only = str(a.get("date") or a.get("created_at") or "")[:10]
                    matched_stage = 2  # Por defecto etapa 2: Producción iniciada (inicio de taller)

                    if stages_list and isinstance(stages_list, list) and len(stages_list) >= 6:
                        for st_idx in range(len(stages_list) - 1, 1, -1):
                            st_item = stages_list[st_idx]
                            if isinstance(st_item, dict):
                                st_ent = str(st_item.get("entered_at") or "")
                                if st_ent:
                                    if len(st_ent) > 10 and len(adv_created) > 10:
                                        if st_ent <= adv_created:
                                            matched_stage = st_idx
                                            break
                                    elif st_ent[:10] < adv_date_only:
                                        matched_stage = st_idx
                                        break
                                    elif st_ent[:10] == adv_date_only and st_idx == 2:
                                        matched_stage = 2
                                        break

                    if a.get("stage") != matched_stage:
                        a["stage"] = matched_stage
                        changed = True

                if changed:
                    p.production_data = json.dumps(p_dict, ensure_ascii=False)
                    updated_adv += 1

            if updated_adv > 0:
                s.commit()
                print(f"[migration] Se asignó etapa a avances diarios en {updated_adv} proyectos.")
    except Exception as adv_e:
        print(f"[migration] Aviso asignación de etapas en avances diarios: {adv_e}")

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
        if os.path.commonpath([os.path.realpath(FRONTEND_DIST), os.path.realpath(file_path)]) != os.path.realpath(FRONTEND_DIST):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
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
    work_flow: Optional[str] = None
    source_prospect_id: Optional[int] = None
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
    contract_work_item_ids: Optional[str] = None
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
    portal_access_active: Optional[bool] = True

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


class CascadeQuoteFields(BaseModel):
    quote_saludo: Optional[str] = None
    quote_title: Optional[str] = None
    quote_description: Optional[str] = None
    quote_delivery_time: Optional[str] = None
    quote_validez: Optional[str] = None
    quote_anticipo: Optional[str] = None


class WorkCascadeAction(BaseModel):
    action: str
    ids: List[str]
    quote_fields: Optional[CascadeQuoteFields] = None


@app.post("/api/prospects/{prospect_id}/work-cascade")
def work_cascade_action(prospect_id: int, data: WorkCascadeAction, db: Session = Depends(get_db), request: Request = None):
    if request is not None:
        auth.require_modules(request, db, "prospectos")
        if data.action == "approve":
            auth.require_modules(request, db, "contratos")
    from work_cascade import load_data, sheets_for, ensure_sheet_ids, validate_ids, quote_selection, selected_data
    prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).with_for_update().first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospecto no encontrado")
    if prospect.is_contract:
        raise HTTPException(status_code=409, detail="Esta selección corresponde a Prospectos")
    try:
        raw = load_data(prospect.valuation_data)
        sheets = sheets_for(raw, prospect.project_type)
        state = load_data(prospect.work_flow)
        types = [sheet.get("type") for sheet in sheets]
        if state.get("sheet_types") and types[:len(state["sheet_types"])] != state["sheet_types"]:
            raise ValueError("Los trabajos cambiaron de orden; revisa la valoración antes de continuar")
        state["sheet_types"] = types
        if "sheets" not in raw:
            raw["sheets"] = sheets
        ensure_sheet_ids(sheets, state)
        if data.action not in ("pause", "resume", "delete", "quote", "approve"):
            raise ValueError("Acción no válida")
        validate_ids(data.ids, sheets, state, ("PAUSED",) if data.action == "resume" else ("ACTIVE", "PAUSED") if data.action == "delete" else ("ACTIVE",))
        if data.action == "approve":
            quoted = state.get("quoted", []) if prospect.work_flow else [f"work-{index + 1}" for index in range(len(sheets))]
            if not prospect.has_quote or any(item not in quoted for item in data.ids):
                raise ValueError("Solo se pueden aprobar trabajos de la cotización guardada")
            selected = selected_data(raw, prospect.project_type, data.ids)
            values = {column.name: getattr(prospect, column.name) for column in models.Prospect.__table__.columns
                      if column.name not in ("id", "public_id", "updated_at", "capture_date")}
            total = selected["grandTotal"]
            names = [sheet.get("type") or "Proyecto" for sheet in selected["sheets"]]

            # Inherit existing client password if available, otherwise generate a new one
            from sqlalchemy import func
            client_pwd = prospect.contract_password
            if not client_pwd and prospect.name:
                existing_contract = db.query(models.Prospect).filter(
                    func.lower(func.trim(models.Prospect.name)) == func.lower(func.trim(prospect.name)),
                    models.Prospect.contract_password.isnot(None),
                    models.Prospect.contract_password != "",
                    (models.Prospect.is_papelera.is_(None) | (models.Prospect.is_papelera == False))
                ).first()
                if existing_contract:
                    client_pwd = existing_contract.contract_password
            if not client_pwd:
                client_pwd = uuid.uuid4().hex[:10].upper()

            values.update(
                source_prospect_id=prospect.id, work_flow=None, is_contract=True,
                contract_date=datetime.utcnow(), status="APROBADO", contract_password=client_pwd,
                production_data=None, contract_work_item_ids=None,
                contract_signature_rep=None, contract_signature_client=None,
                contract_photo_rep=None, contract_photo_client=None,
                valuation_data=json.dumps(selected, ensure_ascii=False),
                project_type=", ".join(names), other_projects=None,
                quote_title="FABRICACIÓN DE " + ", ".join(names).upper(),
                quote_description="Fabricación e instalación de: " + ", ".join(names) + ".",
                quote_total_price=f"{total:,.2f}", estimated_price=str(total),
                render_applies=None, render_price=None, render_total_price=None,
                render_image_path=None, render_pdf_path=None, render_pdf_data=None,
            )
            if prospect.estimation_data:
                estimate = load_data(prospect.estimation_data)
                estimate_sheets = sheets_for(estimate, prospect.project_type)
                if len(estimate_sheets) != len(sheets):
                    raise ValueError("La estimación y valoración no coinciden; revisa sus trabajos antes de aprobar")
                selected_estimate = selected_data(estimate, prospect.project_type, data.ids)
                selected_estimate["obsText"] = values["quote_description"]
                values["estimation_data"] = json.dumps(selected_estimate, ensure_ascii=False)
            child = models.Prospect(**values, public_id=generate_public_id(), capture_date=prospect.capture_date, updated_at=datetime.utcnow())
            db.add(child)
            db.flush()
            for item in data.ids:
                state.setdefault("items", {})[item] = {"status": "TRANSFERRED", "client_id": child.id, "public_id": child.public_id}
            remaining_quote = [item for item in quoted if item not in data.ids]
            state["quoted"] = remaining_quote
            prospect.has_quote = bool(remaining_quote)
            prospect.status = "Cotización" if remaining_quote else "Valoración"
            prospect.quote_total_price = f"{quote_selection(raw, prospect.project_type, remaining_quote, state):,.2f}" if remaining_quote else None
            result = {"client_id": child.id, "public_id": child.public_id}
        elif data.action == "quote":
            total = quote_selection(raw, prospect.project_type, data.ids, state)
            state["quoted"] = data.ids
            prospect.has_quote = True
            prospect.status = "Cotización"
            prospect.quote_total_price = f"{total:,.2f}"
            names = [sheet.get("type") or "Proyecto" for index, sheet in enumerate(sheets) if f"work-{index + 1}" in data.ids]
            prospect.quote_title = "FABRICACIÓN DE " + ", ".join(names).upper()
            prospect.quote_description = "Fabricación e instalación de: " + ", ".join(names) + "."
            if data.quote_fields:
                for key, value in data.quote_fields.model_dump(exclude_unset=True).items():
                    setattr(prospect, key, value)
            result = {"total": total}
        else:
            quoted = state.get("quoted", []) if prospect.work_flow else [
                f"work-{index + 1}" for index in range(len(sheets))
            ] if prospect.has_quote else []
            for item in data.ids:
                state.setdefault("items", {})[item] = {"status": {"pause": "PAUSED", "resume": "ACTIVE", "delete": "DELETED"}[data.action]}
            state["quoted"] = [item for item in quoted if item not in data.ids]
            prospect.has_quote = bool(state["quoted"])
            prospect.status = "Cotización" if prospect.has_quote else "Valoración"
            prospect.quote_total_price = f"{quote_selection(raw, prospect.project_type, state['quoted'], state):,.2f}" if prospect.has_quote else None
            if data.action == "delete":
                remaining = [f"work-{index + 1}" for index in range(len(sheets))
                             if state.get("items", {}).get(f"work-{index + 1}", {}).get("status", "ACTIVE") in ("ACTIVE", "PAUSED")]
                prospect.estimated_price = str(selected_data(raw, prospect.project_type, remaining)["grandTotal"])
            result = {}
        prospect.work_flow = json.dumps(state, ensure_ascii=False)
        prospect.valuation_data = json.dumps(raw, ensure_ascii=False)
        if data.action != "quote" and state.get("quoted"):
            names = [sheet.get("type") or "Proyecto" for index, sheet in enumerate(sheets)
                     if f"work-{index + 1}" in state["quoted"]]
            prospect.quote_title = "FABRICACIÓN DE " + ", ".join(names).upper()
            prospect.quote_description = "Fabricación e instalación de: " + ", ".join(names) + "."
        prospect.updated_at = datetime.utcnow()
        db.commit()
        return {**result, "work_flow": prospect.work_flow, "has_quote": prospect.has_quote, "status": prospect.status,
                "estimated_price": prospect.estimated_price,
                "quote_total_price": prospect.quote_total_price, "quote_title": prospect.quote_title, "quote_description": prospect.quote_description}
    except (ValueError, TypeError, KeyError) as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.put("/api/prospects/{prospect_id}", response_model=ProspectResponse)
def update_prospect(prospect_id: int, prospect: ProspectUpdate, db: Session = Depends(get_db), request: Request = None):
    update_fields = prospect.model_dump(exclude_unset=True)
    if request is not None:
        fields = update_fields
        auth.require_modules(request, db, "prospectos", "ventas", "contratos", "pedidos", "produccion")
        if "production_data" in fields or fields.get("status") in ("PRODUCCION", "ENTREGADO"):
            auth.require_modules(request, db, "pedidos", "produccion")
        if any(key.startswith(("contract_", "render_")) or key in ("estimation_data", "is_contract") for key in fields):
            auth.require_modules(request, db, "contratos")
        if any(key.startswith("quote_") or key in ("valuation_data", "work_flow", "has_quote") for key in fields):
            auth.require_modules(request, db, "prospectos", "ventas", "contratos")
    db_prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not db_prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    if prospect.work_flow is not None and prospect.work_flow != db_prospect.work_flow:
        raise HTTPException(status_code=409, detail="Administra los trabajos desde su selección en Cotización")
    if db_prospect.work_flow and not db_prospect.is_contract:
        from work_cascade import load_data, sheets_for, ensure_sheet_ids, quote_selection
        state = load_data(db_prospect.work_flow)
        if prospect.is_contract:
            raise HTTPException(status_code=409, detail="Aprueba únicamente los trabajos cotizados desde Prospectos")
        if prospect.valuation_data is not None:
            raw = load_data(prospect.valuation_data)
            sheets = sheets_for(raw, db_prospect.project_type)
            types = [sheet.get("type") for sheet in sheets]
            if types[:len(state.get("sheet_types", []))] != state.get("sheet_types", []):
                raise HTTPException(status_code=409, detail="No reordenes ni borres hojas con seguimiento; pausa o elimina el trabajo desde Cotización")
            if "valuation_data" in update_fields:
                if "sheets" not in raw:
                    raw["sheets"] = sheets
                try:
                    ensure_sheet_ids(sheets, state)
                except ValueError as exc:
                    raise HTTPException(status_code=409, detail=str(exc)) from exc
                update_fields["valuation_data"] = json.dumps(raw, ensure_ascii=False)
                db_prospect.work_flow = json.dumps(state, ensure_ascii=False)
            quoted = state.get("quoted", [])
            prospect.quote_total_price = f"{quote_selection(raw, db_prospect.project_type, quoted, state):,.2f}" if quoted else None
    if prospect.contract_work_item_ids is not None:
        try:
            selected_ids = json.loads(prospect.contract_work_item_ids)
        except (TypeError, json.JSONDecodeError) as exc:
            raise HTTPException(status_code=400, detail="La selección de trabajos no es válida") from exc
        if not isinstance(selected_ids, list) or not selected_ids or any(
            not isinstance(item, str) or not item.startswith("work-") or not item[5:].isdigit()
            for item in selected_ids
        ) or len(set(selected_ids)) != len(selected_ids):
            raise HTTPException(status_code=400, detail="Selecciona al menos un trabajo válido, sin duplicados")
        try:
            production = json.loads(db_prospect.production_data or "{}")
        except (TypeError, json.JSONDecodeError) as exc:
            raise HTTPException(status_code=409, detail="Los datos de producción no son válidos") from exc
        if any(item.get("status") in ("PRODUCCION", "ENTREGADO") and item.get("id") not in selected_ids
               for item in production.get("work_items", [])):
            raise HTTPException(status_code=409, detail="No se puede quitar un trabajo que ya inició producción")
    # Auto-inherit password if this project is becoming a contract and doesn't have one
    if update_fields.get("is_contract") and (not update_fields.get("contract_password") or not db_prospect.contract_password):
        cname = update_fields.get("name") or db_prospect.name
        if cname and cname.strip():
            from sqlalchemy import func
            existing_sibling = db.query(models.Prospect).filter(
                func.lower(func.trim(models.Prospect.name)) == func.lower(func.trim(cname)),
                models.Prospect.contract_password.isnot(None),
                models.Prospect.contract_password != "",
                models.Prospect.id != db_prospect.id,
                (models.Prospect.is_papelera.is_(None) | (models.Prospect.is_papelera == False))
            ).first()
            if existing_sibling:
                update_fields["contract_password"] = existing_sibling.contract_password

    for key, value in update_fields.items():
        # Prevent overriding read-only fields on update if they happen to be in the payload
        if key not in ['id', 'public_id', 'capture_date', 'updated_at', 'source_prospect_id', 'work_flow']:
            if key == 'estimation_data' and isinstance(value, str) and 'data:image' in value:
                # Las fotos y croquis nuevos se guardan en Cloudinary; si fallan, se conserva el base64.
                value, _, _ = imagestore.externalize_json(value, prospect_id)
            setattr(db_prospect, key, value)

    # Synchronize contract_password to all other active projects of the same client
    if "contract_password" in update_fields:
        new_pwd = update_fields["contract_password"]
        cname = update_fields.get("name") or db_prospect.name
        if new_pwd and cname and cname.strip():
            from sqlalchemy import func
            db.query(models.Prospect).filter(
                func.lower(func.trim(models.Prospect.name)) == func.lower(func.trim(cname)),
                models.Prospect.id != db_prospect.id,
                (models.Prospect.is_papelera.is_(None) | (models.Prospect.is_papelera == False))
            ).update({"contract_password": new_pwd}, synchronize_session=False)

    # Synchronize portal_access_active to all other active projects of the same client
    if "portal_access_active" in update_fields:
        is_active = update_fields["portal_access_active"]
        cname = update_fields.get("name") or db_prospect.name
        if cname and cname.strip():
            from sqlalchemy import func
            db.query(models.Prospect).filter(
                func.lower(func.trim(models.Prospect.name)) == func.lower(func.trim(cname)),
                models.Prospect.id != db_prospect.id,
                (models.Prospect.is_papelera.is_(None) | (models.Prospect.is_papelera == False))
            ).update({"portal_access_active": is_active}, synchronize_session=False)

    db_prospect.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_prospect)
    return db_prospect


class LinkClientRequest(BaseModel):
    target_ids: List[int]   # IDs de proyectos a vincular con este cliente


@app.post("/api/prospects/{prospect_id}/link-client")
def link_client_projects(prospect_id: int, body: LinkClientRequest, db: Session = Depends(get_db)):
    """
    Vincula proyectos huérfanos/viejos al mismo cliente del prospect_id dado.
    - Iguala el nombre del cliente en todos los proyectos vinculados.
    - Hereda la contraseña del prospect_id (o la genera si no tiene ninguna).
    - Sincroniza portal_access_active.
    Retorna: public_id + contraseña de TODOS los proyectos del cliente (incluyendo los recién vinculados).
    """
    from sqlalchemy import func

    master = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Contrato master no encontrado")

    # Determinar contraseña unificada
    unified_pwd = master.contract_password
    if not unified_pwd:
        # Buscar si algún proyecto hermano ya tiene contraseña
        sibling = db.query(models.Prospect).filter(
            func.lower(func.trim(models.Prospect.name)) == func.lower(func.trim(master.name or "")),
            models.Prospect.contract_password.isnot(None),
            models.Prospect.contract_password != "",
            (models.Prospect.is_papelera.is_(None) | (models.Prospect.is_papelera == False))
        ).first()
        unified_pwd = sibling.contract_password if sibling else uuid.uuid4().hex[:10].upper()
        # Guardar en master
        master.contract_password = unified_pwd

    portal_state = master.portal_access_active if master.portal_access_active is not None else True

    if not body.target_ids:
        raise HTTPException(status_code=400, detail="Debes seleccionar al menos un proyecto para vincular")

    linked = []
    for tid in body.target_ids:
        if tid == prospect_id:
            continue
        target = db.query(models.Prospect).filter(models.Prospect.id == tid).first()
        if not target:
            continue
        target.name = master.name           # Igualar nombre exacto
        target.contract_password = unified_pwd
        target.portal_access_active = portal_state
        linked.append({"id": target.id, "public_id": target.public_id, "project_type": target.project_type})

    # Actualizar también todos los proyectos que ya pertenecen al mismo cliente
    db.query(models.Prospect).filter(
        func.lower(func.trim(models.Prospect.name)) == func.lower(func.trim(master.name or "")),
        models.Prospect.id != master.id,
        (models.Prospect.is_papelera.is_(None) | (models.Prospect.is_papelera == False))
    ).update({"contract_password": unified_pwd, "portal_access_active": portal_state}, synchronize_session=False)

    master.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(master)

    # Recolectar TODOS los proyectos del cliente unificado para retornarlos
    all_projects = db.query(models.Prospect).filter(
        func.lower(func.trim(models.Prospect.name)) == func.lower(func.trim(master.name or "")),
        (models.Prospect.is_papelera.is_(None) | (models.Prospect.is_papelera == False))
    ).all()

    return {
        "client_name": master.name,
        "unified_password": unified_pwd,
        "portal_access_active": portal_state,
        "projects": [
            {
                "id": p.id,
                "public_id": p.public_id,
                "project_type": p.project_type,
                "is_contract": p.is_contract,
                "status": p.status,
            }
            for p in all_projects
        ],
        "newly_linked": linked,
    }


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
    is_pdf = ext == ".pdf" or (file.content_type or "").lower() == "application/pdf"
    resource_type = "raw" if is_pdf else "auto"
    unique_name = f"{prefix}_{uuid.uuid4()}{ext}" if is_pdf else f"{prefix}_{uuid.uuid4()}"

    # Leer contenido del archivo primero (importante para evitar stream ya consumido)
    contents = await file.read()
    import io

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
    stage: Optional[int] = Form(None),
    work_item_id: Optional[str] = Form(None),
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

    work_production = production
    if work_item_id:
        work_items = production.get("work_items", [])
        work_item = next((item for item in work_items if item.get("id") == work_item_id), None)
        if not work_item:
            raise HTTPException(status_code=404, detail="Trabajo de producción no encontrado")
        if work_item.get("status") != "PRODUCCION":
            raise HTTPException(status_code=409, detail="El trabajo no está activo en producción")
        work_production = work_item.setdefault("production_data", {})

    current_stage = work_production.get("current_stage", 0)
    assigned_stage = stage if stage is not None else current_stage
    try:
        assigned_stage = max(0, min(int(assigned_stage), 5))
    except (ValueError, TypeError):
        assigned_stage = current_stage

    clean_date = date.strip()[:10]
    image_url = await upload_to_storage(file, f"advance_{prospect_id}_{clean_date}")
    advances = work_production.setdefault("daily_advances", [])
    advance_entry = {
        "id": str(uuid.uuid4()),
        "date": clean_date,
        "url": image_url,
        "comment": comment.strip(),
        "published": bool(published),
        "stage": assigned_stage,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    advances.append(advance_entry)
    prospect.production_data = json.dumps(production, ensure_ascii=False)
    prospect.updated_at = datetime.utcnow()
    db.commit()
    return {"advance": advance_entry, "production_data": prospect.production_data}


class ProductionWorkStageUpdate(BaseModel):
    current_stage: int


@app.put("/api/prospects/{prospect_id}/production-work-items/{work_item_id}/stage")
def update_production_work_stage(
    prospect_id: int,
    work_item_id: str,
    data: ProductionWorkStageUpdate,
    db: Session = Depends(get_db),
    request: Request = None,
):
    if request is not None:
        auth.require_modules(request, db, "pedidos", "produccion")
    if data.current_stage < 0 or data.current_stage > 5:
        raise HTTPException(status_code=400, detail="Invalid production stage")
    prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    try:
        production = json.loads(prospect.production_data or "{}")
    except (TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=409, detail="Production data is invalid") from exc
    work_items = production.get("work_items", [])
    work_item = next((item for item in work_items if item.get("id") == work_item_id), None)
    if not work_item:
        raise HTTPException(status_code=404, detail="Trabajo de producción no encontrado")
    if work_item.get("status") not in ("PRODUCCION", "ENTREGADO"):
        raise HTTPException(status_code=409, detail="El trabajo no está activo en producción")

    work_production = work_item.setdefault("production_data", {})
    stages = work_production.get("stages", [])
    if not isinstance(stages, list) or len(stages) != 6:
        raise HTTPException(status_code=409, detail="Production stages are invalid")
    now = datetime.utcnow().isoformat() + "Z"
    stages[data.current_stage]["entered_at"] = now
    work_production["current_stage"] = data.current_stage
    work_item["status"] = "ENTREGADO" if data.current_stage == 5 else "PRODUCCION"
    if data.current_stage == 5:
        work_production["delivered_at"] = now
    else:
        work_production.pop("delivered_at", None)
    prospect.status = "ENTREGADO" if work_items and all(item.get("status") == "ENTREGADO" for item in work_items) else "PRODUCCION"
    prospect.production_data = json.dumps(production, ensure_ascii=False)
    prospect.updated_at = datetime.utcnow()
    db.commit()
    return {"production_data": prospect.production_data, "status": prospect.status}


@app.delete("/api/prospects/{prospect_id}/daily-advances/{advance_id}")
def delete_daily_advance(prospect_id: int, advance_id: str, work_item_id: Optional[str] = None, db: Session = Depends(get_db)):
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

    target = production
    if work_item_id:
        work_item = next((item for item in production.get("work_items", []) if item.get("id") == work_item_id), None)
        if work_item:
            target = work_item.setdefault("production_data", {})
    advances = target.get("daily_advances", [])
    target["daily_advances"] = [a for a in advances if str(a.get("id")) != advance_id and a.get("url") != advance_id]

    # También asegurar eliminación en raíz y en cualquier otro work_item si existía duplicado o fue guardado previamente
    if "daily_advances" in production:
        production["daily_advances"] = [a for a in production["daily_advances"] if str(a.get("id")) != advance_id and a.get("url") != advance_id]
    for wi in production.get("work_items", []):
        wiprod = wi.get("production_data") or {}
        if "daily_advances" in wiprod:
            wiprod["daily_advances"] = [a for a in wiprod["daily_advances"] if str(a.get("id")) != advance_id and a.get("url") != advance_id]
            wi["production_data"] = wiprod

    prospect.production_data = json.dumps(production, ensure_ascii=False)
    prospect.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Avance eliminado", "production_data": prospect.production_data}


class DailyAdvanceUpdate(BaseModel):
    comment: Optional[str] = None
    published: Optional[bool] = None


@app.put("/api/prospects/{prospect_id}/daily-advances/{advance_id}")
def update_daily_advance(prospect_id: int, advance_id: str, data: DailyAdvanceUpdate, work_item_id: Optional[str] = None, db: Session = Depends(get_db)):
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

    target = production
    if work_item_id:
        work_item = next((item for item in production.get("work_items", []) if item.get("id") == work_item_id), None)
        if work_item:
            target = work_item.setdefault("production_data", {})
    advances = target.get("daily_advances", [])
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

    # Si no se encontró en target, buscar en raíz y en todos los work_items
    if not updated:
        candidates = [production.get("daily_advances", [])]
        for wi in production.get("work_items", []):
            candidates.append((wi.get("production_data") or {}).get("daily_advances", []))
        for cand_list in candidates:
            for a in (cand_list or []):
                if str(a.get("id")) == advance_id or a.get("url") == advance_id:
                    if data.published is not None:
                        a["published"] = data.published
                    else:
                        a["published"] = not a.get("published", True)
                    if data.comment is not None:
                        a["comment"] = data.comment
                    updated = True
                    break
            if updated:
                break

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

@app.post("/api/prospects/{prospect_id}/linked-quote-photo")
async def edit_linked_quote_photo(
    prospect_id: int,
    group: str = Form(...),
    image_url: str = Form(...),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    if group not in ("space", "reference"):
        raise HTTPException(status_code=400, detail="Tipo de foto no válido")
    prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospecto no encontrado")
    field = "space_image_path" if group == "space" else "reference_image_path"
    value = getattr(prospect, field)
    if group == "reference" and not value:
        value = prospect.design_image_path
    urls = [url.strip() for url in (value or "").split(",") if url.strip()]
    if image_url not in urls:
        raise HTTPException(status_code=409, detail="La foto ya cambió. Actualiza la cotización")
    replacement = ""
    if file:
        if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
            raise HTTPException(status_code=400, detail="Selecciona una foto JPG, PNG o WebP")
        replacement = await upload_to_storage(file, f"{group}_{prospect_id}")
        if not replacement:
            raise HTTPException(status_code=502, detail="No se pudo almacenar la foto")
    updated = [replacement if url == image_url else url for url in urls]
    setattr(prospect, field, ",".join(url for url in updated if url) or None)
    if group == "reference" and prospect.design_image_path == image_url:
        prospect.design_image_path = replacement or next((url for url in updated if url), None)
    for index in range(1, 5):
        key = f"quote_image_{index}"
        if getattr(prospect, key) == image_url:
            setattr(prospect, key, replacement)
    prospect.updated_at = datetime.utcnow()
    db.commit()
    return {
        "space_image_path": prospect.space_image_path,
        "reference_image_path": prospect.reference_image_path,
        "design_image_path": prospect.design_image_path,
        **{f"quote_image_{index}": getattr(prospect, f"quote_image_{index}") for index in range(1, 5)},
        "replacement": replacement,
    }


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
    for file in files:
        contents = await file.read()
        filename_lower = (file.filename or "").lower()
        content_type = (file.content_type or "").lower()
        is_pdf = filename_lower.endswith(".pdf") or "pdf" in content_type

        if is_pdf:
            # 1. Subir a Cloudinary PRIMERO (siempre funciona si hay credenciales)
            cloudinary_url = None
            try:
                temp_file = UploadFile(filename=file.filename, file=io.BytesIO(contents))
                cloudinary_url = await upload_to_storage(temp_file, "render")
                db_prospect.render_pdf_path = cloudinary_url
                print(f"[upload-render] PDF guardado en Cloudinary: {cloudinary_url}")
            except Exception as cloud_err:
                print(f"[upload-render] Cloudinary fallido: {cloud_err}")

            # 2. Intentar guardar bytes en PostgreSQL BYTEA (puede no existir la columna en prod)
            try:
                if hasattr(db_prospect, "render_pdf_data") and db_prospect.render_pdf_data is not None or hasattr(db_prospect, "render_pdf_data"):
                    db_prospect.render_pdf_data = contents
                    print(f"[upload-render] PDF guardado en BYTEA ({len(contents)} bytes)")
                    if not cloudinary_url:
                        # Cloudinary fallo, usar endpoint interno de streaming
                        db_prospect.render_pdf_path = f"/api/prospects/{db_prospect.id}/render-pdf"
            except Exception as bytea_err:
                print(f"[upload-render] BYTEA no disponible: {bytea_err}")
                if not cloudinary_url:
                    db_prospect.render_pdf_path = f"/api/prospects/{db_prospect.id}/render-pdf"
        else:
            try:
                temp_file = UploadFile(filename=file.filename, file=io.BytesIO(contents))
                new_url = await upload_to_storage(temp_file, "render")
                image_urls.append(new_url)
            except Exception as img_err:
                print(f"[upload-render] Error subiendo imagen render: {img_err}")

    if image_urls:
        db_prospect.render_image_path = image_urls[-1]

    db_prospect.render_applies = True
    db_prospect.updated_at = datetime.utcnow()

    # Espejear hacia production_data (JSON accesible para el portal del cliente sin restricción de columnas)
    try:
        p_dict = {}
        if db_prospect.production_data:
            try:
                p_dict = json.loads(db_prospect.production_data)
            except Exception:
                p_dict = {}
        if not isinstance(p_dict, dict):
            p_dict = {}
        if db_prospect.render_pdf_path:
            p_dict["render_pdf_path"] = db_prospect.render_pdf_path
        if db_prospect.render_image_path:
            p_dict["render_image_path"] = db_prospect.render_image_path
        p_dict["render_applies"] = True
        db_prospect.production_data = json.dumps(p_dict, ensure_ascii=False)
    except Exception as pe:
        print(f"[upload-render] Error espejeando a production_data: {pe}")

    try:
        db.commit()
        db.refresh(db_prospect)
    except Exception as commit_err:
        db.rollback()
        print(f"[upload-render] Error en commit: {commit_err}")
        raise HTTPException(status_code=500, detail=f"Error guardando render: {commit_err}")

    return {
        "image_path": getattr(db_prospect, "render_image_path", None),
        "pdf_path": getattr(db_prospect, "render_pdf_path", None),
        "render_applies": getattr(db_prospect, "render_applies", True)
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


@app.api_route("/api/client-portal/{public_id}/render-pdf", methods=["GET", "HEAD"])
async def client_portal_stream_render_pdf(public_id: str, request: Request, db: Session = Depends(get_db)):
    """Permite al portal de clientes consultar y descargar el PDF del render directamente."""
    from sqlalchemy import text
    pid = public_id.strip().upper()
    row = None
    has_bytea = True

    try:
        sql = "SELECT id, (render_pdf_data IS NOT NULL) AS has_data, render_pdf_data, render_pdf_path FROM prospects WHERE UPPER(TRIM(public_id)) = :pid LIMIT 1"
        row = db.execute(text(sql), {"pid": pid}).mappings().first()
    except Exception:
        has_bytea = False
        try: db.rollback()
        except Exception: pass
        try:
            sql2 = "SELECT id, render_pdf_path FROM prospects WHERE UPPER(TRIM(public_id)) = :pid LIMIT 1"
            row = db.execute(text(sql2), {"pid": pid}).mappings().first()
        except Exception:
            try: db.rollback()
            except Exception: pass

    if not row:
        raise HTTPException(status_code=404, detail="Proyecto o render no encontrado")

    has_data = bool(row.get("has_data")) if has_bytea else False
    pdf_url = row.get("render_pdf_path")
    pdf_data = row.get("render_pdf_data") if has_bytea else None

    if not has_data and not pdf_url and not pdf_data:
        raise HTTPException(status_code=404, detail="Este proyecto no tiene render PDF")

    if request.method == "HEAD":
        return Response(
            status_code=200,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="render_{pid}.pdf"'}
        )

    if pdf_data:
        return Response(
            content=bytes(pdf_data),
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="render_{pid}.pdf"'},
        )

    if pdf_url:
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
        if pdf_url.startswith("http"):
            return RedirectResponse(url=pdf_url)

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
