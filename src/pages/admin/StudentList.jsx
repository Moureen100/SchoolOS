import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../../Layout";
import { colors } from "../../theme";

export default function StudentList() {
  // ---- TEMPORARY: one dummy row just to preview the UI. ----
  // Delete this whole array (and switch back to useState([])) once
  // you connect the real fetch below.
  const tempDummy = [
    {
      student: {
        student_id: "STU001",
        student_name: "Amara",
        middle_name: "",
        last_name: "Okafor",
        student_class: "S3",
        stream: "East",
        date_of_birth: "2009-04-12",
        gender: "female",
        nationality: "Ugandan",
        photo: "",
        email: "amara@example.com",
        phone_number: "0700000001",
        address: "Kampala",
        status: "active",
      },
      guardian: {
        guardian_name: "Grace Okafor",
        relationship: "parent",
        phone: "0700000002",
        address: "Kampala",
        gender: "female",
      },
    },
  ];

  const [students, setStudents] = useState(tempDummy); // TEMPORARY — was useState([])
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null); // tracks which row shows guardian details

  // ---- Ready to enable once the backend is live. ----
  // Uncomment this block and delete the two lines below it — that's
  // the entire "connect to backend" step for this page.
  useEffect(() => {
    // fetch("http://localhost:5000/api/students")
    //   .then((res) => res.json())
    //   .then((data) => setStudents(data))
    //   .finally(() => setLoading(false));

    setLoading(false); // remove this line once the fetch above is uncommented
  }, []);

  // ---- Placeholder handlers. ----
  // Later these become real fetches to /api/students/<id>/activate,
  // /deactivate, etc. — the button wiring below won't need to change,
  // only what happens inside these two functions.
  function handleToggleStatus(studentId) {
    setStudents((prev) =>
      prev.map((row) =>
        row.student.student_id === studentId
          ? {
              ...row,
              student: {
                ...row.student,
                status: row.student.status === "active" ? "inactive" : "active",
              },
            }
          : row
      )
    );
  }

  function toggleExpanded(studentId) {
    setExpandedId((prev) => (prev === studentId ? null : studentId));
  }

  return (
    <Layout role="admin">
    <div
      style={{
        maxWidth: 900,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ color: colors.primary, margin: 0 }}>Students</h2>
          <p style={{ color: colors.textSecondary, marginTop: 4 }}>
            {students.length} student{students.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          to="/admin/students/new"
          style={{
            padding: "8px 16px",
            background: colors.accent,
            color: "white",
            borderRadius: 6,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          + Add student
        </Link>
      </div>

      <div
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <EmptyState text="Loading students..." />
        ) : students.length === 0 ? (
          <EmptyState text="No students yet. Add one to get started." />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: colors.background, textAlign: "left" }}>
                <Th>Name</Th>
                <Th>Class</Th>
                <Th>Stream</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {students.map(({ student, guardian }) => (
                <StudentRow
                  key={student.student_id}
                  student={student}
                  guardian={guardian}
                  expanded={expandedId === student.student_id}
                  onToggleExpand={() => toggleExpanded(student.student_id)}
                  onToggleStatus={() => handleToggleStatus(student.student_id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
    </Layout>
  );
}

function EmptyState({ text }) {
  return (
    <p style={{ padding: "40px 16px", textAlign: "center", color: colors.textSecondary }}>
      {text}
    </p>
  );
}

function StudentRow({ student, guardian, expanded, onToggleExpand, onToggleStatus }) {
  const isActive = student.status === "active";
  const fullName = [student.student_name, student.middle_name, student.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <tr
        onClick={onToggleExpand}
        style={{ borderTop: `1px solid ${colors.border}`, cursor: "pointer" }}
      >
        <Td>{fullName}</Td>
        <Td>{student.student_class}</Td>
        <Td>{student.stream}</Td>
        <Td>
          <StatusBadge active={isActive} />
        </Td>
        <Td>
          <button
            onClick={(e) => {
              e.stopPropagation(); // don't also trigger the row's expand click
              onToggleStatus();
            }}
            style={buttonStyle}
          >
            {isActive ? "Deactivate" : "Activate"}
          </button>
        </Td>
      </tr>

      {expanded && (
        <tr style={{ background: colors.background }}>
          <td colSpan={5} style={{ padding: "12px 16px" }}>
            <strong style={{ color: colors.textSecondary, fontSize: 13 }}>Guardian</strong>
            {guardian ? (
              <p style={{ margin: "4px 0 0", color: colors.textPrimary }}>
                {guardian.guardian_name} ({guardian.relationship}) — {guardian.phone}
              </p>
            ) : (
              <p style={{ margin: "4px 0 0", color: colors.textSecondary }}>
                No guardian on file.
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 13,
        background: active ? colors.accentLight : colors.warningLight,
        color: active ? colors.accent : colors.warning,
      }}
    >
      {active ? "active" : "inactive"}
    </span>
  );
}

function Th({ children }) {
  return (
    <th style={{ padding: "10px 16px", fontSize: 13, color: colors.textSecondary }}>
      {children}
    </th>
  );
}

function Td({ children }) {
  return <td style={{ padding: "10px 16px", fontSize: 14 }}>{children}</td>;
}

const buttonStyle = {
  padding: "5px 12px",
  fontSize: 13,
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  background: colors.surface,
  cursor: "pointer",
};
