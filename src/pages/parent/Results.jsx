import { useState, useEffect } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

export default function Results() {
  // A parent may have more than one child in the school — this selector
  // is the earlier-suggested addition. Starts empty; populated once the
  // backend tells us which children belong to this parent's account.
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState("");
  const [term, setTerm] = useState("Term 1");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ---- Ready to enable once the backend is live. ----
    // fetch("http://localhost:5000/api/parent/children")
    //   .then((res) => res.json())
    //   .then((data) => {
    //     setChildren(data);
    //     if (data.length) setSelectedChild(data[0].student_id);
    //   })
    //   .finally(() => setLoading(false));

    setLoading(false); // remove once the fetch above is uncommented
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    // ---- Ready to enable once the backend is live. ----
    // fetch(`http://localhost:5000/api/results?student_id=${selectedChild}&term=${term}`)
    //   .then((res) => res.json())
    //   .then((data) => setResults(data));
  }, [selectedChild, term]);

  return (
    <Layout role="parent">
      <div style={{ maxWidth: 700, fontFamily: "sans-serif" }}>
        <h1 style={{ color: colors.primary }}>Results</h1>
        <p style={{ color: colors.textSecondary }}>View your child's academic results by term.</p>

        {loading ? (
          <EmptyState text="Loading..." />
        ) : children.length === 0 ? (
          <EmptyState text="No child linked to this account yet." />
        ) : (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <FilterField label="Child">
                <select value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)} style={selectStyle}>
                  {children.map((c) => (
                    <option key={c.student_id} value={c.student_id}>{c.student_name}</option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="Term">
                <select value={term} onChange={(e) => setTerm(e.target.value)} style={selectStyle}>
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </FilterField>
            </div>

            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden" }}>
              {results.length === 0 ? (
                <p style={{ padding: "40px 16px", textAlign: "center", color: colors.textSecondary }}>
                  No results published for this term yet.
                </p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: colors.background, textAlign: "left" }}>
                      <th style={thStyle}>Subject</th>
                      <th style={thStyle}>Score</th>
                      <th style={thStyle}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.subject} style={{ borderTop: `1px solid ${colors.border}` }}>
                        <td style={tdStyle}>{r.subject}</td>
                        <td style={tdStyle}>{r.score}</td>
                        <td style={tdStyle}>{r.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function FilterField({ label, children }) {
  return (
    <label style={{ fontSize: 13, color: colors.textSecondary }}>
      <span style={{ display: "block", marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "40px 16px", textAlign: "center", color: colors.textSecondary }}>
      {text}
    </div>
  );
}

const selectStyle = { padding: "8px 10px", border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 14, height: 36 };
const thStyle = { padding: "10px 16px", fontSize: 13, color: colors.textSecondary };
const tdStyle = { padding: "10px 16px", fontSize: 14 };
