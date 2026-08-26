import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { updateProfile, changePassword } from "../api/auth";
import { fetchMyChecklist } from "../api/checklist";
import { fetchMyAccess } from "../api/access";
import { extractErrorMessage } from "../api/axios";
import { IconUser, IconLayers, IconRoles, IconChecklist, IconKey } from "../components/Icons";
import { Modal } from "../components/Modal";
import LoadingButton from "../components/LoadingButton";
import StatusBadge from "../components/StatusBadge";
import ProgressBar from "../components/ProgressBar";

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "").concat(parts[1]?.[0] || "").toUpperCase();
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="profile-row">
      <div className="profile-row-icon">{icon}</div>
      <div>
        <div className="profile-row-label">{label}</div>
        <div className="profile-row-value">{value ?? "—"}</div>
      </div>
    </div>
  );
}

function ChangeNameModal({ currentName, onClose, onSaved }) {
  const toast = useToast();
  const [name, setName] = useState(currentName || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name cannot be empty.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateProfile({ full_name: trimmed });
      toast.success("Display name updated.");
      onSaved();
    } catch (err) {
      setError(extractErrorMessage(err, "Could not update your name."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Change name"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <LoadingButton className="btn btn-primary" loading={saving} onClick={handleSubmit}>
            Save
          </LoadingButton>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="display_name">Display name</label>
          <input
            id="display_name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          {error && <div className="field-error">{error}</div>}
        </div>
      </form>
    </Modal>
  );
}

function ChangePasswordModal({ onClose, onSaved }) {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword });
      toast.success("Password updated successfully.");
      onSaved();
    } catch (err) {
      setError(extractErrorMessage(err, "Could not update your password."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Change password"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <LoadingButton className="btn btn-primary" loading={saving} onClick={handleSubmit}>
            Update password
          </LoadingButton>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="current_password">Current password</label>
          <input
            id="current_password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="new_password">New password</label>
          <input
            id="new_password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>
        <div className="field">
          <label htmlFor="confirm_password">Confirm new password</label>
          <input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <div className="field-error">{error}</div>}
        </div>
      </form>
    </Modal>
  );
}

export default function Profile() {
  const { user, isAdmin, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const [checklist, setChecklist] = useState(null);
  const [access, setAccess] = useState(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([fetchMyChecklist(), fetchMyAccess()]).then(([checklistRes, accessRes]) => {
      if (cancelled) return;
      if (checklistRes.status === "fulfilled") setChecklist(checklistRes.value.data);
      if (accessRes.status === "fulfilled") setAccess(accessRes.value.data);
      setSnapshotLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;

  const toolCount = Array.isArray(access?.tools) ? access.tools.length : 0;
  const hasChecklist = !!checklist?.items?.length;

  return (
    <div>
      <div className="section-head">
        <h1>My Profile</h1>
        <p>Your account details.</p>
      </div>

      <div className="grid grid-2" style={{ alignItems: "stretch" }}>
        <div className="card card-pad">
          <div className="profile-header">
            <div className="avatar avatar-lg">{initials(user.full_name)}</div>
            <div>
              <div className="profile-name">
                {user.full_name}
                {user.is_admin && <span className="status-badge status-admin" style={{ marginLeft: 8 }}>Admin</span>}
              </div>
              <div className="text-muted" style={{ fontSize: 13 }}>{user.email}</div>
            </div>
          </div>

          <div className="profile-divider" />

          <div className="profile-rows">
            <InfoRow icon={<IconUser width={15} height={15} />} label="Role" value={isAdmin ? "Administrator" : user.role_name} />
            <InfoRow icon={<IconLayers width={15} height={15} />} label="Team" value={user.team_name} />
            {typeof user.is_active === "boolean" && (
              <div className="profile-row">
                <div className="profile-row-icon"><IconRoles width={15} height={15} /></div>
                <div>
                  <div className="profile-row-label">Status</div>
                  <div className="profile-row-value">
                    <StatusBadge status={user.is_active ? "active" : "inactive"} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card card-pad">
            <div className="flex-between" style={{ alignItems: "flex-start" }}>
              <div>
                <h3 style={{ fontSize: 14.5, marginBottom: 4 }}>Display name</h3>
                <p className="text-muted" style={{ fontSize: 12.5, marginBottom: 0 }}>
                  Email is managed by admin and cannot be changed here.
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setNameModalOpen(true)}>
                Change name
              </button>
            </div>
            <div className="field" style={{ marginTop: 14, marginBottom: 0 }}>
              <input value={user.full_name || ""} readOnly disabled />
            </div>
          </div>

          <div className="card card-pad">
            <div className="flex-between" style={{ alignItems: "flex-start" }}>
              <div>
                <h3 style={{ fontSize: 14.5, marginBottom: 4 }}>Password</h3>
                <p className="text-muted" style={{ fontSize: 12.5, marginBottom: 0 }}>
                  Keep your account secure with a strong password.
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setPasswordModalOpen(true)}>
                Change password
              </button>
            </div>
            <div className="field" style={{ marginTop: 14, marginBottom: 0 }}>
              <input value="••••••••" readOnly disabled type="password" />
            </div>
          </div>
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 20 }}>
        <div className="flex-between" style={{ alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 15, marginBottom: 4 }}>Onboarding snapshot</h3>
            <p className="text-muted" style={{ fontSize: 12.5, marginBottom: 0 }}>
              Your checklist and team access overview
            </p>
          </div>
          {hasChecklist && (
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {Math.round(checklist.progress_percent ?? 0)}%
            </div>
          )}
        </div>

        {!snapshotLoading && hasChecklist && (
          <div style={{ marginBottom: 16 }}>
            <ProgressBar percent={checklist.progress_percent} />
          </div>
        )}

        <div className="flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13.5 }}>
              {hasChecklist ? (
                <>
                  {checklist.completed_items} of {checklist.total_items} complete
                </>
              ) : (
                "No checklist assigned yet"
              )}
            </span>
            <span style={{ fontSize: 13.5 }}>
              Team tools: <strong>{toolCount}</strong>
            </span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate("/checklist")}>
              <IconChecklist width={14} height={14} /> Checklist
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate("/access")}>
              <IconKey width={14} height={14} /> My Access
            </button>
          </div>
        </div>
      </div>

      {nameModalOpen && (
        <ChangeNameModal
          currentName={user.full_name}
          onClose={() => setNameModalOpen(false)}
          onSaved={async () => {
            await refreshUser();
            setNameModalOpen(false);
          }}
        />
      )}

      {passwordModalOpen && (
        <ChangePasswordModal
          onClose={() => setPasswordModalOpen(false)}
          onSaved={() => setPasswordModalOpen(false)}
        />
      )}
    </div>
  );
}
