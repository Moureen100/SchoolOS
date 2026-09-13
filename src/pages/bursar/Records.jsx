import { useState, useEffect } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

export default function Records() {
  const [range, setRange] = useState("daily"); // "daily" | "weekly"
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // ---- Ready to enable once the backend is live. ----
    // fetch(`http://localhost:5000/api/payments/records?range=${range}`)
    //   .then((res) => res.json())
    //   .then((data) => setRecords(data))
    //   .finally(() => setLoading(false));

    setLoading(false); // remove once the fetch above is uncommented
  }, [range]);

  const total = records.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <Layout role="bursar">
      <div style={{ maxWidth: 800, fontFamily: "sans-serif" }}>
        <h1 style={{ color: colors.primary }}>Records</h1>
        <p style={{ color: colors.textSecondary }}>Daily and weekly payment records.</p>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <ToggleButton active={range === "daily"} onClick={() => setRange("daily")}>Daily</ToggleButton>
          <ToggleButton active={range === "weekly"} onClick={() => setRange("weekly")}>Weekly</ToggleButton>
        </div>

        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden" }}>
          {loading ? (
            <p style={{ padding: "40px 16px", textAlign: "center", color: colors.textSecondary }}>Loading...</p>
          ) : records.length === 0 ? (
            <p style={{ padding: "40px 16px", textAlign: "center", color: colors.textSecondary }}>
              No {range} records to show yet.
            </p>
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: colors.background, textAlign: "left" }}>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Student</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                      <td style={tdStyle}>{r.date}</td>
                      <td style={tdStyle}>{r.student_id}</td>
                      <td style={tdStyle}>{r.amount}</td>
                      <td style={tdStyle}>{r.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: "12px 16px", borderTop: `1px solid ${colors.border}`, background: colors.background, textAlign: "right", fontWeight: 600, color: colors.primary }}>
                Total: {total}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

function ToggleButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 6,
        border: `1px solid ${active ? colors.primary : colors.border}`,
        background: active ? colors.primary : colors.surface,
        color: active ? "white" : colors.textPrimary,
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const thStyle = { padding: "10px 16px", fontSize: 13, color: colors.textSecondary };
const tdStyle = { padding: "10px 16px", fontSize: 14 };
