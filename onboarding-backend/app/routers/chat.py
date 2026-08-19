from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.chat import ChatMessage
from app.core.dependencies import get_current_user, get_current_admin
from app.config import settings
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
    current_user: User = Depends(get_current_admin),
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

def is_follow_up(question: str, history: list[dict]) -> bool:
    if not history:
        return False

    q = question.lower().strip()

    follow_up_starts = [
        "what about",
        "and ",
        "who approves",
        "how long",
        "then ",
        "after that",
        "same for",
        "for that",
        "and then",
    ]

    if len(q.split()) <= 6 and any(x in q for x in [" it", " that", " this", " there"]):
        return True

    return any(q.startswith(x) for x in follow_up_starts)



@router.post("/ask", response_model=QuestionResponse)
def ask_ai_question(
    data: QuestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not data.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    question = data.question.strip()

    # ---------- Fix 1: checklist step questions ignore history ----------
    is_checklist_step = question.lower().startswith(
        "help me complete this onboarding step:"
    )

    history = []
    if not is_checklist_step:
        cutoff = datetime.utcnow() - timedelta(minutes=settings.CHAT_SESSION_MINUTES)
        recent = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.user_id == current_user.id,
                ChatMessage.created_at >= cutoff
            )
            .order_by(ChatMessage.created_at.desc())
            .limit(settings.CHAT_HISTORY_LIMIT)
            .all()
        )
        recent = list(reversed(recent))
        history = [{"role": m.role, "content": m.content} for m in recent]

        # keep only true follow-ups
        if not is_follow_up(question, history):
            history = []

    # ---------- Fix 2: better retrieval text for checklist steps ----------
    search_question = question
    if is_checklist_step:
        # "Help me complete this onboarding step: Submit Bank & Payroll Details"
        search_question = question.split(":", 1)[1].strip()

    try:
        result = ask_question(
            question=question,
            history=history,
            search_question=search_question
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate answer: {str(e)}"
        )

    db.add(ChatMessage(user_id=current_user.id, role="user", content=question))
    db.add(ChatMessage(user_id=current_user.id, role="assistant", content=result["answer"]))
    db.commit()

    return result

@router.delete("/history")
def clear_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Chat history cleared"}