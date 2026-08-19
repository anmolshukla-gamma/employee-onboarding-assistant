from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()
users = db.query(User).all()

if not users:
    print("No users found in database")
else:
    print("Users in database:")
    for u in users:
        print(f"ID: {u.id} | Email: {u.email} | Admin: {u.is_admin} | Active: {u.is_active}")

db.close()