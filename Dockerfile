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

EXPOSE 8000

CMD ["sh", "-c", "cd backend && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
