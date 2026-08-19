import { IconClose } from "./Icons";
import LoadingButton from "./LoadingButton";

export function Modal({ title, onClose, children, footer, width }) {
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal-card" style={width ? { maxWidth: width } : undefined}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <IconClose width={16} height={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({ title = "Are you sure?", message, confirmLabel = "Delete", danger = true, loading, onConfirm, onClose }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <LoadingButton
            className={danger ? "btn btn-danger" : "btn btn-primary"}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </LoadingButton>
        </>
      }
    >
      <p style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.55 }}>{message}</p>
    </Modal>
  );
}

export function PageLoading() {
  return (
    <div className="page-loading">
      <span className="spinner spinner-dark" style={{ width: 26, height: 26, borderWidth: 3 }} />
    </div>
  );
}
