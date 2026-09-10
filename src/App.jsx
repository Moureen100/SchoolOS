import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import StudentForm from "./StudentForm";
import StudentList from "./StudentList";


const colors = {
  primary: "#2C4A5E",
  accent: "#3D8361",
  background: "#F7F8F6",
  surface: "#FFFFFF",
  border: "#E2E5E1",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
};

export default function App() {
  return (
    <BrowserRouter>
      {/* This div gives every page the same colored background and full height */}
      <div style={{ minHeight: "100vh", background: colors.background }}>
        <TopBar />
        <div style={{ padding: "32px 16px" }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<StudentList />} />
            <Route path="/students/new" element={<StudentForm />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

// ---- Simple top navigation bar, shown on every page. ----
function TopBar() {
  return (
    <div
      style={{
        background: colors.primary,
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        gap: 24,
      }}
    >
      <Link to="/" style={{ color: "white", fontWeight: 600, textDecoration: "none", fontFamily: "sans-serif" }}>
        School Admin
      </Link>
      <Link to="/students" style={{ color: "#D7E4EC", textDecoration: "none", fontFamily: "sans-serif", fontSize: 14 }}>
        Students
      </Link>
    </div>
  );
}

// ---- The admin landing page. ----
function Dashboard() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ color: colors.primary }}>Admin Dashboard</h1>
      <p style={{ color: colors.textSecondary }}>Manage students from here.</p>

      <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
        <DashboardCard
          title="Add Student"
          description="Register a new student and guardian."
          onClick={() => navigate("/students/new")}
        />
        <DashboardCard
          title="View Students"
          description="See all students, activate or deactivate."
          onClick={() => navigate("/students")}
        />
      </div>
    </div>
  );
}

function DashboardCard({ title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        textAlign: "left",
        padding: 20,
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        cursor: "pointer",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ color: colors.primary, fontWeight: 600, fontSize: 16 }}>{title}</div>
      <div style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>{description}</div>
    </button>
  );
}
