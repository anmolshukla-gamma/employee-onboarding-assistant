import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createAdminRole } from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import LoadingButton from "../../components/LoadingButton";

const EMPTY = {
  name: "",
  description: "",
  is_active: true,
};

export default function CreateRole() {
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Role name is required.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await createAdminRole({
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_active: !!form.is_active,
      });
      toast.success("Role created successfully.");
      // Go to checklist setup for this role (most useful next step)
      if (data?.id) {
        navigate(`/admin/roles/${data.id}/checklists`);
      } else {
        navigate("/admin/roles");
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not create role."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cu-page">
      <div className="cu-top">
        <div>
          <div className="cu-breadcrumb">
            <Link to="/admin/roles">Roles</Link>
            <span>/</span>
            <span>New role</span>
          </div>
          <h1>Create role</h1>
          <p>Define a role that controls onboarding checklist content for employees.</p>
        </div>
        <Link to="/admin/roles" className="btn btn-secondary">
          Back to roles
        </Link>
      </div>

      <form className="cu-grid" onSubmit={handleSubmit}>
        <div className="cu-main">
          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>Role details</h2>
                <p>Name and description shown when employees select or view their role.</p>
              </div>
              <span className="cu-step">1</span>
            </div>

            <div className="cu-fields">
              <div className="field">
                <label htmlFor="cr_name">Role name</label>
                <input
                  id="cr_name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Software Engineer"
                  required
                />
                <div className="field-hint">Must be unique. Example: Sales Executive, Human Resources.</div>
              </div>

              <div className="field">
                <label htmlFor="cr_desc">Description</label>
                <textarea
                  id="cr_desc"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Short explanation of who this role is for and what onboarding covers."
                />
                <div className="field-hint">Optional, but helps admins and employees understand the role.</div>
              </div>
            </div>
          </section>

          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>Availability</h2>
                <p>Control whether this role can be assigned to users.</p>
              </div>
              <span className="cu-step">2</span>
            </div>

            <div className="cu-toggles">
              <label className={`cu-toggle ${form.is_active ? "on" : ""}`}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setField("is_active", e.target.checked)}
                />
                <div>
                  <strong>Active role</strong>
                  <span>Available for assignment during user setup and role selection.</span>
                </div>
              </label>
            </div>
          </section>

          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>What happens next</h2>
                <p>After creating the role, you’ll set up its onboarding checklist.</p>
              </div>
              <span className="cu-step">3</span>
            </div>

            <div className="cr-next-list">
              <div className="cr-next-item">
                <span className="cr-next-num">1</span>
                <div>
                  <strong>Create the role</strong>
                  <p>Save name, description, and active status.</p>
                </div>
              </div>
              <div className="cr-next-item">
                <span className="cr-next-num">2</span>
                <div>
                  <strong>Add checklist</strong>
                  <p>Define onboarding steps for this role (docs, IT, training, etc.).</p>
                </div>
              </div>
              <div className="cr-next-item">
                <span className="cr-next-num">3</span>
                <div>
                  <strong>Assign to users</strong>
                  <p>Link employees so they see the correct checklist.</p>
                </div>
              </div>
            </div>
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
              <span>Description</span>
              <strong>
                {form.description.trim()
                  ? form.description.trim().length > 48
                    ? `${form.description.trim().slice(0, 48)}…`
                    : form.description.trim()
                  : "Not set"}
              </strong>
            </div>
            <div className="cu-summary-row">
              <span>Status</span>
              <strong>{form.is_active ? "Active" : "Inactive"}</strong>
            </div>

            <div className="cu-side-actions">
              <LoadingButton type="submit" className="btn btn-primary btn-block" loading={saving}>
                Create role
              </LoadingButton>
              <Link to="/admin/roles" className="btn btn-secondary btn-block">
                Cancel
              </Link>
            </div>
          </div>

          <div className="cu-tip">
            <strong>Tip</strong>
            <p>
              After creation you’ll be taken to checklist setup for this role so onboarding
              steps can be added immediately.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}