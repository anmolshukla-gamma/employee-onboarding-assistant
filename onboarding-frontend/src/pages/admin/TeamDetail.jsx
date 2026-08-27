import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchAdminTeams,
  fetchAdminTools,
  fetchTeamTools,
  addToolToTeam,
  removeToolFromTeam,
  updateAdminTeam,
} from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { PageLoading, Modal, ConfirmModal } from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import LoadingButton from "../../components/LoadingButton";
import { IconPlus, IconTrash } from "../../components/Icons";
import TeamMembersPanel from "./TeamMembersPanel";

import { useNavigate } from "react-router-dom";



const TABS = [
  { key: "members", label: "Members" },
  { key: "tools", label: "Tools" },
  { key: "overview", label: "Overview" },
];

function ToolsTab({ teamId }) {
  const toast = useToast();
  const [mappedTools, setMappedTools] = useState([]);
  const [allTools, setAllTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState("");
  const [isMandatory, setIsMandatory] = useState(true);
  const [order, setOrder] = useState(1);
  const [saving, setSaving] = useState(false);

  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  const navigate = useNavigate();

  function load() {
    setLoading(true);
    Promise.all([fetchTeamTools(teamId), fetchAdminTools()])
      .then(([teamToolsRes, toolsRes]) => {
        setMappedTools(Array.isArray(teamToolsRes.data) ? teamToolsRes.data : []);
        setAllTools(Array.isArray(toolsRes.data) ? toolsRes.data : []);
      })
      .catch((err) => setError(extractErrorMessage(err, "Could not load tools.")))
      .finally(() => setLoading(false));
  }

  useEffect(load, [teamId]);

  const availableTools = useMemo(() => {
    const mappedIds = new Set(mappedTools.map((mt) => mt.tool_id));
    return allTools.filter((t) => !mappedIds.has(t.id));
  }, [allTools, mappedTools]);

  function openAdd() {
    setSelectedToolId(availableTools[0]?.id ? String(availableTools[0].id) : "");
    setIsMandatory(true);
    setOrder(mappedTools.length + 1);
    setAddOpen(true);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!selectedToolId) return;
    setSaving(true);
    try {
      await addToolToTeam(teamId, {
        tool_id: Number(selectedToolId),
        is_mandatory: isMandatory,
        order: Number(order) || 0,
      });
      toast.success("Tool added to team.");
      setAddOpen(false);
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not add this tool to the team."));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await removeToolFromTeam(teamId, removeTarget.tool_id);
      toast.success("Tool removed from team.");
      setRemoveTarget(null);
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not remove this tool."));
    } finally {
      setRemoving(false);
    }
  }

  if (loading) return <PageLoading />;

  const sortedMapped = mappedTools.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 14 }}>
        <p className="text-muted" style={{ fontSize: 13 }}>Tools employees on this team see under My Access.</p>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate(`/admin/teams/${teamId}/tools/add`)}
        >
          + Add tools
        </button>
      </div>

      {error && <div className="top-align-error">{error}</div>}

      <div className="card">
        {sortedMapped.length === 0 ? (
          <EmptyState title="No tools mapped yet" description="Add tools this team needs access to." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tool</th>
                  <th>Category</th>
                  <th>Required</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedMapped.map((mt) => (
                  <tr key={mt.id}>
                    <td className="cell-muted mono">{mt.order}</td>
                    <td>
                      <div className="cell-name">{mt.tool?.name || `Tool #${mt.tool_id}`}</div>
                      {mt.tool?.description && <div className="cell-muted">{mt.tool.description}</div>}
                    </td>
                    <td className="cell-muted">{mt.tool?.category || "—"}</td>
                    <td>{mt.is_mandatory ? <span className="badge-mandatory">Required</span> : <span className="cell-muted">Optional</span>}</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => setRemoveTarget(mt)}>
                        <IconTrash width={14} height={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {addOpen && (
        <Modal title="Add tool to team" onClose={() => setAddOpen(false)}>
          {availableTools.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13 }}>
              All existing tools are already mapped to this team. Create a new tool first on the Tools page.
            </p>
          ) : (
            <form onSubmit={handleAdd}>
              <div className="field">
                <label htmlFor="tt_tool">Tool</label>
                <select id="tt_tool" value={selectedToolId} onChange={(e) => setSelectedToolId(e.target.value)}>
                  {availableTools.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div className="field">
                  <label htmlFor="tt_order">Order</label>
                  <input id="tt_order" type="number" min={1} value={order} onChange={(e) => setOrder(e.target.value)} />
                </div>
                <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
                  <div className="checkbox-row">
                    <input id="tt_mandatory" type="checkbox" checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} />
                    <label htmlFor="tt_mandatory" style={{ margin: 0 }}>Required</label>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAddOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <LoadingButton type="submit" loading={saving}>
                  Add tool
                </LoadingButton>
              </div>
            </form>
          )}
        </Modal>
      )}

      {removeTarget && (
        <ConfirmModal
          title="Remove tool"
          message={`Remove "${removeTarget.tool?.name || "this tool"}" from this team? Employees on this team will no longer see it under My Access.`}
          confirmLabel="Remove tool"
          loading={removing}
          onConfirm={handleRemove}
          onClose={() => setRemoveTarget(null)}
        />
      )}
    </div>
  );
}

