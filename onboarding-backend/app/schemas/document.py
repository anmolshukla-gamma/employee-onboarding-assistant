from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DocumentResponse(BaseModel):
    id: int
    title: str
    filename: str
    category: Optional[str] = None
    status: str
    uploaded_at: datetime

    class Config:
        from_attributes = True