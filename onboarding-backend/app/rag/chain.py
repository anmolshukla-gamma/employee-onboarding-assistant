from app.rag.llm import get_llm
from app.rag.vectorstore import search_similar_chunks


def ask_question(
    question: str,
    history: list | None = None,
    search_question: str | None = None
) -> dict:
    history = history or []

    # Retrieve using focused query when provided
    retrieval_query = (search_question or question).strip()
    docs = search_similar_chunks(retrieval_query, k=4)

    if not docs:
        return {
            "answer": "I could not find relevant information in the knowledge base.",
            "sources": []
        }

    context = "\n\n".join([doc.page_content for doc in docs])
    sources = list({doc.metadata.get("title", "Unknown") for doc in docs})

    # Keep only the last few turns so history doesn't drown the current question
    recent = history[-4:] if history else []
    history_text = ""
    for msg in recent:
        role_label = "User" if msg["role"] == "user" else "Assistant"
        content = msg.get("content") or ""
        # Trim long prior answers — keep a cue, not a full script to copy
        if msg.get("role") == "assistant" and len(content) > 400:
            content = content[:400].rstrip() + "..."
        history_text += f"{role_label}: {content}\n"

    prompt = f"""You are an internal company onboarding assistant.

Answer using ONLY the context below.
If the answer is not in the context, say you don't know and suggest contacting HR, IT, or the relevant team.

Formatting rules:
- Use plain text only
- No markdown
- No # headers
- No ** bold **
- No tables
- No emojis
- No checkbox characters
- Use short lines
- Use numbered steps for procedures
- Put a blank line between sections
- Keep it easy to scan

Preferred structure:
1. One short intro line
2. Numbered steps
3. Optional short section for issues/contact

Conversation rules:
- Answer the CURRENT question only.
- Recent conversation is background only. Never repeat or rewrite the previous full answer.
- If the user asks about something mentioned in the previous answer (for example "raise an IT ticket"), explain THAT topic using the context.
- Do not continue explaining the previous onboarding step unless the user asks for that step again.
- Prefer retrieved context over prior assistant text when they conflict.
- If the current question introduces a different topic, completely ignore the recent conversation.
- If the question names a specific onboarding step, answer ONLY that step.

Context:
{context}

Recent conversation:
{history_text if history_text else "None"}

Current question: {question}

Answer:
"""

    llm = get_llm()
    response = llm.invoke(prompt)

    return {
        "answer": response.content,
        "sources": sources
    }