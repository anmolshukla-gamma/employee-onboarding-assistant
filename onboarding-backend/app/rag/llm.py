from app.config import settings

def get_llm():
    from app.config import Settings
    fresh = Settings(_env_file=".env")
    provider = fresh.LLM_PROVIDER.lower()

    if provider == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(
            groq_api_key=fresh.GROQ_API_KEY,
            model_name=fresh.GROQ_MODEL,
            temperature=0.2
        )

    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            api_key=fresh.OPENAI_API_KEY,
            model=fresh.OPENAI_MODEL,
            temperature=0.2
        )

    elif provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            google_api_key=fresh.GOOGLE_API_KEY,
            model=fresh.GEMINI_MODEL,
            temperature=0.2
        )

    else:
        raise ValueError(f"Unsupported LLM_PROVIDER: {provider}")