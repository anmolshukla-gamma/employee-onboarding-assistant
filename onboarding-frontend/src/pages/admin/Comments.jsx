import { useEffect, useState } from "react";
import { fetchAdminComments, reviewAdminComment } from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { PageLoading, Modal } from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import LoadingButton from "../../components/LoadingButton";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "resolved", label: "Resolved" },
];

function CommentStatusBadge({ status }) {
  const key = String(status || "pending").toLowerCase();
  return <span className={`status-badge status-comment-${key}`}>{status}</span>;
}

export default function Comments() {
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("approved");
  const [reviewResponse, setReviewResponse] = useState("");
  const [reviewing, setReviewing] = useState(false);

  function load() {
    setLoading(true);
    fetchAdminComments(statusFilter || undefined)
      .then(({ data }) => setComments(Array.isArray(data) ? data : []))
      .catch((err) => setError(extractErrorMessage(err, "Could not load comments.")))
      .finally(() => setLoading(false));
  }

  useEffect(load, [statusFilter]);

  function openReview(c) {
    setReviewTarget(c);
    setReviewStatus(c.status === "pending" ? "approved" : c.status);
    setReviewResponse(c.admin_response || "");
  }

  async function handleReview(e) {
    e.preventDefault();
    if (!reviewTarget) return;
    setReviewing(true);
    try {
      const { data } = await reviewAdminComment(reviewTarget.id, {
        status: reviewStatus,
        admin_response: reviewResponse.trim() || null,
      });
      setComments((prev) => prev.map((c) => (c.id === data.id ? data : c)));
      toast.success("Comment reviewed.");
      setReviewTarget(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save this review."));
    } finally {
      setReviewing(false);
    }
  }

  if (loading && comments.length === 0) return <PageLoading />;

  return (
    <div>
      <div className="section-head">
        <h1>Checklist Feedback</h1>
        <p>Suggestions, issues, and outdated-info reports employees leave on checklist items.</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            className={statusFilter === f.value ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="top-align-error">{error}</div>}

      <div className="card">
        {comments.length === 0 ? (
          <EmptyState title="No comments here" description="Nothing matches this filter right now." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Comment</th>
                  <th>Type</th>
                  <th>Item</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {comments.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="cell-muted mono">{c.user_name || `User #${c.user_id}`}</div>
                    </td>
                    <td style={{ maxWidth: 320 }}>
                      <div style={{ fontSize: 13 }}>{c.comment}</div>
                      {c.admin_response && (
                        <div className="cell-muted" style={{ marginTop: 4, fontSize: 12 }}>
                          Response: {c.admin_response}
                        </div>
                      )}
                    </td>
                    <td className="cell-muted" style={{ textTransform: "capitalize" }}>{c.comment_type}</td>
                    <td>
                    <div className="cell-muted">{c.checklist_item_title || `Item #${c.checklist_item_id}`}</div>
                    </td>
                    <td>
                      <CommentStatusBadge status={c.status} />
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openReview(c)}>
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reviewTarget && (
        <Modal title="Review comment" onClose={() => setReviewTarget(null)}>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 6 }}>{reviewTarget.comment}</p>
          <p className="cell-muted" style={{ fontSize: 12, marginBottom: 18, textTransform: "capitalize" }}>
            {reviewTarget.comment_type} · item #{reviewTarget.checklist_item_id} · user #{reviewTarget.user_id}
          </p>
          <form onSubmit={handleReview}>
            <div className="field">
              <label htmlFor="rv_status">Status</label>
              <select id="rv_status" value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="rv_response">Admin response (optional)</label>
              <textarea
                id="rv_response"
                rows={3}
                value={reviewResponse}
                onChange={(e) => setReviewResponse(e.target.value)}
                placeholder="e.g. Will update the guide"
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setReviewTarget(null)} disabled={reviewing}>
                Cancel
              </button>
              <LoadingButton type="submit" loading={reviewing}>
                Save review
              </LoadingButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
