import api from "./axios";

// ---- Dashboard ----
export const fetchAdminStats = () => api.get("/admin/stats");

// ---- Users ----
export const fetchAdminUsers = (params = {}) => {
  // Only send params that are actually set, so an empty search/filter
  // doesn't get sent as an empty-string query param.
  const query = {};
  if (params.q) query.q = params.q;
  if (params.role_id) query.role_id = params.role_id;
  if (params.team_id) query.team_id = params.team_id;
  if (params.is_active !== undefined && params.is_active !== "") query.is_active = params.is_active;
  return api.get("/admin/users", { params: query });
};
export const toggleUserAdmin = (id) => api.patch(`/admin/users/${id}/toggle-admin`);
export const toggleUserActive = (id) => api.patch(`/admin/users/${id}/toggle-active`);

// ---- Roles ----
export const fetchAdminRoles = () => api.get("/admin/roles");
export const createAdminRole = (payload) => api.post("/admin/roles", payload);
export const updateAdminRole = (id, payload) => api.put(`/admin/roles/${id}`, payload);
export const deleteAdminRole = (id) => api.delete(`/admin/roles/${id}`);

// ---- Checklists (under a role) ----
export const fetchRoleChecklists = (roleId) => api.get(`/admin/roles/${roleId}/checklists`);
export const createRoleChecklist = (roleId, payload) => api.post(`/admin/roles/${roleId}/checklists`, payload);
export const updateChecklist = (checklistId, payload) => api.put(`/admin/checklists/${checklistId}`, payload);
export const deleteChecklist = (checklistId) => api.delete(`/admin/checklists/${checklistId}`);

// ---- Checklist items ----
export const fetchChecklistItems = (checklistId) => api.get(`/admin/checklists/${checklistId}/items`);
export const createChecklistItem = (checklistId, payload) => api.post(`/admin/checklists/${checklistId}/items`, payload);
export const updateChecklistItem = (itemId, payload) => api.put(`/admin/items/${itemId}`, payload);
export const deleteChecklistItem = (itemId) => api.delete(`/admin/items/${itemId}`);

// ---- Teams ----
export const fetchAdminTeams = () => api.get("/admin/teams");
export const createAdminTeam = (payload) => api.post("/admin/teams", payload);
export const updateAdminTeam = (id, payload) => api.put(`/admin/teams/${id}`, payload);
export const deleteAdminTeam = (id) => api.delete(`/admin/teams/${id}`);

// ---- Tools ----
export const fetchAdminTools = () => api.get("/admin/tools");
export const createAdminTool = (payload) => api.post("/admin/tools", payload);
export const updateAdminTool = (id, payload) => api.put(`/admin/tools/${id}`, payload);
export const deleteAdminTool = (id) => api.delete(`/admin/tools/${id}`);

// ---- Team <-> Tool mapping ----
export const fetchTeamTools = (teamId) => api.get(`/admin/teams/${teamId}/tools`);
export const addToolToTeam = (teamId, payload) => api.post(`/admin/teams/${teamId}/tools`, payload);
export const removeToolFromTeam = (teamId, toolId) => api.delete(`/admin/teams/${teamId}/tools/${toolId}`);

// ---- Assign user to team ----
export const assignUserTeam = (userId, teamId) => api.patch(`/admin/users/${userId}/team`, { team_id: teamId });

// ---- Assign user role ----
export const assignUserRole = (userId, roleId) => api.patch(`/admin/users/${userId}/role`, { role_id: roleId });

// ---- Create user ----
export const createAdminUser = (payload) => api.post("/admin/users", payload);

// ---- Progress tracking ----
export const fetchAllUsersProgress = () => api.get("/admin/progress");
export const fetchUserProgressDetail = (userId) => api.get(`/admin/progress/${userId}`);
// Alias matching the spec's naming — same endpoint as fetchUserProgressDetail.
export const fetchUserProgress = (userId) => api.get(`/admin/progress/${userId}`);

// ---- Team members ----
export const fetchTeamMembers = (teamId) => api.get(`/admin/teams/${teamId}/members`);
export const addTeamMember = (teamId, userId) => api.post(`/admin/teams/${teamId}/members`, { user_id: userId });
export const removeTeamMember = (teamId, userId) => api.delete(`/admin/teams/${teamId}/members/${userId}`);

// ---- Checklist comments / suggestions ----
export const fetchAdminComments = (status) =>
  api.get("/admin/comments", { params: status ? { status } : undefined });
export const reviewAdminComment = (commentId, payload) => api.patch(`/admin/comments/${commentId}`, payload);
