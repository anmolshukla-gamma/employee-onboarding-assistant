import { useEffect, useState } from "react";
import {
  fetchAdminUsers,
  fetchAdminRoles,
  fetchAdminTeams,
  createAdminUser,
} from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { PageLoading, Modal } from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import ProgressBar from "../../components/ProgressBar";
import LoadingButton from "../../components/LoadingButton";
import Pagination from "../../components/Pagination";
import { IconPlus } from "../../components/Icons";
import UserManageDrawer from "./UserManageDrawer";
import { useNavigate } from "react-router-dom";

const EMPTY_CREATE_FORM = {
  email: "",
  full_name: "",
  password: "",
  role_id: "",
  team_id: "",
  is_admin: false,
  is_active: true,
};

export default function Users() {
  const toast = useToast();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search + filters
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [creating, setCreating] = useState(false);

  const [manageUser, setManageUser] = useState(null);
  const navigate = useNavigate();

  // Debounce free-text search
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1); // reset to first page on new search text
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  function loadUsers(nextPage = page) {
    setLoading(true);
    setError("");

    fetchAdminUsers({
      q: q || undefined,
      role_id: roleFilter || undefined,
      team_id: teamFilter || undefined,
      is_active: activeFilter === "" ? undefined : activeFilter === "true",
      page: nextPage,
      page_size: pageSize,
    })
      .then(({ data }) => {
        setUsers(Array.isArray(data?.items) ? data.items : []);
        setPage(data?.page || nextPage);
        setTotal(data?.total || 0);
        setTotalPages(data?.total_pages || 1);
      })
      .catch((err) => setError(extractErrorMessage(err, "Could not load users.")))
      .finally(() => setLoading(false));
  }

  // Load roles/teams once
  useEffect(() => {
    Promise.all([fetchAdminRoles(), fetchAdminTeams()])
      .then(([rolesRes, teamsRes]) => {
        setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
        setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : []);
      })
      .catch(() => {});
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadUsers(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, roleFilter, teamFilter, activeFilter, page]);

  // When filters change, reset page to 1
  useEffect(() => {
    setPage(1);
  }, [roleFilter, teamFilter, activeFilter]);

  function updateUserRow(userId, patch) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)));
    setManageUser((prev) => (prev && prev.id === userId ? { ...prev, ...patch } : prev));
  }

  function openCreate() {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateOpen(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await createAdminUser({
        email: createForm.email,
        full_name: createForm.full_name,
        password: createForm.password,
        role_id: createForm.role_id ? Number(createForm.role_id) : null,
        team_id: createForm.team_id ? Number(createForm.team_id) : null,
        is_admin: createForm.is_admin,
        is_active: createForm.is_active,
      });
      toast.success("User created.");
      setCreateOpen(false);
      setPage(1);
      loadUsers(1);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not create this user."));
    } finally {
      setCreating(false);
    }
  }

  const hasActiveFilters = q || roleFilter || teamFilter || activeFilter;

  if (loading && users.length === 0 && !hasActiveFilters) return <PageLoading />;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 18 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h1>Users</h1>
          <p>Search, review progress, and manage team/admin/status for everyone in the org.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/admin/users/new")}>
          + New user
        </button>
      </div>

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email…"
            style={{
              flex: "1 1 220px",
              padding: "9px 12px",
              border: "1px solid var(--color-border-strong)",
              borderRadius: "var(--radius-sm)",
              fontSize: 13.5,
            }}
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: "9px 10px",
              border: "1px solid var(--color-border-strong)",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
            }}
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            style={{
              padding: "9px 10px",
              border: "1px solid var(--color-border-strong)",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
            }}
          >
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            style={{
              padding: "9px 10px",
              border: "1px solid var(--color-border-strong)",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
            }}
          >
            <option value="">Any status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {error && <div className="top-align-error">{error}</div>}

      <div className="card">
        {!loading && users.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? "No matching users" : "No users yet"}
            description={
              hasActiveFilters
                ? "Try a different search or clear your filters."
                : "Users will show up here once people start registering, or create one directly."
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Team</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="cell-name">
                      {u.full_name}
                      {u.id === currentUser?.id && <span className="cell-muted"> (you)</span>}
                      {u.is_admin && (
                        <span className="status-badge status-admin" style={{ marginLeft: 6 }}>
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="cell-muted">{u.email}</td>
                    <td className="cell-muted">{u.role_name || "—"}</td>
                    <td className="cell-muted">{u.team_name || "—"}</td>
                    <td>
                      <StatusBadge status={u.is_active ? "active" : "inactive"} />
                    </td>
                    <td style={{ minWidth: 150 }}>
                      <div className="cell-muted" style={{ fontSize: 11.5, marginBottom: 4 }}>
                        {u.completed_items ?? 0}/{u.total_items ?? 0}
                      </div>
                      <ProgressBar percent={u.progress_percent ?? 0} />
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => setManageUser(u)}>
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={(p) => setPage(p)}
      />

      {createOpen && (
        <Modal title="New user" onClose={() => setCreateOpen(false)} width={480}>
          <form onSubmit={handleCreate}>
            <div className="field">
              <label htmlFor="cu_name">Full name</label>
              <input
                id="cu_name"
                required
                value={createForm.full_name}
                onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Jane Doe"
              />
            </div>
            <div className="field">
              <label htmlFor="cu_email">Email</label>
              <input
                id="cu_email"
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jane@company.com"
              />
            </div>
            <div className="field">
              <label htmlFor="cu_password">Temporary password</label>
              <input
                id="cu_password"
                type="text"
                required
                minLength={8}
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Welcome@123"
              />
              <div className="field-hint">
                Share this with the user securely — they can change it after logging in.
              </div>
            </div>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="field">
                <label htmlFor="cu_role">Role</label>
                <select
                  id="cu_role"
                  value={createForm.role_id}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role_id: e.target.value }))}
                >
                  <option value="">No role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="cu_team">Team</label>
                <select
                  id="cu_team"
                  value={createForm.team_id}
                  onChange={(e) => setCreateForm((f) => ({ ...f, team_id: e.target.value }))}
                >
                  <option value="">No team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
              <div className="checkbox-row">
                <input
                  id="cu_admin"
                  type="checkbox"
                  checked={createForm.is_admin}
                  onChange={(e) => setCreateForm((f) => ({ ...f, is_admin: e.target.checked }))}
                />
                <label htmlFor="cu_admin" style={{ margin: 0 }}>
                  Admin
                </label>
              </div>
              <div className="checkbox-row">
                <input
                  id="cu_active"
                  type="checkbox"
                  checked={createForm.is_active}
                  onChange={(e) => setCreateForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                <label htmlFor="cu_active" style={{ margin: 0 }}>
                  Active
                </label>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <LoadingButton type="submit" loading={creating}>
                Create user
              </LoadingButton>
            </div>
          </form>
        </Modal>
      )}

      <UserManageDrawer
        user={manageUser}
        teams={teams}
        roles={roles}
        open={Boolean(manageUser)}
        onClose={() => setManageUser(null)}
        onUserChange={updateUserRow}
        currentUserId={currentUser?.id}
      />
    </div>
  );
}