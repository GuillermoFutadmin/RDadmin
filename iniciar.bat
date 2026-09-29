@echo off
echo ==========================================
echo   RDadmin - Iniciando Servidores
echo ==========================================

echo.
echo [0/3] Verificando PostgreSQL...
"D:\RDadmin\pgsql\bin\pg_ctl.exe" status -D "D:\RDadmin\pgsql\data" > nul 2>&1
if %errorlevel% neq 0 (
    echo Arrancando PostgreSQL en disco D...
    "D:\RDadmin\pgsql\bin\pg_ctl.exe" start -D "D:\RDadmin\pgsql\data" -l "D:\RDadmin\pgsql\postgres.log" -w
    timeout /t 3 /nobreak > nul
    echo Creando base de datos rdadmin si no existe...
    set PGPASSWORD=postgres
    "D:\RDadmin\pgsql\bin\createdb.exe" -U postgres -h 127.0.0.1 rdadmin > nul 2>&1
) else (
    echo PostgreSQL ya esta corriendo.
)

echo.
echo [1/3] Iniciando Backend (FastAPI en puerto 8001)...
start "Backend FastAPI" cmd /k "cd /d D:\RDadmin\backend && venv\Scripts\python.exe -m uvicorn main:app --reload --port 8001"

echo.
echo [2/3] Iniciando Frontend (Vite)...
start "Frontend Vite" cmd /k "cd /d D:\RDadmin\frontend && npm run dev"

echo.
echo ==========================================
echo  Servidores iniciados!
echo  Backend:  http://localhost:8001/docs
echo  Frontend: http://localhost:5173
echo ==========================================
pause
