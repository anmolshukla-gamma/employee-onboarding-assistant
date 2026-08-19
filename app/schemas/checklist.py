from pydantic import BaseModel
from typing import Optional, List, Any

class ChecklistItemResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    detailed_guide: Optional[str] = None
    resources: Optional[Any] = None   # parsed list/dict
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
    total_items: int = 0
    completed_items: int = 0
    progress_percent: float = 0.0
    items: List[ChecklistItemResponse] = []

    class Config:
        from_attributes = True


class MarkCompleteRequest(BaseModel):
    checklist_item_id: int