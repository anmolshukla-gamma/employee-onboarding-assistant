import { useEffect, useMemo, useState } from "react";
import { fetchMyAccess } from "../api/access";
import { extractErrorMessage } from "../api/axios";
import { PageLoading } from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { IconKey, IconExternalLink, IconBookOpen } from "../components/Icons";

/** Safely normalize guide_text: null/empty are both valid, non-strings are ignored. */
function hasGuide(text) {
  return typeof text === "string" && text.trim().length > 0;
}

function ToolCard({ tool }) {
  const [expanded, setExpanded] = useState(false);
  const guide = hasGuide(tool.guide_text);

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
        {tool.request_url && (
          <a
            href={tool.request_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
            style={{ flexShrink: 0 }}
          >
            Request Access <IconExternalLink width={13} height={13} />
          </a>
        )}
      </div>

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyAccess()
      .then(({ data }) => setAccess(data))
      .catch((err) => setError(extractErrorMessage(err, "Could not load your access list.")))
      .finally(() => setLoading(false));
  }, []);

  // Safe against tools being null/undefined/malformed.
  const tools = useMemo(() => (Array.isArray(access?.tools) ? access.tools : []), [access]);
  const sortedTools = useMemo(
    () => tools.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [tools]
  );

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
        sortedTools.map((tool) => <ToolCard key={tool.tool_id} tool={tool} />)
      )}
    </div>
  );
}
