import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllUsersProgress } from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { PageLoading } from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import ProgressBar from "../../components/ProgressBar";
import StatusBadge from "../../components/StatusBadge";
import Pagination from "../../components/Pagination";

export default function Progress() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  function loadProgress(nextPage = page) {
    setLoading(true);
    setError("");

    fetchAllUsersProgress({
      q: q || undefined,
      page: nextPage,
      page_size: pageSize,
    })
      .then(({ data }) => {
        setRows(Array.isArray(data?.items) ? data.items : []);
        setPage(data?.page || nextPage);
        setTotal(data?.total || 0);
        setTotalPages(data?.total_pages || 1);
      })
      .catch((err) => setError(extractErrorMessage(err, "Could not load progress data.")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadProgress(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page]);

  if (loading && rows.length === 0) return <PageLoading />;

  return (
    <div>
      <div className="section-head">
        <h1>User Progress</h1>
        <p>Onboarding checklist completion across everyone in the org.</p>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or email…"
          style={{
            width: "100%",
            maxWidth: 360,
            padding: "9px 12px",
            border: "1px solid var(--color-border-strong)",
            borderRadius: "var(--radius-sm)",
            fontSize: 13.5,
          }}
        />
      </div>

      {error && <div className="top-align-error">{error}</div>}

      <div className="card">
        {!loading && rows.length === 0 ? (
          <EmptyState
            title="No progress data yet"
            description="Once employees start completing their checklists, progress will show up here."
          />
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
                        <span className="cell-muted" style={{ fontSize: 11.5 }}>
                          {r.progress_percent ?? 0}%
                        </span>
                      </div>
                      <ProgressBar percent={r.progress_percent ?? 0} />
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

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={(p) => setPage(p)}
      />
    </div>
  );
}