from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

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

router = APIRouter(prefix="/admin", tags=["Admin"])

# -------------------- Users --------------------

@router.get("/users", response_model=List[UserAdminResponse])
def get_all_users(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return users

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
    total_roles = db.query(Role).count()

    return {
        "total_users": total_users,
        "total_admins": total_admins,
        "active_users": active_users,
        "total_documents": total_documents,
        "ready_documents": ready_documents,
        "total_roles": total_roles
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