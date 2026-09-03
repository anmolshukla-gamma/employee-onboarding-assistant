import { useEffect, useMemo, useState } from "react";
import { fetchMyAccess, fetchMyToolRequests, requestToolAccess } from "../api/access";
import { useAuth } from "../context/AuthContext";
import { extractErrorMessage } from "../api/axios";
import { PageLoading } from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { IconKey, IconExternalLink, IconBookOpen } from "../components/Icons";

/** Safely normalize guide_text: null/empty are both valid, non-strings are ignored. */
function hasGuide(text) {
  return typeof text === "string" && text.trim().length > 0;
}


const STATUS_LABEL = {
  pending: "Pending approval",
  approved: "Access granted",
  revoked: "Access revoked",
  rejected: "Rejected",
  failed: "Provisioning failed - contact admin",
};

const STATUS_CLASS = {
  pending: "badge-pending",
  approved: "badge-success",
  revoked: "badge-danger",
  rejected: "badge-danger",
  failed: "badge-danger",
};

function ToolCard({ tool, request, onRequested }) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const guide = hasGuide(tool.guide_text);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      await requestToolAccess({
        tool_id: tool.tool_id,
        identifier: identifier.trim() || user?.email || null,
        reason: reason.trim() || null,
      });
      setShowForm(false);
      onRequested();
    } catch (err) {
      setFormError(extractErrorMessage(err, "Could not submit the request."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card card-pad" style={{ marginBottom: 12 }}>
      <div className="flex-between" style={{ alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="checklist-item-title" style={{ fontSize: 14.5 }}>
            {tool.name}
            {tool.is_mandatory && <span className="badge-mandatory">Required</span>}
          </div>
          {tool.category && <div className="text-muted" style={{ fontSize: 12, marginTop: 3 }}>{tool.category}</div>}
          {tool.description && (
            <div className="checklist-item-desc" style={{ marginTop: 6 }}>{tool.description}</div>
          )}
        </div>

                <div style={{ flexShrink: 0, textAlign: "right" }}>
          {request && (
            <span className={"badge " + (STATUS_CLASS[request.status] || "")}>
              {STATUS_LABEL[request.status] || request.status}
            </span>
          )}
            {(!request || request.status === "failed" || request.status === "rejected" || request.status === "revoked") && (
            <div style={{ marginTop: request ? 6 : 0 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowForm((v) => !v)}
              >
                <IconKey width={13} height={13} />
                {request ? "Try Again" : "Request Access"}
              </button>
            </div>
          )}
          {/* {tool.request_url && (
            <div style={{ marginTop: 6 }}>
              
               <a href={tool.request_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
              >
                Manual portal <IconExternalLink width={13} height={13} />
              </a>
            </div>
          )} */}
        </div>
      </div>

      {showForm && (!request || request.status === "failed" || request.status === "rejected" || request.status === "revoked") && (
        <form onSubmit={handleSubmit} className="drawer-guide" style={{ marginTop: 12 }}>
          {(tool.provider_key === "jira" || tool.provider_key === "aws") ? (
            <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(37, 99, 235, 0.06)", borderLeft: "3px solid #2563eb", borderRadius: 4, fontSize: 12.5, color: "#1e293b" }}>
              📧 Account Email: <strong>{user?.email}</strong> <span style={{ color: "#64748b" }}>(automatically linked from your profile)</span>
            </div>
          ) : (
            <div className="field" style={{ marginBottom: 10 }}>
              <label className="text-muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                {tool.provider_key === "github"
                  ? "GitHub Username (optional)"
                  : "Account username or identifier (optional)"}
              </label>
              <input
                className="input"
                style={{ width: "100%" }}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={
                  tool.provider_key === "github"
                    ? `Leave blank to invite profile email (${user?.email || "your email"})`
                    : `Leave blank to use profile email (${user?.email || "your email"})`
                }
              />
              {tool.provider_key === "github" && (
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, lineHeight: 1.4 }}>
                  💡 If you have a GitHub account, enter your username for direct team access. Otherwise, leave blank to invite <strong>{user?.email}</strong>.
                </div>
              )}
            </div>
          )}
                    <div className="field" style={{ marginBottom: 12 }}>
            <label className="text-muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
              Reason (optional)
            </label>
            <input
              className="input"
              style={{ width: "100%" }}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you need this?"
            />
          </div>
          {formError && <div className="top-align-error" style={{ marginBottom: 8 }}>{formError}</div>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      )}

      {guide && (
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setExpanded((v) => !v)}
            style={{ paddingLeft: 0 }}
          >
            <IconBookOpen width={13} height={13} />
            {expanded ? "Hide setup guide" : "Show setup guide"}
          </button>
          {expanded && <div className="drawer-guide" style={{ marginTop: 8 }}>{tool.guide_text}</div>}
        </div>
      )}
    </div>
  );
}

export default function MyAccess() {
  const [access, setAccess] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function loadRequests() {
    return fetchMyToolRequests()
      .then(({ data }) => setRequests(Array.isArray(data) ? data : []))
      .catch(() => setRequests([]));
  }

  useEffect(() => {
    Promise.all([
      fetchMyAccess().then(({ data }) => setAccess(data)),
      loadRequests(),
    ])
      .catch((err) => setError(extractErrorMessage(err, "Could not load your access list.")))
      .finally(() => setLoading(false));
  }, []);

  const tools = useMemo(() => (Array.isArray(access?.tools) ? access.tools : []), [access]);
  const sortedTools = useMemo(
    () => tools.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [tools]
  );

  // latest request per tool_id (most recent first, since backend already orders by requested_at desc)
  const requestByTool = useMemo(() => {
    const map = {};
    for (const r of requests) {
      if (!map[r.tool_id]) map[r.tool_id] = r;
    }
    return map;
  }, [requests]);

  if (loading) return <PageLoading />;

  if (error) {
    return (
      <div className="card card-pad">
        <div className="top-align-error" style={{ marginBottom: 0 }}>{error}</div>
      </div>
    );
  }

  if (!access?.team_id) {
    return (
      <div>
        <div className="section-head">
          <h1>My Access</h1>
          <p>Tools and systems assigned to your team.</p>
        </div>
        <div className="card">
          <EmptyState
            title="No team assigned yet"
            description="You haven't been assigned to a team, so there are no tools to show yet. Your manager or an admin can assign you to one."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-head">
        <h1>My Access</h1>
        <p>
          <IconKey width={14} height={14} style={{ verticalAlign: -2, marginRight: 5 }} />
          Team: <strong>{access.team_name}</strong>
        </p>
      </div>

      {sortedTools.length === 0 ? (
        <div className="card">
          <EmptyState title="No tools mapped yet" description="Your team doesn't have any tools assigned yet. Check back soon." />
        </div>
      ) : (
        sortedTools.map((tool) => (
          <ToolCard
            key={tool.tool_id}
            tool={tool}
            request={requestByTool[tool.tool_id]}
            onRequested={loadRequests}
          />
        ))
      )}
    </div>
  );
}