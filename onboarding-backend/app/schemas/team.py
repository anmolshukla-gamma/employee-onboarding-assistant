from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ----- Team -----
class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class TeamResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ----- Tool -----
class ToolCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    request_url: Optional[str] = None
    guide_text: Optional[str] = None
    provider_key: Optional[str] = None
    is_active: bool = True


class ToolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    request_url: Optional[str] = None
    guide_text: Optional[str] = None
    provider_key: Optional[str] = None
    is_active: Optional[bool] = None


class ToolResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    request_url: Optional[str] = None
    guide_text: Optional[str] = None
    provider_key: Optional[str] = None 
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ----- Team-Tool mapping -----
class TeamToolCreate(BaseModel):
    tool_id: int
    is_mandatory: bool = True
    order: int = 0


class TeamToolResponse(BaseModel):
    id: int
    team_id: int
    tool_id: int
    is_mandatory: bool
    order: int
    tool: Optional[ToolResponse] = None

    class Config:
        from_attributes = True


# ----- Assign user to team -----
class UserTeamAssign(BaseModel):
    team_id: int


# ----- Employee My Access -----
class MyAccessItem(BaseModel):
    tool_id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    request_url: Optional[str] = None
    guide_text: Optional[str] = None
    is_mandatory: bool
    order: int


class MyAccessResponse(BaseModel):
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    tools: List[MyAccessItem] = []


class TeamMemberResponse(BaseModel):
    user_id: int
    full_name: str
    email: str
    role_id: Optional[int] = None
    role_name: Optional[str] = None
    is_admin: bool
    is_active: bool

    class Config:
        from_attributes = True


class AddTeamMemberRequest(BaseModel):
    user_id: int




# ----- Tool Access Requests -----
class ToolAccessRequestCreate(BaseModel):
    tool_id: int
    identifier: Optional[str] = None   # e.g. GitHub username; omit if the tool doesn't need one
    reason: Optional[str] = None


class ToolAccessRequestResponse(BaseModel):
    id: int
    tool_id: int
    tool_name: str
    identifier: Optional[str] = None
    status: str
    reason: Optional[str] = None
    requested_at: datetime
    reviewed_at: Optional[datetime] = None
    provisioning_message: Optional[str] = None


class AdminToolAccessRequestResponse(ToolAccessRequestResponse):
    employee_id: int
    employee_name: str
    employee_email: str
    provider_key: Optional[str] = None
    employee_role: Optional[str] = None
    employee_team: Optional[str] = None