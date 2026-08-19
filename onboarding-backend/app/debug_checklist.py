from app.database import SessionLocal
from app.models.checklist import Checklist, ChecklistItem
from app.models.role import Role

db = SessionLocal()

print("=== ROLES ===")
roles = db.query(Role).all()
for r in roles:
    print(f"Role ID={r.id} | {r.name}")

print("\n=== CHECKLISTS ===")
checklists = db.query(Checklist).all()
if not checklists:
    print("NO CHECKLISTS FOUND")
else:
    for c in checklists:
        print(f"Checklist ID={c.id} | role_id={c.role_id} | {c.title}")

print("\n=== ITEMS (first 30) ===")
items = db.query(ChecklistItem).order_by(ChecklistItem.checklist_id, ChecklistItem.order).limit(30).all()
if not items:
    print("NO ITEMS FOUND")
else:
    for i in items:
        print(f"Item ID={i.id} | checklist_id={i.checklist_id} | order={i.order} | {i.title}")

db.close()