import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAdminStats } from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { PageLoading } from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import { IconPlus, IconLayers, IconMessageSquare, IconUpload } from "../../components/Icons";

const KPI_CARDS = [
  { key: "total_users", label: "Total users" },
  { key: "active_users", label: "Active users" },
  { key: "total_admins", label: "Admins" },
  { key: "average_progress", label: "Avg. progress", suffix: "%", round: true },
  { key: "pending_comments", label: "Pending feedback" },
  { key: "users_without_team", label: "Users without team" },
  { key: "total_teams", label: "Teams" },
  { key: "total_tools", label: "Tools" },
  { key: "ready_documents", label: "Documents ready", of: "total_documents" },
  { key: "users_lagging", label: "Users lagging" },
  { key: "users_completed", label: "Users completed" },
  { key: "total_roles", label: "Roles" },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAdminStats()
      .then(({ data }) => setStats(data))
      .catch((err) => setError(extractErrorMessage(err, "Could not load dashboard stats.")))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 20, alignItems: "flex-start" }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h1>Dashboard</h1>
          <p>A snapshot of onboarding health across the company, with quick actions to follow up.</p>
        </div>
      </div>

      {error && <div className="top-align-error">{error}</div>}

      {stats && (
        <>
          {/* Shortcut actions */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
            <Link className="btn btn-primary btn-sm" to="/admin/users">
              <IconPlus width={14} height={14} /> Create user
            </Link>
            <Link className="btn btn-secondary btn-sm" to="/admin/teams">
              <IconLayers width={14} height={14} /> Manage teams
            </Link>
            <Link className="btn btn-secondary btn-sm" to="/admin/comments">
              <IconMessageSquare width={14} height={14} /> Review feedback
            </Link>
            <Link className="btn btn-secondary btn-sm" to="/admin/documents">
              <IconUpload width={14} height={14} /> Upload documents
            </Link>
          </div>

          {/* KPI grid */}
          <div className="grid grid-4" style={{ marginBottom: 28 }}>
            {KPI_CARDS.map((c) => {
              const raw = stats[c.key];
              const value = c.round && typeof raw === "number" ? Math.round(raw) : raw;
              return (
                <div className="card stat-card" key={c.key}>
                  <div className="stat-label">{c.label}</div>
                  <div className="stat-value">
                    {value ?? "—"}
                    {c.suffix && value != null ? c.suffix : ""}
                  </div>
                  {c.of && stats[c.of] != null && (
                    <div className="stat-sub">of {stats[c.of]} total</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Lagging users + pending feedback */}
          <div className="grid grid-2">
            <div className="card">
              <div className="card-header">
                <h3>Users lagging</h3>
                <Link to="/admin/users" className="btn btn-ghost btn-sm">View all users</Link>
              </div>
              {!stats.lagging_users || stats.lagging_users.length === 0 ? (
                <div style={{ padding: "8px 0" }}>
                  <EmptyState title="Nobody lagging" description="Everyone is progressing well through their checklist." />
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.lagging_users.map((u) => (
                        <tr key={u.user_id}>
                          <td>
                            <div className="cell-name">{u.full_name}</div>
                            <div className="cell-muted">{u.email}</div>
                          </td>
                          <td className="cell-muted" style={{ whiteSpace: "nowrap" }}>
                            {u.completed_items}/{u.total_items} · {Math.round(u.progress_percent)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <h3>Pending feedback</h3>
                <Link to="/admin/comments" className="btn btn-ghost btn-sm">Review all</Link>
              </div>
              {!stats.pending_feedback || stats.pending_feedback.length === 0 ? (
                <div style={{ padding: "8px 0" }}>
                  <EmptyState title="Nothing pending" description="No checklist feedback is waiting for review." />
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Comment</th>
                        <th>From</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.pending_feedback.map((c) => (
                        <tr key={c.id}>
                          <td style={{ maxWidth: 260 }}>
                            <div style={{ fontSize: 13 }}>{c.comment}</div>
                            <div className="cell-muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                              {c.checklist_item_title || "Checklist item"} · <span style={{ textTransform: "capitalize" }}>{c.comment_type}</span>
                            </div>
                          </td>
                          <td className="cell-muted" style={{ whiteSpace: "nowrap" }}>{c.user_name || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
