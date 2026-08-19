import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRoles, selectRole } from "../api/roles";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { extractErrorMessage } from "../api/axios";
import { PageLoading } from "../components/Modal";
import EmptyState from "../components/EmptyState";
import LoadingButton from "../components/LoadingButton";

export default function RoleSelect() {
  const { refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRoles()
      .then(({ data }) => setRoles(Array.isArray(data) ? data : data?.items || []))
      .catch((err) => setError(extractErrorMessage(err, "Could not load roles.")))
      .finally(() => setLoading(false));
  }, []);

  async function handleContinue() {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      await selectRole(selectedId);
      await refreshUser();
      toast.success("Role selected. Here's your checklist.");
      navigate("/checklist", { replace: true });
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not select that role."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <div className="section-head">
        <h1>Welcome aboard 👋</h1>
        <p>Pick the role that matches your position — it shapes your onboarding checklist.</p>
      </div>

      {error && <div className="top-align-error">{error}</div>}

      {!error && roles.length === 0 && (
        <div className="card">
          <EmptyState title="No roles available" description="Ask an admin to add roles before you can continue." />
        </div>
      )}

      {roles.length > 0 && (
        <>
          <div className="role-grid">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                className={`role-card ${selectedId === role.id ? "selected" : ""}`}
                onClick={() => setSelectedId(role.id)}
              >
                <div className="role-card-icon">{(role.name || "?").slice(0, 2).toUpperCase()}</div>
                <h3>{role.name}</h3>
                <p>{role.description || "No description provided."}</p>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 26, display: "flex", justifyContent: "flex-end" }}>
            <LoadingButton
              className="btn btn-primary"
              loading={submitting}
              disabled={!selectedId}
              onClick={handleContinue}
            >
              Continue
            </LoadingButton>
          </div>
        </>
      )}
    </div>
  );
}
