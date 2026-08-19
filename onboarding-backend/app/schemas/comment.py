from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CommentCreate(BaseModel):
    comment: str
    comment_type: str = "suggestion"  # suggestion / issue / outdated


class CommentReview(BaseModel):
    status: str  # approved / rejected / resolved
    admin_response: Optional[str] = None


class CommentResponse(BaseModel):
    id: int
    checklist_item_id: int
    user_id: int
    comment: str
    comment_type: str
    status: str
    admin_response: Optional[str] = None
    reviewed_by: Optional[int] = None
    created_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True