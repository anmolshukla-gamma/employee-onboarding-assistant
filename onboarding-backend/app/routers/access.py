from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.team import Team, Tool, TeamTool, UserTeam
from app.schemas.team import MyAccessResponse, MyAccessItem
from app.core.dependencies import get_current_user

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