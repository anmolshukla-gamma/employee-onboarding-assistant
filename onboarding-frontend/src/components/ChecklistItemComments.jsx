import { useEffect, useState } from "react";
import { addChecklistItemComment, fetchChecklistItemComments } from "../api/checklist";
import { extractErrorMessage } from "../api/axios";
import { useToast } from "../context/ToastContext";
import LoadingButton from "./LoadingButton";

const TYPE_OPTIONS = [
  { value: "suggestion", label: "Suggestion" },
  { value: "issue", label: "Issue" },
  { value: "outdated", label: "Outdated info" },
];

function CommentStatusBadge({ status }) {
  const key = String(status || "pending").toLowerCase();
  return <span className={`status-badge status-comment-${key}`}>{status}</span>;
}

/**
 * Lets the employee leave a comment/suggestion on a checklist item and see
 * their own past comments (with admin status/response) for that item.
 * @param {{ itemId: number, open: boolean }} props
 */
export default function ChecklistItemComments({ itemId, open }) {
  const toast = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [type, setType] = useState("suggestion");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !itemId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchChecklistItemComments(itemId)
      .then(({ data }) => {
        if (!cancelled) setComments(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(extractErrorMessage(err, "Could not load comments."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [itemId, open]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const { data } = await addChecklistItemComment(itemId, { comment: trimmed, comment_type: type });
      setComments((prev) => [data, ...prev]);
      setText("");
      toast.success("Comment submitted.");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not submit your comment."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="drawer-section">
      <h4 className="drawer-section-title">Comments &amp; Suggestions</h4>

      <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Spot an outdated link, or have a suggestion for this step?"
          style={{
            width: "100%", padding: "9px 12px", border: "1px solid var(--color-border-strong)",
            borderRadius: "var(--radius-sm)", fontSize: 13, fontFamily: "inherit", resize: "vertical",
          }}
        />
        <div className="flex-between" style={{ marginTop: 8 }}>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{
              padding: "7px 10px", border: "1px solid var(--color-border-strong)",
              borderRadius: "var(--radius-sm)", fontSize: 12.5, background: "var(--color-surface)",
            }}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <LoadingButton className="btn btn-primary btn-sm" loading={submitting} disabled={!text.trim()} type="submit">
            Submit
          </LoadingButton>
        </div>
      </form>

      {error && <div className="top-align-error">{error}</div>}

      {!error && loading && <p className="text-muted" style={{ fontSize: 13 }}>Loading comments…</p>}

      {!error && !loading && comments.length === 0 && (
        <p className="text-muted" style={{ fontSize: 13 }}>You haven't left any comments on this item yet.</p>
      )}

      {!error && !loading && comments.length > 0 && (
        <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {comments.map((c) => (
            <li key={c.id} className="card card-pad" style={{ padding: "12px 14px" }}>
              <div className="flex-between" style={{ marginBottom: 6 }}>
                <span className="cell-muted" style={{ fontSize: 11.5, textTransform: "capitalize" }}>{c.comment_type}</span>
                <CommentStatusBadge status={c.status} />
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>{c.comment}</div>
              {c.admin_response && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--color-border)" }}>
                  <div className="cell-muted" style={{ fontSize: 11, fontWeight: 700, marginBottom: 3 }}>ADMIN RESPONSE</div>
                  <div style={{ fontSize: 12.8 }}>{c.admin_response}</div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
