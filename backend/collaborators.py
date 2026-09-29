from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Date, Text
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime, date
import os
import shutil
import uuid

from database import Base, engine, get_db

# Ensure upload directory exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

import cloudinary
import cloudinary.uploader
# Cloudinary: el SDK lee CLOUDINARY_URL del entorno automáticamente al importar.
# NO llamar cloudinary.config() — sobreescribe las credenciales y causa Invalid Signature.
CLOUDINARY_URL = os.environ.get("CLOUDINARY_URL")

async def upload_to_storage_collab(file_obj, prefix: str) -> str:
    original_filename = file_obj.filename or "file"
    ext = os.path.splitext(original_filename)[1].lower()
    if prefix.startswith("collab_photo") and ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        ext = ".jpg"
    elif prefix.startswith("collab_cv") and not ext:
        ext = ".pdf"
        
    unique_name = f"{prefix}_{uuid.uuid4().hex[:8]}{ext}"
    
    # Leer bytes primero (evita problema de stream ya consumido)
    import io
    contents = await file_obj.read()

    if CLOUDINARY_URL or (os.environ.get("CLOUDINARY_CLOUD_NAME") and os.environ.get("CLOUDINARY_API_KEY")):
        try:
            result = cloudinary.uploader.upload(io.BytesIO(contents), public_id=unique_name, folder="rdadmin")
            return result.get("secure_url")
        except Exception as e:
            print(f"Error subiendo a Cloudinary (Collaborators): {e}")
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=f"Error en Cloudinary: {str(e)}")

    # Fallback: guardar en disco local
    save_path = os.path.join(UPLOAD_DIR, unique_name)
    with open(save_path, "wb") as buffer:
        buffer.write(contents)
    return f"/uploads/{unique_name}"

# ── MODEL DEFINITION ──────────────────────────────────────────
class Collaborator(Base):
    __tablename__ = "collaborators"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=True, index=True)
    email = Column(String, nullable=True)
    position = Column(String, nullable=False, default="Carpintero") # Puesto
    department = Column(String, nullable=True, default="Producción") # Área / Taller
    status = Column(String, nullable=False, default="Activo") # Activo, Inactivo, Vacaciones, Incapacidad
    
    photo_url = Column(String, nullable=True) # Foto de perfil
    cv_url = Column(String, nullable=True) # Archivo PDF / Documento de CV
    cv_filename = Column(String, nullable=True) # Nombre original del archivo CV

    contract_type = Column(String, nullable=True, default="Tiempo Completo") # Tiempo Completo, Por Obra/Destajo, etc.
    hire_date = Column(Date, nullable=True)
    salary = Column(String, nullable=True)
    salary_period = Column(String, nullable=True, default="Semanal") # Semanal, Quincenal, Mensual
    nss_rfc = Column(String, nullable=True) # NSS, RFC o Identificación
    address = Column(String, nullable=True)
    
    emergency_contact_name = Column(String, nullable=True)
    emergency_contact_phone = Column(String, nullable=True)
    skills = Column(String, nullable=True) # Habilidades (ej: Melamina, Barniz, Torno, etc.)
    notes = Column(Text, nullable=True) # Observaciones o notas internas
    
    entry_time = Column(String, nullable=True) # Hora de entrada
    exit_time = Column(String, nullable=True) # Hora de salida
    
    created_at = Column(DateTime, default=datetime.utcnow)

# Ensure this specific table is created automatically without touching other tables
try:
    Collaborator.__table__.create(bind=engine, checkfirst=True)
except Exception as e:
    print(f"[Collaborators] Tabla ya creada o aviso de BD: {e}")

# ── PYDANTIC SCHEMAS ──────────────────────────────────────────
class CollaboratorBase(BaseModel):
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = "Carpintero"
    department: Optional[str] = "Producción"
    status: Optional[str] = "Activo"
    photo_url: Optional[str] = None
    cv_url: Optional[str] = None
    cv_filename: Optional[str] = None
    contract_type: Optional[str] = "Tiempo Completo"
    hire_date: Optional[date] = None
    salary: Optional[str] = None
    salary_period: Optional[str] = "Semanal"
    nss_rfc: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    skills: Optional[str] = None
    notes: Optional[str] = None
    entry_time: Optional[str] = None
    exit_time: Optional[str] = None

    @field_validator('hire_date', mode='before')
    @classmethod
    def sanitize_hire_date(cls, v):
        if not v or v == '':
            return None
        return v

class CollaboratorCreate(CollaboratorBase):
    pass

class CollaboratorUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    photo_url: Optional[str] = None
    cv_url: Optional[str] = None
    cv_filename: Optional[str] = None
    contract_type: Optional[str] = None
    hire_date: Optional[date] = None
    salary: Optional[str] = None
    salary_period: Optional[str] = None
    nss_rfc: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    skills: Optional[str] = None
    notes: Optional[str] = None
    entry_time: Optional[str] = None
    exit_time: Optional[str] = None

    @field_validator('hire_date', mode='before')
    @classmethod
    def sanitize_hire_date(cls, v):
        if not v or v == '':
            return None
        return v

class CollaboratorResponse(CollaboratorBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ── ROUTER DEFINITION ─────────────────────────────────────────
router = APIRouter(prefix="/api/collaborators", tags=["colaboradores"])

@router.get("", response_model=List[CollaboratorResponse])
@router.get("/", response_model=List[CollaboratorResponse])
def get_collaborators(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Collaborator)
    if status and status.lower() != "todos":
        query = query.filter(Collaborator.status == status)
    if department and department.lower() != "todos":
        query = query.filter(Collaborator.department == department)
    if search:
        search_fmt = f"%{search.strip().lower()}%"
        query = query.filter(
            (Collaborator.full_name.ilike(search_fmt)) |
            (Collaborator.phone.ilike(search_fmt)) |
            (Collaborator.position.ilike(search_fmt)) |
            (Collaborator.skills.ilike(search_fmt))
        )
    return query.order_by(Collaborator.id.desc()).all()

@router.get("/{collab_id}", response_model=CollaboratorResponse)
def get_collaborator(collab_id: int, db: Session = Depends(get_db)):
    collab = db.query(Collaborator).filter(Collaborator.id == collab_id).first()
    if not collab:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")
    return collab

@router.post("", response_model=CollaboratorResponse)
@router.post("/", response_model=CollaboratorResponse)
def create_collaborator(data: CollaboratorCreate, db: Session = Depends(get_db)):
    collab = Collaborator(**data.dict())
    db.add(collab)
    db.commit()
    db.refresh(collab)
    return collab

@router.put("/{collab_id}", response_model=CollaboratorResponse)
def update_collaborator(collab_id: int, data: CollaboratorUpdate, db: Session = Depends(get_db)):
    collab = db.query(Collaborator).filter(Collaborator.id == collab_id).first()
    if not collab:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(collab, key, value)
    db.commit()
    db.refresh(collab)
    return collab

@router.delete("/{collab_id}")
def delete_collaborator(collab_id: int, db: Session = Depends(get_db)):
    collab = db.query(Collaborator).filter(Collaborator.id == collab_id).first()
    if not collab:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")
    
    # Clean up uploaded photo if exists
    if collab.photo_url and collab.photo_url.startswith("/uploads/"):
        file_path = os.path.join(UPLOAD_DIR, os.path.basename(collab.photo_url))
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
                
    # Clean up uploaded CV if exists
    if collab.cv_url and collab.cv_url.startswith("/uploads/"):
        cv_path = os.path.join(UPLOAD_DIR, os.path.basename(collab.cv_url))
        if os.path.exists(cv_path):
            try:
                os.remove(cv_path)
            except Exception:
                pass

    db.delete(collab)
    db.commit()
    return {"message": "Colaborador eliminado con éxito"}

@router.post("/{collab_id}/upload-photo")
async def upload_collaborator_photo(collab_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    collab = db.query(Collaborator).filter(Collaborator.id == collab_id).first()
    if not collab:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")

    # Delete previous photo if exists
    if collab.photo_url and collab.photo_url.startswith("/uploads/"):
        old_file = os.path.join(UPLOAD_DIR, os.path.basename(collab.photo_url))
        if os.path.exists(old_file):
            try:
                os.remove(old_file)
            except Exception:
                pass

    new_url = await upload_to_storage_collab(file, f"collab_photo_{collab_id}")
    collab.photo_url = new_url
    db.commit()
    db.refresh(collab)
    return {"photo_url": collab.photo_url}

@router.post("/{collab_id}/upload-cv")
async def upload_collaborator_cv(collab_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    collab = db.query(Collaborator).filter(Collaborator.id == collab_id).first()
    if not collab:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")

    # Delete previous CV file if exists
    if collab.cv_url and collab.cv_url.startswith("/uploads/"):
        old_file = os.path.join(UPLOAD_DIR, os.path.basename(collab.cv_url))
        if os.path.exists(old_file):
            try:
                os.remove(old_file)
            except Exception:
                pass

    new_url = await upload_to_storage_collab(file, f"collab_cv_{collab_id}")
    collab.cv_url = new_url
    collab.cv_filename = file.filename or "cv_document"
    db.commit()
    db.refresh(collab)
    return {"cv_url": collab.cv_url, "cv_filename": collab.cv_filename}
