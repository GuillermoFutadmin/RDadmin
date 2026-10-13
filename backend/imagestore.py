"""Mueve a Cloudinary las imágenes base64 guardadas dentro de estimation_data.

Regla de oro: nunca se pierde una imagen. Si una subida falla o no se puede
verificar, el base64 original se conserva tal cual en la base de datos.
"""
import base64
import hashlib
import json
import os
import re
import threading
from concurrent.futures import ThreadPoolExecutor

import cloudinary.uploader
from sqlalchemy import text

import models
from database import SessionLocal

DATA_URL_RE = re.compile(r"^data:image/[\w.+-]+;base64,", re.IGNORECASE)
# Imagen "viva" del lienzo: se sobrescribe siempre el mismo recurso para no acumular copias.
LIVE_KEYS = {"croquis_data"}

_cache = {}
_cache_lock = threading.Lock()


def cloudinary_ready():
    return bool(os.environ.get("CLOUDINARY_URL") or (os.environ.get("CLOUDINARY_CLOUD_NAME") and os.environ.get("CLOUDINARY_API_KEY")))


def _decoded_size(data_url):
    payload = data_url.split(",", 1)[1]
    return len(base64.b64decode(payload, validate=False))


def upload_data_url(data_url, live_id=None):
    """Sube un data URL a Cloudinary y devuelve su URL, o None si algo falla (no se reemplaza nada)."""
    digest = hashlib.sha256(data_url.encode("utf-8")).hexdigest()
    cache_key = (digest, live_id)
    with _cache_lock:
        if cache_key in _cache:
            return _cache[cache_key]
    try:
        expected = _decoded_size(data_url)
        public_id = live_id or f"est_{digest[:32]}"
        result = cloudinary.uploader.upload(
            data_url,
            public_id=public_id,
            folder="rdadmin",
            resource_type="image",
            overwrite=bool(live_id),
            invalidate=bool(live_id),
            unique_filename=False,
        )
        url = result.get("secure_url")
        # Verificación: la URL existe y Cloudinary guardó exactamente los mismos bytes.
        if not url or not url.startswith("https://") or result.get("bytes") != expected:
            print(f"[imagestore] verificación fallida ({result.get('bytes')} != {expected}); se conserva el base64")
            return None
    except Exception as exc:
        print(f"[imagestore] error subiendo imagen: {exc}")
        return None
    with _cache_lock:
        _cache[cache_key] = url
    return url


def _collect(node, key, found):
    """Recorre el JSON y anota (contenedor, clave/índice, data_url, es_viva)."""
    if isinstance(node, dict):
        for k, v in node.items():
            if isinstance(v, str) and DATA_URL_RE.match(v):
                found.append((node, k, v, k in LIVE_KEYS))
            else:
                _collect(v, k, found)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            if isinstance(v, str) and DATA_URL_RE.match(v):
                found.append((node, i, v, False))
            else:
                _collect(v, key, found)


def externalize_json(raw, prospect_id):
    """Devuelve (json_nuevo, reemplazadas, fallidas). Si el JSON no es válido lo devuelve igual."""
    if not isinstance(raw, str) or "data:image" not in raw or not cloudinary_ready():
        return raw, 0, 0
    try:
        data = json.loads(raw)
    except ValueError:
        return raw, 0, 0
    found = []
    _collect(data, None, found)
    if not found:
        return raw, 0, 0

    def work(item):
        _, _, value, live = item
        return upload_data_url(value, f"croquis_live_{prospect_id}" if live else None)

    with ThreadPoolExecutor(max_workers=4) as pool:
        urls = list(pool.map(work, found))
    replaced = failed = 0
    for (container, key, _, _), url in zip(found, urls):
        if url:
            container[key] = url
            replaced += 1
        else:
            failed += 1
    if not replaced:
        return raw, 0, failed
    return json.dumps(data, ensure_ascii=False), replaced, failed


def migrate_existing_images():
    """Migra los registros que aún tienen base64. Es idempotente y segura ante ediciones concurrentes."""
    if not cloudinary_ready():
        print("[imagestore] Cloudinary no configurado; no se migra nada")
        return
    db = SessionLocal()
    try:
        rows = db.execute(text(
            "SELECT id FROM prospects WHERE estimation_data LIKE '%data:image%' ORDER BY id"
        )).fetchall()
        for (pid,) in rows:
            original = db.execute(text("SELECT estimation_data FROM prospects WHERE id=:i"), {"i": pid}).scalar()
            if not original:
                continue
            already = db.query(models.ImagesBackup).filter_by(prospect_id=pid, field="estimation_data", original=original).first()
            if not already:
                db.add(models.ImagesBackup(prospect_id=pid, field="estimation_data", original=original))
                db.commit()
            new, replaced, failed = externalize_json(original, pid)
            if not replaced:
                print(f"[imagestore] prospecto {pid}: sin cambios (fallidas={failed})")
                continue
            # Solo se escribe si nadie editó el registro mientras tanto.
            res = db.execute(
                text("UPDATE prospects SET estimation_data=:new WHERE id=:i AND estimation_data=:old"),
                {"new": new, "i": pid, "old": original},
            )
            db.commit()
            print(f"[imagestore] prospecto {pid}: {replaced} imágenes migradas, {failed} pendientes, actualizado={res.rowcount == 1}")
    except Exception as exc:
        db.rollback()
        print(f"[imagestore] error en migración: {exc}")
    finally:
        db.close()


def start_background_migration():
    threading.Thread(target=migrate_existing_images, name="images-migration", daemon=True).start()
