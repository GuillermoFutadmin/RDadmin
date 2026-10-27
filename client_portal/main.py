import json
import logging
import os
import sys
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Request
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
_safe_alter("ALTER TABLE prospects ADD COLUMN IF NOT EXISTS render_pdf_path VARCHAR;")
_safe_alter("ALTER TABLE prospects ADD COLUMN IF NOT EXISTS render_image_path VARCHAR;")
_safe_alter("ALTER TABLE prospects ADD COLUMN IF NOT EXISTS render_applies BOOLEAN;")
_safe_alter("ALTER TABLE prospects ADD COLUMN IF NOT EXISTS render_pdf_data BYTEA;")

app = FastAPI(title="RDadmin Client Portal")
from web_security import security_headers
app.middleware("http")(security_headers)

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
        # Prefer public URL prefix if configured, otherwise serve relative
        # (the portal proxy endpoint /uploads/{path} covers local files)
        public_url = os.environ.get("RDADMIN_PUBLIC_URL", "").rstrip("/")
        return f"{public_url}{value}" if public_url else value
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
        valid_photos = []
        for photo in photos:
            if isinstance(photo, dict):
                p_url = safe_photo_url(photo.get("url"))
                if p_url:
                    valid_photos.append({
                        "url": p_url,
                        "uploaded_at": photo.get("uploaded_at"),
                    })
            elif isinstance(photo, str):
                p_url = safe_photo_url(photo)
                if p_url:
                    valid_photos.append({"url": p_url})
        public_stages.append({
            "entered_at": stage.get("entered_at"),
            "note": stage.get("note") if isinstance(stage.get("note"), str) else None,
            "photos": valid_photos,
        })

    while len(public_stages) < 6:
        public_stages.append({"entered_at": None, "note": None, "photos": []})

    current_stage = production.get("current_stage", 0)
    if not isinstance(current_stage, int) or isinstance(current_stage, bool):
        current_stage = 0
    current_stage = max(0, min(current_stage, 5))
    has_production = bool(production_data_raw)

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

        adv_stage = adv.get("stage")
        adv_created = str(adv.get("created_at") or adv.get("date") or "")
        adv_date_only = str(adv.get("date") or adv.get("created_at") or "")[:10]

        matched_stage = 2
        if isinstance(stages, list) and len(stages) >= 6 and adv_created:
            for s_i in range(len(stages) - 1, 1, -1):
                s_item = stages[s_i]
                if isinstance(s_item, dict):
                    s_ent = str(s_item.get("entered_at") or "")
                    if s_ent:
                        if len(s_ent) > 10 and len(adv_created) > 10:
                            if s_ent <= adv_created:
                                matched_stage = s_i
                                break
                        elif s_ent[:10] < adv_date_only:
                            matched_stage = s_i
                            break
                        elif s_ent[:10] == adv_date_only and s_i == 2:
                            matched_stage = 2
                            break

        if adv_stage is None or adv_stage == current_stage:
            adv_stage = matched_stage

        try:
            adv_stage = max(0, min(int(adv_stage), 5))
        except (ValueError, TypeError):
            adv_stage = matched_stage

        public_daily.append({
            "id": adv.get("id"),
            "url": photo_url,
            "date": adv.get("date"),
            "comment": adv.get("comment") if isinstance(adv.get("comment"), str) else "",
            "stage": adv_stage,
            "created_at": adv.get("created_at"),
        })

    # Ordenar las fotos diarias por fecha descendente
    public_daily.sort(key=lambda a: (a.get("date") or "", a.get("created_at") or ""), reverse=True)

    # Procesar sub-proyectos / áreas (work_items) con sus fotos y avances
    raw_work_items = production.get("work_items") if isinstance(production.get("work_items"), list) else []
    public_work_items = []
    for wi in raw_work_items:
        if not isinstance(wi, dict):
            continue
        wi_prod = wi.get("production_data") if isinstance(wi.get("production_data"), dict) else {}
        wi_stages_raw = wi_prod.get("stages") if isinstance(wi_prod.get("stages"), list) else []
        wi_stages = []
        for st in wi_stages_raw:
            if not isinstance(st, dict):
                continue
            st_photos = st.get("photos") if isinstance(st.get("photos"), list) else []
            valid_st_photos = []
            for p in st_photos:
                p_url = safe_photo_url(p.get("url") if isinstance(p, dict) else p)
                if p_url:
                    valid_st_photos.append({
                        "url": p_url,
                        "uploaded_at": p.get("uploaded_at") if isinstance(p, dict) else None,
                    })
            wi_stages.append({
                "name": st.get("name"),
                "entered_at": st.get("entered_at"),
                "note": st.get("note"),
                "photos": valid_st_photos,
            })
        wi_daily_raw = wi_prod.get("daily_advances") if isinstance(wi_prod.get("daily_advances"), list) else []
        wi_daily = []
        for adv in wi_daily_raw:
            if not isinstance(adv, dict) or adv.get("published") is False:
                continue
            p_url = safe_photo_url(adv.get("url"))
            if not p_url:
                continue
            wi_daily.append({
                "id": adv.get("id"),
                "url": p_url,
                "date": adv.get("date"),
                "comment": adv.get("comment", "") if isinstance(adv.get("comment"), str) else "",
                "stage": adv.get("stage"),
                "created_at": adv.get("created_at"),
            })
        public_work_items.append({
            "id": wi.get("id"),
            "name": wi.get("name"),
            "type": wi.get("type"),
            "measurements": wi.get("measurements"),
            "notes": wi.get("notes"),
            "status": wi.get("status"),
            "production_data": {
                "started_at": wi_prod.get("started_at"),
                "delivered_at": wi_prod.get("delivered_at"),
                "current_stage": wi_prod.get("current_stage", 0),
                "stages": wi_stages,
                "daily_advances": wi_daily,
            },
        })

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
        "render_pdf_path": _g("render_pdf_path") or production.get("render_pdf_path"),
        "render_image_path": _g("render_image_path") or production.get("render_image_path"),
        "render_applies": bool(_g("render_applies") or production.get("render_applies") or _g("render_pdf_path") or production.get("render_pdf_path") or _g("render_image_path") or production.get("render_image_path")),
        "has_render_pdf": bool(_g("has_render_pdf") or _g("render_pdf_path") or production.get("render_pdf_path") or _g("render_pdf_data")),
        "production_data": {
            "started_at": production.get("started_at"),
            "delivered_at": production.get("delivered_at"),
            "current_stage": current_stage,
            "stages": public_stages,
            "daily_advances": public_daily,
            "work_items": public_work_items,
        },
        # linked_projects is populated at login time when the client has multiple contracts
        "linked_projects": [],
    }


