import { useEffect, useMemo, useState } from "react";
import {
  toggleUserAdmin,
  toggleUserActive,
  assignUserTeam,
  assignUserRole,
  fetchUserProgress,
} from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import LoadingButton from "../../components/LoadingButton";
import StatusBadge from "../../components/StatusBadge";
import ProgressBar from "../../components/ProgressBar";
import { IconClose } from "../../components/Icons";

export default function UserManageDrawer({
  user,
  teams,
  roles,
  open,
  onClose,
  onUserChange,
  currentUserId,
}) {
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

  const initials = (user.full_name || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
      toast.success(
        `${user.full_name} is ${!user.is_admin ? "now an admin" : "no longer an admin"}.`
      );
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
      <aside
        className="drawer-panel umd-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Manage ${user.full_name}`}
      >
        {/* Hero header */}
        <div className="umd-hero">
          <div className="umd-hero-main">
            <div className="umd-avatar">{initials}</div>
            <div className="umd-hero-text">
              <div className="umd-name-row">
                <h2>{user.full_name}</h2>
                {user.is_admin && <span className="status-badge status-admin">Admin</span>}
              </div>
              <p>{user.email}</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <IconClose width={17} height={17} />
          </button>
        </div>

        {/* Quick stats */}
        <div className="umd-stats">
          <div className="umd-stat">
            <span>Role</span>
            <strong>{user.role_name || "Not set"}</strong>
          </div>
          <div className="umd-stat">
            <span>Team</span>
            <strong>{user.team_name || "Not set"}</strong>
          </div>
          <div className="umd-stat">
            <span>Status</span>
            <StatusBadge status={user.is_active ? "active" : "inactive"} />
          </div>
        </div>

        <div className="drawer-body umd-body">
          {/* Access */}
          <section className="umd-card">
            <div className="umd-card-head">
              <h3>Access</h3>
              <p>Role drives checklist. Team drives tools.</p>
            </div>

            <div className="umd-field">
              <label>Role</label>
              <div className="umd-row">
                <select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                  <option value="">No role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
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

            <div className="umd-field">
              <label>Team</label>
              <div className="umd-row">
                <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                  <option value="">No team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
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
          </section>

          {/* Permissions */}
          <section className="umd-card">
            <div className="umd-card-head">
              <h3>Permissions</h3>
              <p>Admin rights and account availability.</p>
            </div>

            <div className="umd-toggles">
              <div className="umd-toggle-row">
                <div>
                  <strong>Admin access</strong>
                  <span>{user.is_admin ? "Can manage org settings" : "Standard employee access"}</span>
                </div>
                <LoadingButton
                  className={`btn btn-sm ${user.is_admin ? "btn-secondary" : "btn-primary"}`}
                  loading={togglingAdmin}
                  onClick={handleToggleAdmin}
                >
                  {user.is_admin ? "Revoke" : "Grant"}
                </LoadingButton>
              </div>

              <div className="umd-toggle-row">
                <div>
                  <strong>Account status</strong>
                  <span>
                    {user.id === currentUserId
                      ? "You can't deactivate your own account"
                      : user.is_active
                      ? "User can sign in"
                      : "User is blocked from sign-in"}
                  </span>
                </div>
                <LoadingButton
                  className={`btn btn-sm ${user.is_active ? "btn-danger" : "btn-primary"}`}
                  loading={togglingActive}
                  disabled={user.id === currentUserId}
                  onClick={handleToggleActive}
                >
                  {user.is_active ? "Deactivate" : "Activate"}
                </LoadingButton>
              </div>
            </div>
          </section>

          {/* Progress */}
          <section className="umd-card">
            <div className="umd-card-head">
              <h3>Onboarding progress</h3>
              <p>Live checklist completion for this user.</p>
            </div>

            {progressLoading && <p className="text-muted" style={{ fontSize: 13 }}>Loading progress…</p>}
            {!progressLoading && progressError && (
              <div className="top-align-error">{progressError}</div>
            )}
            {!progressLoading && !progressError && progress && (
              <>
                <div className="umd-progress-top">
                  <span>
                    {progress.completed_items}/{progress.total_items} complete
                  </span>
                  <strong>{Math.round(progress.progress_percent || 0)}%</strong>
                </div>
                <ProgressBar percent={progress.progress_percent} />

                {groupedItems.length > 0 && (
                  <div className="umd-progress-list">
                    {groupedItems.map(([category, items]) => (
                      <div key={category} className="umd-cat">
                        <div className="umd-cat-title">{category}</div>
                        {items.map((item) => (
                          <div
                            key={item.item_id}
                            className={`umd-item ${item.is_completed ? "done" : ""}`}
                          >
                            <span className={`check-circle ${item.is_completed ? "checked" : ""}`}>
                              {item.is_completed && (
                                <svg
                                  width="9"
                                  height="9"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#fff"
                                  strokeWidth="4"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              )}
                            </span>
                            <span>{item.title}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <div className="drawer-footer umd-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}