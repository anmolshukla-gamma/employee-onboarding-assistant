import api from "./axios";

export function fetchDocuments() {
  return api.get("/documents/");
}

export function uploadDocument({ file, title, category }) {
  const form = new FormData();
  form.append("file", file);
  form.append("title", title);
  form.append("category", category);
  return api.post("/documents/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export function deleteDocument(id) {
  return api.delete(`/documents/${id}`);
}