@app.on_event("startup")
async def startup_client_portal_migrations():
    statements = [
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS other_projects VARCHAR;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS production_days INTEGER;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS render_pdf_path VARCHAR;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS render_image_path VARCHAR;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS render_applies BOOLEAN;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS render_pdf_data BYTEA;"
    ]
    for sql in statements:
        try:
            with engine.begin() as conn:
                conn.execute(text(sql))
        except Exception as e:
            logger.info("Startup migration: %s (%s)", sql[:40], e)


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
            "render_pdf_path, render_image_path, render_applies, "
            "CASE WHEN render_pdf_data IS NOT NULL THEN TRUE ELSE FALSE END AS has_render_pdf"
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

        def _fetch_rows(sql: str, params: dict) -> list:
            """Execute a query and return all matched rows as dicts, trying each fallback."""
            try:
                return [dict(r) for r in db.execute(text(sql), params).mappings().all()]
            except Exception as exc:
                logger.warning("Query falló (%s)", exc)
                return []

        rows: list = []
        params_id = {"pid": public_id, "pwd": password}

        # Attempt 1: full cols — primary lookup by public_id
        rows = _fetch_rows(
            f"SELECT {cols_all} FROM prospects "
            "WHERE UPPER(TRIM(public_id)) = :pid "
            "AND (contract_password = :pwd OR TRIM(contract_password) = :pwd) "
            "AND (is_papelera IS NULL OR is_papelera = FALSE) "
            "ORDER BY capture_date ASC",
            params_id,
        )

        # Attempt 2: same but without render_pdf_data
        if not rows:
            db2 = SessionLocal()
            try:
                rows = [dict(r) for r in db2.execute(
                    text(f"SELECT {cols_base} FROM prospects "
                         "WHERE UPPER(TRIM(public_id)) = :pid "
                         "AND (contract_password = :pwd OR TRIM(contract_password) = :pwd) "
                         "AND (is_papelera IS NULL OR is_papelera = FALSE) "
                         "ORDER BY capture_date ASC"),
                    params_id,
                ).mappings().all()]
            except Exception as e2:
                logger.warning("Query cols_base falló (%s), intentando fallback", e2)
            finally:
                db2.close()

        # Attempt 3: minimal columns
        if not rows:
            db3 = SessionLocal()
            try:
                rows = [dict(r) for r in db3.execute(
                    text(f"SELECT {cols_fallback} FROM prospects "
                         "WHERE UPPER(TRIM(public_id)) = :pid "
                         "AND (contract_password = :pwd OR TRIM(contract_password) = :pwd) "
                         "ORDER BY capture_date ASC"),
                    params_id,
                ).mappings().all()]
            except Exception as e3:
                logger.error("Error consultando prospectos en client portal: %s", e3)
                raise HTTPException(status_code=500, detail="Error de conexión a la base de datos al validar el acceso.")
            finally:
                db3.close()

        if not rows:
            raise HTTPException(status_code=401, detail="ID o contraseña incorrectos")

        # Primary project (the one whose public_id was entered)
        primary_row = next((r for r in rows if r.get("public_id", "").upper() == public_id), rows[0])
        primary = client_project(primary_row)

        # --- Sibling projects: same client_name + same password, different public_id ---
        sibling_rows: list = []
        client_name = primary_row.get("name") or ""
        if client_name:
            params_name = {"cname": client_name.strip(), "pwd": password}
            try:
                sibling_rows = [dict(r) for r in db.execute(
                    text(f"SELECT {cols_all} FROM prospects "
                         "WHERE LOWER(TRIM(name)) = LOWER(TRIM(:cname)) "
                         "AND (contract_password = :pwd OR TRIM(contract_password) = :pwd) "
                         "AND UPPER(TRIM(public_id)) != :excl "
                         "AND (is_papelera IS NULL OR is_papelera = FALSE) "
                         "ORDER BY capture_date ASC"),
                    {**params_name, "excl": public_id},
                ).mappings().all()]
            except Exception as sib_err:
                logger.warning("Could not fetch sibling projects for %s: %s", client_name, sib_err)

        linked = [client_project(r) for r in sibling_rows]
        # Remove linked_projects nesting inside each sibling to avoid circular data
        for p in linked:
            p["linked_projects"] = []

        primary["linked_projects"] = linked
        return primary
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error en client_portal_login: %s", exc)
        return JSONResponse({"detail": f"Error interno: {str(exc)}"}, status_code=500)


