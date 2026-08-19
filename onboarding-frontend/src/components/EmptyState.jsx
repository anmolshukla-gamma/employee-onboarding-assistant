import { IconEmpty } from "./Icons";

export default function EmptyState({ title = "Nothing here yet", description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <IconEmpty />
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
