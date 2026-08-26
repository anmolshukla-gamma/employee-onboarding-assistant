import { useEffect, useMemo, useState } from "react";
import { toggleUserAdmin, toggleUserActive, assignUserTeam, assignUserRole, fetchUserProgress } from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import LoadingButton from "../../components/LoadingButton";
import StatusBadge from "../../components/StatusBadge";
import ProgressBar from "../../components/ProgressBar";
import { IconClose } from "../../components/Icons";

/**
 * @param {Object} props
 * @param {Object} props.user - the row from the users table (id, full_name, email, role_name, team_id, team_name, is_admin, is_active, ...)
 * @param {Array} props.teams
 * @param {Array} props.roles
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(userId: number, patch: Object) => void} props.onUserChange - called with a partial patch to update the row in the parent table
 * @param {number} [props.currentUserId] - to prevent self-deactivation
 */
export default function UserManageDrawer({ user, teams, roles, open, onClose, onUserChange, currentUserId }) {
  const toast = useToast();

  const [teamId, setTeamId] = useState(user?.team_id ? String(user.team_id) : "");
  const [savingTeam, setSavingTeam] = useState(false);
  const [roleId, setRoleId] = useState(user?.role_id ? String(user.role_id) : "");
  const [savingRole, setSavingRole] = useState(false);
  const [togglingAdmin, setTogglingAdmin] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  const [progress, setProgress] = useState(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressError, setProgressError] = useState("");

  useEffect(() => {
    setTeamId(user?.team_id ? String(user.team_id) : "");
    setRoleId(user?.role_id ? String(user.role_id) : "");
  }, [user?.id, user?.team_id, user?.role_id]);

  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    setProgressLoading(true);
    setProgressError("");
    fetchUserProgress(user.id)
      .then(({ data }) => {
        if (!cancelled) setProgress(data);
      })
      .catch((err) => {
        if (!cancelled) setProgressError(extractErrorMessage(err, "Could not load progress."));
      })
      .finally(() => {
        if (!cancelled) setProgressLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  const groupedItems = useMemo(() => {
    if (!progress?.items) return [];
    const map = new Map();
    for (const item of progress.items) {
      const cat = item.category || "General";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(item);
    }
    return Array.from(map.entries());
  }, [progress]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !user) return null;

  async function handleSaveTeam() {
    if (!teamId) return;
    setSavingTeam(true);
    try {
      await assignUserTeam(user.id, Number(teamId));
      const team = teams.find((t) => String(t.id) === teamId);
      onUserChange(user.id, { team_id: team?.id, team_name: team?.name });
      toast.success(`${user.full_name} assigned to ${team?.name || "team"}.`);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not assign this team."));
    } finally {
      setSavingTeam(false);
    }
  }

  async function handleSaveRole() {
    if (!roleId) return;
    setSavingRole(true);
    try {
      const { data } = await assignUserRole(user.id, Number(roleId));
      onUserChange(user.id, { role_id: data.role_id, role_name: data.role_name });
      toast.success(`${user.full_name}'s role updated to ${data.role_name || "selected role"}.`);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not assign this role."));
    } finally {
      setSavingRole(false);
    }
  }

  async function handleToggleAdmin() {
    setTogglingAdmin(true);
    try {
      await toggleUserAdmin(user.id);
      onUserChange(user.id, { is_admin: !user.is_admin });
      toast.success(`${user.full_name} is ${!user.is_admin ? "now an admin" : "no longer an admin"}.`);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not update admin status."));
    } finally {
      setTogglingAdmin(false);
    }
  }

  async function handleToggleActive() {
    if (user.id === currentUserId) {
      toast.error("You can't deactivate your own account.");
      return;
    }
    setTogglingActive(true);
    try {
      await toggleUserActive(user.id);
      onUserChange(user.id, { is_active: !user.is_active });
      toast.success(`${user.full_name} is now ${!user.is_active ? "active" : "inactive"}.`);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not update user status."));
    } finally {
      setTogglingActive(false);
    }
  }

  return (
    <div className="drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer-panel" role="dialog" aria-modal="true" aria-label={`Manage ${user.full_name}`}>
        <div className="drawer-header">
          <div className="drawer-header-text">
            <div className="checklist-item-title" style={{ fontSize: 16 }}>
              {user.full_name}
              {user.is_admin && <span className="status-badge status-admin" style={{ marginLeft: 4 }}>Admin</span>}
            </div>
            <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>{user.email}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <IconClose width={17} height={17} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Profile */}
          <div className="drawer-section">
            <h4 className="drawer-section-title">Profile</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <div className="flex-between">
                <span className="text-muted">Role</span>
                <span>{user.role_name || "—"}</span>
              </div>
              <div className="flex-between">
                <span className="text-muted">Team</span>
                <span>{user.team_name || "—"}</span>
              </div>
              <div className="flex-between">
                <span className="text-muted">Status</span>
                <StatusBadge status={user.is_active ? "active" : "inactive"} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="drawer-section">
            <h4 className="drawer-section-title">Actions</h4>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                Assign / change role
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  style={{
                    flex: 1, padding: "8px 10px", border: "1px solid var(--color-border-strong)",
                    borderRadius: "var(--radius-sm)", fontSize: 13,
                  }}
                >
                  <option value="">No role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <LoadingButton
                  className="btn btn-primary btn-sm"
                  loading={savingRole}
                  disabled={!roleId || roleId === (user.role_id ? String(user.role_id) : "")}
                  onClick={handleSaveRole}
                >
                  Save
                </LoadingButton>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                Assign / change team
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  style={{
                    flex: 1, padding: "8px 10px", border: "1px solid var(--color-border-strong)",
                    borderRadius: "var(--radius-sm)", fontSize: 13,
                  }}
                >
                  <option value="">No team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <LoadingButton
                  className="btn btn-primary btn-sm"
                  loading={savingTeam}
                  disabled={!teamId || teamId === (user.team_id ? String(user.team_id) : "")}
                  onClick={handleSaveTeam}
                >
                  Save
                </LoadingButton>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <LoadingButton className="btn btn-success btn-sm" loading={togglingAdmin} onClick={handleToggleAdmin}>
                {user.is_admin ? "Revoke admin" : "Make admin"}
              </LoadingButton>
              <LoadingButton
                className="btn btn-danger btn-sm"
                loading={togglingActive}
                disabled={user.id === currentUserId}
                onClick={handleToggleActive}
              >
                {user.is_active ? "Deactivate" : "Activate"}
              </LoadingButton>
            </div>
            {user.id === currentUserId && (
              <p className="text-muted" style={{ fontSize: 11.5, marginTop: 8 }}>You can't deactivate your own account.</p>
            )}
          </div>

          {/* Progress */}
          <div className="drawer-section">
            <h4 className="drawer-section-title">Checklist Progress</h4>
            {progressLoading && <p className="text-muted" style={{ fontSize: 13 }}>Loading progress…</p>}
            {!progressLoading && progressError && <div className="top-align-error">{progressError}</div>}
            {!progressLoading && !progressError && progress && (
              <>
                <div className="flex-between" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                    {progress.completed_items}/{progress.total_items} complete
                  </span>
                </div>
                <ProgressBar percent={progress.progress_percent} />

                {groupedItems.length > 0 && (
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                    {groupedItems.map(([category, items]) => (
                      <div key={category}>
                        <div className="checklist-group-title" style={{ marginBottom: 6 }}>{category}</div>
                        {items.map((item) => (
                          <div
                            key={item.item_id}
                            style={{
                              display: "flex", alignItems: "center", gap: 8, fontSize: 12.8,
                              padding: "6px 0", color: item.is_completed ? "var(--color-text-muted)" : "var(--color-text)",
                            }}
                          >
                            <span
                              className={`check-circle ${item.is_completed ? "checked" : ""}`}
                              style={{ width: 16, height: 16, cursor: "default" }}
                            >
                              {item.is_completed && (
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              )}
                            </span>
                            <span style={{ textDecoration: item.is_completed ? "line-through" : "none" }}>{item.title}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="drawer-footer">
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </aside>
    </div>
  );
}
