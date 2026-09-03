import { useEffect, useState } from "react";
import { fetchAdminTools, createAdminTool, updateAdminTool, deleteAdminTool } from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { PageLoading, Modal, ConfirmModal } from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import LoadingButton from "../../components/LoadingButton";
import { IconPlus, IconEdit, IconTrash } from "../../components/Icons";
import { useNavigate } from "react-router-dom";

const EMPTY_FORM = { name: "", description: "", category: "", request_url: "", guide_text: "", is_active: true };

export default function Tools() {
  const toast = useToast();
  const [tools, setTools] = useState([]);
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
    fetchAdminTools()
      .then(({ data }) => setTools(Array.isArray(data) ? data : data?.items || []))
      .catch((err) => setError(extractErrorMessage(err, "Could not load tools.")))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }
  function openEdit(tool) {
    setEditing(tool);
    setForm({
      name: tool.name || "",
      description: tool.description || "",
      category: tool.category || "",
      request_url: tool.request_url || "",
      guide_text: tool.guide_text || "",
      is_active: tool.is_active ?? true,
    });
    setFormOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateAdminTool(editing.id, form);
        toast.success("Tool updated.");
      } else {
        await createAdminTool(form);
        toast.success("Tool created.");
      }
      setFormOpen(false);
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save the tool."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminTool(deleteTarget.id);
      toast.success("Tool deleted.");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not delete this tool — it may still be mapped to a team."));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 18 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h1>Tools</h1>
          <p>Manage the catalog of tools/systems that can be mapped to teams.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/admin/tools/new")}>
          + New tool
        </button>
      </div>

      {error && <div className="top-align-error">{error}</div>}

      <div className="card">
        {tools.length === 0 ? (
          <EmptyState title="No tools yet" description="Create your first tool, then map it to a team on the Teams page." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Request URL</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tools.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="cell-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {t.name}
                        {t.provider_key === "jira" && (
                          <span className="badge badge-info" style={{ fontSize: 11, padding: "2px 6px" }}>Jira (Auto)</span>
                        )}
                        {t.provider_key === "github" && (
                          <span className="badge badge-info" style={{ fontSize: 11, padding: "2px 6px" }}>GitHub (Auto)</span>
                        )}
                        {t.provider_key === "aws" && (
                          <span className="badge badge-info" style={{ fontSize: 11, padding: "2px 6px" }}>AWS (Auto)</span>
                        )}
                      </div>
                      {t.description && <div className="cell-muted">{t.description}</div>}
                    </td>
                    <td className="cell-muted">{t.category || "—"}</td>
                    <td className="cell-muted" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.request_url || "—"}
                    </td>
                    <td>
                      <StatusBadge status={t.is_active ? "active" : "inactive"} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/admin/tools/${t.id}/edit`)}>
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
        <Modal title={editing ? "Edit tool" : "New tool"} onClose={() => setFormOpen(false)} width={540}>
          <form onSubmit={handleSave}>
            <div className="field">
              <label htmlFor="tool_name">Name</label>
              <input
                id="tool_name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. GitHub"
              />
            </div>
            <div className="field">
              <label htmlFor="tool_desc">Description</label>
              <textarea
                id="tool_desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What this tool is used for"
              />
            </div>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="field">
                <label htmlFor="tool_cat">Category</label>
                <input
                  id="tool_cat"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Engineering"
                />
              </div>
              <div className="field">
                <label htmlFor="tool_url">Request URL</label>
                <input
                  id="tool_url"
                  value={form.request_url}
                  onChange={(e) => setForm((f) => ({ ...f, request_url: e.target.value }))}
                  placeholder="https://…"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="tool_guide">
                Guide text
                <span className="text-muted" style={{ fontWeight: 400 }}> — shown in an expandable section under My Access</span>
              </label>
              <textarea
                id="tool_guide"
                rows={5}
                value={form.guide_text}
                onChange={(e) => setForm((f) => ({ ...f, guide_text: e.target.value }))}
                placeholder={"Setup steps, e.g.:\n1. Click Request Access\n2. Wait for approval email\n3. Log in with company SSO"}
              />
            </div>
            <div className="checkbox-row">
              <input
                id="tool_active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              <label htmlFor="tool_active" style={{ margin: 0 }}>Active</label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </button>
              <LoadingButton type="submit" loading={saving}>
                {editing ? "Save changes" : "Create tool"}
              </LoadingButton>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete tool"
          message={`Delete "${deleteTarget.name}"? This may fail if it's still mapped to a team.`}
          confirmLabel="Delete tool"
          loading={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
