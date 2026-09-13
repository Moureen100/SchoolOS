import { useState } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

// ---- TEMPORARY: one dummy pupil row just to preview the table design. ----
// Delete this array (and switch pupils' useState back to []) once you
// connect the real "load class list" fetch below.
const tempDummyPupils = [
  { id: "STU001", name: "Amara Okafor", score: "" },
];

export default function UploadMarks() {
  const [studentClass, setStudentClass] = useState("");
  const [subject, setSubject] = useState("");
  const [term, setTerm] = useState("");
  const [pupils, setPupils] = useState(tempDummyPupils); // TEMPORARY — was useState([])
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleLoadClass() {
    if (!studentClass || !subject) return;
    setLoading(true);
    setSaved(false);

    // ---- Ready to enable once the backend is live. ----
    // const res = await fetch(
    //   `http://localhost:5000/api/students?student_class=${studentClass}`
    // );
    // const data = await res.json();
    // setPupils(data.map((row) => ({ id: row.student.student_id, name: row.student.student_name, score: "" })));

    await new Promise((resolve) => setTimeout(resolve, 400)); // simulated
    setLoading(false);
  }

  function handleScoreChange(id, value) {
    setPupils((prev) => prev.map((p) => (p.id === id ? { ...p, score: value } : p)));
  }

  async function handleSubmit() {
    setSaving(true);

    // ---- Ready to enable once the backend is live. ----
    // await fetch("http://localhost:5000/api/marks", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ student_class: studentClass, subject, term, marks: pupils }),
    // });

    await new Promise((resolve) => setTimeout(resolve, 400)); // simulated
    setSaving(false);
    setSaved(true);
  }

  return (
    <Layout role="teacher">
      <div style={{ maxWidth: 760, fontFamily: "sans-serif" }}>
        <h1 style={{ color: colors.primary }}>Upload Marks</h1>
        <p style={{ color: colors.textSecondary }}>
          Select a class and subject, then enter scores for each pupil.
        </p>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 20 }}>
          <FilterField label="Class">
            <select value={studentClass} onChange={(e) => setStudentClass(e.target.value)} style={selectStyle}>
              <option value="">Select...</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4</option>
            </select>
          </FilterField>
          <FilterField label="Subject">
            <select value={subject} onChange={(e) => setSubject(e.target.value)} style={selectStyle}>
              <option value="">Select...</option>
              <option value="Mathematics">Mathematics</option>
              <option value="English">English</option>
              <option value="Science">Science</option>
              <option value="Social Studies">Social Studies</option>
            </select>
          </FilterField>
          <FilterField label="Term">
            <select value={term} onChange={(e) => setTerm(e.target.value)} style={selectStyle}>
              <option value="">Select...</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </FilterField>
          <button
            onClick={handleLoadClass}
            disabled={!studentClass || !subject || loading}
            style={{
              padding: "8px 16px",
              background: studentClass && subject ? colors.primary : colors.border,
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 14,
              cursor: studentClass && subject ? "pointer" : "not-allowed",
              height: 36,
            }}
          >
            {loading ? "Loading..." : "Load class list"}
          </button>
        </div>

        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden" }}>
          {pupils.length === 0 ? (
            <p style={{ padding: "40px 16px", textAlign: "center", color: colors.textSecondary }}>
              Select a class and subject, then load the class list.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: colors.background, textAlign: "left" }}>
                  <th style={{ padding: "10px 16px", fontSize: 13, color: colors.textSecondary }}>Pupil</th>
                  <th style={{ padding: "10px 16px", fontSize: 13, color: colors.textSecondary }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {pupils.map((p) => (
                  <tr key={p.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                    <td style={{ padding: "10px 16px", fontSize: 14 }}>{p.name}</td>
                    <td style={{ padding: "8px 16px" }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={p.score}
                        onChange={(e) => handleScoreChange(p.id, e.target.value)}
                        style={{ width: 80, padding: "6px 8px", border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 14 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pupils.length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              marginTop: 20,
              padding: "10px 20px",
              background: colors.accent,
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 15,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Submitting..." : "Submit marks"}
          </button>
        )}
        {saved && <p style={{ color: colors.accent, fontSize: 13, marginTop: 10 }}>Marks submitted.</p>}
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

const selectStyle = { padding: "8px 10px", border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 14, height: 36 };
