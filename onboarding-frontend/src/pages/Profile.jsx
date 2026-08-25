import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { fetchMyChecklist } from "../api/checklist";
import { fetchMyAccess } from "../api/access";
import { updateMyProfile, changeMyPassword } from "../api/auth";
import { extractErrorMessage } from "../api/axios";
import { IconUser, IconLayers, IconRoles } from "../components/Icons";
import StatusBadge from "../components/StatusBadge";
import ProgressBar from "../components/ProgressBar";
import LoadingButton from "../components/LoadingButton";

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return `${(parts[0]?.[0] || "").toUpperCase()}${(parts[1]?.[0] || "").toUpperCase()}`;
}

function InfoRow({ label, value }) {
  return (
    <div className="profile-meta-row">
      <span className="profile-meta-label">{label}</span>
      <span className="profile-meta-value">{value ?? "—"}</span>
    </div>
  );
}

export default function Profile() {
  const { user, isAdmin, refreshUser } = useAuth();
  const toast = useToast();

  const [progress, setProgress] = useState(null);
  const [access, setAccess] = useState(null);

  const [editingName, setEditingName] = useState(false);
  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
  }, [user]);

  useEffect(() => {
    if (!user || isAdmin) return;
    Promise.allSettled([fetchMyChecklist(), fetchMyAccess()]).then(([checklistRes, accessRes]) => {
      if (checklistRes.status === "fulfilled") {
        const data = checklistRes.value.data;
        setProgress({
          total: data.total_items ?? data.items?.length ?? 0,
          completed: data.completed_items ?? 0,
          percent: data.progress_percent ?? 0,
        });
      }
      if (accessRes.status === "fulfilled") setAccess(accessRes.value.data);
    });
  }, [user, isAdmin]);

  if (!user) return null;

  const roleValue = user.role_name || (isAdmin ? "Administrator" : "Not assigned");
  const teamValue = user.team_name || access?.team_name || "Not assigned";

  async function handleNameSave(e) {
    e.preventDefault();
    const name = fullName.trim();
    if (!name) return toast.error("Name cannot be empty.");
    setSavingName(true);
    try {
      await updateMyProfile({ full_name: name });
      if (typeof refreshUser === "function") await refreshUser();
      toast.success("Name updated successfully.");
      setEditingName(false);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not update name."));
    } finally {
      setSavingName(false);
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      return toast.error("Please fill all password fields.");
    }
    if (newPassword.length < 6) {
      return toast.error("New password must be at least 6 characters.");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("New password and confirm password do not match.");
    }

    setSavingPassword(true);
    try {
      await changeMyPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setEditingPassword(false);
      toast.success("Password updated successfully.");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not update password."));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="profile-page">
      <div className="section-head">
        <h1>My Profile</h1>
        <p>View your account details and manage security settings.</p>
      </div>

      <div className="profile-grid">
        {/* Left: identity */}
        <div className="card card-pad profile-main-card">
          <div className="profile-header">
            <div className="avatar avatar-lg">{initials(user.full_name)}</div>
            <div>
              <div className="profile-name">
                {user.full_name}
                {user.is_admin && (
                  <span className="status-badge status-admin" style={{ marginLeft: 8 }}>
                    Admin
                  </span>
                )}
              </div>
              <div className="text-muted" style={{ fontSize: 13 }}>
                {user.email}
              </div>
            </div>
          </div>

          <div className="profile-divider" />

          <div className="profile-meta-list">
            <InfoRow label="Role" value={roleValue} />
            <InfoRow label="Team" value={teamValue} />
            {typeof user.is_active === "boolean" && (
              <div className="profile-meta-row">
                <span className="profile-meta-label">Status</span>
                <span className="profile-meta-value">
                  <StatusBadge status={user.is_active ? "active" : "inactive"} />
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="profile-side">
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div className="profile-card-head">
              <div>
                <div className="profile-card-title">Display name</div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Email is managed by admin and cannot be changed here.
                </div>
              </div>
              {!editingName && (
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingName(true)}>
                  Change name
                </button>
              )}
            </div>

            {!editingName ? (
              <div className="profile-readonly-box">{user.full_name}</div>
            ) : (
              <form onSubmit={handleNameSave} className="profile-form-compact">
                <div className="field">
                  <label htmlFor="full_name">Full name</label>
                  <input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="profile-form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditingName(false);
                      setFullName(user.full_name || "");
                    }}
                    disabled={savingName}
                  >
                    Cancel
                  </button>
                  <LoadingButton type="submit" className="btn btn-primary btn-sm" loading={savingName}>
                    Save
                  </LoadingButton>
                </div>
              </form>
            )}
          </div>

          <div className="card card-pad">
            <div className="profile-card-head">
              <div>
                <div className="profile-card-title">Password</div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Keep your account secure with a strong password.
                </div>
              </div>
              {!editingPassword && (
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingPassword(true)}>
                  Change password
                </button>
              )}
            </div>

            {!editingPassword ? (
              <div className="profile-readonly-box">••••••••</div>
            ) : (
              <form onSubmit={handlePasswordSave} className="profile-form-compact">
                <div className="field">
                  <label htmlFor="current_password">Current password</label>
                  <input
                    id="current_password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="new_password">New password</label>
                  <input
                    id="new_password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="confirm_password">Confirm password</label>
                  <input
                    id="confirm_password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="profile-form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditingPassword(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    disabled={savingPassword}
                  >
                    Cancel
                  </button>
                  <LoadingButton type="submit" className="btn btn-primary btn-sm" loading={savingPassword}>
                    Update
                  </LoadingButton>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div className="card card-pad" style={{ marginTop: 16 }}>
          <div className="profile-card-head">
            <div>
              <div className="profile-card-title">Onboarding snapshot</div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Your checklist and team access overview
              </div>
            </div>
          </div>

          {progress ? (
            <>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span className="text-muted" style={{ fontSize: 13 }}>
                  {progress.completed} of {progress.total} complete
                </span>
                <strong style={{ fontSize: 13 }}>{progress.percent}%</strong>
              </div>
              {/* <ProgressBar value={progress.percent} /> */}
            </>
          ) : (
            <div className="text-muted" style={{ fontSize: 13 }}>
              Checklist progress unavailable.
            </div>
          )}

          <div className="profile-snapshot-footer">
            <span className="text-muted" style={{ fontSize: 13 }}>
              Team tools: <strong>{access?.tools?.length ?? 0}</strong>
              {!access?.team_id && " (no team assigned)"}
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link to="/checklist" className="btn btn-secondary btn-sm">Checklist</Link>
              <Link to="/access" className="btn btn-secondary btn-sm">My Access</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}