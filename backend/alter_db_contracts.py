from database import engine
from sqlalchemy import text

print("Altering database...")
with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE prospects ADD COLUMN is_contract BOOLEAN DEFAULT FALSE;"))
        print("is_contract added")
    except Exception as e:
        print(f"Error adding is_contract: {e}")

    try:
        conn.execute(text("ALTER TABLE prospects ADD COLUMN is_papelera BOOLEAN DEFAULT FALSE;"))
        print("is_papelera added")
    except Exception as e:
        print(f"Error adding is_papelera: {e}")

    try:
        conn.execute(text("ALTER TABLE prospects ADD COLUMN contract_date TIMESTAMP;"))
        print("contract_date added")
    except Exception as e:
        print(f"Error adding contract_date: {e}")

    try:
        conn.execute(text("ALTER TABLE prospects ADD COLUMN estimation_data VARCHAR;"))
        print("estimation_data added")
    except Exception as e:
        print(f"Error adding estimation_data: {e}")

print("Done.")
