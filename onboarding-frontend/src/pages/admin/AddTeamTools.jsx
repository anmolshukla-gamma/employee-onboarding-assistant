import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchAdminTeams,
  fetchAdminTools,
  fetchTeamTools,
  addToolToTeam,
} from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { PageLoading } from "../../components/Modal";
import LoadingButton from "../../components/LoadingButton";
import EmptyState from "../../components/EmptyState";

export default function AddTeamTools() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [team, setTeam] = useState(null);
  const [allTools, setAllTools] = useState([]);
  const [mappedIds, setMappedIds] = useState(new Set());
  const [selected, setSelected] = useState({}); // toolId -> { mandatory, order }
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchAdminTeams(),
      fetchAdminTools(),
      fetchTeamTools(teamId),
    ])
      .then(([teamsRes, toolsRes, mappedRes]) => {
        const teams = Array.isArray(teamsRes.data) ? teamsRes.data : teamsRes.data?.items || [];
        setTeam(teams.find((t) => String(t.id) === String(teamId)) || null);

        const tools = Array.isArray(toolsRes.data) ? toolsRes.data : toolsRes.data?.items || [];
        setAllTools(tools.filter((t) => t.is_active !== false));

        const mapped = Array.isArray(mappedRes.data) ? mappedRes.data : mappedRes.data?.items || [];
        const ids = new Set(
          mapped.map((m) => m.tool_id || m.tool?.id || m.id).filter(Boolean)
        );
        setMappedIds(ids);
      })
      .catch((err) => toast.error(extractErrorMessage(err, "Could not load tools.")))
      .finally(() => setLoading(false));
  }, [teamId, toast]);

  const available = useMemo(() => {
    const query = q.trim().toLowerCase();
    return allTools
      .filter((t) => !mappedIds.has(t.id))
      .filter((t) => {
        if (!query) return true;
        return (
          t.name?.toLowerCase().includes(query) ||
          t.category?.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
        );
      });
  }, [allTools, mappedIds, q]);

  const selectedList = useMemo(
    () => allTools.filter((t) => selected[t.id]),
    [allTools, selected]
  );

  function toggleTool(tool) {
    setSelected((prev) => {
      if (prev[tool.id]) {
        const next = { ...prev };
        delete next[tool.id];
        return next;
      }
      return {
        ...prev,
        [tool.id]: { is_mandatory: false, order: Object.keys(prev).length + 1 },
      };
    });
  }

  function updateSelected(toolId, patch) {
    setSelected((prev) => ({
      ...prev,
      [toolId]: { ...prev[toolId], ...patch },
    }));
  }

  async function handleAdd() {
    const ids = Object.keys(selected);
    if (!ids.length) {
      toast.error("Select at least one tool.");
      return;
    }

    setSaving(true);
    try {
      for (const id of ids) {
        const cfg = selected[id];
        await addToolToTeam(teamId, {
          tool_id: Number(id),
          is_mandatory: !!cfg.is_mandatory,
          order: Number(cfg.order) || 1,
        });
      }
      toast.success(
        ids.length === 1 ? "Tool added to team." : `${ids.length} tools added to team.`
      );
      navigate(`/admin/teams/${teamId}`);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not add tools."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="tt-page">
      <div className="tt-top">
        <div>
          <div className="tt-breadcrumb">
            <Link to="/admin/teams">Teams</Link>
            <span>/</span>
            <Link to={`/admin/teams/${teamId}`}>{team?.name || `Team #${teamId}`}</Link>
            <span>/</span>
            <span>Add tools</span>
          </div>
          <h1>Add tools</h1>
          <p>Pick tools from the catalog and map them to this team.</p>
        </div>
        <Link to={`/admin/teams/${teamId}`} className="btn btn-secondary">
          Back to team
        </Link>
      </div>

      <div className="tt-layout">
        {/* Catalog */}
        <section className="tt-main card">
          <div className="tt-toolbar">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tools by name or category…"
              className="tt-search"
            />
            <span className="text-muted" style={{ fontSize: 12.5 }}>
              {available.length} available
            </span>
          </div>

          {available.length === 0 ? (
            <EmptyState
              title="No tools to add"
              description={
                q
                  ? "Try a different search."
                  : "All active tools are already mapped, or no tools exist yet."
              }
            />
          ) : (
            <div className="tt-catalog">
              {available.map((tool) => {
                const isOn = !!selected[tool.id];
                return (
                  <button
                    key={tool.id}
                    type="button"
                    className={`tt-tool-card ${isOn ? "selected" : ""}`}
                    onClick={() => toggleTool(tool)}
                  >
                    <div className="tt-tool-check">{isOn ? "✓" : ""}</div>
                    <div className="tt-tool-body">
                      <div className="tt-tool-name">{tool.name}</div>
                      <div className="tt-tool-meta">
                        {tool.category || "General"}
                        {tool.is_mandatory ? " · often required" : ""}
                      </div>
                      {tool.description && (
                        <div className="tt-tool-desc">{tool.description}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Selection tray */}
        <aside className="tt-side">
          <div className="tt-side-card">
            <h3>Selected ({selectedList.length})</h3>
            {selectedList.length === 0 ? (
              <p className="tt-empty">Click tools on the left to select them.</p>
            ) : (
              <div className="tt-selected-list">
                {selectedList.map((tool) => (
                  <div key={tool.id} className="tt-selected-item">
                    <div className="tt-selected-top">
                      <strong>{tool.name}</strong>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => toggleTool(tool)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="tt-selected-cfg">
                      <label className="tt-check">
                        <input
                          type="checkbox"
                          checked={!!selected[tool.id]?.is_mandatory}
                          onChange={(e) =>
                            updateSelected(tool.id, { is_mandatory: e.target.checked })
                          }
                        />
                        Mandatory
                      </label>
                      <label className="tt-order">
                        Order
                        <input
                          type="number"
                          min={1}
                          value={selected[tool.id]?.order ?? 1}
                          onChange={(e) =>
                            updateSelected(tool.id, { order: e.target.value })
                          }
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="tt-side-actions">
              <LoadingButton
                type="button"
                className="btn btn-primary btn-block"
                loading={saving}
                disabled={!selectedList.length}
                onClick={handleAdd}
              >
                Add to team
              </LoadingButton>
              <Link to={`/admin/teams/${teamId}`} className="btn btn-secondary btn-block">
                Cancel
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}