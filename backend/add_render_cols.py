"""Add render columns via raw psql on Railway"""
import os, subprocess, sys

db_url = os.environ.get("DATABASE_URL", "")
# Parse or just use psql directly if available

cols = [
    "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS render_applies BOOLEAN;",
    "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS render_price REAL;",
    "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS render_total_price REAL;",
    "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS render_image_path VARCHAR;",
]

sql = "\n".join(cols)
print("SQL to run on Railway database:")
print(sql)
print("\nThis migration will be applied automatically via Railway on next deploy.")
print("The backend uses SQLAlchemy with create_all on startup - adding columns won't auto-run.")
print("You need to run this via the Railway database console or psql.")
