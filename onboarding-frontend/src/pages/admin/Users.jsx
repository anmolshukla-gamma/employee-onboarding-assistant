import { useEffect, useState } from "react";
import { fetchAdminUsers, toggleUserAdmin, toggleUserActive } from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { PageLoading } from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";

export default function Users() {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    fetchAdminUsers()
      .then(({ data }) => setUsers(Array.isArray(data) ? data : data?.items || []))
      .catch((err) => setError(extractErrorMessage(err, "Could not load users.")))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleToggleAdmin(u) {
    setBusyId(u.id);
    try {
      await toggleUserAdmin(u.id);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_admin: !x.is_admin } : x)));
      toast.success(`${u.full_name} is ${!u.is_admin ? "now an admin" : "no longer an admin"}.`);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not update admin status."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(u) {
    if (u.id === currentUser?.id) {
      toast.error("You can't deactivate your own account.");
      return;
    }
    setBusyId(u.id);
    try {
      await toggleUserActive(u.id);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: !x.is_active } : x)));
      toast.success(`${u.full_name} is now ${!u.is_active ? "active" : "inactive"}.`);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not update user status."));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div>
      <div className="section-head">
        <h1>Users</h1>
        <p>Manage admin access and account status for everyone in the org.</p>
      </div>

      {error && <div className="top-align-error">{error}</div>}

      <div className="card">
        {users.length === 0 ? (
          <EmptyState title="No users yet" description="Users will show up here once people start registering." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Admin</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="cell-name">
                      {u.full_name}
                      {u.id === currentUser?.id && <span className="cell-muted"> (you)</span>}
                    </td>
                    <td className="cell-muted">{u.email}</td>
                    <td className="cell-muted">{u.role_name || u.role_id || "—"}</td>
                    <td>
                      <span className={`status-badge ${u.is_admin ? "status-admin" : "status-inactive"}`}>
                        {u.is_admin ? "Admin" : "Employee"}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={u.is_active ? "active" : "inactive"} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={busyId === u.id}
                          onClick={() => handleToggleAdmin(u)}
                        >
                          {u.is_admin ? "Revoke admin" : "Make admin"}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={busyId === u.id || u.id === currentUser?.id}
                          onClick={() => handleToggleActive(u)}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
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
