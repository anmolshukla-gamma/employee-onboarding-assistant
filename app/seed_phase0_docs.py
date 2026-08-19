import json
from app.database import SessionLocal
from app.models.checklist import Checklist, ChecklistItem

db = SessionLocal()

PHASE0_ITEMS = [
    {
        "order": 1,
        "title": "Complete Personal Details Form",
        "category": "Documentation",
        "description": "Fill your basic personal and emergency contact information in HRMS.",
        "detailed_guide": (
            "1. Open HRMS using your company account.\n"
            "2. Go to Profile / Personal Details.\n"
            "3. Fill full name, contact number, current address, permanent address.\n"
            "4. Add emergency contact details.\n"
            "5. Save and review for accuracy.\n"
            "6. If fields are locked, contact HR."
        ),
        "resources": [
            {"label": "HRMS Portal", "url": "https://hrms.company.com", "type": "link"},
            {"label": "HR Helpdesk", "url": "https://company.slack.com/channels/hr-help", "type": "link"},
        ],
    },
    {
        "order": 2,
        "title": "Upload Identity Documents",
        "category": "Documentation",
        "description": "Upload required ID proofs such as Aadhaar/PAN/passport as per HR policy.",
        "detailed_guide": (
            "1. Keep clear scanned copies ready (PDF/JPG as accepted).\n"
            "2. Open HRMS → Documents / KYC section.\n"
            "3. Upload government ID proofs requested in your joining mail.\n"
            "4. Ensure name matches offer letter details.\n"
            "5. Submit and verify upload status.\n"
            "6. If rejected, re-upload corrected files and notify HR."
        ),
        "resources": [
            {"label": "HRMS Documents Section", "url": "https://hrms.company.com/documents", "type": "link"},
            {"label": "Document Checklist", "url": "https://intranet.company.com/joining-docs", "type": "document"},
        ],
    },
    {
        "order": 3,
        "title": "Submit Bank & Payroll Details",
        "category": "Documentation",
        "description": "Provide bank account details for salary processing.",
        "detailed_guide": (
            "1. Keep cancelled cheque or bank passbook copy ready.\n"
            "2. Open HRMS payroll / bank details section.\n"
            "3. Enter account holder name, account number, IFSC, bank name.\n"
            "4. Upload supporting bank proof if required.\n"
            "5. Save and confirm details carefully.\n"
            "6. Contact HR/Payroll for correction requests."
        ),
        "resources": [
            {"label": "HRMS Payroll Section", "url": "https://hrms.company.com/payroll", "type": "link"},
        ],
    },
    {
        "order": 4,
        "title": "Complete Tax / PF Declarations",
        "category": "Documentation",
        "description": "Complete tax investment declaration and PF-related forms if applicable.",
        "detailed_guide": (
            "1. Open HRMS tax declaration / PF module.\n"
            "2. Fill PF details if joining PF is required.\n"
            "3. Submit tax declaration based on current guidance.\n"
            "4. Review before final submit.\n"
            "5. Download acknowledgement if available.\n"
            "6. Ask Payroll/HR for help on unclear sections."
        ),
        "resources": [
            {"label": "Tax Declaration Portal", "url": "https://hrms.company.com/tax", "type": "link"},
            {"label": "PF/Tax Help Guide", "url": "https://intranet.company.com/pf-tax-guide", "type": "document"},
        ],
    },
    {
        "order": 5,
        "title": "Sign NDA / Confidentiality Agreement",
        "category": "Documentation",
        "description": "Read and digitally sign the company NDA/confidentiality agreement.",
        "detailed_guide": (
            "1. Open the document signing link shared by HR.\n"
            "2. Read the NDA carefully.\n"
            "3. Complete e-sign / acknowledgement.\n"
            "4. Save confirmation mail/PDF receipt.\n"
            "5. Inform HR if the sign link is expired."
        ),
        "resources": [
            {"label": "Document Signing Portal", "url": "https://sign.company.com", "type": "link"},
        ],
    },
    {
        "order": 6,
        "title": "Sign Employment Bond / Joining Forms",
        "category": "Documentation",
        "description": "Complete employment bond and mandatory joining forms required by HR.",
        "detailed_guide": (
            "1. Review bond/joining form package shared by HR.\n"
            "2. Check tenure/terms with HR before signing if needed.\n"
            "3. Sign through approved e-sign process or upload signed copies.\n"
            "4. Ensure all mandatory pages are completed.\n"
            "5. Confirm HR has received signed documents."
        ),
        "resources": [
            {"label": "Joining Forms Packet", "url": "https://intranet.company.com/joining-forms", "type": "document"},
            {"label": "HR Helpdesk", "url": "https://company.slack.com/channels/hr-help", "type": "link"},
        ],
    },
    {
        "order": 7,
        "title": "Acknowledge Company Policies",
        "category": "Documentation",
        "description": "Read and acknowledge key company policies such as code of conduct and workplace policies.",
        "detailed_guide": (
            "1. Open policy acknowledgement section in HRMS/intranet.\n"
            "2. Read Code of Conduct, POSH, and information security policies.\n"
            "3. Mark acknowledgement for each required policy.\n"
            "4. Keep a note of policy contacts/escalation channels.\n"
            "5. Contact HR for policy clarifications."
        ),
        "resources": [
            {"label": "Policy Centre", "url": "https://intranet.company.com/policies", "type": "document"},
            {"label": "Employee Handbook", "url": "https://intranet.company.com/handbook", "type": "document"},
        ],
    },
    {
        "order": 8,
        "title": "Complete HRMS Profile Registration",
        "category": "Documentation",
        "description": "Finish remaining HRMS profile setup and verify your employee record.",
        "detailed_guide": (
            "1. Login to HRMS.\n"
            "2. Verify employee ID, department, manager, and contact info.\n"
            "3. Complete remaining mandatory profile fields.\n"
            "4. Check leave balance/attendance module visibility.\n"
            "5. Confirm everything looks correct or raise HR ticket for corrections."
        ),
        "resources": [
            {"label": "HRMS Portal", "url": "https://hrms.company.com", "type": "link"},
        ],
    },
]


