import json
from app.database import SessionLocal
from app.models.checklist import ChecklistItem

db = SessionLocal()

CONTENT = {
    # ================= SOFTWARE ENGINEER / COMMON IT =================
    "Complete IT Setup": {
        "description": "Set up laptop, company email, and MFA before accessing internal systems.",
        "detailed_guide": (
            "1. Collect your laptop and temporary login details from IT / your manager.\n"
            "2. Power on the laptop and sign in with the temporary credentials.\n"
            "3. Change your password immediately.\n"
            "4. Open company email and confirm you can send/receive mails.\n"
            "5. Install the approved authenticator app and enable MFA.\n"
            "6. Join official communication tools (Slack/Teams) using your company email.\n"
            "7. If login, email, or MFA fails, raise an IT ticket with screenshots."
        ),
        "resources": [
            {"label": "IT Helpdesk Portal", "url": "https://it.company.com", "type": "link"},
            {"label": "MFA Setup Guide", "url": "https://intranet.company.com/mfa-setup", "type": "document"},
            {"label": "IT Support Channel", "url": "https://company.slack.com/channels/it-help", "type": "link"},
        ],
    },
    "Set up VPN": {
        "description": "Install and configure company VPN to access internal tools remotely.",
        "detailed_guide": (
            "1. Open the IT portal and download the official VPN client.\n"
            "2. Install the client. Approve admin permission if asked.\n"
            "3. Launch VPN and sign in with your company email.\n"
            "4. Complete MFA verification.\n"
            "5. Connect to the company network.\n"
            "6. Verify you can open internal sites/tools only available on VPN.\n"
            "7. If connection fails, note the error message and raise an IT ticket."
        ),
        "resources": [
            {"label": "VPN Download / IT Portal", "url": "https://it.company.com/vpn", "type": "link"},
            {"label": "VPN Setup Guide", "url": "https://intranet.company.com/vpn-guide", "type": "document"},
        ],
    },
    "Get GitHub & Jira Access": {
        "description": "Request access to source code repositories and project tracking tools.",
        "detailed_guide": (
            "1. Confirm your team/project name with your manager or buddy.\n"
            "2. Open the Access Request portal.\n"
            "3. Request access for GitHub (or GitLab) and Jira.\n"
            "4. Add business justification and manager name.\n"
            "5. Submit the request and wait for approval.\n"
            "6. Once approved, log in and verify repository/project visibility.\n"
            "7. Ask your buddy which repos and boards you should follow first."
        ),
        "resources": [
            {"label": "Access Request Portal", "url": "https://access.company.com", "type": "link"},
            {"label": "GitHub Enterprise", "url": "https://github.company.com", "type": "link"},
            {"label": "Jira", "url": "https://jira.company.com", "type": "link"},
        ],
    },
    "Set up Development Environment": {
        "description": "Install IDE, required runtimes, Git, and project dependencies.",
        "detailed_guide": (
            "1. Install the team-recommended IDE (VS Code or as advised by your team).\n"
            "2. Install required runtimes/tools (Node/Python/Java, Git, Docker if needed).\n"
            "3. Configure Git with your name and company email.\n"
            "4. Clone the starter repositories shared by your buddy.\n"
            "5. Follow each repo README to install dependencies.\n"
            "6. Run the project locally and confirm it starts successfully.\n"
            "7. Never commit secrets, tokens, or .env files."
        ),
        "resources": [
            {"label": "Engineering Handbook", "url": "https://intranet.company.com/eng-handbook", "type": "document"},
            {"label": "Dev Environment Setup", "url": "https://intranet.company.com/dev-setup", "type": "document"},
        ],
    },
    "Read Engineering Handbook": {
        "description": "Review coding standards, Git workflow, and code review process.",
        "detailed_guide": (
            "1. Open the Engineering Handbook from the intranet.\n"
            "2. Read sections on branching strategy and pull requests.\n"
            "3. Review coding standards and review checklist.\n"
            "4. Note release/deployment expectations for your team.\n"
            "5. Ask your buddy about team-specific exceptions.\n"
            "6. Keep the handbook bookmarked for daily reference."
        ),
        "resources": [
            {"label": "Engineering Handbook", "url": "https://intranet.company.com/eng-handbook", "type": "document"},
            {"label": "Git Workflow Guide", "url": "https://intranet.company.com/git-workflow", "type": "document"},
        ],
    },
    "Complete Mandatory Trainings": {
        "description": "Finish security, compliance, and required learning modules.",
        "detailed_guide": (
            "1. Open the Learning Portal with your company account.\n"
            "2. Complete Information Security Awareness.\n"
            "3. Complete Code of Conduct / Ethics module.\n"
            "4. Complete any role-specific mandatory modules assigned to you.\n"
            "5. Download/store completion certificates if provided.\n"
            "6. Inform your manager once all mandatory trainings are done."
        ),
        "resources": [
            {"label": "Learning Portal", "url": "https://learning.company.com", "type": "link"},
        ],
    },
    "Meet Your Buddy & Manager": {
        "description": "Schedule intro meetings and understand team expectations.",
        "detailed_guide": (
            "1. Confirm your buddy and manager names from your welcome mail.\n"
            "2. Schedule a 20–30 minute intro with your manager.\n"
            "3. Schedule a working session with your buddy.\n"
            "4. Ask about team goals, process, and first-week tasks.\n"
            "5. Note preferred communication channels and meeting cadence.\n"
            "6. Agree on your first onboarding deliverable."
        ),
        "resources": [
            {"label": "Team Directory", "url": "https://intranet.company.com/directory", "type": "link"},
        ],
    },

    # ================= SALES =================
    "Get CRM Access (Salesforce/HubSpot)": {
        "description": "Request CRM access for leads, opportunities, and activity tracking.",
        "detailed_guide": (
            "1. Confirm which CRM your team uses with your manager.\n"
            "2. Raise access request for CRM with manager approval.\n"
            "3. After access is granted, log in and update your profile.\n"
            "4. Learn where to create leads and log calls/emails.\n"
            "5. Review sample pipeline records shared by your team.\n"
            "6. Do not create dummy customer data in production."
        ),
        "resources": [
            {"label": "CRM Login", "url": "https://crm.company.com", "type": "link"},
            {"label": "CRM Access Request", "url": "https://access.company.com", "type": "link"},
            {"label": "CRM Basics Guide", "url": "https://intranet.company.com/crm-guide", "type": "document"},
        ],
    },
    "Complete Product Training": {
        "description": "Learn product features, pricing, and key value propositions.",
        "detailed_guide": (
            "1. Open Sales Enablement / Learning materials.\n"
            "2. Complete product overview modules.\n"
            "3. Review pricing guidelines and discount rules.\n"
            "4. Note top customer use-cases and objections.\n"
            "5. Shadow at least one product demo if available.\n"
            "6. Ask your manager unclear pricing/positioning questions."
        ),
        "resources": [
            {"label": "Product Training", "url": "https://learning.company.com/product", "type": "link"},
            {"label": "Sales Playbook", "url": "https://intranet.company.com/sales-playbook", "type": "document"},
        ],
    },
    "Learn Sales Process & Pipeline": {
        "description": "Understand lead stages, pipeline movement, and reporting cadence.",
        "detailed_guide": (
            "1. Review the official sales process stages.\n"
            "2. Learn when a lead becomes an opportunity.\n"
            "3. Understand required fields before stage movement.\n"
            "4. Check weekly/monthly reporting expectations.\n"
            "5. Observe one pipeline review meeting.\n"
            "6. Confirm your first targets with your manager."
        ),
        "resources": [
            {"label": "Sales Process Guide", "url": "https://intranet.company.com/sales-process", "type": "document"},
        ],
    },
    "Set up Sales Tools": {
        "description": "Configure email sequences, dialer, and other assigned sales tools.",
        "detailed_guide": (
            "1. List tools assigned to you from your manager.\n"
            "2. Install/configure each tool using company account.\n"
            "3. Connect email/calendar if required.\n"
            "4. Test one outbound sequence in training mode if available.\n"
            "5. Confirm CRM logging is working.\n"
            "6. Raise IT/Sales Ops ticket for tool issues."
        ),
        "resources": [
            {"label": "Sales Tools Setup", "url": "https://intranet.company.com/sales-tools", "type": "document"},
            {"label": "Sales Ops Support", "url": "https://company.slack.com/channels/sales-ops", "type": "link"},
        ],
    },
    "Meet Manager & Sales Team": {
        "description": "Meet your manager and team; start shadowing calls if planned.",
        "detailed_guide": (
            "1. Schedule intro with manager.\n"
            "2. Join team standup/review meetings.\n"
            "3. Request call-shadowing schedule.\n"
            "4. Note team communication norms.\n"
            "5. Confirm first-week outreach plan."
        ),
        "resources": [
            {"label": "Team Directory", "url": "https://intranet.company.com/directory", "type": "link"},
        ],
    },
    "Review Targets & Territory": {
        "description": "Review KPIs, targets, and assigned accounts or territory.",
        "detailed_guide": (
            "1. Get target sheet from manager.\n"
            "2. Review monthly/quarterly KPIs.\n"
            "3. Understand assigned territory/accounts.\n"
            "4. Clarify ramp-up expectations for first 30/60/90 days.\n"
            "5. Set your first weekly activity plan."
        ),
        "resources": [
            {"label": "Targets Template", "url": "https://intranet.company.com/sales-targets", "type": "document"},
        ],
    },

    # ================= HR =================
    "Get Access to HRMS": {
        "description": "Request HRMS access for employee records, leave, and HR processes.",
        "detailed_guide": (
            "1. Confirm required HRMS role with your HR manager.\n"
            "2. Raise access request with justification.\n"
            "3. After access is granted, log in and explore key modules.\n"
            "4. Practice only on permitted test data if available.\n"
            "5. Never share employee personal data outside approved systems.\n"
            "6. Complete any HRMS orientation checklist."
        ),
        "resources": [
            {"label": "HRMS Login", "url": "https://hrms.company.com", "type": "link"},
            {"label": "Access Request Portal", "url": "https://access.company.com", "type": "link"},
        ],
    },
    "Learn HR Policies & Employee Handbook": {
        "description": "Study leave, attendance, conduct, and core HR policy documents.",
        "detailed_guide": (
            "1. Open Employee Handbook and HR policy folder.\n"
            "2. Read leave, attendance, and working-hour policies.\n"
            "3. Read code of conduct and POSH policy.\n"
            "4. Note escalation contacts for employee issues.\n"
            "5. Discuss unclear policy points with your HR manager."
        ),
        "resources": [
            {"label": "Employee Handbook", "url": "https://intranet.company.com/handbook", "type": "document"},
            {"label": "HR Policy Library", "url": "https://intranet.company.com/hr-policies", "type": "document"},
        ],
    },
    "Understand Recruitment Process": {
        "description": "Learn hiring stages, interview flow, offers, and joining formalities.",
        "detailed_guide": (
            "1. Review recruitment SOP end-to-end.\n"
            "2. Understand requisition → screening → interview → offer flow.\n"
            "3. Learn documentation needed at each stage.\n"
            "4. Shadow one active hiring process if possible.\n"
            "5. Confirm offer-approval matrix with HR manager."
        ),
        "resources": [
            {"label": "Recruitment SOP", "url": "https://intranet.company.com/recruitment-sop", "type": "document"},
        ],
    },
    "Learn Employee Lifecycle Processes": {
        "description": "Understand onboarding, confirmation, transfers, and exit processes.",
        "detailed_guide": (
            "1. Review pre-boarding and Day-1 checklist.\n"
            "2. Study probation/confirmation process.\n"
            "3. Review internal transfer process.\n"
            "4. Review exit/clearance process.\n"
            "5. Note system update points in HRMS for each stage."
        ),
        "resources": [
            {"label": "Employee Lifecycle Guide", "url": "https://intranet.company.com/lifecycle", "type": "document"},
        ],
    },
    "Meet HR Team & Key Stakeholders": {
        "description": "Meet HR team members and key business stakeholders.",
        "detailed_guide": (
            "1. Get introduction list from your manager.\n"
            "2. Schedule short intro calls/meetings.\n"
            "3. Understand which business units you support.\n"
            "4. Note recurring HR forums/meetings to join.\n"
            "5. Align on your first support responsibilities."
        ),
        "resources": [
            {"label": "Team Directory", "url": "https://intranet.company.com/directory", "type": "link"},
        ],
    },
}


def main():
    updated = 0
    skipped = 0

    items = db.query(ChecklistItem).all()
    print(f"Found {len(items)} checklist items")

    for item in items:
        content = CONTENT.get(item.title)
        if not content:
            print(f"SKIP (no content mapping): {item.title}")
            skipped += 1
            continue

        item.description = content["description"]
        item.detailed_guide = content["detailed_guide"]
        item.resources = json.dumps(content["resources"])
        updated += 1
        print(f"UPDATED: {item.title}")

    db.commit()
    print("\nDone")
    print(f"Updated: {updated}")
    print(f"Skipped: {skipped}")
    db.close()


if __name__ == "__main__":
    main()