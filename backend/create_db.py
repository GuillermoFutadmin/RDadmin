import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

try:
    # Connect to default 'postgres' database to create the new one
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="Gd012354R1.",
        host="localhost"
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # Check if database exists
    cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'rdadmin'")
    exists = cursor.fetchone()
    if not exists:
        cursor.execute("CREATE DATABASE rdadmin")
        print("Database 'rdadmin' created successfully!")
    else:
        print("Database 'rdadmin' already exists.")
        
    cursor.close()
    conn.close()
except Exception as e:
    print(f"An error occurred: {e}")
