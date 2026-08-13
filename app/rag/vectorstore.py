import os
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import FastEmbedEmbeddings
from langchain_core.documents import Document

CHROMA_PATH = "chroma_db"

# Free local embeddings
embeddings = FastEmbedEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

def get_vectorstore():
    return Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings
    )

def add_documents_to_vectorstore(chunks: list[str], metadata: dict):
    docs = [
        Document(page_content=chunk, metadata=metadata)
        for chunk in chunks if chunk.strip()
    ]
    vectorstore = get_vectorstore()
    vectorstore.add_documents(docs)
    return len(docs)

def search_similar_chunks(query: str, k: int = 4):
    vectorstore = get_vectorstore()
    results = vectorstore.similarity_search(query, k=k)
    return results