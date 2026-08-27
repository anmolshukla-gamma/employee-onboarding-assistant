import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createRoleChecklist,
  fetchAdminRoles,
} from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import LoadingButton from "../../components/LoadingButton";
import { PageLoading } from "../../components/Modal";

export default function CreateChecklist() {
  const { roleId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();

  const [roleName, setRoleName] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
  });

  useEffect(() => {
    fetchAdminRoles()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        const role = list.find((r) => String(r.id) === String(roleId));
        setRoleName(role?.name || `Role #${roleId}`);
        // Helpful default title
        if (role?.name) {
          setForm((f) => ({
            ...f,
            title: f.title || `${role.name} Onboarding`,
          }));
        }
      })
      .catch(() => {
        setRoleName(`Role #${roleId}`);
      })
      .finally(() => setLoadingMeta(false));
  }, [roleId]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Checklist title is required.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await createRoleChecklist(roleId, {
        title: form.title.trim(),
        description: form.description.trim() || null,
      });
      toast.success("Checklist created.");

      // Best next step: add items
      if (data?.id) {
        navigate(`/admin/checklists/${data.id}/items`);
      } else {
        navigate(`/admin/roles/${roleId}/checklists`);
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not create checklist."));
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
            <Link to={`/admin/roles/${roleId}/checklists`}>{roleName}</Link>
            <span>/</span>
            <span>New checklist</span>
          </div>
          <h1>Create checklist</h1>
          <p>
            Define the onboarding checklist for <strong>{roleName}</strong>.
          </p>
        </div>
        <Link to={`/admin/roles/${roleId}/checklists`} className="btn btn-secondary">
          Back to checklists
        </Link>
      </div>

      <form className="cu-grid" onSubmit={handleSubmit}>
        <div className="cu-main">
          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>Checklist details</h2>
                <p>Title and description shown to admins and used for organization.</p>
              </div>
              <span className="cu-step">1</span>
            </div>

            <div className="cu-fields">
              <div className="field">
                <label htmlFor="cl_title">Title</label>
                <input
                  id="cl_title"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="e.g. Software Engineer Onboarding"
                  required
                />
                <div className="field-hint">
                  Recommended format: “{roleName} Onboarding”
                </div>
              </div>

              <div className="field">
                <label htmlFor="cl_desc">Description</label>
                <textarea
                  id="cl_desc"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="What this checklist covers for this role (docs, tools, training, etc.)."
                />
              </div>
            </div>
          </section>

          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>What happens next</h2>
                <p>After creating the checklist, add the actual onboarding steps.</p>
              </div>
              <span className="cu-step">2</span>
            </div>

            <div className="cr-next-list">
              <div className="cr-next-item">
                <span className="cr-next-num">1</span>
                <div>
                  <strong>Create checklist</strong>
                  <p>Save title and description for this role.</p>
                </div>
              </div>
              <div className="cr-next-item">
                <span className="cr-next-num">2</span>
                <div>
                  <strong>Add items</strong>
                  <p>Break onboarding into clear steps with guides and resources.</p>
                </div>
              </div>
              <div className="cr-next-item">
                <span className="cr-next-num">3</span>
                <div>
                  <strong>Assign role to users</strong>
                  <p>Employees with this role will see the checklist automatically.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="cu-side">
          <div className="cu-side-card">
            <h3>Summary</h3>
            <div className="cu-summary-row">
              <span>Role</span>
              <strong>{roleName}</strong>
            </div>
            <div className="cu-summary-row">
              <span>Title</span>
              <strong>{form.title.trim() || "—"}</strong>
            </div>
            <div className="cu-summary-row">
              <span>Description</span>
              <strong>
                {form.description.trim()
                  ? form.description.trim().length > 48
                    ? `${form.description.trim().slice(0, 48)}…`
                    : form.description.trim()
                  : "Not set"}
              </strong>
            </div>

            <div className="cu-side-actions">
              <LoadingButton type="submit" className="btn btn-primary btn-block" loading={saving}>
                Create checklist
              </LoadingButton>
              <Link
                to={`/admin/roles/${roleId}/checklists`}
                className="btn btn-secondary btn-block"
              >
                Cancel
              </Link>
            </div>
          </div>

          <div className="cu-tip">
            <strong>Tip</strong>
            <p>
              After create, you’ll be taken to item setup so you can add Day-1 steps
              immediately.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}