import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { extractErrorMessage } from "../api/axios";
import LoadingButton from "../components/LoadingButton";
import { landingPathFor } from "../components/RouteGuards";

// Sample checklist used only for the preview panel — completed/total drive
// both the "x of y" label and the progress bar, so they can never drift apart.
const PREVIEW_CHECKLIST = {
  completed: 9,
  total: 15,
  items: [
    { label: "Complete Personal Details Form", done: true },
    { label: "Upload Identity Documents", done: true },
    { label: "Request GitHub & VPN Access", done: false },
    { label: "Ask AI about leave policy", done: false },
  ],
};

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const percent = Math.round((PREVIEW_CHECKLIST.completed / PREVIEW_CHECKLIST.total) * 100);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const me = await login({ email, password });
      toast.success("Welcome back!");
      navigate(landingPathFor(me), { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err, "Invalid email or password."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="kf-auth">
      <style>{AUTH_CSS}</style>

      <div className="kf-bg-orb kf-bg-orb-1" />
      <div className="kf-bg-orb kf-bg-orb-2" />

      <div className="kf-card">
        <section className="kf-left">
          <div className="kf-brand">
            <div className="kf-logo">OB</div>
            <span>Onboarding Buddy</span>
          </div>

          <h1>Welcome back</h1>
          <p className="kf-sub">Continue your checklist, tool access, and AI onboarding help.</p>

          {error && <div className="top-align-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Work email</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            <LoadingButton type="submit" className="btn btn-primary btn-block kf-login-btn" loading={loading}>
              Log in
            </LoadingButton>
          </form>

          <p className="kf-foot">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </section>

        <section className="kf-right">
          <div className="kf-right-content">
            <p className="kf-right-kicker">Employee Onboarding Platform</p>
            <h2>Guided setup for every new hire</h2>
            <p className="kf-right-sub">
              Role-based checklists, team tool access, and an AI assistant trained on company documents.
            </p>

            <div className="kf-mock" aria-hidden="true">
              <div className="kf-mock-top">
                <span className="kf-dot" />
                <span className="kf-dot" />
                <span className="kf-dot" />
                <span className="kf-mock-title">Onboarding overview</span>
              </div>

              <div className="kf-mock-body">
                <div className="kf-mock-row">
                  <div>
                    <div className="kf-mock-label">Checklist progress</div>
                    <div className="kf-mock-value">
                      {PREVIEW_CHECKLIST.completed} of {PREVIEW_CHECKLIST.total} complete
                    </div>
                  </div>
                  <div className="kf-mock-percent">{percent}%</div>
                </div>
                <div className="kf-mock-bar">
                  <div className="kf-mock-bar-fill" style={{ width: `${percent}%` }} />
                </div>

                <div className="kf-mock-list">
                  {PREVIEW_CHECKLIST.items.map((item) => (
                    <div className={`kf-mock-item ${item.done ? "done" : ""}`} key={item.label}>
                      <span className="kf-check">{item.done ? "✓" : ""}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const AUTH_CSS = `
.kf-auth {
  position: relative;
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  padding: 32px 24px;
  background: var(--color-bg, #f4f6f9);
  overflow: hidden;
}
.kf-bg-orb { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.55; pointer-events: none; }
.kf-bg-orb-1 { width: 460px; height: 460px; top: -160px; left: -140px; background: var(--color-primary-100, #dbe6f6); }
.kf-bg-orb-2 { width: 420px; height: 420px; bottom: -180px; right: -120px; background: #e3e8f7; }

.kf-card {
  position: relative;
  width: 100%; max-width: 960px;
  display: grid; grid-template-columns: 1fr 1fr;
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #e1e5eb);
  border-radius: var(--radius-lg, 14px);
  box-shadow: var(--shadow-pop, 0 12px 32px rgba(20,30,50,0.14));
  overflow: hidden;
}
@media (max-width: 860px) {
  .kf-card { grid-template-columns: 1fr; max-width: 440px; }
}

.kf-left { padding: 44px 44px 36px; display: flex; flex-direction: column; justify-content: center; }
@media (max-width: 520px) { .kf-left { padding: 36px 26px 30px; } }

.kf-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 30px; font-weight: 700; font-size: 14.5px; color: var(--color-text, #1b2431); }
.kf-logo {
  width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
  background: var(--color-primary, #29508c); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 13px;
}

.kf-left h1 { font-size: 25px; letter-spacing: -0.01em; margin-bottom: 8px; }
.kf-sub { color: var(--color-text-muted, #667085); font-size: 13.8px; line-height: 1.55; margin-bottom: 26px; }

.kf-login-btn { margin-top: 4px; padding: 11px 16px; font-size: 14px; }

.kf-foot { margin-top: 20px; text-align: center; font-size: 13.3px; color: var(--color-text-muted, #667085); }
.kf-foot a { font-weight: 600; }

.kf-right {
  position: relative;
  padding: 44px 40px;
  display: flex; align-items: center;
  background: linear-gradient(160deg, var(--color-primary-700, #17315a) 0%, var(--color-primary, #29508c) 60%, #2c2160 130%);
  color: #fff;
  overflow: hidden;
}
.kf-right::before {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(340px 260px at 85% 8%, rgba(255,255,255,0.14), transparent 60%);
  pointer-events: none;
}
.kf-right-content { position: relative; z-index: 1; }

.kf-right-kicker {
  display: inline-flex; font-size: 11.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: #cfe0fb; margin-bottom: 12px;
}
.kf-right h2 { font-size: 23px; line-height: 1.28; color: #fff; margin-bottom: 10px; letter-spacing: -0.01em; }
.kf-right-sub { font-size: 13.6px; line-height: 1.6; color: rgba(255,255,255,0.78); margin-bottom: 28px; max-width: 360px; }

.kf-mock {
  background: rgba(255,255,255,0.97);
  border-radius: var(--radius-md, 10px);
  box-shadow: 0 16px 40px rgba(10, 15, 35, 0.28);
  overflow: hidden;
  color: var(--color-text, #1b2431);
}
.kf-mock-top {
  display: flex; align-items: center; gap: 6px;
  padding: 12px 14px; border-bottom: 1px solid var(--color-border, #e1e5eb);
  background: var(--color-surface-alt, #f9fafb);
}
.kf-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-border-strong, #cbd2dc); }
.kf-mock-title { margin-left: 6px; font-size: 12px; font-weight: 600; color: var(--color-text-muted, #667085); }

.kf-mock-body { padding: 18px 18px 20px; }
.kf-mock-row { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 10px; }
.kf-mock-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-faint, #98a2b3); margin-bottom: 3px; }
.kf-mock-value { font-size: 13.6px; font-weight: 700; }
.kf-mock-percent { font-size: 15px; font-weight: 800; color: var(--color-primary-600, #1f3f72); }

.kf-mock-bar { height: 6px; border-radius: 999px; background: var(--color-primary-50, #eef3fb); overflow: hidden; margin-bottom: 16px; }
.kf-mock-bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--color-primary-400, #4472c4), var(--color-primary, #29508c)); }

.kf-mock-list { display: flex; flex-direction: column; gap: 10px; }
.kf-mock-item { display: flex; align-items: center; gap: 10px; font-size: 12.8px; color: var(--color-text, #1b2431); }
.kf-mock-item.done { color: var(--color-text-muted, #667085); }
.kf-check {
  width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
}
.kf-mock-item.done .kf-check { background: var(--color-success-bg, #e7f6ee); color: var(--color-success, #0f7a52); }
.kf-mock-item:not(.done) .kf-check { border: 1.5px solid var(--color-border-strong, #cbd2dc); }

@media (max-width: 860px) {
  .kf-right { display: none; }
}
`;