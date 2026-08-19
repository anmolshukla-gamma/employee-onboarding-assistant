from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Tool(Base):
    __tablename__ = "tools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    request_url = Column(String, nullable=True)
    guide_text = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TeamTool(Base):
    __tablename__ = "team_tools"
    __table_args__ = (
        UniqueConstraint("team_id", "tool_id", name="uq_team_tool"),
    )

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    tool_id = Column(Integer, ForeignKey("tools.id"), nullable=False)
    is_mandatory = Column(Boolean, default=True)
    order = Column(Integer, default=0)


class UserTeam(Base):
    __tablename__ = "user_teams"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_one_team"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())