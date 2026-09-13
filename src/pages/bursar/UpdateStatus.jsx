import { useState } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

export default function UpdateStatus() {
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState("cleared");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    // ---- Ready to enable once the backend is live. ----
    // await fetch(`http://localhost:5000/api/students/${studentId}/payment-status`, {
    //   method: "PATCH",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ status }),
    // });

    await new Promise((resolve) => setTimeout(resolve, 400)); // simulated
    setSaving(false);
    setSaved(true);
  }

  return (
    <Layout role="bursar">
      <div style={{ maxWidth: 500, fontFamily: "sans-serif" }}>
        <h1 style={{ color: colors.primary }}>Update Status</h1>
        <p style={{ color: colors.textSecondary }}>Update a pupil's financial/payment status.</p>

        <form
          onSubmit={handleSubmit}
          style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 20 }}
        >
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "block", fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>Student ID</span>
            <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. STU001" style={inputStyle} required />
          </label>

          <span style={{ display: "block", fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>Payment status</span>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <StatusOption label="Cleared" value="cleared" current={status} onSelect={setStatus} />
            <StatusOption label="Partial" value="partial" current={status} onSelect={setStatus} />
            <StatusOption label="Outstanding" value="outstanding" current={status} onSelect={setStatus} />
          </div>

          <button
            type="submit"
            disabled={saving || !studentId}
            style={{ padding: "10px 20px", background: colors.accent, color: "white", border: "none", borderRadius: 6, fontSize: 15, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Updating..." : "Update status"}
          </button>

          {saved && <p style={{ color: colors.accent, fontSize: 13, marginTop: 10 }}>Status updated.</p>}
        </form>
      </div>
    </Layout>
  );
}

function StatusOption({ label, value, current, onSelect }) {
  const active = current === value;
  const color = value === "cleared" ? colors.accent : value === "outstanding" ? colors.warning : colors.primary;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      style={{
        flex: 1,
        padding: "8px 10px",
        borderRadius: 6,
        border: `1px solid ${active ? color : colors.border}`,
        background: active ? color : colors.surface,
        color: active ? "white" : colors.textPrimary,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

const inputStyle = { width: "100%", padding: "8px 10px", border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" };
