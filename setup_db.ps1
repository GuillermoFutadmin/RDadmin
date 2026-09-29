$env:PGPASSWORD="Gd012354R1."
& "D:\RDadmin\pgsql\bin\psql.exe" -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD 'Gd012354R1.';"
& "D:\RDadmin\pgsql\bin\psql.exe" -U postgres -d postgres -c "CREATE DATABASE rdadmin;"
