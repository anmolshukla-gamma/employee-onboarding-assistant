import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createChecklistItem,
  fetchChecklistItems,
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

export default function CreateChecklistItem() {
  const { checklistId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [saving, setSaving] = useState(false);

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
    // Prefill order as last + 1
    fetchChecklistItems(checklistId)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.items || [];
        const maxOrder = list.reduce((m, it) => Math.max(m, Number(it.order) || 0), 0);
        setForm((f) => ({ ...f, order: maxOrder + 1 }));
      })
      .catch(() => {
        /* keep default order */
      })
      .finally(() => setLoadingMeta(false));
  }, [checklistId]);

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
      await createChecklistItem(checklistId, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        detailed_guide: form.detailed_guide.trim() || null,
        category: form.category.trim() || null,
        order: Number(form.order) || 1,
        is_mandatory: !!form.is_mandatory,
        resources,
      });
      toast.success("Checklist item added.");
      navigate(`/admin/checklists/${checklistId}/items`);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not add this item."));
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
            <Link to="/admin/roles">Roles</Link>
            <span>/</span>
            <Link to={`/admin/checklists/${checklistId}/items`}>Checklist #{checklistId}</Link>
            <span>/</span>
            <span>New item</span>
          </div>
          <h1>Add checklist item</h1>
          <p>Create a clear onboarding step with guide text and helpful resources.</p>
        </div>
        <Link to={`/admin/checklists/${checklistId}/items`} className="btn btn-secondary">
          Back to items
        </Link>
      </div>

      <form className="cu-grid" onSubmit={handleSubmit}>
        <div className="cu-main">
          {/* Basics */}
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
                <label htmlFor="ci_title">Title</label>
                <input
                  id="ci_title"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="e.g. Set up VPN"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="ci_desc">Short description</label>
                <input
                  id="ci_desc"
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="One-line summary shown in the checklist list"
                />
              </div>

              <div className="cu-fields-2">
                <div className="field">
                  <label htmlFor="ci_cat">Category</label>
                  <input
                    id="ci_cat"
                    value={form.category}
                    onChange={(e) => setField("category", e.target.value)}
                    placeholder="e.g. IT, HR, Access, Learning"
                  />
                </div>
                <div className="field">
                  <label htmlFor="ci_order">Display order</label>
                  <input
                    id="ci_order"
                    type="number"
                    min={1}
                    value={form.order}
                    onChange={(e) => setField("order", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Guide */}
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
                <label htmlFor="ci_guide">How to complete this step</label>
                <textarea
                  id="ci_guide"
                  rows={8}
                  value={form.detailed_guide}
                  onChange={(e) => setField("detailed_guide", e.target.value)}
                  placeholder={`Example:\n1. Open HRMS\n2. Go to Profile → Documents\n3. Upload required files\n4. Submit and wait for verification`}
                />
                <div className="field-hint">
                  Write clear numbered steps. This is what reduces repeated questions to managers.
                </div>
              </div>
            </div>
          </section>

          {/* Resources */}
          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>Resources</h2>
                <p>Links or documents the employee needs for this step.</p>
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

          {/* Rules */}
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
                Add item
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
              A good item has a clear title, a short description, and a detailed guide with
              links. That is what reduces “how do I do this?” questions.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}