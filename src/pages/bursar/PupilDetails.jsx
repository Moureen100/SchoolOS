
import { useState, useEffect } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

const API_URL = import.meta.env.VITE_API_URL;

export default function PupilDetails() {
  const [search, setSearch] = useState("");
  const [pupils, setPupils] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // GET ALL STUDENTS FROM ADMIN/BACKEND
  // --------------------------------------------------
  useEffect(() => {
    const getStudents = async () => {
      try {
        setLoading(true);
        setError("");

        console.log("Getting students from:", `${API_URL}/students`);

const response = await fetch(`${API_URL}/students`);

console.log("GET /students status:", response.status);

if (!response.ok) {
  throw new Error(`Failed to load students: ${response.status}`);
}

const data = await response.json();

console.log("Students received:", data);

// Your backend returns an array like:
// [
//   {
//     student: {...},
//     guardian: {...}
//   }
// ]

setPupils(Array.isArray(data) ? data : []);
} catch (err) {
  console.error("Get students error:", err);
  setError("Unable to load pupil records.");
  setPupils([]);
} finally {
  setLoading(false);
}
};

getStudents();
}, []);

// --------------------------------------------------
// SEARCH STUDENTS
// --------------------------------------------------
const filtered = pupils.filter(({ student }) => {
  if (!student) return false;

  const searchText = search.toLowerCase().trim();

  const name = `${student.student_name || ""} ${
      student.middle_name || ""
  } ${student.last_name || ""}`.toLowerCase();

  const studentId = String(student.student_id || "").toLowerCase();

  return (
      name.includes(searchText) ||
      studentId.includes(searchText)
  );
});

return (
    <Layout role="bursar">
      <div
          style={{
            maxWidth: 1000,
            fontFamily: "sans-serif",
          }}
      >
        {/* --------------------------------------------------
            HEADER
        -------------------------------------------------- */}
        <h1 style={{ color: colors.primary }}>
          Pupil Details
        </h1>

        <p style={{ color: colors.textSecondary }}>
          View pupil records pulled from the school administration system.
        </p>

        {/* --------------------------------------------------
            SEARCH
        -------------------------------------------------- */}
        <input
            placeholder="Search by name or student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              fontSize: 14,
              marginBottom: 16,
              boxSizing: "border-box",
              outline: "none",
            }}
        />

        {/* --------------------------------------------------
            STUDENT TABLE
        -------------------------------------------------- */}
        <div
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              overflow: "hidden",
            }}
        >
          {loading ? (
              <p
                  style={{
                    padding: "40px 16px",
                    textAlign: "center",
                    color: colors.textSecondary,
                  }}
              >
                Loading pupil records...
              </p>
          ) : error ? (
              <p
                  style={{
                    padding: "40px 16px",
                    textAlign: "center",
                    color: "#dc2626",
                  }}
              >
                {error}
              </p>
          ) : filtered.length === 0 ? (
              <p
                  style={{
                    padding: "40px 16px",
                    textAlign: "center",
                    color: colors.textSecondary,
                  }}
              >
                {pupils.length === 0
                    ? "No pupil records available."
                    : "No pupils match your search."}
              </p>
          ) : (
              <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
              >
                <thead>
                <tr
                    style={{
                      background: colors.background,
                      textAlign: "left",
                    }}
                >
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Student ID</th>
                  <th style={thStyle}>Class</th>
                  <th style={thStyle}>Stream</th>
                  <th style={thStyle}>Guardian Phone</th>
                  <th style={thStyle}>Status</th>
                </tr>
                </thead>

                <tbody>
                {filtered.map(({ student, guardian }) => (
                    <tr
                        key={student.student_id}
                        style={{
                          borderTop: `1px solid ${colors.border}`,
                        }}
                    >
                      <td style={tdStyle}>
                        {student.student_name || "—"}{" "}
                        {student.middle_name || ""}{" "}
                        {student.last_name || ""}
                      </td>

                      <td style={tdStyle}>
                        {student.student_id || "—"}
                      </td>

                      <td style={tdStyle}>
                        {student.student_class || "—"}
                      </td>

                      <td style={tdStyle}>
                        {student.stream || "—"}
                      </td>

                      <td style={tdStyle}>
                        {guardian?.phone ||
                            guardian?.phone_number ||
                            "—"}
                      </td>

                      <td style={tdStyle}>
                        {student.status || "—"}
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
          )}
        </div>

        {/* --------------------------------------------------
            TOTAL
        -------------------------------------------------- */}
        {!loading && !error && pupils.length > 0 && (
            <p
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  color: colors.textSecondary,
                }}
            >
              Showing {filtered.length} of {pupils.length} pupils
            </p>
        )}
      </div>
    </Layout>
);
}

const thStyle = {
  padding: "12px 16px",
  fontSize: 13,
  color: colors.textSecondary,
  fontWeight: 600,
};

const tdStyle = {
  padding: "12px 16px",
  fontSize: 14,
};
