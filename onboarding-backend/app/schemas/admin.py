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