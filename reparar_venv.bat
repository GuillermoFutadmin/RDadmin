@echo off
echo ============================================
echo  RDadmin - Reparando entorno Python (venv)
echo ============================================
echo.

echo [0/3] Matando procesos Python colgados...
taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /IM python3.exe /T >nul 2>&1
taskkill /F /IM uvicorn.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul
echo      OK

echo.
echo [1/3] Borrando venv corrupto...
rmdir /s /q "D:\RDadmin\backend\venv" >nul 2>&1
timeout /t 2 /nobreak >nul
echo      OK

echo.
echo [2/3] Creando venv nuevo...
"C:\Users\Xtender TdC R1\AppData\Local\Programs\Python\Python312\python.exe" -m venv "D:\RDadmin\backend\venv"
if errorlevel 1 (
    echo      ERROR al crear venv. Intente cerrar todo y volver a ejecutar.
    pause
    exit /b 1
)
echo      OK

echo.
echo [3/3] Instalando paquetes (FastAPI, uvicorn, etc.)...
"D:\RDadmin\backend\venv\Scripts\python.exe" -m pip install fastapi==0.115.12 starlette==0.41.2 "uvicorn[standard]" sqlalchemy psycopg2-binary python-multipart pydantic
if errorlevel 1 (
    echo      ERROR al instalar paquetes.
    pause
    exit /b 1
)
echo      OK

echo.
echo ============================================
echo  Venv reparado correctamente!
echo  Ahora dale doble clic a iniciar.bat
echo ============================================
pause
