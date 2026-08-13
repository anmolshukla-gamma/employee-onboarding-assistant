from pydantic import BaseModel
from typing import Optional
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