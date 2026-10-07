import Layout from "../../Layout";
import { colors } from "../../theme";

export default function BursarDashboard() {
  return (
    <Layout role="bursar">
      <div style={{ maxWidth: 640, fontFamily: "sans-serif" }}>
        <h1 style={{ color: colors.primary }}>Bursar Dashboard</h1>
        <p style={{ color: colors.textSecondary }}>
          Capture payments and manage pupil financial records from the sidebar.
        </p>
      </div>
    </Layout>
  );
}
