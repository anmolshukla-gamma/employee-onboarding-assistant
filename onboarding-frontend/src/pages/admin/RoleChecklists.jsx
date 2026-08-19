import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchRoleChecklists,
  createRoleChecklist,
  updateChecklist,
  deleteChecklist,
} from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { PageLoading, Modal, ConfirmModal } from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import LoadingButton from "../../components/LoadingButton";
import { IconPlus, IconEdit, IconTrash, IconChecklist } from "../../components/Icons";

const EMPTY_FORM = { title: "", description: "" };

export default function RoleChecklists() {
  const { roleId } = useParams();
  const toast = useToast();

  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoading(true);
    fetchRoleChecklists(roleId)
      .then(({ data }) => setChecklists(Array.isArray(data) ? data : data?.items || []))
      .catch((err) => setError(extractErrorMessage(err, "Could not load checklists.")))
      .finally(() => setLoading(false));
  }

  useEffect(load, [roleId]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }
  function openEdit(cl) {
    setEditing(cl);
    setForm({ title: cl.title || "", description: cl.description || "" });
    setFormOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateChecklist(editing.id, form);
        toast.success("Checklist updated.");
      } else {
        await createRoleChecklist(roleId, form);
        toast.success("Checklist created.");
      }
      setFormOpen(false);
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save the checklist."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteChecklist(deleteTarget.id);
      toast.success("Checklist deleted.");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not delete this checklist."));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 6 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h1>Role checklists</h1>
          <p>
            <Link to="/admin/roles">Roles</Link> / Checklists for role #{roleId}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <IconPlus width={15} height={15} /> New checklist
        </button>
      </div>

      {error && <div className="top-align-error" style={{ marginTop: 18 }}>{error}</div>}

      <div style={{ marginTop: 18 }}>
        {checklists.length === 0 ? (
          <div className="card">
            <EmptyState title="No checklists yet" description="Create a checklist so new joiners in this role know what to do." />
          </div>
        ) : (
          <div className="grid grid-2">
            {checklists.map((cl) => (
              <div className="card card-pad" key={cl.id}>
                <div className="flex-between" style={{ alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontSize: 15 }}>{cl.title}</h3>
                    <p className="text-muted" style={{ fontSize: 12.8, marginTop: 4 }}>
                      {cl.description || "No description"}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <Link className="btn btn-secondary btn-sm" to={`/admin/checklists/${cl.id}/items`}>
                    <IconChecklist width={14} height={14} /> Manage items
                  </Link>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(cl)}>
                    <IconEdit width={14} height={14} />
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(cl)}>
                    <IconTrash width={14} height={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <Modal title={editing ? "Edit checklist" : "New checklist"} onClose={() => setFormOpen(false)}>
          <form onSubmit={handleSave}>
            <div className="field">
              <label htmlFor="cl_title">Title</label>
              <input
                id="cl_title"
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Software Engineer Onboarding"
              />
            </div>
            <div className="field">
              <label htmlFor="cl_desc">Description</label>
              <textarea
                id="cl_desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What this checklist covers"
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </button>
              <LoadingButton type="submit" loading={saving}>
                {editing ? "Save changes" : "Create checklist"}
              </LoadingButton>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete checklist"
          message={`Delete "${deleteTarget.title}"? All of its items will be removed too.`}
          confirmLabel="Delete checklist"
          loading={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
