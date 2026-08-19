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
    is_active: bool = True


class ToolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    request_url: Optional[str] = None
    guide_text: Optional[str] = None
    is_active: Optional[bool] = None


class ToolResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    request_url: Optional[str] = None
    guide_text: Optional[str] = None
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