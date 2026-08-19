from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()
user = db.query(User).filter(User.email == "test5@example.com").first()
user.is_admin = True
db.commit()
print("You are now admin")