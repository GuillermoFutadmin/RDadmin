from database import engine
from sqlalchemy import text

print("Altering database...")
with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE prospects ADD COLUMN contract_password VARCHAR;"))
        print("contract_password added")
    except Exception as e:
        print(f"Error adding contract_password: {e}")

print("Done.")
