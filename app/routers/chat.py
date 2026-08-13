from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.document import Document
from app.core.dependencies import get_current_user
from app.rag.process import process_document
from app.rag.chain import ask_question

router = APIRouter(prefix="/ai", tags=["AI / RAG"])

class QuestionRequest(BaseModel):
    question: str

class QuestionResponse(BaseModel):
    answer: str
    sources: list[str]

@router.post("/process/{document_id}")
def process_uploaded_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if document.status == "ready":
        return {"message": "Document already processed", "document_id": document_id}

    try:
        document.status = "processing"
        db.commit()

        result = process_document(
            file_path=document.file_path,
            document_id=document.id,
            title=document.title,
            category=document.category
        )

        document.status = "ready"
        db.commit()

        return {
            "message": "Document processed successfully",
            "document_id": document_id,
            "chunks_created": result["chunks_created"]
        }

    except Exception as e:
        document.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {str(e)}"
        )

@router.post("/ask", response_model=QuestionResponse)
def ask_ai_question(
    data: QuestionRequest,
    current_user: User = Depends(get_current_user)
):
    if not data.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty"
        )

    try:
        result = ask_question(data.question)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate answer: {str(e)}"
        )