from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.role import Role
from app.schemas.admin import UserAdminResponse, AdminStatsResponse
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
