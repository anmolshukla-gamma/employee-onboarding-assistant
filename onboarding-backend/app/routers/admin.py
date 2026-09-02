from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.security import hash_password
from typing import List, Optional
from app.models.team import Team, Tool, TeamTool, UserTeam
from app.schemas.team import (
    TeamCreate, TeamUpdate, TeamResponse,
    ToolCreate, ToolUpdate, ToolResponse,
    TeamToolCreate, TeamToolResponse,
    UserTeamAssign
)

from app.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.role import Role
from app.models.checklist import Checklist, ChecklistItem
from app.schemas.admin import UserAdminResponse, AdminStatsResponse
from app.schemas.role import (
    RoleCreate, RoleUpdate, RoleResponse,
    ChecklistCreate, ChecklistUpdate, ChecklistResponse,
    ChecklistItemCreate, ChecklistItemUpdate, ChecklistItemResponse
)
from app.core.dependencies import get_current_admin
from app.models.role import Role
from app.models.checklist import Checklist, ChecklistItem, UserProgress
from app.models.team import UserTeam, Team
from app.schemas.admin import UserProgressSummary, UserProgressDetail, UserProgressItem,AdminUserCreate,UserListItem

from datetime import datetime
from app.models.comment import ChecklistComment
from app.schemas.comment import CommentResponse, CommentReview
from app.schemas.admin import UserListItem
from app.schemas.team import TeamMemberResponse, AddTeamMemberRequest
from app.schemas.admin import UserRoleAssign
from app.models.team import ToolAccessRequest
from app.schemas.team import ToolAccessRequestResponse, AdminToolAccessRequestResponse
from app.services.github_connector import GitHubConnector

CONNECTORS = {
    "github": GitHubConnector(),
}
import math
import json



router = APIRouter(prefix="/admin", tags=["Admin"])


def paginate(query, page: int, page_size: int):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    total = query.count()
    items = (
        query.offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    total_pages = math.ceil(total / page_size) if total else 0

    return items, page, page_size, total, total_pages


def get_user_progress_numbers(db: Session, user: User):
    total = 0
    completed = 0

    if not user.role_id:
        return total, completed, 0.0

    checklist = db.query(Checklist).filter(Checklist.role_id == user.role_id).first()
    if not checklist:
        return total, completed, 0.0

    items = db.query(ChecklistItem).filter(ChecklistItem.checklist_id == checklist.id).all()
    total = len(items)
    item_ids = [i.id for i in items]

    if item_ids:
        completed = db.query(UserProgress).filter(
            UserProgress.user_id == user.id,
            UserProgress.checklist_item_id.in_(item_ids),
            UserProgress.is_completed == True
        ).count()

    percent = round((completed / total) * 100, 1) if total > 0 else 0.0
    return total, completed, percent

def parse_resources(value):
    if value is None:
        return []
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return []


def dump_resources(value):
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return json.dumps(value)



# -------------------- Users --------------------
@router.get("/users")
def get_all_users(
    q: str | None = None,
    role_id: int | None = None,
    team_id: int | None = None,
    is_active: bool | None = None,
    page: int = 1,
    page_size: int = 20,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User)

    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (User.full_name.ilike(like)) | (User.email.ilike(like))
        )

    if role_id is not None:
        query = query.filter(User.role_id == role_id)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    # team filter needs post-process OR join; keep simple join if needed
    query = query.order_by(User.created_at.desc())

    # if team_id filter requested, join user_teams
    if team_id is not None:
        query = query.join(UserTeam, UserTeam.user_id == User.id).filter(UserTeam.team_id == team_id)

    users, page, page_size, total, total_pages = paginate(query, page, page_size)

    result = []
    for user in users:
        role_name = None
        if user.role_id:
            role = db.query(Role).filter(Role.id == user.role_id).first()
            role_name = role.name if role else None

        user_team = db.query(UserTeam).filter(UserTeam.user_id == user.id).first()
        user_team_id = user_team.team_id if user_team else None
        team_name = None
        if user_team_id:
            team = db.query(Team).filter(Team.id == user_team_id).first()
            team_name = team.name if team else None

        total_items, completed_items, percent = get_user_progress_numbers(db, user)

        result.append({
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role_id": user.role_id,
            "role_name": role_name,
            "team_id": user_team_id,
            "team_name": team_name,
            "is_admin": user.is_admin,
            "is_active": user.is_active,
            "progress_percent": percent,
            "total_items": total_items,
            "completed_items": completed_items
        })

    return {
        "items": result,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }

