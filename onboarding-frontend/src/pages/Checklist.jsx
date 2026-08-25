import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMyChecklist, completeChecklistItem } from "../api/checklist";
import { extractErrorMessage } from "../api/axios";
import { useToast } from "../context/ToastContext";
import { PageLoading } from "../components/Modal";
import ProgressBar from "../components/ProgressBar";
import EmptyState from "../components/EmptyState";
import ChecklistItemDrawer from "../components/ChecklistItemDrawer";
import { IconChat } from "../components/Icons";

export default function Checklist() {
  const toast = useToast();
  const navigate = useNavigate();

  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingIds, setPendingIds] = useState(new Set());
  const [openItemId, setOpenItemId] = useState(null);

  function load() {
    setLoading(true);
    fetchMyChecklist()
      .then(({ data }) => setChecklist(data))
      .catch((err) => setError(extractErrorMessage(err, "Could not load your checklist.")))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  // Sort items by their backend `order` first, then group into categories by
  // first appearance in that sorted list. Category *names* are intentionally
  // never alphabetized — whichever category contains the lowest `order`
  // items appears first (e.g. "Documentation" before "IT" or "Access").
  const grouped = useMemo(() => {
    if (!checklist?.items) return [];
    const sortedItems = checklist.items.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const map = new Map();
    for (const item of sortedItems) {
      const cat = item.category || "General";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(item);
    }
    return Array.from(map.entries());
  }, [checklist]);

  // The drawer needs the live item object (not a stale snapshot) so it reflects
  // completion state immediately after marking complete.
  const openItem = useMemo(
    () => checklist?.items?.find((i) => i.id === openItemId) || null,
    [checklist, openItemId]
  );

  async function toggleComplete(item) {
    if (item.is_completed || pendingIds.has(item.id)) return;
    setPendingIds((prev) => new Set(prev).add(item.id));
    // Optimistic update
    setChecklist((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((i) => (i.id === item.id ? { ...i, is_completed: true } : i));
      const completed_items = items.filter((i) => i.is_completed).length;
      const progress_percent = prev.total_items ? (completed_items / prev.total_items) * 100 : 0;
      return { ...prev, items, completed_items, progress_percent };
    });
    try {
      await completeChecklistItem(item.id);
      toast.success(`Marked "${item.title}" complete`);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not mark that item complete."));
      load(); // revert via fresh fetch
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  function handleAskAi(item) {
    setOpenItemId(null);
    navigate("/chat", {
      state: { prefill: `Help me complete this onboarding step: ${item.title}` },
    });
  }

  if (loading) return <PageLoading />;

  if (error) {
    return (
      <div className="card card-pad">
        <div className="top-align-error" style={{ marginBottom: 0 }}>{error}</div>
      </div>
    );
  }

  if (!checklist || !checklist.items?.length) {
    return (
      <div className="card">
        <EmptyState
          title="No checklist yet"
          description="Your onboarding checklist hasn't been set up yet. Check back soon or reach out to your admin."
        />
      </div>
    );
  }

  return (
    <div>
      <div className="section-head">
        <h1>{checklist.title}</h1>
        {checklist.description && <p>{checklist.description}</p>}
      </div>

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <div className="flex-between" style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {checklist.completed_items} of {checklist.total_items} complete
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate("/chat")}>
            <IconChat width={14} height={14} /> Ask the AI assistant
          </button>
        </div>
        <ProgressBar percent={checklist.progress_percent} />
      </div>

      {grouped.map(([category, items]) => (
        <div className="checklist-group" key={category}>
          <div className="checklist-group-title">{category}</div>
          {items.map((item) => (
            <div
              key={item.id}
              className={`checklist-item clickable ${item.is_completed ? "completed" : ""}`}
              onClick={() => setOpenItemId(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpenItemId(item.id);
                }
              }}
            >
              <button
                type="button"
                className={`check-circle ${item.is_completed ? "checked" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!item.is_completed) setOpenItemId(item.id);
                }}
                disabled={item.is_completed}
                aria-label={item.is_completed ? "Completed" : "Open to mark complete"}
              >
                {item.is_completed && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
              <div className="checklist-item-body">
                <div className="checklist-item-title">
                  {item.title}
                  {item.is_mandatory && <span className="badge-mandatory">Required</span>}
                </div>
                {item.description && <div className="checklist-item-desc">{item.description}</div>}
              </div>
              {!item.is_completed && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenItemId(item.id);
                  }}
                >
                  Mark complete
                </button>
              )}
            </div>
          ))}
        </div>
      ))}

      <ChecklistItemDrawer
        item={openItem}
        open={Boolean(openItem)}
        onClose={() => setOpenItemId(null)}
        onComplete={toggleComplete}
        completing={openItem ? pendingIds.has(openItem.id) : false}
        onAskAi={handleAskAi}
      />
    </div>
  );
}
