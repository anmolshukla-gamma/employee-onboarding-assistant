from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE tools ADD COLUMN IF NOT EXISTS provider_key VARCHAR;"))
    conn.commit()

print("Done — provider_key column added to tools table")