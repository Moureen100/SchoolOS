import { useState } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

// ---- TEMPORARY: one dummy pupil row just to preview the table design. ----
// Delete this array (and switch pupils' useState back to []) once you
// connect the real "load class list" fetch below.
const tempDummyPupils = [
  { id: "STU001", name: "Amara Okafor", present: true },
];

export default function Attendance() {
  const [studentClass, setStudentClass] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [pupils, setPupils] = useState(tempDummyPupils); // TEMPORARY — was useState([])
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleLoadClass() {
    if (!studentClass) return;
    setLoading(true);
    setSaved(false);

    // ---- Ready to enable once the backend is live. ----
    // const res = await fetch(`http://localhost:5000/api/students?student_class=${studentClass}`);
    // const data = await res.json();
    // setPupils(data.map((row) => ({ id: row.student.student_id, name: row.student.student_name, present: true })));

    await new Promise((resolve) => setTimeout(resolve, 400)); // simulated
    setLoading(false);
  }

  function togglePresent(id) {
    setPupils((prev) => prev.map((p) => (p.id === id ? { ...p, present: !p.present } : p)));
  }

  async function handleSubmit() {
    setSaving(true);

    // ---- Ready to enable once the backend is live. ----
    // await fetch("http://localhost:5000/api/attendance", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ student_class: studentClass, date, records: pupils }),
    // });

    await new Promise((resolve) => setTimeout(resolve, 400)); // simulated
    setSaving(false);
    setSaved(true);
  }

  const presentCount = pupils.filter((p) => p.present).length;

  return (
    <Layout role="teacher">
      <div style={{ maxWidth: 700, fontFamily: "sans-serif" }}>
        <h1 style={{ color: colors.primary }}>Attendance</h1>
        <p style={{ color: colors.textSecondary }}>Mark daily attendance for your class.</p>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 20 }}>
          <FilterField label="Class">
            <select value={studentClass} onChange={(e) => setStudentClass(e.target.value)} style={selectStyle}>
              <option value="">Select...</option>
              <option value="S1">P1</option>
              <option value="S2">P2</option>
              <option value="S3">P3</option>
              <option value="S4">P4</option>
            </select>
          </FilterField>
          <FilterField label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={selectStyle} />
          </FilterField>
          <button
            onClick={handleLoadClass}
            disabled={!studentClass || loading}
            style={{ padding: "8px 16px", background: studentClass ? colors.primary : colors.border, color: "white", border: "none", borderRadius: 6, fontSize: 14, cursor: studentClass ? "pointer" : "not-allowed", height: 36 }}
          >
            {loading ? "Loading..." : "Load class list"}
          </button>
        </div>

        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden" }}>
          {pupils.length === 0 ? (
            <p style={{ padding: "40px 16px", textAlign: "center", color: colors.textSecondary }}>
              Select a class, then load the class list.
            </p>
          ) : (
            <>
              <div style={{ padding: "10px 16px", fontSize: 13, color: colors.textSecondary, background: colors.background }}>
                {presentCount} / {pupils.length} present
              </div>
              {pupils.map((p) => (
                <div
                  key={p.id}
                  onClick={() => togglePresent(p.id)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: `1px solid ${colors.border}`, cursor: "pointer" }}
                >
                  <span style={{ fontSize: 14 }}>{p.name}</span>
                  <span
                    style={{
                      padding: "3px 12px",
                      borderRadius: 999,
                      fontSize: 13,
                      background: p.present ? colors.accentLight : colors.warningLight,
                      color: p.present ? colors.accent : colors.warning,
                    }}
                  >
                    {p.present ? "Present" : "Absent"}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {pupils.length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{ marginTop: 20, padding: "10px 20px", background: colors.accent, color: "white", border: "none", borderRadius: 6, fontSize: 15, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Submitting..." : "Submit attendance"}
          </button>
        )}
        {saved && <p style={{ color: colors.accent, fontSize: 13, marginTop: 10 }}>Attendance submitted.</p>}
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
