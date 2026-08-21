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
    # existing
    total_users: int
    total_admins: int
    active_users: int
    total_documents: int
    ready_documents: int
    total_roles: int

    # new counts
    total_teams: int = 0
    total_tools: int = 0
    pending_comments: int = 0
    users_without_team: int = 0
    users_completed: int = 0
    users_lagging: int = 0
    average_progress: float = 0.0
    unready_documents: int = 0

    # lists for dashboard sections
    lagging_users: List[LaggingUserItem] = []
    pending_feedback: List[PendingCommentItem] = []

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

from typing import Optional, List
from pydantic import BaseModel


class UserListItem(BaseModel):
    id: int
    full_name: str
    email: str
    role_id: Optional[int] = None
    role_name: Optional[str] = None
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    is_admin: bool
    is_active: bool
    progress_percent: float = 0.0
    total_items: int = 0
    completed_items: int = 0

    class Config:
        from_attributes = True

class LaggingUserItem(BaseModel):
    user_id: int
    full_name: str
    email: str
    progress_percent: float
    completed_items: int
    total_items: int

class PendingCommentItem(BaseModel):
    id: int
    comment: str
    comment_type: str
    user_name: Optional[str] = None
    checklist_item_title: Optional[str] = None

class UserRoleAssign(BaseModel):
    role_id: int