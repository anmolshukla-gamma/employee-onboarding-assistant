import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchAdminComments, reviewAdminComment } from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { PageLoading } from "../../components/Modal";
import LoadingButton from "../../components/LoadingButton";

const OUTCOMES = [
  { value: "approved", label: "Approve", hint: "Valid feedback — track for improvement." },
  { value: "resolved", label: "Resolve", hint: "Issue handled or guide already updated." },
  { value: "rejected", label: "Reject", hint: "Not accurate or not actionable." },
];

export default function ReviewComment() {
  const { commentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const backStatus = searchParams.get("status") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState(null);
  const [outcome, setOutcome] = useState("approved");
  const [response, setResponse] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const buckets = ["", "pending", "approved", "rejected", "resolved"];
        let found = null;

        for (const st of buckets) {
          const { data } = await fetchAdminComments(
            st
              ? { status: st, page: 1, page_size: 100 }
              : { page: 1, page_size: 100 }
          );
          const list = Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data)
            ? data
            : [];
          found = list.find((c) => String(c.id) === String(commentId));
          if (found) break;
        }

        if (cancelled) return;

        if (!found) {
          toast.error("Feedback item not found.");
          navigate("/admin/comments");
          return;
        }

        setComment(found);
        setOutcome(found.status === "pending" ? "approved" : found.status || "approved");
        setResponse(found.admin_response || "");
      } catch (err) {
        if (!cancelled) {
          toast.error(extractErrorMessage(err, "Could not load feedback."));
          navigate("/admin/comments");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [commentId, navigate, toast]);

  const backTo = useMemo(
    () =>
      backStatus
        ? `/admin/comments?status=${encodeURIComponent(backStatus)}`
        : "/admin/comments",
    [backStatus]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!comment) return;

    setSaving(true);
    try {
      await reviewAdminComment(comment.id, {
        status: outcome,
        admin_response: response.trim() || null,
      });
      toast.success("Review saved.");
      navigate(backTo);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save this review."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading />;
  if (!comment) return null;

  return (
    <div className="rv-page">
      <div className="rv-topbar">
        <div>
          <div className="rv-crumbs">
            <Link to="/admin/comments">Feedback</Link>
            <span>/</span>
            <span>Review #{comment.id}</span>
          </div>
          <h1>Decision desk</h1>
        </div>
        <Link to={backTo} className="btn btn-secondary">
          Back to queue
        </Link>
      </div>

      <form className="rv-board" onSubmit={handleSubmit}>
        {/* LEFT: ticket */}
        <section className="rv-ticket">
          <div className="rv-ticket-banner">
            <div>
              <div className="rv-kicker">Employee report</div>
              <div className="rv-type">{comment.comment_type || "feedback"}</div>
            </div>
            <span
              className={`status-badge status-comment-${String(
                comment.status || "pending"
              ).toLowerCase()}`}
            >
              {comment.status || "pending"}
            </span>
          </div>

          <div className="rv-message">
            <p>{comment.comment}</p>
          </div>

          <div className="rv-facts">
            <div className="rv-fact">
              <span>From</span>
              <strong>{comment.user_name || `User #${comment.user_id}`}</strong>
              {comment.user_email && <em>{comment.user_email}</em>}
            </div>
            <div className="rv-fact">
              <span>Checklist item</span>
              <strong>
                {comment.checklist_item_title || `Item #${comment.checklist_item_id}`}
              </strong>
            </div>
            <div className="rv-fact">
              <span>Submitted</span>
              <strong>
                {comment.created_at
                  ? new Date(comment.created_at).toLocaleString()
                  : "—"}
              </strong>
            </div>
          </div>
        </section>

        {/* RIGHT: action rail */}
        <aside className="rv-rail">
  <div className="rv-rail-card">
    <h2>Review</h2>
    <p className="rv-rail-sub">Set the outcome and add an optional note.</p>

    <div className="field">
      <label>Status</label>
      <div className="rv-seg" role="radiogroup" aria-label="Review status">
        {OUTCOMES.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={outcome === o.value}
            className={`rv-seg-btn ${outcome === o.value ? "active" : ""}`}
            onClick={() => setOutcome(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="field-hint">
        {OUTCOMES.find((o) => o.value === outcome)?.hint}
      </div>
    </div>

    <div className="field">
      <label htmlFor="rv_note">Admin note (optional)</label>
      <textarea
        id="rv_note"
        rows={4}
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="What did you check or change?"
      />
    </div>

    <div className="rv-actions">
      <LoadingButton type="submit" className="btn btn-primary btn-block" loading={saving}>
        Save review
      </LoadingButton>
      <Link to={backTo} className="btn btn-secondary btn-block">
        Cancel
      </Link>
    </div>
  </div>
</aside>
      </form>
    </div>
  );
}