import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { AUTH_CONFIG } from "./authConfig";
import "./Login.css";

const API_URL = "http://localhost:5000";

// Roles that log in with the email + password made in "Create Teacher".
// Left side  = the role in the page URL (must match AUTH_CONFIG keys)
// Right side = the portal Flask expects ("teacher" or "bursar")
const TEACHER_LOGIN_ROLES = {
  teacher: "teacher",
  "class-teacher": "teacher", // a class teacher is also a teacher in the database
  bursar: "bursar",
};

// One 3D hexagon: the wrapper carries the drop-shadow,
// the inner span is cut with clip-path.
function Hex({ className }) {
  return (
      <span className={`lg-hex-wrap ${className}`} aria-hidden="true">
      <span className="lg-hex" />
    </span>
  );
}

export default function Login() {
  const { role } = useParams();
  const navigate = useNavigate();
  const config = AUTH_CONFIG[role];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!config) {
    return <p className="lg-unknown">Unknown role: {role}</p>;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const portal = TEACHER_LOGIN_ROLES[role];

    // ===== REAL LOGIN: teacher, class teacher, bursar =====
    if (portal) {
      try {
        const res = await fetch(`${API_URL}/api/auth/teacher/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: portal,
            email: email.trim(),
            password,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || "Invalid email or password");
        }

        // the class teacher portal is only for real class teachers.
        // The SERVER decides this (data.isClassTeacher), not the frontend.
        if (role === "class-teacher" && !data.isClassTeacher) {
          throw new Error(
              "This account is not a class teacher. Use the Teacher login instead."
          );
        }

        // clear anything left from a previous login first
        localStorage.clear();

        // keep the token + teacher details for the dashboard
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("isClassTeacher", String(Boolean(data.isClassTeacher)));
        localStorage.setItem("classes", JSON.stringify(data.classes || []));

        navigate(config.dashboard);
      } catch (err) {
        // "Failed to fetch" = Flask is off or CORS is blocking the request
        setError(
            err.message === "Failed to fetch"
                ? "Cannot reach the server. Please try again."
                : err.message
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // ===== OTHER ROLES: still simulated until their backend is ready =====
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSubmitting(false);
    navigate(config.dashboard);
  }

  return (
      <div className="login-page">
        {/* page background: soft bubbles + floating hexagons */}
        <span className="lg-bubble lg-bubble--1" aria-hidden="true" />
        <span className="lg-bubble lg-bubble--2" aria-hidden="true" />
        <span className="lg-bubble lg-bubble--3" aria-hidden="true" />
        <Hex className="lg-hex-wrap--bg1" />
        <Hex className="lg-hex-wrap--bg2" />

        <div className="lg-card">
          {/* ============ LEFT: BRAND PANEL ============ */}
          <section className="lg-brand-panel">
            <div className="lg-logo">
              <Hex className="lg-hex-wrap--logo" />
              <span className="lg-logo-text">SchoolOS</span>
            </div>

            <div className="lg-art" aria-hidden="true">
              <span className="lg-blob" />
              <Hex className="lg-hex-wrap--main" />
              <Hex className="lg-hex-wrap--yellow" />
              <Hex className="lg-hex-wrap--small" />
            </div>

            <div className="lg-brand-copy">
              <h2>Run your whole school from one place</h2>
              <p>Students, teachers, fees and results, kept together and always up to date.</p>
            </div>

            <p className="lg-copyright">© {new Date().getFullYear()} SchoolOS</p>
          </section>

          {/* ============ RIGHT: FORM PANEL ============ */}
          <section className="lg-form-panel">
            <form className="lg-form" onSubmit={handleSubmit}>
              <h1 className="lg-title">{config.label} Login</h1>
              <p className="lg-subtitle">Sign in to continue to your dashboard.</p>

              {config.singleAccount && (
                  <p className="lg-note">
                    This role allows only one account. If you're the{" "}
                    {config.label.toLowerCase()} and can't get in, use{" "}
                    <Link to={`/account-recovery/${role}`}>account recovery</Link>.
                  </p>
              )}

              <label className="lg-label" htmlFor="lg-email">Email</label>
              <input
                  id="lg-email"
                  className="lg-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
              />

              <label className="lg-label" htmlFor="lg-password">Password</label>
              <div className="lg-input-wrap">
                <input
                    id="lg-password"
                    className="lg-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                />
                <button
                    type="button"
                    className="lg-eye"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              <button type="submit" className="lg-submit" disabled={submitting}>
                {submitting ? "Logging in..." : "Log in"}
              </button>

              {error && (
                  <p className="lg-error" role="alert">
                    {error}
                  </p>
              )}

              {config.allowSignup && (
                  <p className="lg-footer-text">
                    Don't have an account? <Link to={`/signup/${role}`}>Sign up</Link>
                  </p>
              )}

              <p className="lg-back">
                <Link to="/roles">← Choose a different portal</Link>
              </p>
            </form>
          </section>
        </div>
      </div>
  );
}