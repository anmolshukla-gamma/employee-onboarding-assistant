import api from "./axios";

/** Returns { team_id, team_name, tools: [] } — team_id/team_name are null if unassigned. */
export function fetchMyAccess() {
  return api.get("/access/my");
}

export function requestToolAccess(payload) {
  return api.post("/access/request", payload);
}

export function fetchMyToolRequests() {
  return api.get("/access/requests");
}