import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchChecklistItems,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
} from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { PageLoading, Modal, ConfirmModal } from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import LoadingButton from "../../components/LoadingButton";
import { IconPlus, IconEdit, IconTrash, IconExternalLink } from "../../components/Icons";

const RESOURCE_TYPES = ["link", "document"];

const EMPTY_FORM = {
  title: "",
  description: "",
  detailed_guide: "",
  category: "",
  order: 1,
  is_mandatory: true,
  resources: [],
};

let resourceKeySeq = 0;
const newResourceRow = () => ({ _key: ++resourceKeySeq, label: "", url: "", type: "link" });

// The admin API returns `resources` as-is from the DB column, which is stored
// as a raw JSON string (unlike /checklist/my, which parses it server-side).
// Normalize both shapes here so the table count and edit form see a real array
// whether the backend hands back a string, an already-parsed array, or null.
function normalizeResources(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function ChecklistItems() {
  const { checklistId } = useParams();
  const toast = useToast();

  const [items, setItems] = useState([]);
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
    fetchChecklistItems(checklistId)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.items || [];
        const normalized = list.map((item) => ({ ...item, resources: normalizeResources(item.resources) }));
        setItems(normalized.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      })
      .catch((err) => setError(extractErrorMessage(err, "Could not load checklist items.")))
      .finally(() => setLoading(false));
  }

  useEffect(load, [checklistId]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, order: items.length + 1, resources: [] });
    setFormOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    const resources = Array.isArray(item.resources)
      ? item.resources.map((r) => ({ _key: ++resourceKeySeq, label: r.label || "", url: r.url || "", type: r.type || "link" }))
      : [];
    setForm({
      title: item.title || "",
      description: item.description || "",
      detailed_guide: item.detailed_guide || "",
      category: item.category || "",
      order: item.order ?? 1,
      is_mandatory: item.is_mandatory ?? true,
      resources,
    });
    setFormOpen(true);
  }

  function addResourceRow() {
    setForm((f) => ({ ...f, resources: [...f.resources, newResourceRow()] }));
  }
  function updateResourceRow(key, patch) {
    setForm((f) => ({
      ...f,
      resources: f.resources.map((r) => (r._key === key ? { ...r, ...patch } : r)),
    }));
  }
  function removeResourceRow(key) {
    setForm((f) => ({ ...f, resources: f.resources.filter((r) => r._key !== key) }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // Drop empty resource rows and the internal _key before sending to the API.
      const resources = form.resources
        .filter((r) => r.url.trim() || r.label.trim())
        .map(({ label, url, type }) => ({ label: label.trim(), url: url.trim(), type }));

      const payload = {
        title: form.title,
        description: form.description,
        detailed_guide: form.detailed_guide,
        category: form.category,
        order: Number(form.order) || 1,
        is_mandatory: form.is_mandatory,
        resources,
      };

      if (editing) {
        await updateChecklistItem(editing.id, payload);
        toast.success("Item updated.");
      } else {
        await createChecklistItem(checklistId, payload);
        toast.success("Item added.");
      }
      setFormOpen(false);
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save this item."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteChecklistItem(deleteTarget.id);
      toast.success("Item deleted.");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not delete this item."));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 6 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h1>Checklist items</h1>
          <p>
            <Link to="/admin/roles">Roles</Link> / Checklist #{checklistId} items
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <IconPlus width={15} height={15} /> New item
        </button>
      </div>

      {error && <div className="top-align-error" style={{ marginTop: 18 }}>{error}</div>}

      <div className="card" style={{ marginTop: 18 }}>
        {items.length === 0 ? (
          <EmptyState title="No items yet" description="Add the first task new joiners need to complete." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Resources</th>
                  <th>Required</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="cell-muted mono">{item.order}</td>
                    <td>
                      <div className="cell-name">{item.title}</div>
                      {item.description && <div className="cell-muted">{item.description}</div>}
                    </td>
                    <td className="cell-muted">{item.category || "General"}</td>
                    <td className="cell-muted">
                      {Array.isArray(item.resources) && item.resources.length > 0 ? item.resources.length : "—"}
                    </td>
                    <td>{item.is_mandatory ? <span className="badge-mandatory">Required</span> : <span className="cell-muted">Optional</span>}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>
                          <IconEdit width={14} height={14} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(item)}>
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
        <Modal title={editing ? "Edit item" : "New item"} onClose={() => setFormOpen(false)} width={560}>
          <form onSubmit={handleSave}>
            <div className="field">
              <label htmlFor="it_title">Title</label>
              <input
                id="it_title"
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Set up VPN"
              />
            </div>
            <div className="field">
              <label htmlFor="it_desc">Short description</label>
              <textarea
                id="it_desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="One line shown on the checklist list, e.g. Install and configure company VPN for remote access."
              />
            </div>
            <div className="field">
              <label htmlFor="it_guide">
                Detailed guide
                <span className="text-muted" style={{ fontWeight: 400 }}> — shown in the item's detail view</span>
              </label>
              <textarea
                id="it_guide"
                rows={6}
                value={form.detailed_guide}
                onChange={(e) => setForm((f) => ({ ...f, detailed_guide: e.target.value }))}
                placeholder={"Step-by-step instructions. Line breaks are preserved, e.g.:\n1. Open the IT portal...\n2. Install the client...\n3. Login with company email..."}
              />
              <div className="field-hint">Line breaks are preserved exactly as typed.</div>
            </div>

            <div className="field">
              <label>Resources</label>
              {form.resources.length === 0 && (
                <div className="text-muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
                  No resources added yet.
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                {form.resources.map((res) => (
                  <div key={res._key} className="resource-row">
                    <input
                      value={res.label}
                      onChange={(e) => updateResourceRow(res._key, { label: e.target.value })}
                      placeholder="Label, e.g. VPN Setup Guide"
                    />
                    <input
                      value={res.url}
                      onChange={(e) => updateResourceRow(res._key, { url: e.target.value })}
                      placeholder="https://…"
                    />
                    <select
                      value={res.type}
                      onChange={(e) => updateResourceRow(res._key, { type: e.target.value })}
                    >
                      {RESOURCE_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      onClick={() => removeResourceRow(res._key)}
                      aria-label="Remove resource"
                    >
                      <IconTrash width={14} height={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addResourceRow}>
                <IconExternalLink width={13} height={13} /> Add resource
              </button>
            </div>

            <div className="grid grid-2" style={{ gap: 12, marginTop: 4 }}>
              <div className="field">
                <label htmlFor="it_cat">Category</label>
                <input
                  id="it_cat"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. IT"
                />
              </div>
              <div className="field">
                <label htmlFor="it_order">Order</label>
                <input
                  id="it_order"
                  type="number"
                  min={1}
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                />
              </div>
            </div>
            <div className="checkbox-row">
              <input
                id="it_mandatory"
                type="checkbox"
                checked={form.is_mandatory}
                onChange={(e) => setForm((f) => ({ ...f, is_mandatory: e.target.checked }))}
              />
              <label htmlFor="it_mandatory" style={{ margin: 0 }}>Mandatory item</label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </button>
              <LoadingButton type="submit" loading={saving}>
                {editing ? "Save changes" : "Add item"}
              </LoadingButton>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete item"
          message={`Delete "${deleteTarget.title}"? Employees will no longer see it on their checklist.`}
          confirmLabel="Delete item"
          loading={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
