import { useState } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

export default function WeeklyReport() {
  const [form, setForm] = useState({
    week: "",
    student_class: "",
    subject: "",
    topics_covered: "",
    challenges: "",
    pupil_progress: "",
    plan_next_week: "",
  });
  const [reports, setReports] = useState([]); // starts empty — no dummy data to maintain
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    // ---- Ready to enable once the backend is live. ----
    // await fetch("http://localhost:5000/api/weekly-reports", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(form),
    // });

    await new Promise((resolve) => setTimeout(resolve, 400)); // simulated
    setSaving(false);

    setReports((prev) => [{ ...form, id: Date.now() }, ...prev]);
    setForm({ week: "", student_class: "", subject: "", topics_covered: "", challenges: "", pupil_progress: "", plan_next_week: "" });
  }

  return (
    <Layout role="teacher">
      <div style={{ maxWidth: 760, fontFamily: "sans-serif" }}>
        <h1 style={{ color: colors.primary }}>Weekly Report</h1>
        <p style={{ color: colors.textSecondary }}>Submit a summary of the week's teaching and pupil progress.</p>

        <form
          onSubmit={handleSubmit}
          style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 20, marginBottom: 24 }}
        >
          <Row>
            <Field label="Week ending" name="week" value={form.week} onChange={handleChange} type="date" />
            <Field label="Class" name="student_class" value={form.student_class} onChange={handleChange} placeholder="e.g. P3" />
          </Row>
          <Field label="Subject" name="subject" value={form.subject} onChange={handleChange} full />
          <Field label="Topics covered" name="topics_covered" value={form.topics_covered} onChange={handleChange} textarea full />
          <Field label="Challenges faced" name="challenges" value={form.challenges} onChange={handleChange} textarea full />
          <Field label="Pupil progress notes" name="pupil_progress" value={form.pupil_progress} onChange={handleChange} textarea full />
          <Field label="Plan for next week" name="plan_next_week" value={form.plan_next_week} onChange={handleChange} textarea full />

          <button
            type="submit"
            disabled={saving}
            style={{ marginTop: 12, padding: "10px 20px", background: colors.accent, color: "white", border: "none", borderRadius: 6, fontSize: 15, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Submitting..." : "Submit report"}
          </button>
        </form>

        <p style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Past reports
        </p>
        {reports.length === 0 ? (
          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "32px 16px", textAlign: "center", color: colors.textSecondary }}>
            No weekly reports submitted yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reports.map((r) => (
              <div key={r.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ color: colors.primary }}>{r.subject || "(no subject)"}</strong>
                  <span style={{ fontSize: 13, color: colors.textSecondary }}>{r.student_class} · {r.week}</span>
                </div>
                <p style={{ fontSize: 13, color: colors.textSecondary, marginTop: 6 }}>{r.topics_covered}</p>
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

function Field({ label, name, value, onChange, type = "text", placeholder, textarea, full }) {
  return (
    <label style={{ flex: full ? "1 1 100%" : 1, display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>{label}</span>
      {textarea ? (
        <textarea name={name} value={value} onChange={onChange} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      ) : (
        <input name={name} value={value} onChange={onChange} type={type} placeholder={placeholder} style={inputStyle} />
      )}
    </label>
  );
}

const inputStyle = { width: "100%", padding: "8px 10px", border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit" };
