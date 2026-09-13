import { Link, useLocation, useNavigate } from "react-router-dom";
import { colors } from "./theme";

// ---- One shared sidebar config per role. ----
// Add new pages here and they show up in that role's sidebar automatically.
const ROLE_LINKS = {
  admin: {
    label: "SchoolOS · Admin",
    links: [
      { to: "/admin", label: "Dashboard" },
      { to: "/admin/students", label: "Students" },
    ],
  },
  teacher: {
    label: "SchoolOS · Teacher",
    links: [
      { to: "/teacher", label: "Dashboard" },
      { to: "/teacher/marks", label: "Upload Marks" },
      { to: "/teacher/lesson-plan", label: "Lesson Plan" },
      { to: "/teacher/timetable", label: "Timetable" },
      { to: "/teacher/attendance", label: "Attendance" },
      { to: "/teacher/weekly-report", label: "Weekly Report" },
    ],
  },
  classTeacher: {
    label: "SchoolOS · Class Teacher",
    links: [
      { to: "/class-teacher", label: "Report Compilation" },
    ],
  },
  parent: {
    label: "SchoolOS · Parent",
    links: [
      { to: "/parent", label: "Dashboard" },
      { to: "/parent/announcements", label: "Announcements" },
      { to: "/parent/results", label: "Results" },
      { to: "/parent/payment-status", label: "Payment Status" },
      { to: "/parent/receipts", label: "Receipts" },
    ],
  },
  bursar: {
    label: "SchoolOS · Bursar",
    links: [
      { to: "/bursar", label: "Dashboard" },
      { to: "/bursar/capture-money", label: "Capture Money" },
      { to: "/bursar/pupil-details", label: "Pupil Details" },
      { to: "/bursar/records", label: "Records" },
      { to: "/bursar/update-status", label: "Update Status" },
    ],
  },
};

// ---- Wrap any page in this to get the sidebar + consistent background. ----
// Usage: <Layout role="teacher"> ...page content... </Layout>
export default function Layout({ role, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const config = ROLE_LINKS[role];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: colors.background }}>
      <div
        style={{
          width: 220,
          background: colors.primary,
          padding: "20px 0",
          display: "flex",
          flexDirection: "column",
          fontFamily: "sans-serif",
        }}
      >
        <Link to="/" style={{ color: "white", fontWeight: 700, fontSize: 16, padding: "0 20px", marginBottom: 24, textDecoration: "none" }}>
          {config.label}
        </Link>
        {config.links.map((link) => {
          const active = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              style={{
                padding: "10px 20px",
                color: active ? "white" : "#B9CBD6",
                background: active ? colors.primaryDark : "transparent",
                textDecoration: "none",
                fontSize: 14,
                borderLeft: active ? "3px solid " + colors.accent : "3px solid transparent",
              }}
            >
              {link.label}
            </Link>
          );
        })}
        <Link to="/" style={{ marginTop: "auto", padding: "10px 20px", color: "#8AA3B3", fontSize: 13, textDecoration: "none" }}>
          ← Switch role
        </Link>

        <ProfileSection role={role} config={config} onLogout={() => navigate(`/login/${role}`)} />
      </div>
      <div style={{ flex: 1, padding: "32px 24px" }}>{children}</div>
    </div>
  );
}

// ---- Sidebar profile block, shown on every page since it lives in Layout. ----
// Name/avatar are placeholders until real auth exists — once login is
// connected, swap "You" and the initial for the logged-in user's actual
// name pulled from the session.
function ProfileSection({ role, config, onLogout }) {
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
      <Link to={`/profile/${role}`} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, textDecoration: "none" }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: colors.accent,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {config.label.charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "white", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            You
          </div>
          <div style={{ color: "#8AA3B3", fontSize: 12 }}>{config.label.replace("SchoolOS · ", "")}</div>
        </div>
      </Link>
      <button
        onClick={onLogout}
        title="Log out"
        style={{ background: "none", border: "none", color: "#8AA3B3", cursor: "pointer", fontSize: 12, padding: 4 }}
      >
        ⏻
      </button>
    </div>
  );
}

// ---- Reusable placeholder for pages not built out yet. ----
export function PagePlaceholder({ title, description }) {
  return (
    <div style={{ maxWidth: 640, fontFamily: "sans-serif" }}>
      <h1 style={{ color: colors.primary }}>{title}</h1>
      <p style={{ color: colors.textSecondary }}>{description}</p>
      <div
        style={{
          marginTop: 24,
          padding: 40,
          background: colors.surface,
          border: `1px dashed ${colors.border}`,
          borderRadius: 10,
          textAlign: "center",
          color: colors.textSecondary,
        }}
      >
        This page's UI is coming next — layout and design are set, functionality to follow.
      </div>
    </div>
  );
}
