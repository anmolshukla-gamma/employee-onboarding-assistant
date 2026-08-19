from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.database import Base


class ChecklistComment(Base):
    __tablename__ = "checklist_comments"

    id = Column(Integer, primary_key=True, index=True)
    checklist_item_id = Column(Integer, ForeignKey("checklist_items.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    comment = Column(Text, nullable=False)
    comment_type = Column(String, default="suggestion")  # suggestion / issue / outdated
    status = Column(String, default="pending")  # pending / approved / rejected / resolved

    admin_response = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)