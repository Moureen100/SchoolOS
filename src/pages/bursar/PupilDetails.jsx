import { useState, useEffect } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

// ---- Read-only view of pupil records pulled from admin. ----
// Bursars don't edit student bio-data (that's Admin's job) — they just
// need to look someone up to confirm identity/class before capturing
// a payment or checking a balance.
export default function PupilDetails() {
  const [search, setSearch] = useState("");
  const [pupils, setPupils] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ---- Ready to enable once the backend is live. ----
    // fetch("http://localhost:5000/api/students")
    //   .then((res) => res.json())
    //   .then((data) => setPupils(data))
    //   .finally(() => setLoading(false));

    setLoading(false); // remove once the fetch above is uncommented
  }, []);

  const filtered = pupils.filter(({ student }) =>
    student.student_name.toLowerCase().includes(search.toLowerCase()) ||
    student.student_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout role="bursar">
      <div style={{ maxWidth: 800, fontFamily: "sans-serif" }}>
        <h1 style={{ color: colors.primary }}>Pupil Details</h1>
        <p style={{ color: colors.textSecondary }}>View pupil details pulled from admin records.</p>

        <input
          placeholder="Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 14, marginBottom: 16, boxSizing: "border-box" }}
        />

        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden" }}>
          {loading ? (
            <p style={{ padding: "40px 16px", textAlign: "center", color: colors.textSecondary }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p style={{ padding: "40px 16px", textAlign: "center", color: colors.textSecondary }}>
              {pupils.length === 0 ? "No pupil records available yet." : "No matches for that search."}
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: colors.background, textAlign: "left" }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Class</th>
                  <th style={thStyle}>Guardian phone</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ student, guardian }) => (
                  <tr key={student.student_id} style={{ borderTop: `1px solid ${colors.border}` }}>
                    <td style={tdStyle}>{student.student_name} {student.last_name}</td>
                    <td style={tdStyle}>{student.student_id}</td>
                    <td style={tdStyle}>{student.student_class}</td>
                    <td style={tdStyle}>{guardian?.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}

const thStyle = { padding: "10px 16px", fontSize: 13, color: colors.textSecondary };
const tdStyle = { padding: "10px 16px", fontSize: 14 };
