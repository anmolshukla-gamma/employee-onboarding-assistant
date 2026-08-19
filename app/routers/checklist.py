from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime


from app.database import get_db
from app.models.user import User
from app.models.checklist import Checklist, ChecklistItem, UserProgress
from app.schemas.checklist import ChecklistResponse, ChecklistItemResponse, MarkCompleteRequest
from app.core.dependencies import get_current_user
import json

router = APIRouter(prefix="/checklist", tags=["Checklist"])

@router.get("/my", response_model=ChecklistResponse)
def get_my_checklist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.role_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select a role first"
        )

    checklist = db.query(Checklist).filter(Checklist.role_id == current_user.role_id).first()
    if not checklist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist not found for this role"
        )

    items = db.query(ChecklistItem).filter(
        ChecklistItem.checklist_id == checklist.id
    ).order_by(ChecklistItem.order).all()

    # Get completed items for this user
    completed_ids = {
        p.checklist_item_id
        for p in db.query(UserProgress).filter(
            UserProgress.user_id == current_user.id,
            UserProgress.is_completed == True
        ).all()
    }

    item_responses = []
    for item in items:
        item_responses.append(
            ChecklistItemResponse(
                id=item.id,
                title=item.title,
                description=item.description,
                detailed_guide=item.detailed_guide,
                resources=parse_resources(item.resources),
                category=item.category,
                order=item.order,
                is_mandatory=item.is_mandatory,
                is_completed=item.id in completed_ids
            )
        )

    total = len(item_responses)
    completed = sum(1 for i in item_responses if i.is_completed)
    progress = round((completed / total) * 100, 1) if total > 0 else 0.0

    return ChecklistResponse(
        id=checklist.id,
        title=checklist.title,
        description=checklist.description,
        total_items=total,
        completed_items=completed,
        progress_percent=progress,
        items=item_responses
    )

@router.post("/complete")
def mark_item_complete(
    data: MarkCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(ChecklistItem).filter(ChecklistItem.id == data.checklist_item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist item not found"
        )

    progress = db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id,
        UserProgress.checklist_item_id == data.checklist_item_id
    ).first()

    if progress:
        progress.is_completed = True
        progress.completed_at = datetime.utcnow()
    else:
        progress = UserProgress(
            user_id=current_user.id,
            checklist_item_id=data.checklist_item_id,
            is_completed=True,
            completed_at=datetime.utcnow()
        )
        db.add(progress)

    db.commit()
    return {"message": "Checklist item marked as complete"}



def parse_resources(value):
    if value is None:
        return []
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return []

def dump_resources(value):
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return json.dumps(value)