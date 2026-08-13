import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentResponse
from app.core.dependencies import get_current_user,get_current_admin

router = APIRouter(prefix="/documents", tags=["Documents"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md"}

def is_allowed_file(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS

@router.post("/upload", response_model=DocumentResponse)
def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    category: Optional[str] = Form(None),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Optional: Allow only admin (you can enable this later)
    # if not current_user.is_admin:
    #     raise HTTPException(status_code=403, detail="Only admin can upload documents")

    if not is_allowed_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type not allowed. Allowed: pdf, docx, doc, txt, md"
        )

    # Create unique filename to avoid overwrite
    file_location = os.path.join(UPLOAD_DIR, file.filename)

    # If file already exists, add a number
    counter = 1
    name, ext = os.path.splitext(file.filename)
    while os.path.exists(file_location):
        file_location = os.path.join(UPLOAD_DIR, f"{name}_{counter}{ext}")
        counter += 1

    # Save file locally
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Save metadata in database
    document = Document(
        title=title,
        filename=os.path.basename(file_location),
        file_path=file_location,
        category=category,
        status="uploaded"
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    return document

@router.get("/", response_model=List[DocumentResponse])
def get_all_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    documents = db.query(Document).order_by(Document.uploaded_at.desc()).all()
    return documents

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
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
    return document

@router.delete("/{document_id}")
def delete_document(
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

    # Delete file from local storage
    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    db.delete(document)
    db.commit()

    return {"message": "Document deleted successfully"}