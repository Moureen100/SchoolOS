import { useNavigate } from "react-router-dom";
import { colors } from "../theme";

// ---- Landing page: pick which role's portal to enter. ----
// Once real login/auth exists, this gets replaced by auto-routing
// based on the logged-in user's role — this is a stand-in for now.
// Class Teacher is deliberately separate from Teacher: only class
// teachers should reach it, not the general teacher pool.
export default function RoleSelect() {
  const navigate = useNavigate();

  const roles = [
    { key: "admin", title: "Admin", description: "Manage students and school records." },
    { key: "teacher", title: "Teacher", description: "Marks, lesson plans, timetable, attendance." },
    { key: "class-teacher", title: "Class Teacher", description: "Compile class reports, grading, position." },
    { key: "parent", title: "Parent", description: "Results, announcements, payments." },
    { key: "bursar", title: "Bursar", description: "Fees, payments, pupil records." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: colors.background, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 760 }}>
        <h1 style={{ color: colors.primary, textAlign: "center" }}>SchoolOS</h1>
        <p style={{ color: colors.textSecondary, textAlign: "center", marginBottom: 32 }}>
          Choose a portal to continue.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {roles.map((role) => (
            <button
              key={role.key}
              onClick={() => navigate(`/login/${role.key}`)}
              style={{
                textAlign: "left",
                padding: 20,
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "sans-serif",
              }}
            >
              <div style={{ color: colors.primary, fontWeight: 600, fontSize: 16 }}>{role.title}</div>
              <div style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>{role.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
