from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import models, os, shutil, uuid
from database import engine, get_db

try:
    models.Base.metadata.create_all(bind=engine)
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

# Serve uploaded images as static files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "../frontend/dist")

if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")
    
    @app.exception_handler(404)
    async def not_found_handler(request, exc):
        if request.url.path.startswith("/api/"):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
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

class ProspectUpdate(ProspectCreate):
    pass

class ProspectResponse(ProspectCreate):
    id: int
    status: str
    design_image_path: Optional[str] = None
    space_image_path: Optional[str] = None
    reference_image_path: Optional[str] = None

    class Config:
        from_attributes = True


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
    db_prospect.capture_date = datetime.now()
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


@app.post("/api/prospects/{prospect_id}/upload-image")
async def upload_design_image(prospect_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not db_prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    # Delete old image if exists
    if db_prospect.design_image_path:
        old_path = db_prospect.design_image_path.replace("/uploads/", f"{UPLOAD_DIR}/")
        if os.path.exists(old_path):
            os.remove(old_path)

    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4()}{ext}"
    save_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db_prospect.design_image_path = f"/uploads/{unique_name}"
    db.commit()
    db.refresh(db_prospect)
    return {"image_path": db_prospect.design_image_path}

@app.post("/api/prospects/{prospect_id}/upload-space-image")
async def upload_space_image(prospect_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not db_prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    if db_prospect.space_image_path:
        old_path = db_prospect.space_image_path.replace("/uploads/", f"{UPLOAD_DIR}/")
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass

    ext = os.path.splitext(file.filename)[1]
    unique_name = f"space_{uuid.uuid4()}{ext}"
    save_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db_prospect.space_image_path = f"/uploads/{unique_name}"
    db.commit()
    db.refresh(db_prospect)
    return {"image_path": db_prospect.space_image_path}

@app.post("/api/prospects/{prospect_id}/upload-reference-image")
async def upload_reference_image(prospect_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not db_prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    if db_prospect.reference_image_path:
        old_path = db_prospect.reference_image_path.replace("/uploads/", f"{UPLOAD_DIR}/")
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass

    ext = os.path.splitext(file.filename)[1]
    unique_name = f"ref_{uuid.uuid4()}{ext}"
    save_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db_prospect.reference_image_path = f"/uploads/{unique_name}"
    if not db_prospect.design_image_path:
        db_prospect.design_image_path = db_prospect.reference_image_path
    db.commit()
    db.refresh(db_prospect)
    return {"image_path": db_prospect.reference_image_path}

@app.post("/api/prospects/{prospect_id}/upload-quote-image/{index}")
async def upload_quote_image(prospect_id: int, index: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if index < 1 or index > 4:
        raise HTTPException(status_code=400, detail="Invalid image index")
        
    db_prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not db_prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    attr_name = f"quote_image_{index}"
    existing_path = getattr(db_prospect, attr_name)
    
    if existing_path:
        old_path = existing_path.replace("/uploads/", f"{UPLOAD_DIR}/")
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass

    ext = os.path.splitext(file.filename)[1]
    unique_name = f"quote_{index}_{uuid.uuid4()}{ext}"
    save_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    setattr(db_prospect, attr_name, f"/uploads/{unique_name}")
    db.commit()
    db.refresh(db_prospect)
    return {"image_path": getattr(db_prospect, attr_name)}

# ── COLABORADORES (Módulo aislado e independiente) ───────────
try:
    from collaborators import router as collaborators_router
    app.include_router(collaborators_router)
except Exception as e:
    print(f"Error cargando módulo de colaboradores: {e}")

