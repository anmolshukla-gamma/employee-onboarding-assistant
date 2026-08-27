import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchChecklistItems,
  updateChecklistItem,
} from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import LoadingButton from "../../components/LoadingButton";
import { PageLoading } from "../../components/Modal";
import { IconPlus, IconTrash } from "../../components/Icons";

const RESOURCE_TYPES = ["link", "document"];

let resourceKeySeq = 0;
const newResourceRow = () => ({
  _key: ++resourceKeySeq,
  label: "",
  url: "",
  type: "link",
});

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

export default function EditChecklistItem() {
  const { checklistId, itemId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    detailed_guide: "",
    category: "",
    order: 1,
    is_mandatory: true,
    resources: [],
  });

  useEffect(() => {
    setLoading(true);
    fetchChecklistItems(checklistId)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.items || [];
        const item = list.find((it) => String(it.id) === String(itemId));
        if (!item) {
          setNotFound(true);
          return;
        }

        const resources = normalizeResources(item.resources).map((r) => ({
          _key: ++resourceKeySeq,
          label: r.label || "",
          url: r.url || "",
          type: r.type || "link",
        }));

        setForm({
          title: item.title || "",
          description: item.description || "",
          detailed_guide: item.detailed_guide || "",
          category: item.category || "",
          order: item.order ?? 1,
          is_mandatory: item.is_mandatory ?? true,
          resources,
        });
      })
      .catch((err) => {
        toast.error(extractErrorMessage(err, "Could not load item."));
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [checklistId, itemId, toast]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addResourceRow() {
    setForm((f) => ({ ...f, resources: [...f.resources, newResourceRow()] }));
  }

  function updateResource(key, patch) {
    setForm((f) => ({
      ...f,
      resources: f.resources.map((r) => (r._key === key ? { ...r, ...patch } : r)),
    }));
  }

  function removeResource(key) {
    setForm((f) => ({
      ...f,
      resources: f.resources.filter((r) => r._key !== key),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Item title is required.");
      return;
    }

    const resources = form.resources
      .filter((r) => r.url.trim() || r.label.trim())
      .map(({ label, url, type }) => ({
        label: label.trim(),
        url: url.trim(),
        type: type || "link",
      }));

    setSaving(true);
    try {
      await updateChecklistItem(itemId, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        detailed_guide: form.detailed_guide.trim() || null,
        category: form.category.trim() || null,
        order: Number(form.order) || 1,
        is_mandatory: !!form.is_mandatory,
        resources,
      });
      toast.success("Item updated.");
      navigate(`/admin/checklists/${checklistId}/items`);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not update this item."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading />;

  if (notFound) {
    return (
      <div className="cu-page">
        <div className="card card-pad">
          <h1 style={{ marginBottom: 8 }}>Item not found</h1>
          <p className="text-muted" style={{ marginBottom: 16 }}>
            This checklist item may have been deleted.
          </p>
          <Link to={`/admin/checklists/${checklistId}/items`} className="btn btn-secondary">
            Back to items
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cu-page">
      <div className="cu-top">
        <div>
          <div className="cu-breadcrumb">
            <Link to="/admin/roles">Roles</Link>
            <span>/</span>
            <Link to={`/admin/checklists/${checklistId}/items`}>Checklist #{checklistId}</Link>
            <span>/</span>
            <span>Edit item</span>
          </div>
          <h1>Edit checklist item</h1>
          <p>Update guide text, resources, and placement for this onboarding step.</p>
        </div>
        <Link to={`/admin/checklists/${checklistId}/items`} className="btn btn-secondary">
          Back to items
        </Link>
      </div>

      <form className="cu-grid" onSubmit={handleSubmit}>
        <div className="cu-main">
          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>Basic details</h2>
                <p>What the employee should complete.</p>
              </div>
              <span className="cu-step">1</span>
            </div>

            <div className="cu-fields">
              <div className="field">
                <label htmlFor="ei_title">Title</label>
                <input
                  id="ei_title"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="e.g. Set up VPN"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="ei_desc">Short description</label>
                <input
                  id="ei_desc"
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="One-line summary shown in the checklist list"
                />
              </div>

              <div className="cu-fields-2">
                <div className="field">
                  <label htmlFor="ei_cat">Category</label>
                  <input
                    id="ei_cat"
                    value={form.category}
                    onChange={(e) => setField("category", e.target.value)}
                    placeholder="e.g. IT, HR, Access, Learning"
                  />
                </div>
                <div className="field">
                  <label htmlFor="ei_order">Display order</label>
                  <input
                    id="ei_order"
                    type="number"
                    min={1}
                    value={form.order}
                    onChange={(e) => setField("order", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>Detailed guide</h2>
                <p>Step-by-step instructions shown when the employee opens this item.</p>
              </div>
              <span className="cu-step">2</span>
            </div>

            <div className="cu-fields">
              <div className="field">
                <label htmlFor="ei_guide">How to complete this step</label>
                <textarea
                  id="ei_guide"
                  rows={8}
                  value={form.detailed_guide}
                  onChange={(e) => setField("detailed_guide", e.target.value)}
                  placeholder="Write clear numbered steps..."
                />
                <div className="field-hint">
                  Keep this practical. Employees use this instead of asking managers.
                </div>
              </div>
            </div>
          </section>

          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>Resources</h2>
                <p>Links or documents needed for this step.</p>
              </div>
              <span className="cu-step">3</span>
            </div>

            <div className="ci-resources">
              {form.resources.length === 0 && (
                <div className="ci-resources-empty">
                  No resources yet. Add a portal link, policy doc, or guide URL.
                </div>
              )}

              {form.resources.map((res) => (
                <div className="ci-resource-row" key={res._key}>
                  <input
                    value={res.label}
                    onChange={(e) => updateResource(res._key, { label: e.target.value })}
                    placeholder="Label (e.g. VPN guide)"
                  />
                  <input
                    value={res.url}
                    onChange={(e) => updateResource(res._key, { url: e.target.value })}
                    placeholder="https://..."
                  />
                  <select
                    value={res.type}
                    onChange={(e) => updateResource(res._key, { type: e.target.value })}
                  >
                    {RESOURCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => removeResource(res._key)}
                    aria-label="Remove resource"
                  >
                    <IconTrash width={14} height={14} />
                  </button>
                </div>
              ))}

              <button type="button" className="btn btn-secondary btn-sm" onClick={addResourceRow}>
                <IconPlus width={14} height={14} /> Add resource
              </button>
            </div>
          </section>

          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>Rules</h2>
                <p>Whether this step is required for onboarding completion.</p>
              </div>
              <span className="cu-step">4</span>
            </div>

            <div className="cu-toggles">
              <label className={`cu-toggle ${form.is_mandatory ? "on" : ""}`}>
                <input
                  type="checkbox"
                  checked={form.is_mandatory}
                  onChange={(e) => setField("is_mandatory", e.target.checked)}
                />
                <div>
                  <strong>Mandatory item</strong>
                  <span>Recommended for critical setup steps (docs, access, compliance).</span>
                </div>
              </label>
            </div>
          </section>
        </div>

        <aside className="cu-side">
          <div className="cu-side-card">
            <h3>Summary</h3>
            <div className="cu-summary-row">
              <span>Title</span>
              <strong>{form.title.trim() || "—"}</strong>
            </div>
            <div className="cu-summary-row">
              <span>Category</span>
              <strong>{form.category.trim() || "General"}</strong>
            </div>
            <div className="cu-summary-row">
              <span>Order</span>
              <strong>#{form.order || 1}</strong>
            </div>
            <div className="cu-summary-row">
              <span>Resources</span>
              <strong>{form.resources.filter((r) => r.url || r.label).length}</strong>
            </div>
            <div className="cu-summary-row">
              <span>Required</span>
              <strong>{form.is_mandatory ? "Yes" : "No"}</strong>
            </div>

            <div className="cu-side-actions">
              <LoadingButton type="submit" className="btn btn-primary btn-block" loading={saving}>
                Save changes
              </LoadingButton>
              <Link
                to={`/admin/checklists/${checklistId}/items`}
                className="btn btn-secondary btn-block"
              >
                Cancel
              </Link>
            </div>
          </div>

          <div className="cu-tip">
            <strong>Tip</strong>
            <p>
              Keep the detailed guide current. Outdated steps are a top reason employees
              raise feedback on checklist items.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}