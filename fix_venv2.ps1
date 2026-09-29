Write-Host "Re-creando venv (sin pip para evitar cuelgue)..."
& "C:\Users\Xtender TdC R1\AppData\Local\Programs\Python\Python312\python.exe" -m venv "D:\RDadmin\backend\venv" --without-pip

Write-Host "Instalando pip manualmente..."
Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile "D:\RDadmin\backend\get-pip.py"
& "D:\RDadmin\backend\venv\Scripts\python.exe" "D:\RDadmin\backend\get-pip.py"

Write-Host "Instalando dependencias..."
& "D:\RDadmin\backend\venv\Scripts\python.exe" -m pip install fastapi==0.115.12 starlette==0.41.2 uvicorn[standard] sqlalchemy psycopg2-binary python-multipart pydantic --quiet
Write-Host "Hecho"
