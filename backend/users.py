from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import json
import hashlib

from database import engine, get_db
import models

# Asegurar que la tabla exista
models.User.__table__.create(bind=engine, checkfirst=True)

router = APIRouter(prefix="/api/users", tags=["users"])

# --- Esquemas Pydantic ---
class UserCreate(BaseModel):
    name: str
    username: str
    password: str
    role: str
    status: str
    permissions: List[str]

class UserUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    permissions: Optional[List[str]] = None

class UserResponse(BaseModel):
    id: int
    name: str
    username: str
    role: str
    status: str
    permissions: List[str]

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

# Helper de hasheo simple (Para producción real usar bcrypt o passlib, pero para este caso sirve como protección básica)
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Crear usuario admin inicial si no hay usuarios
def create_initial_admin(db: Session):
    if db.query(models.User).count() == 0:
        admin = models.User(
            name="Admin Principal",
            username="admin",
            password_hash=hash_password("admin123"),
            role="Administrador",
            status="Activo",
            permissions=json.dumps(['dashboard', 'prospectos', 'ventas', 'pedidos', 'colaboradores', 'pagos', 'accesos'])
        )
        db.add(admin)
        db.commit()

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    create_initial_admin(db)
    user = db.query(models.User).filter(models.User.username == req.username).first()
    if not user or user.password_hash != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    if user.status != "Activo":
        raise HTTPException(status_code=403, detail="La cuenta está inactiva")
    
    return {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "role": user.role,
        "permissions": json.loads(user.permissions) if user.permissions else [],
        "token": f"token-{user.id}" # Token muy básico
    }

class VerifyPasswordRequest(BaseModel):
    user_id: Optional[int] = None
    username: Optional[str] = None
    password: str

@router.post("/verify-password")
def verify_password(req: VerifyPasswordRequest, db: Session = Depends(get_db)):
    user = None
    if req.user_id:
        user = db.query(models.User).filter(models.User.id == req.user_id).first()
    elif req.username:
        user = db.query(models.User).filter(models.User.username == req.username).first()
    
    if not user or user.password_hash != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")
    return {"ok": True}

@router.get("/", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    create_initial_admin(db)
    users = db.query(models.User).all()
    res = []
    for u in users:
        res.append(UserResponse(
            id=u.id, name=u.name, username=u.username, role=u.role, status=u.status,
            permissions=json.loads(u.permissions) if u.permissions else []
        ))
    return res

@router.post("/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
    
    new_user = models.User(
        name=user.name,
        username=user.username,
        password_hash=hash_password(user.password),
        role=user.role,
        status=user.status,
        permissions=json.dumps(user.permissions)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserResponse(
        id=new_user.id, name=new_user.name, username=new_user.username, 
        role=new_user.role, status=new_user.status, 
        permissions=json.loads(new_user.permissions)
    )

@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.name is not None: db_user.name = user.name
    if user.username is not None:
        # Check if new username exists
        existing = db.query(models.User).filter(models.User.username == user.username, models.User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
        db_user.username = user.username
    if user.password:
        db_user.password_hash = hash_password(user.password)
    if user.role is not None: db_user.role = user.role
    if user.status is not None: db_user.status = user.status
    if user.permissions is not None: db_user.permissions = json.dumps(user.permissions)
    
    db.commit()
    db.refresh(db_user)
    return UserResponse(
        id=db_user.id, name=db_user.name, username=db_user.username, 
        role=db_user.role, status=db_user.status, 
        permissions=json.loads(db_user.permissions) if db_user.permissions else []
    )

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Prevenir eliminar el último admin
    if db_user.role == "Administrador":
        admin_count = db.query(models.User).filter(models.User.role == "Administrador").count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="No puedes eliminar al último administrador")
            
    db.delete(db_user)
    db.commit()
    return {"message": "Usuario eliminado"}
