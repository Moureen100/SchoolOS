import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { AUTH_CONFIG } from "./authConfig";
import "./Login.css";
import ParentLoginForm from "../parent/ParentLoginForm"; // Make sure this path correctly points to your ParentLoginForm.jsx

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// Administrator uses separate administrator credentials.
const ADMIN_LOGIN_URL = "/login_admin_account";

// Teacher portals use the existing teacher authentication endpoint.
const TEACHER_LOGIN_ROLES = {
  teacher: "teacher",
  "class-teacher": "teacher",
  bursar: "bursar",
};

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

    if (!API_URL) {
      setError("Backend URL is missing. Check your VITE_API_URL setting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const portal = TEACHER_LOGIN_ROLES[role];

    try {
      // =========================================
      // ADMIN LOGIN
      // Creator email + Administrator password
      // =========================================

      if (role === "admin") {
        const res = await fetch(`${API_URL}${ADMIN_LOGIN_URL}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            creator_email: email.trim().toLowerCase(),
            password: password,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.success || !data.access_token) {
          throw new Error(
            data.message || "Unable to log in. Check your administrator credentials."
          );
        }

        // Save administrator authentication.
        localStorage.clear();

        localStorage.setItem("token", data.access_token);
        localStorage.setItem("role", "admin");

        if (data.school) {
          localStorage.setItem("school", JSON.stringify(data.school));
        }

        navigate(config.dashboard);
        return;
      }

      // =========================================
      // TEACHER / CLASS TEACHER / BURSAR LOGIN
      // =========================================

      if (portal) {
        const res = await fetch(
          `${API_URL}/api/auth/teacher/login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              role: portal,
              portal: role,
              email: email.trim(),
              password,
            }),
          }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || "Invalid email or password.");
        }

        if (!data.token) {
          throw new Error("The server did not return an access token.");
        }

        // Class Teacher validation.
        if (role === "class-teacher" && !data.isClassTeacher) {
          throw new Error(
            "This account is not a class teacher. Use the Teacher login instead."
          );
        }

        // Bursar validation.
        if (
          role === "bursar" &&
          (data.user?.designation || "").trim().toLowerCase() !== "bursar"
        ) {
          throw new Error(
            "This account is not registered as a bursar. Contact your administrator."
          );
        }

        // Save teacher/bursar authentication.
        localStorage.clear();

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user || {}));
        localStorage.setItem("role", role);

        localStorage.setItem(
          "isClassTeacher",
          String(Boolean(data.isClassTeacher))
        );

        localStorage.setItem(
          "classes",
          JSON.stringify(data.classes || [])
        );

        navigate(config.dashboard);
        return;
      }

      // =========================================
      // OTHER ROLES
      // =========================================

      throw new Error("Login is not configured for this portal.");

    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot reach the server. Check the server URL and CORS settings."
          : err.message || "Login failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isAdmin = role === "admin";

  return (
    <div className="login-page">
      <span className="lg-bubble lg-bubble--1" aria-hidden="true" />
      <span className="lg-bubble lg-bubble--2" aria-hidden="true" />
      <span className="lg-bubble lg-bubble--3" aria-hidden="true" />

      <Hex className="lg-hex-wrap--bg1" />
      <Hex className="lg-hex-wrap--bg2" />

      <div className="lg-card">

        {/* LEFT: BRAND PANEL */}

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
            <p>
              Students, teachers, fees and results, kept together and always
              up to date.
            </p>
          </div>

          <p className="lg-copyright">
            © {new Date().getFullYear()} SchoolOS
          </p>
        </section>

        {/* RIGHT: LOGIN FORM */}

        <section className="lg-form-panel">
          {role === "parent" ? (
            <div className="lg-form">
              <h1 className="lg-title">
                {config.label} Login
              </h1>
              <p className="lg-subtitle" style={{ marginBottom: 24 }}>
                Enter your student details and registered phone number to access your portal.
              </p>
              
              <ParentLoginForm />
            </div>
          ) : (
            <form className="lg-form" onSubmit={handleSubmit}>

              <h1 className="lg-title">
                {config.label} Login
              </h1>

              <p className="lg-subtitle">
                {isAdmin
                  ? "Sign in using your administrator account credentials."
                  : "Sign in to continue to your dashboard."}
              </p>

              {config.singleAccount && (
                <p className="lg-note">
                  This role allows only one account. If you're the{" "}
                  {config.label.toLowerCase()} and can't get in, use{" "}
                  <Link to={`/account-recovery/${role}`}>
                    account recovery
                  </Link>.
                </p>
              )}

              <label className="lg-label" htmlFor="lg-email">
                {isAdmin ? "Administrator Email Address" : "Email Address"}
              </label>
              <input
                id="lg-email"
                className="lg-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <label className="lg-label" htmlFor="lg-password">
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="lg-password"
                  className="lg-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 12, top: 12, background: "none", border: "none", color: "rgba(255,255,255,0.4)" }}
                >
                  {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>

              {error && <p style={{ color: "#ffb4a8", fontSize: 14 }}>{error}</p>}

              <button type="submit" disabled={submitting} className="lg-submit-btn" style={{ width: "100%", padding: 13, borderRadius: 999, border: "none", background: "#fbc94a", color: "#0f1538", fontWeight: 700, fontSize: 16, cursor: "pointer", marginTop: 12 }}>
                {submitting ? "Logging in..." : "Log in"}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
