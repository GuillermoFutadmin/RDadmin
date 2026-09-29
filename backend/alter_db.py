import psycopg2

conn_str = "dbname='rdadmin' user='postgres' password='Gd012354R1.' host='localhost'"

def alter_db():
    conn = psycopg2.connect(conn_str)
    conn.autocommit = True
    cur = conn.cursor()
    try:
        cur.execute("ALTER TABLE collaborators ADD COLUMN entry_time VARCHAR;")
        print("entry_time added.")
    except Exception as e:
        print("entry_time error:", e)

    try:
        cur.execute("ALTER TABLE collaborators ADD COLUMN exit_time VARCHAR;")
        print("exit_time added.")
    except Exception as e:
        print("exit_time error:", e)

    conn.close()

if __name__ == "__main__":
    alter_db()
