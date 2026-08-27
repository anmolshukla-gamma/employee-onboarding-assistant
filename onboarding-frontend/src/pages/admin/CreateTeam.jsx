import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createAdminTeam } from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import LoadingButton from "../../components/LoadingButton";

const EMPTY = {
  name: "",
  description: "",
  is_active: true,
};

export default function CreateTeam() {
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
      toast.error("Team name is required.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await createAdminTeam({
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_active: !!form.is_active,
      });
      toast.success("Team created successfully.");

      // Next useful step: map tools to this team
      if (data?.id) {
        navigate(`/admin/teams/${data.id}`);
      } else {
        navigate("/admin/teams");
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not create team."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cu-page">
      <div className="cu-top">
        <div>
          <div className="cu-breadcrumb">
            <Link to="/admin/teams">Teams</Link>
            <span>/</span>
            <span>New team</span>
          </div>
          <h1>Create team</h1>
          <p>Teams control which tools employees see under My Access.</p>
        </div>
        <Link to="/admin/teams" className="btn btn-secondary">
          Back to teams
        </Link>
      </div>

      <form className="cu-grid" onSubmit={handleSubmit}>
        <div className="cu-main">
          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>Team details</h2>
                <p>Name and description for this group of employees.</p>
              </div>
              <span className="cu-step">1</span>
            </div>

            <div className="cu-fields">
              <div className="field">
                <label htmlFor="ct_name">Team name</label>
                <input
                  id="ct_name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Data Engineering – Platform"
                  required
                />
                <div className="field-hint">
                  Use clear names by function/size, e.g. “DE Platform” vs “DE Analytics”.
                </div>
              </div>

              <div className="field">
                <label htmlFor="ct_desc">Description</label>
                <textarea
                  id="ct_desc"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="What this team does and what kind of tool access they typically need."
                />
              </div>
            </div>
          </section>

          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>Availability</h2>
                <p>Control whether users can be assigned to this team.</p>
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
                  <strong>Active team</strong>
                  <span>Available when assigning users and mapping tools.</span>
                </div>
              </label>
            </div>
          </section>

          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>What happens next</h2>
                <p>After creating the team, map tools and assign members.</p>
              </div>
              <span className="cu-step">3</span>
            </div>

            <div className="cr-next-list">
              <div className="cr-next-item">
                <span className="cr-next-num">1</span>
                <div>
                  <strong>Create team</strong>
                  <p>Save name, description, and active status.</p>
                </div>
              </div>
              <div className="cr-next-item">
                <span className="cr-next-num">2</span>
                <div>
                  <strong>Map tools</strong>
                  <p>Add required tools (GitHub, VPN, Jira, etc.) for this team.</p>
                </div>
              </div>
              <div className="cr-next-item">
                <span className="cr-next-num">3</span>
                <div>
                  <strong>Assign members</strong>
                  <p>Link users so they see the right tools in My Access.</p>
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
                Create team
              </LoadingButton>
              <Link to="/admin/teams" className="btn btn-secondary btn-block">
                Cancel
              </Link>
            </div>
          </div>

          <div className="cu-tip">
            <strong>Tip</strong>
            <p>
              After creation you’ll land on the team detail page to add tools immediately.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}