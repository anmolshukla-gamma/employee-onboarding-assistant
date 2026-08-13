from app.rag.loader import extract_text_from_file
from app.rag.chunker import split_text
from app.rag.vectorstore import add_documents_to_vectorstore

def process_document(file_path: str, document_id: int, title: str, category: str = None):
    # 1. Extract text
    text = extract_text_from_file(file_path)
    if not text:
        raise ValueError("No text could be extracted from the document")

    # 2. Split into chunks
    chunks = split_text(text)

    # 3. Store in vector DB
    metadata = {
        "document_id": document_id,
        "title": title,
        "category": category or "general",
        "source": file_path
    }
    num_chunks = add_documents_to_vectorstore(chunks, metadata)

    return {
        "document_id": document_id,
        "chunks_created": num_chunks,
        "status": "ready"
    }