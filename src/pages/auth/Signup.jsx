import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { colors } from "../../theme";
import { AUTH_CONFIG } from "./authConfig";

export default function Signup() {
  const { role } = useParams();
  const navigate = useNavigate();
  const config = AUTH_CONFIG[role];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!config || !config.allowSignup) {
    return (
      <div style={{ padding: 40, fontFamily: "sans-serif", textAlign: "center" }}>
        <p style={{ color: colors.textSecondary }}>Signup isn't available for this role.</p>
        <Link to="/" style={{ color: colors.accent }}>← Back to portals</Link>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    // ---- Ready to enable once the backend is live. ----
    // const res = await fetch("http://localhost:5000/api/auth/signup", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ role, name, email, password }),
    // });

    await new Promise((resolve) => setTimeout(resolve, 400)); // simulated
    setSubmitting(false);
    navigate(`/login/${role}`);
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.background, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <form
        onSubmit={handleSubmit}
        style={{ width: 340, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 28 }}
      >
        <p style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 2 }}>SchoolOS</p>
        <h2 style={{ color: colors.primary, marginTop: 0 }}>{config.label} Sign up</h2>

        <label style={labelStyle}>
          Full name
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} required />
        </label>
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
          {submitting ? "Creating account..." : "Sign up"}
        </button>

        <p style={{ fontSize: 13, color: colors.textSecondary, marginTop: 16, textAlign: "center" }}>
          Already have an account? <Link to={`/login/${role}`} style={{ color: colors.accent }}>Log in</Link>
        </p>
      </form>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 13, color: colors.textSecondary, marginBottom: 12 };
const inputStyle = { width: "100%", padding: "8px 10px", marginTop: 4, border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" };