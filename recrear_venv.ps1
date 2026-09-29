$pythonExe = 'C:\Users\Xtender TdC R1\AppData\Local\Programs\Python\Python312\python.exe'
$venvPath = 'D:\RDadmin\backend\venv'
$pipExe = 'D:\RDadmin\backend\venv\Scripts\pip.exe'

Write-Host "=== Recreando entorno virtual ===" -ForegroundColor Cyan

# Borrar venv anterior
if (Test-Path $venvPath) {
    Write-Host "Borrando venv anterior..." -ForegroundColor Yellow
    Remove-Item -Path $venvPath -Recurse -Force
    Write-Host "Borrado OK" -ForegroundColor Green
}

# Crear venv
Write-Host "Creando venv con Python 3.12..." -ForegroundColor Yellow
& $pythonExe -m venv $venvPath
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR al crear venv: $LASTEXITCODE" -ForegroundColor Red
    exit 1
}
Write-Host "Venv creado OK" -ForegroundColor Green

# Verificar pip
Write-Host "Verificando pip..." -ForegroundColor Yellow
& $pipExe --version
Write-Host "Resultado pip --version: $LASTEXITCODE" -ForegroundColor Cyan

# Instalar dependencias
Write-Host "Instalando dependencias..." -ForegroundColor Yellow
& $pipExe install fastapi uvicorn sqlalchemy psycopg2-binary python-multipart pydantic
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR al instalar dependencias: $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

Write-Host "=== TODO LISTO ===" -ForegroundColor Green
