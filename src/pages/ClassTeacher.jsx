import { useState } from "react";
import Layout from "../Layout";
import { colors } from "../theme";

// ---- Class Teacher page. ----
// A class teacher collects marks that OTHER subject teachers have
// uploaded (via Upload Marks) for their class, checks who's submitted,
// then grades and ranks pupils before sending the full report to admin.
//
// NOTE: grading + position calculation will eventually be handled by
// an AI agent (flagged for later work) — for now this page just lays
// out the structure: submission tracking, a manual grade/position
// entry area, and a "send to admin" action.
export default function ClassTeacher() {
  // Starts empty — no dummy data. Once connected to the backend, this
  // becomes a fetch of "which subject teachers owe marks for my class"
  // and "which have submitted".
  const [submissions, setSubmissions] = useState([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const allSubmitted = submissions.length > 0 && submissions.every((s) => s.status === "submitted");

  async function handleSendToAdmin() {
    setSending(true);
    // TODO: real POST to admin once backend endpoint exists
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSending(false);
    setSent(true);
  }

  return (
    <Layout role="classTeacher">
      <div style={{ maxWidth: 760, fontFamily: "sans-serif" }}>
        <h1 style={{ color: colors.primary }}>Class Teacher — Report Compilation</h1>
        <p style={{ color: colors.textSecondary }}>
          Track subject teacher submissions, then grade and send the class report to admin.
        </p>

        <SectionLabel>Subject submissions</SectionLabel>
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden" }}>
          {submissions.length === 0 ? (
            <p style={{ padding: "32px 16px", textAlign: "center", color: colors.textSecondary }}>
              No subject submissions yet for this class.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: colors.background, textAlign: "left" }}>
                  <th style={{ padding: "10px 16px", fontSize: 13, color: colors.textSecondary }}>Subject</th>
                  <th style={{ padding: "10px 16px", fontSize: 13, color: colors.textSecondary }}>Teacher</th>
                  <th style={{ padding: "10px 16px", fontSize: 13, color: colors.textSecondary }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.subject} style={{ borderTop: `1px solid ${colors.border}` }}>
                    <td style={{ padding: "10px 16px", fontSize: 14 }}>{s.subject}</td>
                    <td style={{ padding: "10px 16px", fontSize: 14 }}>{s.teacher}</td>
                    <td style={{ padding: "10px 16px", fontSize: 14 }}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 13,
                          background: s.status === "submitted" ? colors.accentLight : colors.warningLight,
                          color: s.status === "submitted" ? colors.accent : colors.warning,
                        }}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <SectionLabel>Grading &amp; position</SectionLabel>
        <div
          style={{
            padding: 20,
            background: colors.surface,
            border: `1px dashed ${colors.border}`,
            borderRadius: 10,
            color: colors.textSecondary,
            fontSize: 14,
          }}
        >
          Once all subjects are submitted, grading and class position will be computed here
          (planned to be automated by an AI agent later — manual entry for now).
        </div>

        <button
          onClick={handleSendToAdmin}
          disabled={!allSubmitted || sending}
          style={{
            marginTop: 20,
            padding: "10px 20px",
            background: allSubmitted ? colors.accent : colors.border,
            color: allSubmitted ? "white" : colors.textSecondary,
            border: "none",
            borderRadius: 6,
            fontSize: 15,
            cursor: allSubmitted ? "pointer" : "not-allowed",
          }}
        >
          {sending ? "Sending..." : "Send report to admin"}
        </button>

        {!allSubmitted && submissions.length > 0 && (
          <p style={{ color: colors.warning, marginTop: 10, fontSize: 13 }}>
            Waiting on submissions from all subject teachers before sending.
          </p>
        )}
        {sent && (
          <p style={{ color: colors.accent, marginTop: 10, fontSize: 13 }}>
            Report sent to admin.
          </p>
        )}
      </div>
    </Layout>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary, marginTop: 28, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
      {children}
    </p>
  );
}
