import { useState, useEffect } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

const API_URL = "http://127.0.0.1:5000"; // no /api prefix, matching how app.py registers the blueprint

// TODO: replace with the real logged-in teacher's id (from login/localStorage/context)
const TEACHER_ID = 1;

const emptyForm = {
  student_class: "",
  subject: "",
  week: "",
  topic: "",
  objectives: "",
  activities: "",
  materials: "",
};

export default function LessonPlan() {
  const [form, setForm] = useState(emptyForm);
  const [plans, setPlans] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // GET: load saved plans
  async function fetchPlans() {
    try {
      setError("");
      const res = await fetch(`${API_URL}/lesson-plans/${TEACHER_ID}`);
      if (!res.ok) throw new Error("Failed to load lesson plans");
      const data = await res.json();

      // Map backend field names to the names this page uses
      const mapped = data.lesson_plans.map((p) => ({
        id: p.id,
        student_class: p.teacher_class,
        subject: p.teacher_subject,
        week: p.week,
        topic: p.topic,
        objectives: p.objectives,
        activities: p.activities,
        materials: p.materials_needed,
      }));

      setPlans(mapped.reverse()); // newest first
    } catch (err) {
      setError(err.message || "Could not connect to the server");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPlans();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // POST: save a new plan
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    // Map this page's field names to what the backend expects
    const payload = {
      teacher_id: TEACHER_ID,
      teacher_class: form.student_class,
      teacher_subject: form.subject,
      week: form.week,
      topic: form.topic,
      objectives: form.objectives,
      activities: form.activities,
      materials_needed: form.materials,
    };

    try {
      const res = await fetch(`${API_URL}/lesson-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save lesson plan");
      }

      setSuccess("Lesson plan saved!");
      setForm(emptyForm);
      await fetchPlans(); // re-fetch so the list shows what is really in the database
    } catch (err) {
      setError(err.message || "Could not connect to the server");
    } finally {
      setSaving(false);
    }
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
              <Field label="Class" name="student_class" value={form.student_class} onChange={handleChange} placeholder="e.g. P3" required />
              <Field label="Subject" name="subject" value={form.subject} onChange={handleChange} placeholder="e.g. Mathematics" required />
            </Row>
            <Row>
              <Field label="Week / Date" name="week" value={form.week} onChange={handleChange} type="date" required />
              <Field label="Topic" name="topic" value={form.topic} onChange={handleChange} required />
            </Row>
            <Field label="Objectives" name="objectives" value={form.objectives} onChange={handleChange} textarea full required />
            <Field label="Activities" name="activities" value={form.activities} onChange={handleChange} textarea full required />
            <Field label="Materials needed" name="materials" value={form.materials} onChange={handleChange} full required />

            {error && <Message color="#b00020">{error}</Message>}
            {success && <Message color="#1b7f3b">{success}</Message>}

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

          {loading ? (
              <div style={emptyBox}>Loading lesson plans...</div>
          ) : plans.length === 0 ? (
              <div style={emptyBox}>No lesson plans yet. Create one above.</div>
          ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {plans.map((p) => (
                    <div key={p.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <strong style={{ color: colors.primary }}>{p.topic || "(untitled)"}</strong>
                        <span style={{ fontSize: 13, color: colors.textSecondary }}>{p.student_class} · {p.subject}</span>
                      </div>
                      <p style={{ fontSize: 13, color: colors.textSecondary, marginTop: 6 }}>{p.week}</p>
                      <Detail label="Objectives" text={p.objectives} />
                      <Detail label="Activities" text={p.activities} />
                      <Detail label="Materials" text={p.materials} />
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

function Message({ color, children }) {
  return <p style={{ color, fontSize: 14, margin: "8px 0" }}>{children}</p>;
}

function Detail({ label, text }) {
  if (!text) return null;
  return (
      <p style={{ fontSize: 14, margin: "6px 0 0", color: colors.textSecondary }}>
        <strong>{label}:</strong> {text}
      </p>
  );
}

function Field({ label, name, value, onChange, type = "text", placeholder, textarea, full, required }) {
  return (
      <label style={{ flex: full ? "1 1 100%" : 1, display: "block", marginBottom: 14 }}>
        <span style={{ display: "block", fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>{label}</span>
        {textarea ? (
            <textarea name={name} value={value} onChange={onChange} rows={3} required={required} style={{ ...inputStyle, resize: "vertical" }} />
        ) : (
            <input name={name} value={value} onChange={onChange} type={type} placeholder={placeholder} required={required} style={inputStyle} />
        )}
      </label>
  );
}

const emptyBox = { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "32px 16px", textAlign: "center", color: colors.textSecondary };

const inputStyle = { width: "100%", padding: "8px 10px", border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit" };