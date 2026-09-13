import Layout from "../../Layout";
import { colors } from "../../theme";

export default function TeacherDashboard() {
  return (
    <Layout role="teacher">
      <div style={{ maxWidth: 640, fontFamily: "sans-serif" }}>
        <h1 style={{ color: colors.primary }}>Teacher Dashboard</h1>
        <p style={{ color: colors.textSecondary }}>
          Upload marks, manage lesson plans, and view your timetable from the sidebar.
        </p>
      </div>
    </Layout>
  );
}
