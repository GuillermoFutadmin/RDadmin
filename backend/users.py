from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import json

from database import engine, get_db
import models
from auth import (hash_password, verify_password_hash, needs_rehash, create_token,
                  login_blocked, login_failed, login_ok)

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
    photo_path: Optional[str] = None

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

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

def _require_admin(request: Request):
    if getattr(request.state, "role", None) != "Administrador":
        raise HTTPException(status_code=403, detail="Se requiere rol Administrador")


@router.post("/login")
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    create_initial_admin(db)
    key = f"{(request.client.host if request.client else '')}|{req.username.lower()}"
    if login_blocked(key):
        raise HTTPException(status_code=429, detail="Demasiados intentos. Espera unos minutos.")
    user = db.query(models.User).filter(models.User.username == req.username).first()
    if not user or not verify_password_hash(req.password, user.password_hash):
        login_failed(key)
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    if user.status != "Activo":
        raise HTTPException(status_code=403, detail="La cuenta está inactiva")
    login_ok(key)
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(req.password)
        db.commit()

    return {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "role": user.role,
        "photo_path": user.photo_path,
        "permissions": json.loads(user.permissions) if user.permissions else [],
        "token": create_token(user.id, user.role)
    }

class VerifyPasswordRequest(BaseModel):
    user_id: Optional[int] = None
    username: Optional[str] = None
    password: str

@router.post("/verify-password")
def verify_password(req: VerifyPasswordRequest, request: Request, db: Session = Depends(get_db)):
    # Solo se puede verificar la contraseña de la propia sesión (o de cualquiera si es admin).
    user = None
    if req.user_id:
        user = db.query(models.User).filter(models.User.id == req.user_id).first()
    elif req.username:
        user = db.query(models.User).filter(models.User.username == req.username).first()
    if user and user.id != getattr(request.state, "user_id", None):
        _require_admin(request)

    if not user or not verify_password_hash(req.password, user.password_hash):
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
            photo_path=u.photo_path,
            permissions=json.loads(u.permissions) if u.permissions else []
        ))
    return res

@router.post("/", response_model=UserResponse)
def create_user(user: UserCreate, request: Request, db: Session = Depends(get_db)):
    _require_admin(request)
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
        photo_path=new_user.photo_path,
        permissions=json.loads(new_user.permissions)
    )

@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user: UserUpdate, request: Request, db: Session = Depends(get_db)):
    if getattr(request.state, "role", None) != "Administrador":
        # Un usuario normal solo puede editar su propio nombre y contraseña.
        if user_id != getattr(request.state, "user_id", None):
            raise HTTPException(status_code=403, detail="Se requiere rol Administrador")
        user = UserUpdate(name=user.name, password=user.password)
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
        photo_path=db_user.photo_path,
        permissions=json.loads(db_user.permissions) if db_user.permissions else []
    )

@router.delete("/{user_id}")
def delete_user(user_id: int, request: Request, db: Session = Depends(get_db)):
    _require_admin(request)
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
