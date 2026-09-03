import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchAdminTools, updateAdminTool } from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { PageLoading } from "../../components/Modal";
import LoadingButton from "../../components/LoadingButton";

export default function EditTool() {
  const { toolId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    request_url: "",
    guide_text: "",
    provider_key: "",
    is_active: true,
  });

  useEffect(() => {
    setLoading(true);
    fetchAdminTools()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.items || [];
        const tool = list.find((t) => String(t.id) === String(toolId));
        if (!tool) {
          toast.error("Tool not found.");
          navigate("/admin/tools");
          return;
        }
        setForm({
          name: tool.name || "",
          description: tool.description || "",
          category: tool.category || "",
          request_url: tool.request_url || "",
          guide_text: tool.guide_text || "",
          provider_key: tool.provider_key || "",
          is_active: tool.is_active !== false,
        });
      })
      .catch((err) => {
        toast.error(extractErrorMessage(err, "Could not load tool."));
        navigate("/admin/tools");
      })
      .finally(() => setLoading(false));
  }, [toolId, navigate, toast]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const initials = useMemo(() => {
    const n = form.name.trim();
    if (!n) return "T";
    return n.slice(0, 1).toUpperCase();
  }, [form.name]);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Tool name is required.");
      return;
    }

    setSaving(true);
    try {
      await updateAdminTool(toolId, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        request_url: form.request_url.trim() || null,
        guide_text: form.guide_text.trim() || null,
        provider_key: form.provider_key.trim() || null,
        is_active: !!form.is_active,
      });
      toast.success("Tool updated.");
      navigate("/admin/tools");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not update tool."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="et-page">
      {/* Hero */}
      <div className="et-hero">
        <div>
          <div className="et-breadcrumb">
            <Link to="/admin/tools">Tools</Link>
            <span>/</span>
            <span>Edit</span>
          </div>
          <div className="et-title-row">
            <div className="et-avatar">{initials}</div>
            <div>
              <h1>{form.name || "Edit tool"}</h1>
              <p>Update catalog details, access link, and guide text.</p>
            </div>
          </div>
        </div>
        <div className="et-hero-actions">
          <Link to="/admin/tools" className="btn btn-secondary">
            Back to tools
          </Link>
        </div>
      </div>

      {/* Metrics strip */}
      <div className="et-metrics">
        <div className="et-metric">
          <span className="et-metric-label">Category</span>
          <strong style={{ fontSize: 15 }}>{form.category.trim() || "General"}</strong>
        </div>
        <div className="et-metric">
          <span className="et-metric-label">Integration</span>
          <strong style={{ fontSize: 15 }}>
            {form.provider_key === "jira"
              ? "Jira (Auto)"
              : form.provider_key === "github"
              ? "GitHub (Auto)"
              : form.provider_key === "aws"
              ? "AWS (Auto)"
              : "Manual"}
          </strong>
        </div>
        <div className="et-metric">
          <span className="et-metric-label">Request URL</span>
          <strong style={{ fontSize: 15 }}>{form.request_url.trim() ? "Configured" : "Not set"}</strong>
        </div>
        <div className="et-metric">
          <span className="et-metric-label">Status</span>
          <strong style={{ fontSize: 15 }}>{form.is_active ? "Active" : "Inactive"}</strong>
        </div>
      </div>

      <form className="et-layout" onSubmit={handleSave}>
        <section className="et-editor">
          <div className="et-editor-head">
            <h2>Tool details</h2>
            <p>These fields appear in the tools catalog and My Access.</p>
          </div>

          <div className="field">
            <label htmlFor="edit_tool_name">Name</label>
            <input
              id="edit_tool_name"
              required
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </div>

          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field">
              <label htmlFor="edit_tool_category">Category</label>
              <input
                id="edit_tool_category"
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                placeholder="Engineering, IT, HR…"
              />
            </div>
            <div className="field">
              <label htmlFor="edit_tool_url">Request URL</label>
              <input
                id="edit_tool_url"
                type="url"
                value={form.request_url}
                onChange={(e) => setField("request_url", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="edit_tool_desc">Description</label>
            <textarea
              id="edit_tool_desc"
              rows={3}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="edit_tool_provider">Automated Provisioning (Integration)</label>
            <select
              id="edit_tool_provider"
              value={form.provider_key}
              onChange={(e) => setField("provider_key", e.target.value)}
            >
              <option value="">None / Manual (External portal or ticket)</option>
              <option value="jira">Jira Cloud (Automatic User Invite & Group Access)</option>
              <option value="github">GitHub (Automatic Org & Team Invitation)</option>
              <option value="aws">AWS (Automatic IAM Console & User Access)</option>
            </select>
            <div className="field-hint">
              When selected, approving an employee's access request will automatically grant access via API.
            </div>
          </div>

          <div className="field">
            <label htmlFor="edit_tool_guide">Guide text</label>
            <textarea
              id="edit_tool_guide"
              rows={6}
              value={form.guide_text}
              onChange={(e) => setField("guide_text", e.target.value)}
              placeholder="How to request or set up access…"
            />
          </div>

          <label className={`et-switch-row ${form.is_active ? "on" : ""}`}>
            <div>
              <strong>Active tool</strong>
              <span>Inactive tools are hidden from new team mappings.</span>
            </div>
            <div className="et-switch">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setField("is_active", e.target.checked)}
              />
              <span className="et-switch-ui" />
            </div>
          </label>

          <div className="et-editor-actions">
            <LoadingButton type="submit" className="btn btn-primary" loading={saving}>
              Save changes
            </LoadingButton>
            <Link to="/admin/tools" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </section>

        <aside className="et-ops">
          <div className="et-ops-card">
            <h3>Tool operations</h3>
            <p className="et-ops-sub">Where this tool is used next</p>

            <Link className="et-ops-link" to="/admin/teams">
              <div>
                <strong>Map to teams</strong>
                <span>Assign this tool from Manage Team → Tools</span>
              </div>
              <span className="et-ops-arrow">→</span>
            </Link>

            <Link className="et-ops-link" to="/admin/tools">
              <div>
                <strong>Back to catalog</strong>
                <span>Review all tools and statuses</span>
              </div>
              <span className="et-ops-arrow">→</span>
            </Link>
          </div>

          <div className="et-note">
            <strong>Tip</strong>
            <p>
              Keep guide text short and actionable. Employees see it on My Access when the tool
              is mapped to their team.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}