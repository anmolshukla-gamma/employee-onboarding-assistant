import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllUsersProgress } from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { PageLoading } from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import ProgressBar from "../../components/ProgressBar";
import StatusBadge from "../../components/StatusBadge";

export default function Progress() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAllUsersProgress()
      .then(({ data }) => setRows(Array.isArray(data) ? data : []))
      .catch((err) => setError(extractErrorMessage(err, "Could not load progress data.")))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  return (
    <div>
      <div className="section-head">
        <h1>User Progress</h1>
        <p>Onboarding checklist completion across everyone in the org.</p>
      </div>

      {error && <div className="top-align-error">{error}</div>}

      <div className="card">
        {rows.length === 0 ? (
          <EmptyState title="No progress data yet" description="Once employees start completing their checklists, progress will show up here." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Team</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.user_id}>
                    <td>
                      <div className="cell-name">{r.full_name}</div>
                      <div className="cell-muted">{r.email}</div>
                    </td>
                    <td className="cell-muted">{r.role_name || "—"}</td>
                    <td className="cell-muted">{r.team_name || "—"}</td>
                    <td style={{ minWidth: 180 }}>
                      <div className="flex-between" style={{ marginBottom: 4 }}>
                        <span className="cell-muted" style={{ fontSize: 11.5 }}>
                          {r.completed_items}/{r.total_items} items
                        </span>
                      </div>
                      <ProgressBar percent={r.progress_percent} />
                    </td>
                    <td>
                      <StatusBadge status={r.is_active ? "active" : "inactive"} />
                    </td>
                    <td>
                      <Link className="btn btn-secondary btn-sm" to={`/admin/progress/${r.user_id}`}>
                        View detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
