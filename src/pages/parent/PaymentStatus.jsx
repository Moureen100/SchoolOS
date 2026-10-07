import { useState, useEffect } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

export default function PaymentStatus() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState("");
  const [status, setStatus] = useState(null); // { total_fees, paid, balance, due_date }
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
    // fetch(`http://localhost:5000/api/payments/status?student_id=${selectedChild}`)
    //   .then((res) => res.json())
    //   .then((data) => setStatus(data));
  }, [selectedChild]);

  return (
    <Layout role="parent">
      <div style={{ maxWidth: 600, fontFamily: "sans-serif" }}>
        <h1 style={{ color: colors.primary }}>Payment Status</h1>
        <p style={{ color: colors.textSecondary }}>Fees paid and outstanding balance for your child.</p>

        {loading ? (
          <EmptyState text="Loading..." />
        ) : children.length === 0 ? (
          <EmptyState text="No child linked to this account yet." />
        ) : (
          <>
            <FilterField label="Child">
              <select value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)} style={{ ...selectStyle, marginBottom: 20 }}>
                {children.map((c) => (
                  <option key={c.student_id} value={c.student_id}>{c.student_name}</option>
                ))}
              </select>
            </FilterField>

            {!status ? (
              <EmptyState text="No payment record found yet." />
            ) : (
              <div style={{ display: "flex", gap: 12 }}>
                <StatCard label="Total fees" value={status.total_fees} />
                <StatCard label="Paid" value={status.paid} highlight="accent" />
                <StatCard label="Balance" value={status.balance} highlight={status.balance > 0 ? "warning" : "accent"} />
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ label, value, highlight }) {
  const color = highlight === "accent" ? colors.accent : highlight === "warning" ? colors.warning : colors.textPrimary;
  return (
    <div style={{ flex: 1, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 13, color: colors.textSecondary }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <label style={{ fontSize: 13, color: colors.textSecondary, display: "block" }}>
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

const selectStyle = { padding: "8px 10px", border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 14, height: 36, width: "100%" };