@app.api_route("/api/client-portal/{public_id}/render-pdf", methods=["GET", "HEAD"])
def client_portal_render_pdf(public_id: str, request: Request):
    pid = public_id.strip().upper()
    row = None
    has_bytea = True

    # Attempt 1: with render_pdf_data (BYTEA) - fresh session
    db1 = SessionLocal()
    try:
        sql = "SELECT id, (render_pdf_data IS NOT NULL) AS has_data, render_pdf_data, render_pdf_path, render_image_path FROM prospects WHERE UPPER(TRIM(public_id)) = :pid LIMIT 1"
        row = db1.execute(text(sql), {"pid": pid}).mappings().first()
    except Exception as e1:
        logger.warning("render-pdf query1 falló para %s: %s", pid, e1)
        has_bytea = False
    finally:
        db1.close()

    # Attempt 2: without render_pdf_data - fresh session
    if row is None:
        db2 = SessionLocal()
        try:
            sql2 = "SELECT id, render_pdf_path, render_image_path, production_data FROM prospects WHERE UPPER(TRIM(public_id)) = :pid LIMIT 1"
            row = db2.execute(text(sql2), {"pid": pid}).mappings().first()
        except Exception as e2:
            logger.warning("render-pdf query2 (fallback) falló para %s: %s", pid, e2)
        finally:
            db2.close()

    # Attempt 3: query only production_data (100% guaranteed accessible to restricted DB roles)
    if row is None:
        db3 = SessionLocal()
        try:
            sql3 = "SELECT id, production_data FROM prospects WHERE UPPER(TRIM(public_id)) = :pid LIMIT 1"
            row3 = db3.execute(text(sql3), {"pid": pid}).mappings().first()
            if row3:
                row = dict(row3)
        except Exception as e3:
            logger.warning("render-pdf query3 (production_data fallback) falló para %s: %s", pid, e3)
        finally:
            db3.close()

    if not row:
        raise HTTPException(status_code=404, detail="Proyecto o render no encontrado")

    # If row was found via fallback, inspect production_data JSON for render urls
    prod_raw = row.get("production_data")
    prod_dict = {}
    if prod_raw:
        try:
            prod_dict = json.loads(prod_raw) if isinstance(prod_raw, str) else (prod_raw if isinstance(prod_raw, dict) else {})
        except Exception:
            prod_dict = {}

    has_data = bool(row.get("has_data")) if has_bytea else False
    pdf_url = row.get("render_pdf_path") or prod_dict.get("render_pdf_path")
    img_url = row.get("render_image_path") or prod_dict.get("render_image_path")
    if img_url:
        img_url = img_url.split(",")[0].strip()
    pdf_data = row.get("render_pdf_data") if has_bytea else None

    if not has_data and not pdf_url and not img_url and not pdf_data:
        raise HTTPException(status_code=404, detail="Este proyecto no tiene render PDF")

    if request.method == "HEAD":
        return Response(
            status_code=200,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="render_{pid}.pdf"'}
        )

    # Serve BYTEA data directly
    if pdf_data:
        return Response(
            content=bytes(pdf_data),
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="render_{pid}.pdf"'}
        )

    # Serve via URL (Cloudinary or local)
    serve_url = pdf_url or img_url
    if serve_url:
        if serve_url.startswith("http"):
            return RedirectResponse(url=serve_url)
        if serve_url.startswith("/uploads/"):
            local_path = (ROOT_DIR / serve_url.lstrip("/")).resolve()
            if local_path.is_file():
                return FileResponse(local_path, media_type="application/pdf")
        return RedirectResponse(url=serve_url)

    raise HTTPException(status_code=404, detail="Este proyecto no tiene render PDF")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/uploads/{file_path:path}")
