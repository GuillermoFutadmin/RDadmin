FROM python:3.11-slim

# Instalar Node.js y npm
RUN apt-get update && \
    apt-get install -y nodejs npm && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Wrapper seguro para uvicorn (sustituye $PORT literal por el puerto real)
COPY uvicorn_wrapper.py /usr/local/bin/uvicorn
RUN chmod +x /usr/local/bin/uvicorn

# Instalar dependencias de Node y construir el frontend
COPY frontend/package*.json frontend/
RUN cd frontend && npm ci

COPY frontend/ frontend/
RUN cd frontend && npm run build

# Copiar el resto de la aplicación
COPY backend/ backend/
COPY client_portal/ client_portal/

ENV PYTHONPATH=/app/backend:/app

EXPOSE 8000

CMD ["python", "backend/run.py"]
