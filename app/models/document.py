from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    category = Column(String, nullable=True)
    status = Column(String, default="uploaded")  # uploaded / processing / ready / failed
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())