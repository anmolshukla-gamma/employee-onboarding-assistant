import { useEffect, useState } from "react";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { PageLoading } from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import LoadingButton from "../../components/LoadingButton";
import { fetchToolRequests, approveToolRequest, rejectToolRequest, revokeToolRequest } from "../../api/admin";


const FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "revoked", label: "Revoked" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Failed" },
];

export default function ToolRequests() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("pending");
  const [actingOn, setActingOn] = useState(null); // request id currently being approved/rejected

  function load(currentFilter) {
    setLoading(true);
    fetchToolRequests(currentFilter || undefined)
      .then(({ data }) => setRequests(Array.isArray(data) ? data : []))
      .catch((err) => setError(extractErrorMessage(err, "Could not load tool requests.")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleApprove(req) {
    setActingOn(req.id);
    try {
      const { data } = await approveToolRequest(req.id);
      if (data.status === "approved") {
        toast.success(`Approved — ${data.provisioning_message || "access granted"}`);
      } else {
        toast.error(data.provisioning_message || "Approval did not complete as expected.");
      }
      load(filter);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not approve this request."));
      load(filter);
    } finally {
      setActingOn(null);
    }
  }

  async function handleReject(req) {
    setActingOn(req.id);
    try {
      await rejectToolRequest(req.id);
      toast.success("Request rejected.");
      load(filter);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not reject this request."));
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 18 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h1>Tool Access Requests</h1>
          <p>Review employee requests for tool access. Approving a tool with an automated connector (e.g. GitHub) grants real access immediately.</p>
        </div>
      </div>

      <div className="row-actions" style={{ marginBottom: 14, gap: 6 }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`btn btn-sm ${filter === f.value ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="top-align-error">{error}</div>}

      <div className="card">
        {loading ? (
          <PageLoading />
        ) : requests.length === 0 ? (
          <EmptyState
            title="No requests here"
            description="There are no tool access requests matching this filter."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Tool</th>
                  <th>Identifier</th>
                  <th>Reason</th>
                  <th>Requested</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="cell-name">{r.employee_name}</div>
                      <div className="cell-muted">{r.employee_email}</div>
                    </td>
                    <td className="cell-name">{r.tool_name}</td>
                    <td className="cell-muted">{r.identifier || "—"}</td>
                    <td className="cell-muted" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.reason || "—"}
                    </td>
                    <td className="cell-muted">
                      {r.requested_at ? new Date(r.requested_at).toLocaleString() : "—"}
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                      {r.provisioning_message && r.status !== "pending" && (
                        <div className="cell-muted" style={{ marginTop: 4, maxWidth: 220 }}>
                          {r.provisioning_message}
                        </div>
                      )}
                    </td>
                                        <td>
                      {r.status === "pending" && (
                        <div className="row-actions">
                          <LoadingButton
                            className="btn btn-primary btn-sm"
                            loading={actingOn === r.id}
                            onClick={() => handleApprove(r)}
                          >
                            Approve
                          </LoadingButton>
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={actingOn === r.id}
                            onClick={() => handleReject(r)}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {r.status === "approved" && (
                        <LoadingButton
                          className="btn btn-danger btn-sm"
                          loading={actingOn === r.id}
                          onClick={() => handleRevoke(r)}
                        >
                          Revoke
                        </LoadingButton>
                      )}
                      {r.status !== "pending" && r.status !== "approved" && (
                        <span className="text-muted" style={{ fontSize: 12 }}>
                          {r.reviewed_at ? `Reviewed ${new Date(r.reviewed_at).toLocaleDateString()}` : "—"}
                        </span>
                      )}
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

  async function handleRevoke(req) {
    setActingOn(req.id);
    try {
      const { data } = await revokeToolRequest(req.id);
      toast.success(`Revoked — ${data.provisioning_message || "access removed"}`);
      load(filter);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not revoke this request."));
    } finally {
      setActingOn(null);
    }
  }
}
