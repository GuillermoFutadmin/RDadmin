import json
import logging
import os
import sys
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker


logger = logging.getLogger(__name__)
ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST = ROOT_DIR / "frontend" / "client-dist"
DATABASE_URL = os.environ.get("CLIENT_PORTAL_DATABASE_URL") or os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("CLIENT_PORTAL_DATABASE_URL or DATABASE_URL must be configured")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
os.environ["DATABASE_URL"] = DATABASE_URL

# The portal uses a dedicated, small connection pool and never opens a write session.
engine = create_engine(DATABASE_URL, pool_size=3, max_overflow=0, pool_timeout=5, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
sys.path.insert(0, str(ROOT_DIR / "backend"))
import models  # noqa: E402

# Ensure any recently-added columns exist in this database instance.
def _safe_alter(sql: str) -> None:
    try:
        with engine.begin() as _conn:
            _conn.execute(text(sql))
    except Exception:  # noqa: BLE001
        pass

_safe_alter("ALTER TABLE prospects ADD COLUMN IF NOT EXISTS other_projects VARCHAR;")
_safe_alter("ALTER TABLE prospects ADD COLUMN IF NOT EXISTS production_days INTEGER;")

app = FastAPI(title="RDadmin Client Portal")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

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
    def _g(key, default=None):
        if isinstance(prospect, dict):
            return prospect.get(key, default)
        if hasattr(prospect, key):
            return getattr(prospect, key, default)
        if hasattr(prospect, "get"):
            return prospect.get(key, default)
        return default

    production_data_raw = _g("production_data")
    try:
        production = json.loads(production_data_raw) if production_data_raw else {}
    except (TypeError, json.JSONDecodeError) as exc:
        logger.exception("Invalid production data for prospect %s", _g("id"))
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

    raw_daily = production.get("daily_advances") if isinstance(production.get("daily_advances"), list) else []
    public_daily = []
    for adv in raw_daily:
        if not isinstance(adv, dict):
            continue
        # Sólo incluir fotos que el taller marcó para ver el cliente (published es True o no es False)
        if adv.get("published") is False:
            continue
        photo_url = safe_photo_url(adv.get("url"))
        if not photo_url:
            continue
        public_daily.append({
            "id": adv.get("id"),
            "url": photo_url,
            "date": adv.get("date"),
            "comment": adv.get("comment") if isinstance(adv.get("comment"), str) else "",
            "created_at": adv.get("created_at"),
        })

    # Ordenar las fotos diarias por fecha descendente
    public_daily.sort(key=lambda a: (a.get("date") or "", a.get("created_at") or ""), reverse=True)

    current_stage = production.get("current_stage", 0)
    if not isinstance(current_stage, int) or isinstance(current_stage, bool):
        current_stage = 0
    current_stage = max(0, min(current_stage, 5))
    has_production = bool(production_data_raw)

    capture_d = _g("capture_date")
    contract_d = _g("contract_date")
    delivery_d = _g("delivery_date")

    return {
        "id": _g("id"),
        "name": _g("name"),
        "public_id": _g("public_id"),
        "project_type": _g("project_type"),
        "project_type_other": _g("project_type_other"),
        "other_projects": _g("other_projects"),
        "restoration_details": _g("restoration_details"),
        "quote_description": _g("quote_description"),
        "project_priorities": _g("project_priorities"),
        "expectations": _g("expectations"),
        "capture_date": capture_d.isoformat() if hasattr(capture_d, "isoformat") else capture_d,
        "contract_date": contract_d.isoformat() if hasattr(contract_d, "isoformat") else contract_d,
        "delivery_date": delivery_d.isoformat() if hasattr(delivery_d, "isoformat") else (str(delivery_d) if delivery_d else None),
        "status": _g("status"),
        "is_contract": bool(_g("is_contract")),
        "has_quote": bool(_g("has_quote")),
        "valuation_data": bool(_g("valuation_data")),
        "production_days": _g("production_days") or production.get("planned_days"),
        "render_pdf_path": _g("render_pdf_path"),
        "render_image_path": _g("render_image_path"),
        "render_applies": bool(_g("render_applies")),
        "has_render_pdf": bool(_g("render_pdf_path") or _g("render_pdf_data")),
        "production_data": {
            "started_at": production.get("started_at"),
            "delivered_at": production.get("delivered_at"),
            "current_stage": current_stage,
            "stages": public_stages,
            "daily_advances": public_daily,
        } if has_production else None,
    }


@app.post("/api/client-portal/login")
def client_portal_login(req: ClientPortalLogin, db: Session = Depends(get_db)):
    try:
        public_id = req.public_id.strip().upper()
        password = req.password.strip()
        if not public_id or not password:
            raise HTTPException(status_code=401, detail="ID o contraseña incorrectos")

        cols_all = (
            "id, public_id, contract_password, name, project_type, project_type_other, "
            "other_projects, restoration_details, quote_description, project_priorities, "
            "expectations, capture_date, contract_date, delivery_date, status, is_contract, "
            "has_quote, valuation_data, production_data, production_days, "
            "render_pdf_path, render_image_path, render_applies, render_pdf_data"
        )
        cols_base = (
            "id, public_id, contract_password, name, project_type, project_type_other, "
            "restoration_details, quote_description, project_priorities, expectations, "
            "capture_date, contract_date, delivery_date, status, is_contract, has_quote, "
            "valuation_data, production_data, production_days, "
            "render_pdf_path, render_image_path, render_applies"
        )
        cols_fallback = (
            "id, public_id, contract_password, name, project_type, project_type_other, "
            "restoration_details, quote_description, project_priorities, expectations, "
            "capture_date, contract_date, delivery_date, status, is_contract, has_quote, "
            "valuation_data, production_data"
        )

        row = None
        try:
            sql = f"SELECT {cols_all} FROM prospects WHERE UPPER(TRIM(public_id)) = :pid AND (contract_password = :pwd OR TRIM(contract_password) = :pwd) LIMIT 1"
            row = db.execute(text(sql), {"pid": public_id, "pwd": password}).mappings().first()
        except Exception as e1:
            logger.warning("Query con other_projects y production_days falló (%s), intentando cols_base", e1)
            try:
                db.rollback()
            except Exception:
                pass
            try:
                sql2 = f"SELECT {cols_base} FROM prospects WHERE UPPER(TRIM(public_id)) = :pid AND (contract_password = :pwd OR TRIM(contract_password) = :pwd) LIMIT 1"
                row = db.execute(text(sql2), {"pid": public_id, "pwd": password}).mappings().first()
            except Exception as e2:
                logger.warning("Query con cols_base falló (%s), intentando cols_fallback", e2)
                try:
                    db.rollback()
                except Exception:
                    pass
                try:
                    sql3 = f"SELECT {cols_fallback} FROM prospects WHERE UPPER(TRIM(public_id)) = :pid AND (contract_password = :pwd OR TRIM(contract_password) = :pwd) LIMIT 1"
                    row = db.execute(text(sql3), {"pid": public_id, "pwd": password}).mappings().first()
                except Exception as e3:
                    logger.error("Error consultando prospectos en client portal: %s", e3)
                    raise HTTPException(status_code=500, detail="Error de conexión a la base de datos al validar el acceso.")

        if not row:
            raise HTTPException(status_code=401, detail="ID o contraseña incorrectos")

        return client_project(dict(row))
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error en client_portal_login: %s", exc)
        return JSONResponse({"detail": f"Error interno: {str(exc)}"}, status_code=500)


@app.get("/api/client-portal/{public_id}/render-pdf")
def client_portal_render_pdf(public_id: str, db: Session = Depends(get_db)):
    pid = public_id.strip().upper()
    sql = "SELECT id, render_pdf_data, render_pdf_path FROM prospects WHERE UPPER(TRIM(public_id)) = :pid LIMIT 1"
    try:
        row = db.execute(text(sql), {"pid": pid}).mappings().first()
    except Exception as e:
        logger.error("Error buscando render PDF para %s: %s", pid, e)
        raise HTTPException(status_code=500, detail="Error de base de datos")

    if not row:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    pdf_data = row.get("render_pdf_data")
    if pdf_data:
        return Response(
            content=bytes(pdf_data),
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="render_{pid}.pdf"'}
        )

    pdf_url = row.get("render_pdf_path")
    if pdf_url:
        if pdf_url.startswith("http"):
            return RedirectResponse(url=pdf_url)
        # Si es ruta local
        return RedirectResponse(url=pdf_url)

    raise HTTPException(status_code=404, detail="Este proyecto no tiene render PDF")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def portal_index():
    return FileResponse(FRONTEND_DIST / "client.html", headers={"Cache-Control": "no-cache"})


@app.get("/{asset_path:path}")
def portal_assets(asset_path: str):
    candidate = (FRONTEND_DIST / asset_path).resolve()
    if candidate.is_relative_to(FRONTEND_DIST.resolve()) and candidate.is_file():
        return FileResponse(candidate)
    return FileResponse(FRONTEND_DIST / "client.html", headers={"Cache-Control": "no-cache"})
