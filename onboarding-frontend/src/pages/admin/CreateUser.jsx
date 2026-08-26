import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createAdminUser,
  fetchAdminRoles,
  fetchAdminTeams,
} from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import LoadingButton from "../../components/LoadingButton";
import { PageLoading } from "../../components/Modal";

const EMPTY = {
  full_name: "",
  email: "",
  password: "",
  role_id: "",
  team_id: "",
  is_admin: false,
  is_active: true,
};

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < 12; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export default function CreateUser() {
  const toast = useToast();
  const navigate = useNavigate();

  const [roles, setRoles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  useEffect(() => {
    Promise.all([fetchAdminRoles(), fetchAdminTeams()])
      .then(([rolesRes, teamsRes]) => {
        setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
        setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : []);
      })
      .catch(() => {
        toast.error("Could not load roles/teams.");
      })
      .finally(() => setLoadingMeta(false));
  }, [toast]);

  const selectedRole = useMemo(
    () => roles.find((r) => String(r.id) === String(form.role_id)),
    [roles, form.role_id]
  );

  const selectedTeam = useMemo(
    () => teams.find((t) => String(t.id) === String(form.team_id)),
    [teams, form.team_id]
  );

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      toast.error("Please fill name, email, and password.");
      return;
    }

    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    try {
      await createAdminUser({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        role_id: form.role_id ? Number(form.role_id) : null,
        team_id: form.team_id ? Number(form.team_id) : null,
        is_admin: !!form.is_admin,
        is_active: !!form.is_active,
      });
      toast.success("User created successfully.");
      navigate("/admin/users");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not create user."));
    } finally {
      setSaving(false);
    }
  }

  if (loadingMeta) return <PageLoading />;

  return (
    <div className="cu-page">
      <div className="cu-top">
        <div>
          <div className="cu-breadcrumb">
            <Link to="/admin/users">Users</Link>
            <span>/</span>
            <span>New user</span>
          </div>
          <h1>Create user</h1>
          <p>Set up account access, role, and team in one place.</p>
        </div>
        <Link to="/admin/users" className="btn btn-secondary">
          Back to users
        </Link>
      </div>

      <form className="cu-grid" onSubmit={handleSubmit}>
        <div className="cu-main">
          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>Identity</h2>
                <p>Basic account details for the new employee.</p>
              </div>
              <span className="cu-step">1</span>
            </div>

            <div className="cu-fields">
              <div className="field">
                <label htmlFor="cu_name">Full name</label>
                <input
                  id="cu_name"
                  value={form.full_name}
                  onChange={(e) => setField("full_name", e.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="cu_email">Work email</label>
                <input
                  id="cu_email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="jane@company.com"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="cu_password">Temporary password</label>
                <div className="cu-password-row">
                  <input
                    id="cu_password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setField("password", generatePassword());
                      setShowPassword(true);
                    }}
                  >
                    Generate
                  </button>
                </div>
                <div className="field-hint">
                  Share this securely. The user can change it from Profile after login.
                </div>
              </div>
            </div>
          </section>

          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>Access setup</h2>
                <p>Assign onboarding role and team tool access.</p>
              </div>
              <span className="cu-step">2</span>
            </div>

            <div className="cu-fields cu-fields-2">
              <div className="field">
                <label htmlFor="cu_role">Role</label>
                <select
                  id="cu_role"
                  value={form.role_id}
                  onChange={(e) => setField("role_id", e.target.value)}
                >
                  <option value="">No role yet</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <div className="field-hint">Controls checklist content.</div>
              </div>

              <div className="field">
                <label htmlFor="cu_team">Team</label>
                <select
                  id="cu_team"
                  value={form.team_id}
                  onChange={(e) => setField("team_id", e.target.value)}
                >
                  <option value="">No team yet</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <div className="field-hint">Controls tools under My Access.</div>
              </div>
            </div>
          </section>

          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>Permissions</h2>
                <p>Choose account status and admin rights.</p>
              </div>
              <span className="cu-step">3</span>
            </div>

            <div className="cu-toggles">
              <label className={`cu-toggle ${form.is_active ? "on" : ""}`}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setField("is_active", e.target.checked)}
                />
                <div>
                  <strong>Active account</strong>
                  <span>User can sign in immediately.</span>
                </div>
              </label>

              <label className={`cu-toggle ${form.is_admin ? "on" : ""}`}>
                <input
                  type="checkbox"
                  checked={form.is_admin}
                  onChange={(e) => setField("is_admin", e.target.checked)}
                />
                <div>
                  <strong>Admin access</strong>
                  <span>Can manage users, teams, documents, and feedback.</span>
                </div>
              </label>
            </div>
          </section>
        </div>

        <aside className="cu-side">
          <div className="cu-side-card">
            <h3>Summary</h3>

            <div className="cu-summary-row">
              <span>Name</span>
              <strong>{form.full_name || "—"}</strong>
            </div>
            <div className="cu-summary-row">
              <span>Email</span>
              <strong>{form.email || "—"}</strong>
            </div>
            <div className="cu-summary-row">
              <span>Role</span>
              <strong>{selectedRole?.name || "Not assigned"}</strong>
            </div>
            <div className="cu-summary-row">
              <span>Team</span>
              <strong>{selectedTeam?.name || "Not assigned"}</strong>
            </div>
            <div className="cu-summary-row">
              <span>Status</span>
              <strong>{form.is_active ? "Active" : "Inactive"}</strong>
            </div>
            <div className="cu-summary-row">
              <span>Admin</span>
              <strong>{form.is_admin ? "Yes" : "No"}</strong>
            </div>

            <div className="cu-side-actions">
              <LoadingButton type="submit" className="btn btn-primary btn-block" loading={saving}>
                Create user
              </LoadingButton>
              <Link to="/admin/users" className="btn btn-secondary btn-block">
                Cancel
              </Link>
            </div>
          </div>

          <div className="cu-tip">
            <strong>Tip</strong>
            <p>
              Assign both role and team now so the employee sees checklist and My Access on
              first login.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}