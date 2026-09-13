import { useState } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

export default function CaptureMoney() {
  const [form, setForm] = useState({
    student_id: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    method: "cash",
    purpose: "",
  });
  const [recent, setRecent] = useState([]); // starts empty — no dummy data to maintain
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    // ---- Ready to enable once the backend is live. ----
    // await fetch("http://localhost:5000/api/payments", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(form),
    // });

    await new Promise((resolve) => setTimeout(resolve, 400)); // simulated
    setSaving(false);

    setRecent((prev) => [{ ...form, id: Date.now() }, ...prev]);
    setForm({ student_id: "", amount: "", date: new Date().toISOString().slice(0, 10), method: "cash", purpose: "" });
  }

  return (
    <Layout role="bursar">
      <div style={{ maxWidth: 700, fontFamily: "sans-serif" }}>
        <h1 style={{ color: colors.primary }}>Capture Money</h1>
        <p style={{ color: colors.textSecondary }}>Record a payment received from a pupil/guardian.</p>

        <form
          onSubmit={handleSubmit}
          style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 20, marginBottom: 24 }}
        >
          <Row>
            <Field label="Student ID" name="student_id" value={form.student_id} onChange={handleChange} placeholder="e.g. STU001" />
            <Field label="Amount" name="amount" value={form.amount} onChange={handleChange} type="number" />
          </Row>
          <Row>
            <Field label="Date" name="date" value={form.date} onChange={handleChange} type="date" />
            <label style={{ flex: 1, display: "block", marginBottom: 14 }}>
              <span style={{ display: "block", fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>Method</span>
              <select name="method" value={form.method} onChange={handleChange} style={inputStyle}>
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </label>
          </Row>
          <Field label="Purpose" name="purpose" value={form.purpose} onChange={handleChange} placeholder="e.g. Term 1 tuition" full />

          <button
            type="submit"
            disabled={saving}
            style={{ marginTop: 12, padding: "10px 20px", background: colors.accent, color: "white", border: "none", borderRadius: 6, fontSize: 15, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving..." : "Capture payment"}
          </button>
        </form>

        <p style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Recently captured
        </p>
        {recent.length === 0 ? (
          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "32px 16px", textAlign: "center", color: colors.textSecondary }}>
            No payments captured yet in this session.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recent.map((r) => (
              <div key={r.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 14, display: "flex", justifyContent: "space-between" }}>
                <span>{r.student_id} — {r.purpose || "Payment"}</span>
                <strong style={{ color: colors.accent }}>{r.amount}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function Row({ children }) {
  return <div style={{ display: "flex", gap: 12 }}>{children}</div>;
}

function Field({ label, name, value, onChange, type = "text", placeholder, full }) {
  return (
    <label style={{ flex: full ? "1 1 100%" : 1, display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>{label}</span>
      <input name={name} value={value} onChange={onChange} type={type} placeholder={placeholder} style={inputStyle} />
    </label>
  );
}

const inputStyle = { width: "100%", padding: "8px 10px", border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" };