def portal_serve_upload(file_path: str):
    """Proxy endpoint: serve locally stored upload files so the portal can
    display photos that were saved to /uploads/ instead of Cloudinary."""
    candidate = (ROOT_DIR / "uploads" / file_path).resolve()
    # Security: ensure the resolved path stays inside the uploads directory
    uploads_root = (ROOT_DIR / "uploads").resolve()
    if not str(candidate).startswith(str(uploads_root)):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    if not candidate.is_file():
        # Try backend/uploads/ fallback (local dev layout)
        candidate2 = (ROOT_DIR / "backend" / "uploads" / file_path).resolve()
        uploads_root2 = (ROOT_DIR / "backend" / "uploads").resolve()
        if str(candidate2).startswith(str(uploads_root2)) and candidate2.is_file():
            candidate = candidate2
        else:
            raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(candidate)


@app.get("/")
def portal_index():
    return FileResponse(FRONTEND_DIST / "client.html", headers={"Cache-Control": "no-cache"})


@app.get("/{asset_path:path}")
def portal_assets(asset_path: str):
    candidate = (FRONTEND_DIST / asset_path).resolve()
    if candidate.is_relative_to(FRONTEND_DIST.resolve()) and candidate.is_file():
        return FileResponse(candidate)
    return FileResponse(FRONTEND_DIST / "client.html", headers={"Cache-Control": "no-cache"})
