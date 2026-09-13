import { useState } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

export default function LessonPlan() {
  const [form, setForm] = useState({
    student_class: "",
    subject: "",
    week: "",
    topic: "",
    objectives: "",
    activities: "",
    materials: "",
  });
  const [plans, setPlans] = useState([]); // starts empty — no dummy data to maintain
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    // ---- Ready to enable once the backend is live. ----
    // await fetch("http://localhost:5000/api/lesson-plans", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(form),
    // });

    await new Promise((resolve) => setTimeout(resolve, 400)); // simulated
    setSaving(false);

    // Add it to the local list so you can see it appear immediately.
    // Once the backend is connected, replace this with a re-fetch of
    // the saved plans instead of manually appending.
    setPlans((prev) => [{ ...form, id: Date.now() }, ...prev]);
    setForm({ student_class: "", subject: "", week: "", topic: "", objectives: "", activities: "", materials: "" });
  }

  return (
    <Layout role="teacher">
      <div style={{ maxWidth: 760, fontFamily: "sans-serif" }}>
        <h1 style={{ color: colors.primary }}>Lesson Plan</h1>
        <p style={{ color: colors.textSecondary }}>Create and manage your lesson plans by week.</p>

        <form
          onSubmit={handleSubmit}
          style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 20, marginBottom: 24 }}
        >
          <Row>
            <Field label="Class" name="student_class" value={form.student_class} onChange={handleChange} placeholder="e.g. P3" />
            <Field label="Subject" name="subject" value={form.subject} onChange={handleChange} placeholder="e.g. Mathematics" />
          </Row>
          <Row>
            <Field label="Week / Date" name="week" value={form.week} onChange={handleChange} type="date" />
            <Field label="Topic" name="topic" value={form.topic} onChange={handleChange} />
          </Row>
          <Field label="Objectives" name="objectives" value={form.objectives} onChange={handleChange} textarea full />
          <Field label="Activities" name="activities" value={form.activities} onChange={handleChange} textarea full />
          <Field label="Materials needed" name="materials" value={form.materials} onChange={handleChange} full />

          <button
            type="submit"
            disabled={saving}
            style={{ marginTop: 12, padding: "10px 20px", background: colors.accent, color: "white", border: "none", borderRadius: 6, fontSize: 15, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving..." : "Save lesson plan"}
          </button>
        </form>

        <p style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Saved plans
        </p>
        {plans.length === 0 ? (
          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "32px 16px", textAlign: "center", color: colors.textSecondary }}>
            No lesson plans yet. Create one above.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {plans.map((p) => (
              <div key={p.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ color: colors.primary }}>{p.topic || "(untitled)"}</strong>
                  <span style={{ fontSize: 13, color: colors.textSecondary }}>{p.student_class} · {p.subject}</span>
                </div>
                <p style={{ fontSize: 13, color: colors.textSecondary, marginTop: 6 }}>{p.week}</p>
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
