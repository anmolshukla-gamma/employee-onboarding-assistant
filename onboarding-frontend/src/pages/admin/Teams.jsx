import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAdminTeams, createAdminTeam, updateAdminTeam, deleteAdminTeam } from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { PageLoading, Modal, ConfirmModal } from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import LoadingButton from "../../components/LoadingButton";
import { IconPlus, IconEdit, IconTrash, IconWrench } from "../../components/Icons";
import { useNavigate } from "react-router-dom";

const EMPTY_FORM = { name: "", description: "", is_active: true };

export default function Teams() {
  const toast = useToast();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  function load() {
    setLoading(true);
    fetchAdminTeams()
      .then(({ data }) => setTeams(Array.isArray(data) ? data : data?.items || []))
      .catch((err) => setError(extractErrorMessage(err, "Could not load teams.")))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }
  function openEdit(team) {
    setEditing(team);
    setForm({ name: team.name || "", description: team.description || "", is_active: team.is_active ?? true });
    setFormOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateAdminTeam(editing.id, form);
        toast.success("Team updated.");
      } else {
        await createAdminTeam(form);
        toast.success("Team created.");
      }
      setFormOpen(false);
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save the team."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminTeam(deleteTarget.id);
      toast.success("Team deleted.");
      setDeleteTarget(null);
      load();
    } catch (err) {
      // Teams with assigned users can't be deleted — surface that clearly.
      toast.error(extractErrorMessage(err, "Could not delete this team — it may still have users assigned to it."));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 18 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h1>Teams</h1>
          <p>Create teams and manage which tools each team has access to.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/admin/teams/new")}>
          + New team
        </button>
      </div>

      {error && <div className="top-align-error">{error}</div>}

      <div className="card">
        {teams.length === 0 ? (
          <EmptyState title="No teams yet" description="Create your first team, then map tools to it and assign users." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.id}>
                    <td className="cell-name">{t.name}</td>
                    <td className="cell-muted">{t.description || "—"}</td>
                    <td>
                      <StatusBadge status={t.is_active ? "active" : "inactive"} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link className="btn btn-secondary btn-sm" to={`/admin/teams/${t.id}`}>
                          <IconWrench width={14} height={14} /> Manage team
                        </Link>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/admin/teams/${t.id}/edit`)}>
                          <IconEdit width={14} height={14} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(t)}>
                          <IconTrash width={14} height={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <Modal title={editing ? "Edit team" : "New team"} onClose={() => setFormOpen(false)}>
          <form onSubmit={handleSave}>
            <div className="field">
              <label htmlFor="team_name">Name</label>
              <input
                id="team_name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Data Engineering Platform"
              />
            </div>
            <div className="field">
              <label htmlFor="team_desc">Description</label>
              <textarea
                id="team_desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What this team works on"
              />
            </div>
            <div className="checkbox-row">
              <input
                id="team_active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              <label htmlFor="team_active" style={{ margin: 0 }}>Active</label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </button>
              <LoadingButton type="submit" loading={saving}>
                {editing ? "Save changes" : "Create team"}
              </LoadingButton>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete team"
          message={`Delete "${deleteTarget.name}"? This will fail if any users are still assigned to it.`}
          confirmLabel="Delete team"
          loading={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
