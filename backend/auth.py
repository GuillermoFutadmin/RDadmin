import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from fastapi import Request
from fastapi.responses import JSONResponse

TOKEN_TTL_SECONDS = 12 * 60 * 60
PBKDF2_ITERATIONS = 200_000

# Rutas /api/* que se pueden usar sin sesión.
PUBLIC_PATHS = {"/api/users/login"}


def _secret() -> bytes:
    configured = os.environ.get("AUTH_SECRET")
    if configured:
        return configured.encode()
    # Sin AUTH_SECRET se deriva de valores estables del entorno para que los tokens
    # sobrevivan a un reinicio. Conviene definir AUTH_SECRET en Railway.
    seed = (os.environ.get("DATABASE_URL", "") or "rdadmin") + os.environ.get("CLOUDINARY_URL", "")
    return hashlib.sha256(("rdadmin-auth:" + seed).encode()).digest()


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def create_token(user_id: int, role: str) -> str:
    payload = _b64(json.dumps({"uid": user_id, "role": role, "exp": int(time.time()) + TOKEN_TTL_SECONDS}).encode())
    sig = _b64(hmac.new(_secret(), payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{sig}"


def verify_token(token: str):
    try:
        payload, sig = token.split(".", 1)
        expected = _b64(hmac.new(_secret(), payload.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        data = json.loads(_unb64(payload))
        if data.get("exp", 0) < time.time():
            return None
        return data
    except Exception:
        return None


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ITERATIONS).hex()
    return f"pbkdf2${PBKDF2_ITERATIONS}${salt}${digest}"


def verify_password_hash(password: str, stored: str) -> bool:
    if not stored:
        return False
    if stored.startswith("pbkdf2$"):
        try:
            _, iterations, salt, digest = stored.split("$")
            candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iterations)).hex()
            return hmac.compare_digest(candidate, digest)
        except Exception:
            return False
    # Formato anterior (SHA-256 sin sal); se actualiza al iniciar sesión.
    return hmac.compare_digest(hashlib.sha256(password.encode()).hexdigest(), stored)


def needs_rehash(stored: str) -> bool:
    return not (stored or "").startswith("pbkdf2$")


async def auth_middleware(request: Request, call_next):
    path = request.url.path
    if request.method == "OPTIONS" or not path.startswith("/api/") or path in PUBLIC_PATHS:
        return await call_next(request)

    header = request.headers.get("authorization", "")
    claims = verify_token(header[7:]) if header.lower().startswith("bearer ") else None
    if not claims:
        return JSONResponse({"detail": "Sesión no válida o expirada"}, status_code=401)

    if path.startswith("/api/admin/") and claims.get("role") != "Administrador":
        return JSONResponse({"detail": "Se requiere rol Administrador"}, status_code=403)

    request.state.user_id = claims["uid"]
    request.state.role = claims.get("role")
    return await call_next(request)


# Límite simple de intentos fallidos de inicio de sesión (en memoria).
_failed = {}
MAX_ATTEMPTS = 6
LOCK_SECONDS = 300


def login_blocked(key: str) -> bool:
    count, first = _failed.get(key, (0, 0))
    if count >= MAX_ATTEMPTS and time.time() - first < LOCK_SECONDS:
        return True
    if time.time() - first >= LOCK_SECONDS:
        _failed.pop(key, None)
    return False


def login_failed(key: str):
    count, first = _failed.get(key, (0, time.time()))
    _failed[key] = (count + 1, first)


def login_ok(key: str):
    _failed.pop(key, None)
