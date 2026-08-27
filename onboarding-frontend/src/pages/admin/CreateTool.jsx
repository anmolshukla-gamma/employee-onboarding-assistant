import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createAdminTool } from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import LoadingButton from "../../components/LoadingButton";

const EMPTY = {
  name: "",
  description: "",
  category: "",
  request_url: "",
  guide_text: "",
  is_active: true,
};

export default function CreateTool() {
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const canSubmit = useMemo(() => form.name.trim().length > 0, [form.name]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("Tool name is required.");
      return;
    }

    setSaving(true);
    try {
      await createAdminTool({
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        request_url: form.request_url.trim() || null,
        guide_text: form.guide_text.trim() || null,
        is_active: !!form.is_active,
      });
      toast.success("Tool created successfully.");
      navigate("/admin/tools");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not create tool."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cu-page">
      <div className="cu-top">
        <div>
          <div className="cu-breadcrumb">
            <Link to="/admin/tools">Tools</Link>
            <span>/</span>
            <span>New tool</span>
          </div>
          <h1>Create tool</h1>
          <p>Add a system or app employees may need during onboarding.</p>
        </div>
        <Link to="/admin/tools" className="btn btn-secondary">
          Back to tools
        </Link>
      </div>

      <form className="cu-grid" onSubmit={handleSubmit}>
        <div className="cu-main">
          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>Basic details</h2>
                <p>Name and how this tool is grouped.</p>
              </div>
              <span className="cu-step">1</span>
            </div>

            <div className="cu-fields">
              <div className="field">
                <label htmlFor="tool_name">Tool name</label>
                <input
                  id="tool_name"
                  required
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. GitHub, VPN, HRMS"
                />
              </div>

              <div className="cu-fields-2">
                <div className="field">
                  <label htmlFor="tool_category">Category</label>
                  <input
                    id="tool_category"
                    value={form.category}
                    onChange={(e) => setField("category", e.target.value)}
                    placeholder="e.g. Engineering, IT, HR"
                  />
                </div>
                <div className="field">
                  <label htmlFor="tool_url">Request URL</label>
                  <input
                    id="tool_url"
                    type="url"
                    value={form.request_url}
                    onChange={(e) => setField("request_url", e.target.value)}
                    placeholder="https://..."
                  />
                  <div className="field-hint">Optional link for “Request access”.</div>
                </div>
              </div>

              <div className="field">
                <label htmlFor="tool_desc">Short description</label>
                <textarea
                  id="tool_desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="What this tool is used for"
                />
              </div>
            </div>
          </section>

          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>Access guide</h2>
                <p>Help text shown on My Access for employees.</p>
              </div>
              <span className="cu-step">2</span>
            </div>

            <div className="field">
              <label htmlFor="tool_guide">Guide text</label>
              <textarea
                id="tool_guide"
                rows={6}
                value={form.guide_text}
                onChange={(e) => setField("guide_text", e.target.value)}
                placeholder={"Step 1: ...\nStep 2: ...\nWho to contact: ..."}
              />
            </div>
          </section>

          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>Availability</h2>
                <p>Inactive tools stay hidden from new team mappings.</p>
              </div>
              <span className="cu-step">3</span>
            </div>

            <label className={`cu-toggle ${form.is_active ? "on" : ""}`}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setField("is_active", e.target.checked)}
              />
              <div>
                <strong>Active tool</strong>
                <span>Can be assigned to teams and shown in My Access.</span>
              </div>
            </label>
          </section>
        </div>

        <aside className="cu-side">
          <div className="cu-side-card">
            <h3>Summary</h3>
            <div className="cu-summary-row">
              <span>Name</span>
              <strong>{form.name.trim() || "—"}</strong>
            </div>
            <div className="cu-summary-row">
              <span>Category</span>
              <strong>{form.category.trim() || "General"}</strong>
            </div>
            <div className="cu-summary-row">
              <span>Request URL</span>
              <strong>{form.request_url.trim() ? "Set" : "Not set"}</strong>
            </div>
            <div className="cu-summary-row">
              <span>Guide</span>
              <strong>{form.guide_text.trim() ? "Added" : "Empty"}</strong>
            </div>
            <div className="cu-summary-row">
              <span>Status</span>
              <strong>{form.is_active ? "Active" : "Inactive"}</strong>
            </div>

            <div className="cu-side-actions">
              <LoadingButton
                type="submit"
                className="btn btn-primary btn-block"
                loading={saving}
                disabled={!canSubmit}
              >
                Create tool
              </LoadingButton>
              <Link to="/admin/tools" className="btn btn-secondary btn-block">
                Cancel
              </Link>
            </div>
          </div>

          <div className="cu-tip">
            <strong>Next step</strong>
            <p>
              After creating the tool, map it to teams from Manage Team → Tools so the right
              employees see it under My Access.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}