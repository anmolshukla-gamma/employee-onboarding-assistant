from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserAdminResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role_id: Optional[int] = None
    is_admin: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AdminStatsResponse(BaseModel):
    total_users: int
    total_admins: int
    active_users: int
    total_documents: int
    ready_documents: int
    total_roles: int

class UserProgressSummary(BaseModel):
    user_id: int
    full_name: str
    email: str
    role_id: Optional[int] = None
    role_name: Optional[str] = None
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    is_active: bool
    total_items: int = 0
    completed_items: int = 0
    progress_percent: float = 0.0


class UserProgressItem(BaseModel):
    item_id: int
    title: str
    category: Optional[str] = None
    is_mandatory: bool
    is_completed: bool
    order: int


class UserProgressDetail(BaseModel):
    user_id: int
    full_name: str
    email: str
    role_id: Optional[int] = None
    role_name: Optional[str] = None
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    total_items: int = 0
    completed_items: int = 0
    progress_percent: float = 0.0
    items: List[UserProgressItem] = []

class AdminUserCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role_id: Optional[int] = None
    team_id: Optional[int] = None
    is_admin: bool = False
    is_active: bool = True