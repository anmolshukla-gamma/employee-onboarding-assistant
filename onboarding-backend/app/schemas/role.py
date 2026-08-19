from pydantic import BaseModel
from typing import Optional,Any
from datetime import datetime

class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

class RoleSelect(BaseModel):
    role_id: int


# ---------- Role ----------
class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


# ---------- Checklist ----------
class ChecklistCreate(BaseModel):
    title: str
    description: Optional[str] = None

class ChecklistUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class ChecklistResponse(BaseModel):
    id: int
    role_id: int
    title: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ---------- Checklist Item ----------
class ChecklistItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    detailed_guide: Optional[str] = None
    resources: Optional[Any] = None
    category: Optional[str] = None
    order: int = 0
    is_mandatory: bool = True


class ChecklistItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    detailed_guide: Optional[str] = None
    resources: Optional[Any] = None
    category: Optional[str] = None
    order: Optional[int] = None
    is_mandatory: Optional[bool] = None


class ChecklistItemResponse(BaseModel):
    id: int
    checklist_id: int
    title: str
    description: Optional[str] = None
    detailed_guide: Optional[str] = None
    resources: Optional[Any] = None
    category: Optional[str] = None
    order: int
    is_mandatory: bool
    created_at: datetime

    class Config:
        from_attributes = True