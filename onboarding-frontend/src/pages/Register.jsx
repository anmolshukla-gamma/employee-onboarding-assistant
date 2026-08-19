import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/auth";
import { useToast } from "../context/ToastContext";
import { extractErrorMessage } from "../api/axios";
import LoadingButton from "../components/LoadingButton";

export default function Register() {
  const toast = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      await register({
        email,
        full_name: fullName,
        password,
      });

      // Registration is complete. User must log in manually.
      toast.success("Account created successfully. Please sign in.");

      navigate("/login", { replace: true });
    } catch (err) {
      setError(
        extractErrorMessage(err, "Could not create your account.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div
            className="sidebar-brand-mark"
            style={{ background: "var(--color-primary)" }}
          >
            OB
          </div>
          <strong>Onboarding Buddy</strong>
        </div>

        <div className="auth-title">Create your account</div>
        <p className="auth-sub">
          Get set up in a couple of minutes.
        </p>

        {error && <div className="top-align-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="full_name">Full name</label>
            <input
              id="full_name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>

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
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />

            <div className="field-hint">
              Use 8 or more characters with a mix of letters and numbers.
            </div>
          </div>

          <LoadingButton
            type="submit"
            className="btn btn-primary btn-block"
            loading={loading}
          >
            Create account
          </LoadingButton>
        </form>

        <div className="auth-foot">
          Already have an account?{" "}
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}