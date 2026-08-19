from app.rag.llm import get_llm
from app.rag.vectorstore import search_similar_chunks

def ask_question(question: str, history: list | None = None) -> dict:
    history = history or []

    docs = search_similar_chunks(question, k=4)

    if not docs:
        return {
            "answer": "I could not find relevant information in the knowledge base.",
            "sources": []
        }

    context = "\n\n".join([doc.page_content for doc in docs])
    sources = list({doc.metadata.get("title", "Unknown") for doc in docs})

    history_text = ""
    for msg in history:
        role_label = "User" if msg["role"] == "user" else "Assistant"
        history_text += f"{role_label}: {msg['content']}\n"

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

Important:
- If the user asks a new independent question, do not continue the previous topic.
- Only use chat history for true follow-ups referring to previous answers.
- Prioritize the current question + retrieved context.

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