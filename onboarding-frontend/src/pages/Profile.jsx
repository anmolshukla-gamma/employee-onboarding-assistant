import { useAuth } from "../context/AuthContext";
import { IconUser, IconLayers, IconRoles } from "../components/Icons";
import StatusBadge from "../components/StatusBadge";

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

export default function Profile() {
  const { user, isAdmin } = useAuth();

  if (!user) return null;

  return (
    <div>
      <div className="section-head">
        <h1>My Profile</h1>
        <p>Your account details.</p>
      </div>

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
    </div>
  );
}