@router.get("/users/{user_id}", response_model=UserAdminResponse)
def get_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.patch("/users/{user_id}/toggle-admin", response_model=UserAdminResponse)
def toggle_admin(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot change your own admin status")

    user.is_admin = not user.is_admin
    db.commit()
    db.refresh(user)
    return user

@router.patch("/users/{user_id}/toggle-active", response_model=UserAdminResponse)
def toggle_active(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate yourself")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user

# -------------------- Stats --------------------

@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    total_users = db.query(User).count()
    total_admins = db.query(User).filter(User.is_admin == True).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_documents = db.query(Document).count()
    ready_documents = db.query(Document).filter(Document.status == "ready").count()
    unready_documents = total_documents - ready_documents
    total_roles = db.query(Role).count()
    total_teams = db.query(Team).count()
    total_tools = db.query(Tool).count()
    pending_comments = db.query(ChecklistComment).filter(
        ChecklistComment.status == "pending"
    ).count()

    users = db.query(User).all()
    users_without_team = 0
    progress_values = []
    lagging_users_all = []
    users_completed = 0

    for user in users:
        has_team = db.query(UserTeam).filter(UserTeam.user_id == user.id).first()
        if not has_team:
            users_without_team += 1

        total = 0
        completed = 0
        if user.role_id:
            checklist = db.query(Checklist).filter(Checklist.role_id == user.role_id).first()
            if checklist:
                items = db.query(ChecklistItem).filter(
                    ChecklistItem.checklist_id == checklist.id
                ).all()
                total = len(items)
                item_ids = [i.id for i in items]
                if item_ids:
                    completed = db.query(UserProgress).filter(
                        UserProgress.user_id == user.id,
                        UserProgress.checklist_item_id.in_(item_ids),
                        UserProgress.is_completed == True
                    ).count()

        percent = round((completed / total) * 100, 1) if total > 0 else 0.0
        progress_values.append(percent)

        if total > 0 and percent >= 100.0:
            users_completed += 1

        if total > 0 and percent < 50.0:
            lagging_users_all.append({
                "user_id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "progress_percent": percent,
                "completed_items": completed,
                "total_items": total
            })

    average_progress = round(sum(progress_values) / len(progress_values), 1) if progress_values else 0.0
    lagging_users = sorted(lagging_users_all, key=lambda x: x["progress_percent"])[:5]

    pending_rows = (
        db.query(ChecklistComment)
        .filter(ChecklistComment.status == "pending")
        .order_by(ChecklistComment.created_at.desc())
        .limit(5)
        .all()
    )
    pending_feedback = []
    for row in pending_rows:
        user = db.query(User).filter(User.id == row.user_id).first()
        item = db.query(ChecklistItem).filter(ChecklistItem.id == row.checklist_item_id).first()
        pending_feedback.append({
            "id": row.id,
            "comment": row.comment,
            "comment_type": row.comment_type,
            "user_name": user.full_name if user else None,
            "checklist_item_title": item.title if item else None
        })

    return {
        "total_users": total_users,
        "total_admins": total_admins,
        "active_users": active_users,
        "total_documents": total_documents,
        "ready_documents": ready_documents,
        "unready_documents": unready_documents,
        "total_roles": total_roles,
        "total_teams": total_teams,
        "total_tools": total_tools,
        "pending_comments": pending_comments,
        "users_without_team": users_without_team,
        "users_completed": users_completed,
        "users_lagging": len(lagging_users_all),
        "average_progress": average_progress,
        "lagging_users": lagging_users,
        "pending_feedback": pending_feedback
    }

# ====================== ROLES ======================

@router.post("/roles", response_model=RoleResponse, status_code=201)
def create_role(
    data: RoleCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Role).filter(Role.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Role name already exists")

    role = Role(
        name=data.name,
        description=data.description,
        is_active=data.is_active
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.get("/roles", response_model=List[RoleResponse])
def list_roles_admin(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return db.query(Role).order_by(Role.name).all()


@router.get("/roles/{role_id}", response_model=RoleResponse)
def get_role_admin(
    role_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


@router.put("/roles/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: int,
    data: RoleUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if data.name is not None:
        exists = db.query(Role).filter(Role.name == data.name, Role.id != role_id).first()
        if exists:
            raise HTTPException(status_code=400, detail="Role name already exists")
        role.name = data.name

    if data.description is not None:
        role.description = data.description
    if data.is_active is not None:
        role.is_active = data.is_active

    db.commit()
    db.refresh(role)
    return role


@router.delete("/roles/{role_id}")
def delete_role(
    role_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # 1) Block if users are assigned
    users_count = db.query(User).filter(User.role_id == role_id).count()
    if users_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete role. {users_count} user(s) are still assigned to it."
        )

    # 2) Block if checklists exist
    checklists = db.query(Checklist).filter(Checklist.role_id == role_id).all()
    if checklists:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete role. {len(checklists)} checklist(s) still exist. Delete checklists first."
        )

    db.delete(role)
    db.commit()
    return {"message": "Role deleted successfully"}


# ====================== CHECKLISTS ======================

@router.post("/roles/{role_id}/checklists", response_model=ChecklistResponse, status_code=201)
def create_checklist(
    role_id: int,
    data: ChecklistCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    checklist = Checklist(
        role_id=role_id,
        title=data.title,
        description=data.description
    )
    db.add(checklist)
    db.commit()
    db.refresh(checklist)
    return checklist


@router.get("/roles/{role_id}/checklists", response_model=List[ChecklistResponse])
def list_checklists(
    role_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    return db.query(Checklist).filter(Checklist.role_id == role_id).all()


@router.put("/checklists/{checklist_id}", response_model=ChecklistResponse)
def update_checklist(
    checklist_id: int,
    data: ChecklistUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    checklist = db.query(Checklist).filter(Checklist.id == checklist_id).first()
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist not found")

    if data.title is not None:
        checklist.title = data.title
    if data.description is not None:
        checklist.description = data.description

    db.commit()
    db.refresh(checklist)
    return checklist


@router.delete("/checklists/{checklist_id}")
def delete_checklist(
    checklist_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    checklist = db.query(Checklist).filter(Checklist.id == checklist_id).first()
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist not found")

    db.delete(checklist)
    db.commit()
    return {"message": "Checklist deleted successfully"}


# ====================== CHECKLIST ITEMS ======================

@router.post("/checklists/{checklist_id}/items", response_model=ChecklistItemResponse, status_code=201)
def create_checklist_item(
    checklist_id: int,
    data: ChecklistItemCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    checklist = db.query(Checklist).filter(Checklist.id == checklist_id).first()
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist not found")

    item = ChecklistItem(
        checklist_id=checklist_id,
        title=data.title,
        description=data.description,
        detailed_guide=data.detailed_guide,
        resources=dump_resources(data.resources),
        category=data.category,
        order=data.order,
        is_mandatory=data.is_mandatory
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/checklists/{checklist_id}/items", response_model=List[ChecklistItemResponse])
def list_checklist_items(
    checklist_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    checklist = db.query(Checklist).filter(Checklist.id == checklist_id).first()
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist not found")

    return db.query(ChecklistItem).filter(
        ChecklistItem.checklist_id == checklist_id
    ).order_by(ChecklistItem.order).all()


@router.put("/items/{item_id}", response_model=ChecklistItemResponse)
def update_checklist_item(
    item_id: int,
    data: ChecklistItemUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    item = db.query(ChecklistItem).filter(ChecklistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    if data.title is not None:
        item.title = data.title
    if data.description is not None:
        item.description = data.description
    if data.category is not None:
        item.category = data.category
    if data.order is not None:
        item.order = data.order
    if data.is_mandatory is not None:
        item.is_mandatory = data.is_mandatory
    if data.detailed_guide is not None:
        item.detailed_guide = data.detailed_guide
    if data.resources is not None:
        item.resources = dump_resources(data.resources)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}")
def delete_checklist_item(
    item_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    item = db.query(ChecklistItem).filter(ChecklistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    db.delete(item)
    db.commit()
    return {"message": "Checklist item deleted successfully"}

# ====================== TEAMS ======================

@router.post("/teams", response_model=TeamResponse, status_code=201)
def create_team(
    data: TeamCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    exists = db.query(Team).filter(Team.name == data.name).first()
    if exists:
        raise HTTPException(status_code=400, detail="Team name already exists")

    team = Team(
        name=data.name,
        description=data.description,
        is_active=data.is_active
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


@router.get("/teams", response_model=List[TeamResponse])
def list_teams(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return db.query(Team).order_by(Team.name).all()


@router.put("/teams/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: int,
    data: TeamUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if data.name is not None:
        conflict = db.query(Team).filter(Team.name == data.name, Team.id != team_id).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Team name already exists")
        team.name = data.name
    if data.description is not None:
        team.description = data.description
    if data.is_active is not None:
        team.is_active = data.is_active

    db.commit()
    db.refresh(team)
    return team


@router.delete("/teams/{team_id}")
def delete_team(
    team_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    users_count = db.query(UserTeam).filter(UserTeam.team_id == team_id).count()
    if users_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete team. {users_count} user(s) are assigned to it."
        )

    db.query(TeamTool).filter(TeamTool.team_id == team_id).delete()
    db.delete(team)
    db.commit()
    return {"message": "Team deleted successfully"}


# ====================== TOOLS ======================

@router.post("/tools", response_model=ToolResponse, status_code=201)
def create_tool(
    data: ToolCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    exists = db.query(Tool).filter(Tool.name == data.name).first()
    if exists:
        raise HTTPException(status_code=400, detail="Tool name already exists")

    tool = Tool(
        name=data.name,
        description=data.description,
        category=data.category,
        request_url=data.request_url,
        guide_text=data.guide_text,
        provider_key=data.provider_key,
        is_active=data.is_active
    )
    db.add(tool)
    db.commit()
    db.refresh(tool)
    return tool


@router.get("/tools", response_model=List[ToolResponse])
def list_tools(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return db.query(Tool).order_by(Tool.name).all()


@router.put("/tools/{tool_id}", response_model=ToolResponse)
def update_tool(
    tool_id: int,
    data: ToolUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    if data.name is not None:
        conflict = db.query(Tool).filter(Tool.name == data.name, Tool.id != tool_id).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Tool name already exists")
        tool.name = data.name
    if data.description is not None:
        tool.description = data.description
    if data.category is not None:
        tool.category = data.category
    if data.request_url is not None:
        tool.request_url = data.request_url
    if data.guide_text is not None:
        tool.guide_text = data.guide_text
    if data.provider_key is not None:
        tool.provider_key = data.provider_key
    if data.is_active is not None:
        tool.is_active = data.is_active

    db.commit()
    db.refresh(tool)
    return tool


@router.delete("/tools/{tool_id}")
def delete_tool(
    tool_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    db.query(TeamTool).filter(TeamTool.tool_id == tool_id).delete()
    db.delete(tool)
    db.commit()
    return {"message": "Tool deleted successfully"}


# ====================== TEAM TOOL MAPPING ======================

@router.post("/teams/{team_id}/tools", response_model=TeamToolResponse, status_code=201)
def add_tool_to_team(
    team_id: int,
    data: TeamToolCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    tool = db.query(Tool).filter(Tool.id == data.tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    exists = db.query(TeamTool).filter(
        TeamTool.team_id == team_id,
        TeamTool.tool_id == data.tool_id
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="Tool already mapped to this team")

    row = TeamTool(
        team_id=team_id,
        tool_id=data.tool_id,
        is_mandatory=data.is_mandatory,
        order=data.order
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return {
        "id": row.id,
        "team_id": row.team_id,
        "tool_id": row.tool_id,
        "is_mandatory": row.is_mandatory,
        "order": row.order,
        "tool": tool
    }

@router.get("/teams/{team_id}/tools", response_model=List[TeamToolResponse])
def list_team_tools(
    team_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    rows = (
        db.query(TeamTool, Tool)
        .join(Tool, Tool.id == TeamTool.tool_id)
        .filter(TeamTool.team_id == team_id)
        .order_by(TeamTool.order.asc())
        .all()
    )

    result = []
    for team_tool, tool in rows:
        result.append({
            "id": team_tool.id,
            "team_id": team_tool.team_id,
            "tool_id": team_tool.tool_id,
            "is_mandatory": team_tool.is_mandatory,
            "order": team_tool.order,
            "tool": tool
        })
    return result


@router.delete("/teams/{team_id}/tools/{tool_id}")
def remove_tool_from_team(
    team_id: int,
    tool_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    row = db.query(TeamTool).filter(
        TeamTool.team_id == team_id,
        TeamTool.tool_id == tool_id
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Team tool mapping not found")

    db.delete(row)
    db.commit()
    return {"message": "Tool removed from team"}


# ====================== ASSIGN USER TEAM ======================

@router.patch("/users/{user_id}/team")
def assign_user_team(
    user_id: int,
    data: UserTeamAssign,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    team = db.query(Team).filter(Team.id == data.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    existing = db.query(UserTeam).filter(UserTeam.user_id == user_id).first()
    if existing:
        existing.team_id = data.team_id
    else:
        db.add(UserTeam(user_id=user_id, team_id=data.team_id))

    db.commit()
    return {"message": "User assigned to team successfully", "user_id": user_id, "team_id": data.team_id}



# ====================== USER PROGRESS ======================

@router.get("/progress")
def list_users_progress(
    page: int = 1,
    page_size: int = 20,
    q: str | None = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (User.full_name.ilike(like)) | (User.email.ilike(like))
        )
    query = query.order_by(User.created_at.desc())

    users, page, page_size, total, total_pages = paginate(query, page, page_size)
    result = []

    for user in users:
        role_name = None
        if user.role_id:
            role = db.query(Role).filter(Role.id == user.role_id).first()
            role_name = role.name if role else None

        user_team = db.query(UserTeam).filter(UserTeam.user_id == user.id).first()
        team_id = user_team.team_id if user_team else None
        team_name = None
        if team_id:
            team = db.query(Team).filter(Team.id == team_id).first()
            team_name = team.name if team else None

        total_items, completed_items, percent = get_user_progress_numbers(db, user)

        result.append({
            "user_id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role_id": user.role_id,
            "role_name": role_name,
            "team_id": team_id,
            "team_name": team_name,
            "is_active": user.is_active,
            "total_items": total_items,
            "completed_items": completed_items,
            "progress_percent": percent
        })

    return {
        "items": result,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }


@router.get("/progress/{user_id}", response_model=UserProgressDetail)
def get_user_progress_detail(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role_name = None
    items_response = []
    total = 0
    completed = 0

    if user.role_id:
        role = db.query(Role).filter(Role.id == user.role_id).first()
        role_name = role.name if role else None

        checklist = db.query(Checklist).filter(Checklist.role_id == user.role_id).first()
        if checklist:
            items = db.query(ChecklistItem).filter(
                ChecklistItem.checklist_id == checklist.id
            ).order_by(ChecklistItem.order).all()

            completed_ids = {
                p.checklist_item_id
                for p in db.query(UserProgress).filter(
                    UserProgress.user_id == user.id,
                    UserProgress.is_completed == True
                ).all()
            }

            for item in items:
                is_done = item.id in completed_ids
                if is_done:
                    completed += 1
                items_response.append(UserProgressItem(
                    item_id=item.id,
                    title=item.title,
                    category=item.category,
                    is_mandatory=item.is_mandatory,
                    is_completed=is_done,
                    order=item.order
                ))

            total = len(items)

    team_id = None
    team_name = None
    user_team = db.query(UserTeam).filter(UserTeam.user_id == user.id).first()
    if user_team:
        team = db.query(Team).filter(Team.id == user_team.team_id).first()
        team_id = user_team.team_id
        team_name = team.name if team else None

    percent = round((completed / total) * 100, 1) if total > 0 else 0.0

    return UserProgressDetail(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role_id=user.role_id,
        role_name=role_name,
        team_id=team_id,
        team_name=team_name,
        total_items=total,
        completed_items=completed,
        progress_percent=percent,
        items=items_response
    )

@router.post("/users", status_code=201)
def admin_create_user(
    data: AdminUserCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if data.role_id is not None:
        role = db.query(Role).filter(Role.id == data.role_id).first()
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")

    if data.team_id is not None:
        team = db.query(Team).filter(Team.id == data.team_id).first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")

    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role_id=data.role_id,
        is_admin=data.is_admin,
        is_active=data.is_active
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if data.team_id is not None:
        db.add(UserTeam(user_id=user.id, team_id=data.team_id))
        db.commit()

    return {
        "message": "User created successfully",
        "user_id": user.id,
        "email": user.email,
        "role_id": user.role_id,
        "team_id": data.team_id
    }


# ====================== CHECKLIST COMMENTS ======================

@router.get("/comments")
def list_comments(
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(ChecklistComment)
    if status:
        query = query.filter(ChecklistComment.status == status)
    query = query.order_by(ChecklistComment.created_at.desc())

    rows, page, page_size, total, total_pages = paginate(query, page, page_size)
    result = []

    for row in rows:
        user = db.query(User).filter(User.id == row.user_id).first()
        item = db.query(ChecklistItem).filter(ChecklistItem.id == row.checklist_item_id).first()
        result.append({
            "id": row.id,
            "checklist_item_id": row.checklist_item_id,
            "checklist_item_title": item.title if item else None,
            "user_id": row.user_id,
            "user_name": user.full_name if user else None,
            "user_email": user.email if user else None,
            "comment": row.comment,
            "comment_type": row.comment_type,
            "status": row.status,
            "admin_response": row.admin_response,
            "reviewed_by": row.reviewed_by,
            "created_at": row.created_at,
            "reviewed_at": row.reviewed_at,
        })

    return {
        "items": result,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }


@router.patch("/comments/{comment_id}", response_model=CommentResponse)
def review_comment(
    comment_id: int,
    data: CommentReview,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    row = db.query(ChecklistComment).filter(ChecklistComment.id == comment_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Comment not found")

    allowed = {"approved", "rejected", "resolved"}
    if data.status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status")

    row.status = data.status
    row.admin_response = data.admin_response
    row.reviewed_by = current_admin.id
    row.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(row)

    user = db.query(User).filter(User.id == row.user_id).first()
    item = db.query(ChecklistItem).filter(ChecklistItem.id == row.checklist_item_id).first()

    return {
        "id": row.id,
        "checklist_item_id": row.checklist_item_id,
        "checklist_item_title": item.title if item else None,
        "user_id": row.user_id,
        "user_name": user.full_name if user else None,
        "user_email": user.email if user else None,
        "comment": row.comment,
        "comment_type": row.comment_type,
        "status": row.status,
        "admin_response": row.admin_response,
        "reviewed_by": row.reviewed_by,
        "created_at": row.created_at,
        "reviewed_at": row.reviewed_at,
    }

@router.get("/teams/{team_id}/members", response_model=List[TeamMemberResponse])
def list_team_members(
    team_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    rows = (
        db.query(User, UserTeam)
        .join(UserTeam, UserTeam.user_id == User.id)
        .filter(UserTeam.team_id == team_id)
        .order_by(User.full_name.asc())
        .all()
    )

    result = []
    for user, _ in rows:
        role_name = None
        if user.role_id:
            role = db.query(Role).filter(Role.id == user.role_id).first()
            role_name = role.name if role else None

        result.append(TeamMemberResponse(
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            role_id=user.role_id,
            role_name=role_name,
            is_admin=user.is_admin,
            is_active=user.is_active
        ))

    return result


@router.post("/teams/{team_id}/members", status_code=201)
def add_team_member(
    team_id: int,
    data: AddTeamMemberRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(UserTeam).filter(UserTeam.user_id == user.id).first()
    if existing:
        existing.team_id = team_id
    else:
        db.add(UserTeam(user_id=user.id, team_id=team_id))

    db.commit()
    return {
        "message": "User added to team successfully",
        "user_id": user.id,
        "team_id": team_id
    }


@router.delete("/teams/{team_id}/members/{user_id}")
def remove_team_member(
    team_id: int,
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    row = db.query(UserTeam).filter(
        UserTeam.team_id == team_id,
        UserTeam.user_id == user_id
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="User is not a member of this team")

    db.delete(row)
    db.commit()
    return {"message": "User removed from team successfully"}

@router.patch("/users/{user_id}/role")
def assign_user_role(
    user_id: int,
    data: UserRoleAssign,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = db.query(Role).filter(Role.id == data.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if not role.is_active:
        raise HTTPException(status_code=400, detail="Cannot assign inactive role")

    user.role_id = data.role_id
    db.commit()
    db.refresh(user)

    return {
        "message": "User role updated successfully",
        "user_id": user.id,
        "role_id": user.role_id,
        "role_name": role.name
    }




# ====================== TOOL ACCESS REQUESTS ======================

@router.get("/tool-requests", response_model=List[AdminToolAccessRequestResponse])
def list_tool_requests(
    status_filter: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = (
        db.query(ToolAccessRequest, Tool, User)
        .join(Tool, Tool.id == ToolAccessRequest.tool_id)
        .join(User, User.id == ToolAccessRequest.employee_id)
    )
    if status_filter:
        query = query.filter(ToolAccessRequest.status == status_filter)

    rows = query.order_by(ToolAccessRequest.requested_at.desc()).all()

    return [
        AdminToolAccessRequestResponse(
            id=req.id, tool_id=req.tool_id, tool_name=tool.name,
            identifier=req.identifier, status=req.status, reason=req.reason,
            requested_at=req.requested_at, reviewed_at=req.reviewed_at,
            provisioning_message=req.provisioning_message,
            employee_id=user.id, employee_name=user.full_name, employee_email=user.email
        )
        for req, tool, user in rows
    ]


@router.post("/tool-requests/{request_id}/approve", response_model=AdminToolAccessRequestResponse)
def approve_tool_request(
    request_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    req = db.query(ToolAccessRequest).filter(ToolAccessRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {req.status}")

    tool = db.query(Tool).filter(Tool.id == req.tool_id).first()
    employee = db.query(User).filter(User.id == req.employee_id).first()
    connector = CONNECTORS.get(tool.provider_key) if tool.provider_key else None

    if connector:
        if not req.identifier:
            req.status = "failed"
            req.provisioning_message = f"No identifier provided — {tool.name} requires the employee's account username."
            db.commit()
            raise HTTPException(status_code=400, detail=req.provisioning_message)
        identity = req.identifier
        try:
            message = connector.grant_access(identity)
            req.status = "approved"
            req.provisioning_message = message
        except Exception as e:
            req.status = "failed"
            req.provisioning_message = str(e)
            db.commit()
            raise HTTPException(status_code=502, detail=f"Provisioning failed: {e}")
    else:
        req.status = "approved"
        req.provisioning_message = "Approved manually (no automated connector configured for this tool)"

    req.reviewed_by = current_admin.id
    req.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(req)

    return AdminToolAccessRequestResponse(
        id=req.id, tool_id=req.tool_id, tool_name=tool.name,
        identifier=req.identifier, status=req.status, reason=req.reason,
        requested_at=req.requested_at, reviewed_at=req.reviewed_at,
        provisioning_message=req.provisioning_message,
        employee_id=employee.id, employee_name=employee.full_name, employee_email=employee.email
    )


@router.post("/tool-requests/{request_id}/reject", response_model=AdminToolAccessRequestResponse)
def reject_tool_request(
    request_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    req = db.query(ToolAccessRequest).filter(ToolAccessRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {req.status}")

    tool = db.query(Tool).filter(Tool.id == req.tool_id).first()
    employee = db.query(User).filter(User.id == req.employee_id).first()

    req.status = "rejected"
    req.reviewed_by = current_admin.id
    req.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(req)

    return AdminToolAccessRequestResponse(
        id=req.id, tool_id=req.tool_id, tool_name=tool.name,
        identifier=req.identifier, status=req.status, reason=req.reason,
        requested_at=req.requested_at, reviewed_at=req.reviewed_at,
        provisioning_message=req.provisioning_message,
        employee_id=employee.id, employee_name=employee.full_name, employee_email=employee.email
    )

@router.post("/tool-requests/{request_id}/revoke", response_model=AdminToolAccessRequestResponse)
def revoke_tool_request(
    request_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    req = db.query(ToolAccessRequest).filter(ToolAccessRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status != "approved":
        raise HTTPException(status_code=400, detail=f"Only approved requests can be revoked (current status: {req.status})")

    tool = db.query(Tool).filter(Tool.id == req.tool_id).first()
    employee = db.query(User).filter(User.id == req.employee_id).first()
    connector = CONNECTORS.get(tool.provider_key) if tool.provider_key else None

    if connector:
        try:
            message = connector.revoke_access(req.identifier)
            req.status = "revoked"
            req.provisioning_message = message
        except Exception as e:
            db.commit()
            raise HTTPException(status_code=502, detail=f"Revocation failed: {e}")
    else:
        req.status = "revoked"
        req.provisioning_message = "Revoked manually (no automated connector configured for this tool)"

    req.reviewed_by = current_admin.id
    req.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(req)

    return AdminToolAccessRequestResponse(
        id=req.id, tool_id=req.tool_id, tool_name=tool.name,
        identifier=req.identifier, status=req.status, reason=req.reason,
        requested_at=req.requested_at, reviewed_at=req.reviewed_at,
        provisioning_message=req.provisioning_message,
        employee_id=employee.id, employee_name=employee.full_name, employee_email=employee.email
    )