def main():
    checklists = db.query(Checklist).all()
    if not checklists:
        print("No checklists found.")
        db.close()
        return

    for checklist in checklists:
        print(f"\nProcessing checklist: {checklist.id} | {checklist.title}")

        # 1) Shift existing items so Phase-0 can take orders 1..8
        existing_items = (
            db.query(ChecklistItem)
            .filter(ChecklistItem.checklist_id == checklist.id)
            .order_by(ChecklistItem.order.asc(), ChecklistItem.id.asc())
            .all()
        )

        # Avoid shifting if Phase-0 already exists
        existing_titles = {i.title for i in existing_items}
        phase0_titles = {i["title"] for i in PHASE0_ITEMS}
        already_added = phase0_titles.issubset(existing_titles)

        if already_added:
            print("Phase-0 items already present. Skipping insert.")
            continue

        # Shift old items by +8
        for item in existing_items:
            item.order = (item.order or 0) + 8
        db.flush()

        # 2) Insert Phase-0 items
        for data in PHASE0_ITEMS:
            # Skip if this exact title already exists in this checklist
            exists = (
                db.query(ChecklistItem)
                .filter(
                    ChecklistItem.checklist_id == checklist.id,
                    ChecklistItem.title == data["title"],
                )
                .first()
            )
            if exists:
                print(f"  Skip existing: {data['title']}")
                continue

            item = ChecklistItem(
                checklist_id=checklist.id,
                title=data["title"],
                description=data["description"],
                detailed_guide=data["detailed_guide"],
                resources=json.dumps(data["resources"]),
                category=data["category"],
                order=data["order"],
                is_mandatory=True,
            )
            db.add(item)
            print(f"  Added: {data['title']}")

    db.commit()
    print("\nDone. Phase-0 documentation items added.")
    db.close()


if __name__ == "__main__":
    main()