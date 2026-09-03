import os
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import FastEmbedEmbeddings
from langchain_core.documents import Document

CHROMA_PATH = "chroma_db"

# Free local embeddings
embeddings = FastEmbedEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

_vectorstore_instance = None

def get_vectorstore():
    global _vectorstore_instance
    if _vectorstore_instance is None:
        _vectorstore_instance = Chroma(
            persist_directory=CHROMA_PATH,
            embedding_function=embeddings
        )
    return _vectorstore_instance

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

def delete_documents_by_metadata(document_id: int):
    try:
        vectorstore = get_vectorstore()
        # Try metadata filter delete
        vectorstore._collection.delete(where={"document_id": int(document_id)})
    except Exception as e:
        # Do not crash API if chroma delete fails
        print(f"Chroma delete warning for document_id={document_id}: {e}")