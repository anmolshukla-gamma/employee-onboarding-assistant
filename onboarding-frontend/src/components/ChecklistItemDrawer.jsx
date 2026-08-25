import { useEffect, useState } from "react";
import LoadingButton from "./LoadingButton";
import ChecklistItemComments from "./ChecklistItemComments";
import { IconClose, IconExternalLink, IconFileText, IconChat } from "./Icons";

/** Safely normalize the resources field: handles null, undefined, and malformed entries. */
function normalizeResources(resources) {
  if (!Array.isArray(resources)) return [];
  return resources
    .filter((r) => r && (r.url || r.label))
    .map((r) => ({
      label: r.label?.trim() || r.url,
      url: r.url,
      type: (r.type || "link").toLowerCase(),
    }));
}

function ResourceIcon({ type }) {
  if (type === "document") return <IconFileText width={15} height={15} />;
  return <IconExternalLink width={15} height={15} />;
}

/**
 * @param {Object} props
 * @param {import("../types/checklist").ChecklistItem} props.item
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(item: import("../types/checklist").ChecklistItem) => void} props.onComplete
 * @param {boolean} props.completing
 * @param {(item: import("../types/checklist").ChecklistItem) => void} [props.onAskAi]
 */
export default function ChecklistItemDrawer({ item, open, onClose, onComplete, completing, onAskAi }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape") {
        if (confirmOpen) setConfirmOpen(false);
        else onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, confirmOpen]);

  // Reset the confirmation state whenever a different item is opened, or
  // once completion actually finishes, so it doesn't linger stale.
  useEffect(() => {
    setConfirmOpen(false);
    setConfirmChecked(false);
  }, [item?.id]);
  useEffect(() => {
    if (!completing) setConfirmOpen(false);
  }, [completing]);

  if (!open || !item) return null;

  const resources = normalizeResources(item.resources);
  const hasGuide = Boolean(item.detailed_guide && item.detailed_guide.trim());

  function handleConfirm() {
    onComplete(item);
  }

  return (
    <div className="drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer-panel" role="dialog" aria-modal="true" aria-label={item.title}>
        <div className="drawer-header">
          <div className="drawer-header-text">
            <div className="checklist-item-title" style={{ fontSize: 16 }}>
              {item.title}
              {item.is_mandatory && <span className="badge-mandatory">Required</span>}
            </div>
            {item.category && <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>{item.category}</div>}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <IconClose width={17} height={17} />
          </button>
        </div>

        <div className="drawer-body">
          {item.is_completed && (
            <div className="drawer-completed-banner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              You've completed this step
            </div>
          )}

          {item.description && (
            <p className="drawer-description">{item.description}</p>
          )}

          <div className="drawer-section">
            <h4 className="drawer-section-title">How to complete this</h4>
            {hasGuide ? (
              <div className="drawer-guide">{item.detailed_guide}</div>
            ) : (
              <p className="text-muted" style={{ fontSize: 13 }}>No step-by-step guide has been added for this item yet.</p>
            )}
          </div>

          <div className="drawer-section">
            <h4 className="drawer-section-title">Resources</h4>
            {resources.length > 0 ? (
              <ul className="resource-list">
                {resources.map((res, i) => (
                  <li key={i}>
                    <a href={res.url} target="_blank" rel="noopener noreferrer" className="resource-link">
                      <ResourceIcon type={res.type} />
                      <span>{res.label}</span>
                      <IconExternalLink width={12} height={12} className="resource-link-external" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted" style={{ fontSize: 13 }}>No resources added yet.</p>
            )}
          </div>

          <ChecklistItemComments itemId={item.id} open={open} />
        </div>

        <div className="drawer-footer">
          {onAskAi && (
            <button className="btn btn-secondary" onClick={() => onAskAi(item)}>
              <IconChat width={14} height={14} /> Ask AI about this task
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {!item.is_completed && (
            <LoadingButton loading={completing} onClick={() => setConfirmOpen(true)}>
              Mark complete
            </LoadingButton>
          )}
        </div>

        {confirmOpen && (
          <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setConfirmOpen(false)}>
            <div className="modal-card" style={{ maxWidth: 420 }}>
              <div className="modal-header">
                <h3>Confirm completion</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setConfirmOpen(false)} aria-label="Close">
                  <IconClose width={16} height={16} />
                </button>
              </div>
              <div className="modal-body">
                <p style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.55, marginBottom: 16 }}>
                  I confirm that I have completed this onboarding step.
                </p>
                <label className="checkbox-row" style={{ alignItems: "flex-start", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={confirmChecked}
                    onChange={(e) => setConfirmChecked(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span>I have completed this task</span>
                </label>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setConfirmOpen(false)} disabled={completing}>
                  Cancel
                </button>
                <LoadingButton loading={completing} disabled={!confirmChecked} onClick={handleConfirm}>
                  Confirm
                </LoadingButton>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
