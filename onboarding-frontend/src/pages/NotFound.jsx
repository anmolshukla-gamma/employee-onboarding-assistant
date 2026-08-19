import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="auth-screen">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 34, fontWeight: 800, color: "var(--color-primary)" }}>404</div>
        <p className="auth-sub" style={{ marginTop: 6 }}>That page doesn't exist.</p>
        <Link className="btn btn-primary" to="/">Go home</Link>
      </div>
    </div>
  );
}
