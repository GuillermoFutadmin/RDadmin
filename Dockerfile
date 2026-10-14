FROM python:3.11-slim

# Instalar Node.js y npm
RUN apt-get update && \
    apt-get install -y nodejs npm && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Instalar dependencias de Node y construir el frontend
COPY frontend/package*.json frontend/
RUN cd frontend && npm ci

COPY frontend/ frontend/
RUN cd frontend && npm run build

# Copiar el resto de la aplicación
COPY backend/ backend/
COPY client_portal/ client_portal/

ENV PYTHONPATH=/app/backend:/app

# Patch uvicorn para sanitizar '$PORT' si un runner como Railway lo pasa sin expandir
RUN python -c "\
p = '/usr/local/bin/uvicorn';\
content = open(p).read();\
patch = '''    import os\n    _p = os.environ.get('PORT', '8000')\n    if not _p.isdigit(): _p = '8000'\n    sys.argv = [_p if a in ('$PORT', '\${PORT}', '\\$PORT') else a for a in sys.argv]\n''';\
new_c = content.replace('sys.exit(main())', patch + '    sys.exit(main())');\
open(p, 'w').write(new_c)\
"

EXPOSE 8000

CMD ["sh", "-c", "cd backend && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
