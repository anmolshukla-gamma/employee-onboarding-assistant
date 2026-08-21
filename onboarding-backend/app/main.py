from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models import user, role, checklist, document,chat
from app.routers import auth,role,checklist,document,chat,admin,access
from app.models.chat import ChatMessage
from app.models.team import Team, Tool, TeamTool, UserTeam
from app.models.comment import ChecklistComment
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)





# Create's all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Employee Onboarding Assistant API",
    description="AI-powered Onboarding & Knowledge Buddy",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Allow's frontend to call APIs
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # i will replace it with frontend URL further
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(role.router)
app.include_router(checklist.router)
app.include_router(document.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(access.router)


@app.get("/")
def root():
    return {"message": "Employee Onboarding Assistant API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}