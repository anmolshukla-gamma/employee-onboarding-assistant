import api from "./axios";

export function fetchMyChecklist() {
  return api.get("/checklist/my");
}

export function completeChecklistItem(checklist_item_id) {
  return api.post("/checklist/complete", { checklist_item_id });
}

// ---- Checklist item comments/suggestions ----
export function addChecklistItemComment(itemId, { comment, comment_type = "suggestion" }) {
  return api.post(`/checklist/items/${itemId}/comments`, { comment, comment_type });
}

export function fetchChecklistItemComments(itemId) {
  return api.get(`/checklist/items/${itemId}/comments`);
}
