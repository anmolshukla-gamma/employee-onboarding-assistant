import { useEffect, useState } from "react";
import { fetchAdminStats } from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { PageLoading } from "../../components/Modal";

const CARDS = [
  { key: "total_users", label: "Total users" },
  { key: "active_users", label: "Active users" },
  { key: "total_admins", label: "Admins" },
  { key: "total_documents", label: "Documents" },
  { key: "ready_documents", label: "Ready documents" },
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
      <div className="section-head">
        <h1>Dashboard</h1>
        <p>A quick snapshot of onboarding activity across the company.</p>
      </div>

      {error && <div className="top-align-error">{error}</div>}

      {stats && (
        <div className="grid grid-3">
          {CARDS.map((c) => (
            <div className="card stat-card" key={c.key}>
              <div className="stat-label">{c.label}</div>
              <div className="stat-value">{stats[c.key] ?? "—"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
