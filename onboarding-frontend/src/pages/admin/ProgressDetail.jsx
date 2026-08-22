import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchUserProgressDetail } from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { PageLoading } from "../../components/Modal";
import ProgressBar from "../../components/ProgressBar";
import EmptyState from "../../components/EmptyState";

export default function ProgressDetail() {
  const { userId } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchUserProgressDetail(userId)
      .then(({ data }) => setDetail(data))
      .catch((err) => setError(extractErrorMessage(err, "Could not load this user's progress.")))
      .finally(() => setLoading(false));
  }, [userId]);

  // Group items by category, preserving the order they arrive in (already
  // sorted by `order` on the backend), same pattern as the employee checklist page.
  const grouped = useMemo(() => {
    if (!detail?.items) return [];
    const map = new Map();
    for (const item of detail.items) {
      const cat = item.category || "General";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(item);
    }
    return Array.from(map.entries());
  }, [detail]);

  if (loading) return <PageLoading />;

  if (error) {
    return (
      <div className="card card-pad">
        <div className="top-align-error" style={{ marginBottom: 0 }}>{error}</div>
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div>
      <div className="section-head">
        <h1>{detail.full_name}</h1>
        <p>
          <Link to="/admin/progress">Progress</Link> / {detail.email}
          {detail.role_name && ` · ${detail.role_name}`}
          {detail.team_name && ` · ${detail.team_name}`}
        </p>
      </div>

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <div className="flex-between" style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {detail.completed_items} of {detail.total_items} complete
          </span>
        </div>
        <ProgressBar percent={detail.progress_percent} />
      </div>

      {grouped.length === 0 ? (
        <div className="card">
          <EmptyState title="No checklist items" description="This user doesn't have a checklist assigned yet." />
        </div>
      ) : (
        grouped.map(([category, items]) => (
          <div className="checklist-group" key={category}>
            <div className="checklist-group-title">{category}</div>
            {items.map((item) => (
              <div key={item.item_id} className={`checklist-item ${item.is_completed ? "completed" : ""}`}>
                <span className={`check-circle ${item.is_completed ? "checked" : ""}`} style={{ cursor: "default" }}>
                  {item.is_completed && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </span>
                <div className="checklist-item-body">
                  <div className="checklist-item-title">
                    {item.title}
                    {item.is_mandatory && <span className="badge-mandatory">Required</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
