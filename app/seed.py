from app.database import SessionLocal
from app.models.role import Role
from app.models.checklist import Checklist, ChecklistItem

db = SessionLocal()

# ======================
# 1. Create Roles
# ======================
roles_data = [
    {"name": "Software Engineer", "description": "Engineering role"},
    {"name": "Sales Executive", "description": "Sales role"},
    {"name": "Human Resources", "description": "HR role"},
]

for r in roles_data:
    existing = db.query(Role).filter(Role.name == r["name"]).first()
    if not existing:
        db.add(Role(**r))

db.commit()
print("Roles created successfully")

# ======================
# 2. Helper function
# ======================
def create_checklist_for_role(role_name: str, checklist_title: str, checklist_description: str, items: list):
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        print(f"Role not found: {role_name}")
        return

    existing_checklist = db.query(Checklist).filter(Checklist.role_id == role.id).first()
    if existing_checklist:
        print(f"Checklist already exists for: {role_name}")
        return

    checklist = Checklist(
        role_id=role.id,
        title=checklist_title,
        description=checklist_description
    )
    db.add(checklist)
    db.commit()
    db.refresh(checklist)

    for item in items:
        db.add(ChecklistItem(
            checklist_id=checklist.id,
            title=item["title"],
            description=item.get("description"),
            category=item.get("category"),
            order=item["order"],
            is_mandatory=item.get("is_mandatory", True)
        ))

    db.commit()
    print(f"Checklist created for: {role_name}")

# ======================
# 3. Software Engineer Checklist
# ======================
create_checklist_for_role(
    role_name="Software Engineer",
    checklist_title="Software Engineer Onboarding",
    checklist_description="Complete these steps to finish your onboarding",
    items=[
        {"title": "Complete IT Setup", "category": "IT", "order": 1},
        {"title": "Set up VPN", "category": "IT", "order": 2},
        {"title": "Get GitHub & Jira Access", "category": "Access", "order": 3},
        {"title": "Set up Development Environment", "category": "Technical", "order": 4},
        {"title": "Read Engineering Handbook", "category": "Learning", "order": 5},
        {"title": "Complete Mandatory Trainings", "category": "Compliance", "order": 6},
        {"title": "Meet Your Buddy & Manager", "category": "People", "order": 7},
    ]
)

# ======================
# 4. Sales Executive Checklist
# ======================
create_checklist_for_role(
    role_name="Sales Executive",
    checklist_title="Sales Executive Onboarding",
    checklist_description="Complete these steps to finish your onboarding",
    items=[
        {"title": "Complete IT Setup", "category": "IT", "order": 1},
        {"title": "Get CRM Access (Salesforce/HubSpot)", "category": "Access", "order": 2},
        {"title": "Complete Product Training", "category": "Learning", "order": 3},
        {"title": "Learn Sales Process & Pipeline", "category": "Process", "order": 4},
        {"title": "Set up Sales Tools", "category": "Tools", "order": 5},
        {"title": "Complete Mandatory Trainings", "category": "Compliance", "order": 6},
        {"title": "Meet Manager & Sales Team", "category": "People", "order": 7},
        {"title": "Review Targets & Territory", "category": "Process", "order": 8},
    ]
)

# ======================
# 5. Human Resources Checklist
# ======================
create_checklist_for_role(
    role_name="Human Resources",
    checklist_title="HR Onboarding",
    checklist_description="Complete these steps to finish your onboarding",
    items=[
        {"title": "Complete IT Setup", "category": "IT", "order": 1},
        {"title": "Get Access to HRMS", "category": "Access", "order": 2},
        {"title": "Learn HR Policies & Employee Handbook", "category": "Learning", "order": 3},
        {"title": "Understand Recruitment Process", "category": "Process", "order": 4},
        {"title": "Learn Employee Lifecycle Processes", "category": "Process", "order": 5},
        {"title": "Complete Mandatory Trainings", "category": "Compliance", "order": 6},
        {"title": "Meet HR Team & Key Stakeholders", "category": "People", "order": 7},
    ]
)

print("\nAll sample data added successfully!")
db.close()