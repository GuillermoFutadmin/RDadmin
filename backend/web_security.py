from urllib.parse import unquote

from starlette.responses import JSONResponse


def sensitive_path(path):
    decoded = unquote(path).replace("\\", "/")
    parts = decoded.lower().split("/")
    return any(part.startswith(".") and part not in ("", ".well-known") for part in parts)


async def security_headers(request, call_next):
    if sensitive_path(request.url.path):
        return JSONResponse({"detail": "Not Found"}, status_code=404)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    return response
