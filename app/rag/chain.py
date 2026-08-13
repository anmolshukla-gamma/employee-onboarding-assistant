from app.rag.llm import get_llm
from app.rag.vectorstore import search_similar_chunks

def ask_question(question: str) -> dict:
    # 1. Retrieve relevant chunks
    docs = search_similar_chunks(question, k=4)

    if not docs:
        return {
            "answer": "I could not find relevant information in the knowledge base.",
            "sources": []
        }

    context = "\n\n".join([doc.page_content for doc in docs])
    sources = list({doc.metadata.get("title", "Unknown") for doc in docs})

    # 2. Build prompt
    prompt = f"""You are an internal company onboarding assistant.
Answer the question using ONLY the context below.
If the answer is not in the context, say you don't know.

Context:
{context}

Question: {question}

Answer clearly and helpfully:"""

    # 3. Generate answer
    llm = get_llm()
    response = llm.invoke(prompt)

    return {
        "answer": response.content,
        "sources": sources
    }