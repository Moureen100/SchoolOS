import { useState, useEffect } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ---- Ready to enable once the backend is live. ----
    // fetch("http://localhost:5000/api/parent/receipts")
    //   .then((res) => res.json())
    //   .then((data) => setReceipts(data))
    //   .finally(() => setLoading(false));

    setLoading(false); // remove once the fetch above is uncommented
  }, []);

  // NOTE: this calls the browser's print dialog for the whole page.
  // A more polished version would render just that one receipt in an
  // isolated printable layout — worth revisiting once real receipt
  // data (with a proper number/format) exists from the backend.
  function handlePrint() {
    window.print();
  }

  return (
    <Layout role="parent">
      <div style={{ maxWidth: 700, fontFamily: "sans-serif" }}>
        <h1 style={{ color: colors.primary }}>Receipts</h1>
        <p style={{ color: colors.textSecondary }}>View and print past payment receipts.</p>

        {loading ? (
          <EmptyState text="Loading..." />
        ) : receipts.length === 0 ? (
          <EmptyState text="No receipts yet." />
        ) : (
          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: colors.background, textAlign: "left" }}>
                  <th style={thStyle}>Receipt #</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.receipt_number} style={{ borderTop: `1px solid ${colors.border}` }}>
                    <td style={tdStyle}>{r.receipt_number}</td>
                    <td style={tdStyle}>{r.date}</td>
                    <td style={tdStyle}>{r.amount}</td>
                    <td style={tdStyle}>
                      <button onClick={handlePrint} style={buttonStyle}>Print</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

const thStyle = { padding: "10px 16px", fontSize: 13, color: colors.textSecondary };
const tdStyle = { padding: "10px 16px", fontSize: 14 };
const buttonStyle = { padding: "5px 12px", fontSize: 13, border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.surface, cursor: "pointer" };
