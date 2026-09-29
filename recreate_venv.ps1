$python = "C:\Users\Xtender TdC R1\AppData\Local\Programs\Python\Python312\python.exe"
Write-Host "Borrando venv corrupto..."
Remove-Item -Recurse -Force "D:\RDadmin\backend\venv" -ErrorAction SilentlyContinue
Write-Host "Creando venv limpio..."
& $python -m venv "D:\RDadmin\backend\venv"
Write-Host "Instalando dependencias..."
& "D:\RDadmin\backend\venv\Scripts\python.exe" -m pip install --upgrade pip
& "D:\RDadmin\backend\venv\Scripts\python.exe" -m pip install fastapi==0.115.12 "starlette==0.41.2" uvicorn[standard] sqlalchemy psycopg2-binary python-multipart pydantic
Write-Host "LISTO"