function OverviewTab({ team, onTeamChange }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: team?.name || "",
    description: team?.description || "",
    is_active: team?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAdminTeam(team.id, form);
      onTeamChange(form);
      toast.success("Team updated.");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save changes."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card card-pad" style={{ maxWidth: 480 }}>
      <form onSubmit={handleSave}>
        <div className="field">
          <label htmlFor="ov_name">Name</label>
          <input id="ov_name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor="ov_desc">Description</label>
          <textarea id="ov_desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="checkbox-row" style={{ marginBottom: 18 }}>
          <input id="ov_active" type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
          <label htmlFor="ov_active" style={{ margin: 0 }}>Active</label>
        </div>
        <LoadingButton type="submit" loading={saving}>Save changes</LoadingButton>
      </form>
    </div>
  );
}

export default function TeamDetail() {
  const { teamId } = useParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("members");

  function load() {
    setLoading(true);
    fetchAdminTeams()
      .then(({ data }) => {
        const teams = Array.isArray(data) ? data : [];
        setTeam(teams.find((t) => String(t.id) === String(teamId)) || null);
      })
      .catch((err) => setError(extractErrorMessage(err, "Could not load team details.")))
      .finally(() => setLoading(false));
  }

  useEffect(load, [teamId]);

  if (loading) return <PageLoading />;

  return (
    <div>
      <div className="section-head">
        <h1>{team?.name || `Team #${teamId}`}</h1>
        <p>
          <Link to="/admin/teams">Teams</Link> / {team?.name ? "Manage team" : `Team #${teamId}`}
          {team && (
            <span style={{ marginLeft: 8 }}>
              <StatusBadge status={team.is_active ? "active" : "inactive"} />
            </span>
          )}
        </p>
      </div>

      {error && <div className="top-align-error">{error}</div>}

      <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: "1px solid var(--color-border)" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="btn btn-ghost btn-sm"
            style={{
              borderRadius: 0,
              borderBottom: tab === t.key ? "2px solid var(--color-primary)" : "2px solid transparent",
              color: tab === t.key ? "var(--color-primary-700)" : "var(--color-text-muted)",
              fontWeight: tab === t.key ? 700 : 500,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "members" && <TeamMembersPanel teamId={teamId} teamName={team?.name} />}
      {tab === "tools" && <ToolsTab teamId={teamId} />}
      {tab === "overview" && team && (
        <OverviewTab team={team} onTeamChange={(patch) => setTeam((prev) => ({ ...prev, ...patch }))} />
      )}
    </div>
  );
}
