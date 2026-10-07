import Layout from "../../Layout";
import { colors } from "../../theme";

export default function ParentDashboard() {
  return (
    <Layout role="parent">
      <div style={{ maxWidth: 640, fontFamily: "sans-serif" }}>
        <h1 style={{ color: colors.primary }}>Parent Dashboard</h1>
        <p style={{ color: colors.textSecondary }}>
          View announcements, results, and payment status from the sidebar.
        </p>
      </div>
    </Layout>
  );
}
