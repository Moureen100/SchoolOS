import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { colors } from "../../theme";
import { AUTH_CONFIG } from "./authConfig";

export default function Login() {
  const { role } = useParams();
  const navigate = useNavigate();
  const config = AUTH_CONFIG[role];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!config) {
    return <p style={{ padding: 24, fontFamily: "sans-serif" }}>Unknown role: {role}</p>;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // ---- Ready to enable once the backend is live. ----
    // try {
    //   const res = await fetch("http://localhost:5000/api/auth/login", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ role, email, password }),
    //   });
    //   if (!res.ok) throw new Error("Invalid email or password");
    //   const data = await res.json();
    //   navigate(config.dashboard);
    //   return;
    // } catch (err) {
    //   setError(err.message);
    // } finally {
    //   setSubmitting(false);
    // }

    await new Promise((resolve) => setTimeout(resolve, 400)); // simulated
    setSubmitting(false);
    navigate(config.dashboard);
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.background, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <form
        onSubmit={handleSubmit}
        style={{ width: 340, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 28 }}
      >
        <p style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 2 }}>SchoolOS</p>
        <h2 style={{ color: colors.primary, marginTop: 0 }}>{config.label} Login</h2>

        {config.singleAccount && (
          <p style={{ fontSize: 12, color: colors.textSecondary, background: colors.background, padding: 10, borderRadius: 6, marginBottom: 16 }}>
            This role allows only one account. If you're the {config.label.toLowerCase()} and can't get in, use{" "}
            <Link to={`/account-recovery/${role}`} style={{ color: colors.accent }}>account recovery</Link>.
          </p>
        )}

        <label style={labelStyle}>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
        </label>
        <label style={labelStyle}>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} required />
        </label>

        <button
          type="submit"
          disabled={submitting}
          style={{ width: "100%", marginTop: 8, padding: "10px 16px", background: colors.accent, color: "white", border: "none", borderRadius: 6, fontSize: 15, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? "Logging in..." : "Log in"}
        </button>

        {error && <p style={{ color: colors.warning, fontSize: 13, marginTop: 10 }}>{error}</p>}

        {config.allowSignup && (
          <p style={{ fontSize: 13, color: colors.textSecondary, marginTop: 16, textAlign: "center" }}>
            Don't have an account? <Link to={`/signup/${role}`} style={{ color: colors.accent }}>Sign up</Link>
          </p>
        )}

        <p style={{ fontSize: 13, textAlign: "center", marginTop: 12 }}>
          <Link to="/" style={{ color: colors.textSecondary }}>← Choose a different portal</Link>
        </p>
      </form>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 13, color: colors.textSecondary, marginBottom: 12 };
const inputStyle = { width: "100%", padding: "8px 10px", marginTop: 4, border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" };