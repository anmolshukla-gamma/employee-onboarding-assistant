from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    GITHUB_TOKEN: Optional[str] = None
    GITHUB_ORG: Optional[str] = None
    GITHUB_TEAM_SLUG: Optional[str] = None

    JIRA_DOMAIN: Optional[str] = None
    JIRA_ADMIN_EMAIL: Optional[str] = None
    JIRA_API_TOKEN: Optional[str] = None
    JIRA_DEFAULT_GROUP: str = "jira-software-users"

    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    AWS_DEFAULT_IAM_GROUP: Optional[str] = None
    AWS_ACCOUNT_ID: Optional[str] = None

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: str = "Employee Onboarding Platform"
    SMTP_TLS: bool = True

    LLM_PROVIDER: str = "groq"  # groq | openai | gemini
    GROQ_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None

    GROQ_MODEL: str = "openai/gpt-oss-20b"
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_MODEL: str = "gemini-1.5-flash"

    CHAT_HISTORY_LIMIT: int = 4
    CHAT_SESSION_MINUTES: int = 30

    class Config:
        env_file = ".env"

settings = Settings()