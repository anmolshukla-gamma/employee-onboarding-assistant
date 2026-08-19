import api from "./axios";

export function fetchRoles() {
  return api.get("/roles/");
}

export function selectRole(role_id) {
  return api.post("/roles/select", { role_id });
}
