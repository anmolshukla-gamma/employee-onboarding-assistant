import api from "./axios";

// ---- Dashboard ----
export const fetchAdminStats = () => api.get("/admin/stats");

// ---- Users ----
export const fetchAdminUsers = () => api.get("/admin/users");
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
