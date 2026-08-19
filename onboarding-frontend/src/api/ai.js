import api from "./axios";

export function askAi(question) {
  return api.post("/ai/ask", { question });
}

export function clearAiHistory() {
  return api.delete("/ai/history");
}

export function processDocument(documentId) {
  return api.post(`/ai/process/${documentId}`);
}
