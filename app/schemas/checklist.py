from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ChecklistItemResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    order: int
    is_mandatory: bool
    is_completed: bool = False

    class Config:
        from_attributes = True

class ChecklistResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    items: List[ChecklistItemResponse] = []

    class Config:
        from_attributes = True

class MarkCompleteRequest(BaseModel):
    checklist_item_id: int