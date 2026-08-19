import api from "./axios";

export function fetchMyChecklist() {
  return api.get("/checklist/my");
}

export function completeChecklistItem(checklist_item_id) {
  return api.post("/checklist/complete", { checklist_item_id });
}
