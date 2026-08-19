import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAdminRoles, createAdminRole, updateAdminRole, deleteAdminRole } from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { PageLoading, Modal, ConfirmModal } from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import LoadingButton from "../../components/LoadingButton";
import { IconPlus, IconEdit, IconTrash, IconRoles as IconRolesGlyph } from "../../components/Icons";

const EMPTY_FORM = { name: "", description: "", is_active: true };

export default function Roles() {
  const toast = useToast();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoading(true);
    fetchAdminRoles()
      .then(({ data }) => setRoles(Array.isArray(data) ? data : data?.items || []))
      .catch((err) => setError(extractErrorMessage(err, "Could not load roles.")))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setEditingRole(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(role) {
    setEditingRole(role);
    setForm({ name: role.name || "", description: role.description || "", is_active: role.is_active ?? true });
    setFormOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingRole) {
        await updateAdminRole(editingRole.id, form);
        toast.success("Role updated.");
      } else {
        await createAdminRole(form);
        toast.success("Role created.");
      }
      setFormOpen(false);
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save the role."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminRole(deleteTarget.id);
      toast.success("Role deleted.");
      setDeleteTarget(null);
      load();
    } catch (err) {
      // Roles linked to users/checklists may refuse deletion — surface that clearly.
      toast.error(extractErrorMessage(err, "Could not delete this role — it may still have users or checklists linked to it."));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 18 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h1>Roles</h1>
          <p>Create the roles new joiners choose from, and manage their checklists.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <IconPlus width={15} height={15} /> New role
        </button>
      </div>

      {error && <div className="top-align-error">{error}</div>}

      <div className="card">
        {roles.length === 0 ? (
          <EmptyState title="No roles yet" description="Create your first role to start building onboarding checklists." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.id}>
                    <td className="cell-name">{r.name}</td>
                    <td className="cell-muted">{r.description || "—"}</td>
                    <td>
                      <StatusBadge status={r.is_active ? "active" : "inactive"} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link className="btn btn-secondary btn-sm" to={`/admin/roles/${r.id}/checklists`}>
                          <IconRolesGlyph width={14} height={14} /> Checklists
                        </Link>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}>
                          <IconEdit width={14} height={14} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(r)}>
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
        <Modal title={editingRole ? "Edit role" : "New role"} onClose={() => setFormOpen(false)}>
          <form onSubmit={handleSave}>
            <div className="field">
              <label htmlFor="role_name">Name</label>
              <input
                id="role_name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div className="field">
              <label htmlFor="role_desc">Description</label>
              <textarea
                id="role_desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description shown on the role-selection screen"
              />
            </div>
            <div className="checkbox-row">
              <input
                id="role_active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              <label htmlFor="role_active" style={{ margin: 0 }}>Active (visible to new joiners)</label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </button>
              <LoadingButton type="submit" loading={saving}>
                {editingRole ? "Save changes" : "Create role"}
              </LoadingButton>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete role"
          message={`Delete "${deleteTarget.name}"? This can't be undone, and will fail if users or checklists are still linked to it.`}
          confirmLabel="Delete role"
          loading={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
