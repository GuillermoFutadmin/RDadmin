@echo off
echo ===========================================
echo  Configurando entorno de desarrollo RDadmin
echo ===========================================

echo.
echo [1/4] Eliminando venv anterior...
rmdir /s /q "D:\RDadmin\backend\venv"

echo.
echo [2/4] Creando nuevo venv con Python 3.12...
"C:\Users\Xtender TdC R1\AppData\Local\Programs\Python\Python312\python.exe" -m venv "D:\RDadmin\backend\venv"
if errorlevel 1 (
    echo ERROR: No se pudo crear el venv
    pause
    exit /b 1
)
echo Venv creado exitosamente.

echo.
echo [3/4] Instalando dependencias del backend...
call "D:\RDadmin\backend\venv\Scripts\activate"
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-multipart pydantic --upgrade
if errorlevel 1 (
    echo ERROR al instalar dependencias
    pause
    exit /b 1
)
echo Dependencias instaladas.

echo.
echo [4/4] Instalando dependencias del frontend (npm)...
cd /d "D:\RDadmin\frontend"
"C:\Program Files\nodejs\npm.cmd" install
if errorlevel 1 (
    echo ERROR al instalar node_modules
    pause
    exit /b 1
)

echo.
echo ===========================================
echo  LISTO! Todo configurado correctamente.
echo  Ahora puedes usar iniciar.bat normalmente.
echo ===========================================
pause
