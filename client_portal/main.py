import json
import logging
import os
import sys
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


logger = logging.getLogger(__name__)
ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST = ROOT_DIR / "frontend" / "client-dist"
DATABASE_URL = os.environ.get("CLIENT_PORTAL_DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("CLIENT_PORTAL_DATABASE_URL must be configured with a read-only database account")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
os.environ["DATABASE_URL"] = DATABASE_URL

# The portal uses a dedicated, small connection pool and never opens a write session.
engine = create_engine(DATABASE_URL, pool_size=3, max_overflow=0, pool_timeout=5, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
sys.path.insert(0, str(ROOT_DIR / "backend"))
import models  # noqa: E402

app = FastAPI(title="RDadmin Client Portal")

app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ClientPortalLogin(BaseModel):
    public_id: str = Field(min_length=1, max_length=32)
    password: str = Field(min_length=1, max_length=128)


def safe_photo_url(value: object) -> Optional[str]:
    if not isinstance(value, str) or not value:
        return None
    if value.startswith(("https://", "http://")):
        return value
    if value.startswith("/uploads/"):
        public_url = os.environ.get("RDADMIN_PUBLIC_URL", "").rstrip("/")
        return f"{public_url}{value}" if public_url else None
    return None


def client_project(prospect):
    try:
        production = json.loads(prospect.production_data) if prospect.production_data else {}
    except (TypeError, json.JSONDecodeError) as exc:
        logger.exception("Invalid production data for prospect %s", prospect.id)
        raise HTTPException(status_code=503, detail="El avance del proyecto no está disponible temporalmente") from exc
    if not isinstance(production, dict):
        production = {}

    stages = production.get("stages")
    stages = stages if isinstance(stages, list) else []
    if len(stages) == 7:
        first = stages[0] if isinstance(stages[0], dict) else {}
        second = stages[1] if isinstance(stages[1], dict) else {}
        first_photos = first.get("photos") if isinstance(first.get("photos"), list) else []
        second_photos = second.get("photos") if isinstance(second.get("photos"), list) else []
        notes = [note for note in (first.get("note"), second.get("note")) if isinstance(note, str) and note]
        stages = [
            {
                **first,
                "entered_at": first.get("entered_at") or production.get("started_at"),
                "note": "\n".join(notes),
                "photos": first_photos + second_photos,
            },
            *stages[2:],
        ]

    public_stages = []
    for stage in stages[:6]:
        if not isinstance(stage, dict):
            public_stages.append({"entered_at": None, "note": None, "photos": []})
            continue
        photos = stage.get("photos") if isinstance(stage.get("photos"), list) else []
        public_stages.append({
            "entered_at": stage.get("entered_at"),
            "note": stage.get("note") if isinstance(stage.get("note"), str) else None,
            "photos": [
                {
                    "url": safe_photo_url(photo.get("url")),
                    "uploaded_at": photo.get("uploaded_at"),
                } if isinstance(photo, dict) else {"url": safe_photo_url(photo)}
                for photo in photos
                if isinstance(photo, str) or isinstance(photo, dict)
            ],
        })

    current_stage = production.get("current_stage", 0)
    if not isinstance(current_stage, int) or isinstance(current_stage, bool):
        current_stage = 0
    current_stage = max(0, min(current_stage, 5))
    has_production = bool(prospect.production_data)

    return {
        "name": prospect.name,
        "public_id": prospect.public_id,
        "project_type": prospect.project_type,
        "project_type_other": prospect.project_type_other,
        "restoration_details": prospect.restoration_details,
        "quote_description": prospect.quote_description,
        "project_priorities": prospect.project_priorities,
        "expectations": prospect.expectations,
        "capture_date": prospect.capture_date,
        "contract_date": prospect.contract_date,
        "delivery_date": prospect.delivery_date,
        "status": prospect.status,
        "is_contract": bool(prospect.is_contract),
        "has_quote": bool(prospect.has_quote),
        "valuation_data": bool(prospect.valuation_data),
        "production_data": {
            "started_at": production.get("started_at"),
            "delivered_at": production.get("delivered_at"),
            "current_stage": current_stage,
            "stages": public_stages,
        } if has_production else None,
    }


@app.post("/api/client-portal/login")
def client_portal_login(req: ClientPortalLogin, db: Session = Depends(get_db)):
    public_id = req.public_id.strip().upper()
    if not public_id or not req.password:
        raise HTTPException(status_code=401, detail="ID o contraseña incorrectos")

    project = db.query(
        models.Prospect.id,
        models.Prospect.public_id,
        models.Prospect.contract_password,
        models.Prospect.name,
        models.Prospect.project_type,
        models.Prospect.project_type_other,
        models.Prospect.restoration_details,
        models.Prospect.quote_description,
        models.Prospect.project_priorities,
        models.Prospect.expectations,
        models.Prospect.capture_date,
        models.Prospect.contract_date,
        models.Prospect.delivery_date,
        models.Prospect.status,
        models.Prospect.is_contract,
        models.Prospect.has_quote,
        models.Prospect.valuation_data,
        models.Prospect.production_data,
    ).filter(
        models.Prospect.public_id == public_id,
        models.Prospect.contract_password == req.password,
    ).first()
    if not project:
        raise HTTPException(status_code=401, detail="ID o contraseña incorrectos")
    return client_project(project)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def portal_index():
    return FileResponse(FRONTEND_DIST / "client.html")


@app.get("/{asset_path:path}")
def portal_assets(asset_path: str):
    candidate = (FRONTEND_DIST / asset_path).resolve()
    if candidate.is_relative_to(FRONTEND_DIST.resolve()) and candidate.is_file():
        return FileResponse(candidate)
    return FileResponse(FRONTEND_DIST / "client.html")
