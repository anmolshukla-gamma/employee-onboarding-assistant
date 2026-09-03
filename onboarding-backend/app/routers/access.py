from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.team import Team, Tool, TeamTool, UserTeam,ToolAccessRequest
from app.schemas.team import MyAccessResponse, MyAccessItem, ToolAccessRequestCreate, ToolAccessRequestResponse
from app.core.dependencies import get_current_user
from typing import List

router = APIRouter(prefix="/access", tags=["Access / Tools"])


@router.get("/my", response_model=MyAccessResponse)
def get_my_access(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_team = db.query(UserTeam).filter(
        UserTeam.user_id == current_user.id
    ).first()

    if not user_team:
        return MyAccessResponse(
            team_id=None,
            team_name=None,
            tools=[]
        )

    team = db.query(Team).filter(Team.id == user_team.team_id).first()
    if not team or not team.is_active:
        return MyAccessResponse(
            team_id=user_team.team_id,
            team_name=team.name if team else None,
            tools=[]
        )

    rows = (
        db.query(TeamTool, Tool)
        .join(Tool, Tool.id == TeamTool.tool_id)
        .filter(
            TeamTool.team_id == team.id,
            Tool.is_active == True
        )
        .order_by(TeamTool.order.asc(), Tool.name.asc())
        .all()
    )

    tools = [
        MyAccessItem(
            tool_id=tool.id,
            name=tool.name,
            description=tool.description,
            category=tool.category,
            request_url=tool.request_url,
            guide_text=tool.guide_text,
            is_mandatory=row.is_mandatory,
            order=row.order
        )
        for row, tool in rows
    ]

    return MyAccessResponse(
        team_id=team.id,
        team_name=team.name,
        tools=tools
    )




@router.post("/request", response_model=ToolAccessRequestResponse, status_code=201)
def request_tool_access(
    data: ToolAccessRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tool = db.query(Tool).filter(Tool.id == data.tool_id, Tool.is_active == True).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    existing = db.query(ToolAccessRequest).filter(
        ToolAccessRequest.employee_id == current_user.id,
        ToolAccessRequest.tool_id == data.tool_id,
        ToolAccessRequest.status.in_(["pending", "approved"])
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"You already have a {existing.status} request for this tool")

    # Automatically default identifier to employee's profile email if not provided
    resolved_identifier = (
        data.identifier.strip()
        if data.identifier and data.identifier.strip()
        else current_user.email
    )

    req = ToolAccessRequest(
        employee_id=current_user.id,
        tool_id=data.tool_id,
        identifier=resolved_identifier,
        reason=data.reason,
        status="pending"
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    return ToolAccessRequestResponse(
        id=req.id, tool_id=req.tool_id, tool_name=tool.name,
        identifier=req.identifier, status=req.status, reason=req.reason,
        requested_at=req.requested_at, reviewed_at=req.reviewed_at,
        provisioning_message=req.provisioning_message
    )


@router.get("/requests", response_model=List[ToolAccessRequestResponse])
def get_my_tool_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rows = (
        db.query(ToolAccessRequest, Tool)
        .join(Tool, Tool.id == ToolAccessRequest.tool_id)
        .filter(ToolAccessRequest.employee_id == current_user.id)
        .order_by(ToolAccessRequest.requested_at.desc())
        .all()
    )
    return [
        ToolAccessRequestResponse(
            id=req.id, tool_id=req.tool_id, tool_name=tool.name,
            identifier=req.identifier, status=req.status, reason=req.reason,
            requested_at=req.requested_at, reviewed_at=req.reviewed_at,
            provisioning_message=req.provisioning_message
        )
        for req, tool in rows
    ]