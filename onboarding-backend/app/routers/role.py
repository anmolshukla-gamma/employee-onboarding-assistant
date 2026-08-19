from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.role import Role
from app.schemas.role import RoleResponse, RoleSelect
from app.schemas.user import UserResponse
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/roles", tags=["Roles"])

@router.get("/", response_model=List[RoleResponse])
def get_all_roles(db: Session = Depends(get_db)):
    roles = db.query(Role).filter(Role.is_active == True).all()
    return roles

@router.post("/select", response_model=UserResponse)
def select_role(
    role_data: RoleSelect,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role = db.query(Role).filter(Role.id == role_data.role_id, Role.is_active == True).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    current_user.role_id = role.id
    db.commit()
    db.refresh(current_user)
    return current_user