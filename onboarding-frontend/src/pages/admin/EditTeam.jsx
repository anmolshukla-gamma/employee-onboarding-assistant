import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchAdminTeams,
  updateAdminTeam,
  fetchTeamTools,
  fetchTeamMembers,
} from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import LoadingButton from "../../components/LoadingButton";
import { PageLoading } from "../../components/Modal";
import StatusBadge from "../../components/StatusBadge";

export default function EditTeam() {
  const { teamId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    is_active: true,
  });

  const [meta, setMeta] = useState({
    toolsCount: 0,
    membersCount: 0,
  });

  useEffect(() => {
    setLoading(true);

    Promise.all([
      fetchAdminTeams(),
      fetchTeamTools(teamId).catch(() => ({ data: [] })),
      fetchTeamMembers(teamId).catch(() => ({ data: [] })),
    ])
      .then(([teamsRes, toolsRes, membersRes]) => {
        const teams = Array.isArray(teamsRes.data) ? teamsRes.data : teamsRes.data?.items || [];
        const team = teams.find((t) => String(t.id) === String(teamId));

        if (!team) {
          setNotFound(true);
          return;
        }

        setForm({
          name: team.name || "",
          description: team.description || "",
          is_active: team.is_active ?? true,
        });

        const tools = Array.isArray(toolsRes.data) ? toolsRes.data : toolsRes.data?.items || [];
        const members = Array.isArray(membersRes.data) ? membersRes.data : membersRes.data?.items || [];

        setMeta({
          toolsCount: tools.length,
          membersCount: members.length,
        });
      })
      .catch((err) => {
        toast.error(extractErrorMessage(err, "Could not load team."));
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [teamId, toast]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Team name is required.");
      return;
    }

    setSaving(true);
    try {
      await updateAdminTeam(teamId, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_active: !!form.is_active,
      });
      toast.success("Team updated.");
      navigate(`/admin/teams/${teamId}`);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not update team."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading />;

  if (notFound) {
    return (
      <div className="et-page">
        <div className="card card-pad">
          <h1 style={{ marginBottom: 8 }}>Team not found</h1>
          <p className="text-muted" style={{ marginBottom: 16 }}>
            This team may have been deleted.
          </p>
          <Link to="/admin/teams" className="btn btn-secondary">
            Back to teams
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="et-page">
      {/* Hero header — different from create wizard */}
      <div className="et-hero">
        <div className="et-hero-main">
          <div className="et-breadcrumb">
            <Link to="/admin/teams">Teams</Link>
            <span>/</span>
            <Link to={`/admin/teams/${teamId}`}>Team #{teamId}</Link>
            <span>/</span>
            <span>Edit</span>
          </div>

          <div className="et-title-row">
            <div className="et-avatar">{(form.name || "T").slice(0, 1).toUpperCase()}</div>
            <div>
              <h1>{form.name || "Edit team"}</h1>
              <p>Update team profile and review linked access at a glance.</p>
            </div>
          </div>
        </div>

        <div className="et-hero-actions">
          <Link to={`/admin/teams/${teamId}`} className="btn btn-secondary">
            Open team workspace
          </Link>
          <Link to="/admin/teams" className="btn btn-secondary">
            All teams
          </Link>
        </div>
      </div>

      {/* Metric strip */}
      <div className="et-metrics">
        <div className="et-metric">
          <span className="et-metric-label">Tools mapped</span>
          <strong>{meta.toolsCount}</strong>
        </div>
        <div className="et-metric">
          <span className="et-metric-label">Members</span>
          <strong>{meta.membersCount}</strong>
        </div>
        <div className="et-metric">
          <span className="et-metric-label">Status</span>
          <strong>
            <StatusBadge status={form.is_active ? "active" : "inactive"} />
          </strong>
        </div>
      </div>

      <div className="et-layout">
        {/* Left: compact editor */}
        <form className="et-editor card" onSubmit={handleSubmit}>
          <div className="et-editor-head">
            <h2>Team profile</h2>
            <p>These details appear in admin lists and assignment dropdowns.</p>
          </div>

          <div className="field">
            <label htmlFor="et_name">Team name</label>
            <input
              id="et_name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Data Engineering – Platform"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="et_desc">Description</label>
            <textarea
              id="et_desc"
              rows={5}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="What this team owns and typical tool needs."
            />
          </div>

          <div className={`et-switch-row ${form.is_active ? "on" : ""}`}>
            <div>
              <strong>Active team</strong>
              <span>Inactive teams should not receive new user assignments.</span>
            </div>
            <label className="et-switch">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setField("is_active", e.target.checked)}
              />
              <span className="et-switch-ui" />
            </label>
          </div>

          <div className="et-editor-actions">
            <LoadingButton type="submit" className="btn btn-primary" loading={saving}>
              Save changes
            </LoadingButton>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(`/admin/teams/${teamId}`)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Right: operational shortcuts — unique vs create pages */}
        <aside className="et-ops">
          <div className="et-ops-card">
            <h3>Team operations</h3>
            <p className="et-ops-sub">Jump to the work this team needs after profile updates.</p>

            <Link className="et-ops-link" to={`/admin/teams/${teamId}`}>
              <div>
                <strong>Manage tools</strong>
                <span>{meta.toolsCount} tools currently mapped</span>
              </div>
              <span className="et-ops-arrow">→</span>
            </Link>

            <Link className="et-ops-link" to={`/admin/teams/${teamId}`}>
              <div>
                <strong>Manage members</strong>
                <span>{meta.membersCount} users assigned</span>
              </div>
              <span className="et-ops-arrow">→</span>
            </Link>

            <Link className="et-ops-link" to="/admin/users">
              <div>
                <strong>Assign from Users</strong>
                <span>Bulk assign role/team from user management</span>
              </div>
              <span className="et-ops-arrow">→</span>
            </Link>
          </div>

          <div className="et-note">
            <strong>Note</strong>
            <p>
              Editing team profile does not remove existing tool mappings or members.
              Use the team workspace for those changes.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}