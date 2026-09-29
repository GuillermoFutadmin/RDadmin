import psycopg2
try:
    conn = psycopg2.connect('dbname=rdadmin user=postgres password=Gd012354R1. host=localhost')
    print('EXITO')
except Exception as e:
    print('ERROR:', str(e).encode('utf-8'))
