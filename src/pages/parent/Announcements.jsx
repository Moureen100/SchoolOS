import { useState, useEffect } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]); // starts empty
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ---- Ready to enable once the backend is live. ----
    // fetch("http://localhost:5000/api/announcements")
    //   .then((res) => res.json())
    //   .then((data) => setAnnouncements(data))
    //   .finally(() => setLoading(false));

    setLoading(false); // remove once the fetch above is uncommented
  }, []);

  return (
    <Layout role="parent">
      <div style={{ maxWidth: 700, fontFamily: "sans-serif" }}>
        <h1 style={{ color: colors.primary }}>Announcements</h1>
        <p style={{ color: colors.textSecondary }}>School announcements relevant to your child.</p>

        {loading ? (
          <EmptyState text="Loading..." />
        ) : announcements.length === 0 ? (
          <EmptyState text="No announcements right now. Check back later." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {announcements.map((a) => (
              <div key={a.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ color: colors.primary }}>{a.title}</strong>
                  <span style={{ fontSize: 13, color: colors.textSecondary }}>{a.date}</span>
                </div>
                <p style={{ fontSize: 14, color: colors.textPrimary, marginTop: 8 }}>{a.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "40px 16px", textAlign: "center", color: colors.textSecondary }}>
      {text}
    </div>
  );
}
