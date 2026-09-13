import { useNavigate } from "react-router-dom";
import Layout from "../../Layout";
import { colors } from "../../theme";

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <Layout role="admin">
      <div style={{ maxWidth: 640, fontFamily: "sans-serif" }}>
        <h1 style={{ color: colors.primary }}>Admin Dashboard</h1>
        <p style={{ color: colors.textSecondary }}>Manage students from here.</p>

        <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
          <DashboardCard title="Add Student" description="Register a new student and guardian." onClick={() => navigate("/admin/students/new")} />
          <DashboardCard title="View Students" description="See all students, activate or deactivate." onClick={() => navigate("/admin/students")} />
        </div>
      </div>
    </Layout>
  );
}

function DashboardCard({ title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ flex: 1, textAlign: "left", padding: 20, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "sans-serif" }}
    >
      <div style={{ color: colors.primary, fontWeight: 600, fontSize: 16 }}>{title}</div>
      <div style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>{description}</div>
    </button>
  );
}
