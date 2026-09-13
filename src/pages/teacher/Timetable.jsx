import { useState, useEffect } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const PERIODS = ["8:00", "9:00", "10:00", "11:00", "12:00", "2:00", "3:00"];

export default function Timetable() {
  // Shape: { "Mon-8:00": { subject, class }, ... } — keyed by "day-period"
  // so a lookup is a single object access, no searching an array per cell.
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ---- Ready to enable once the backend is live. ----
    // fetch("http://localhost:5000/api/timetable/me")
    //   .then((res) => res.json())
    //   .then((data) => setSchedule(data))
    //   .finally(() => setLoading(false));

    setLoading(false); // remove once the fetch above is uncommented
  }, []);

  const hasAnyEntries = Object.keys(schedule).length > 0;

  return (
    <Layout role="teacher">
      <div style={{ maxWidth: 820, fontFamily: "sans-serif" }}>
        <h1 style={{ color: colors.primary }}>Timetable</h1>
        <p style={{ color: colors.textSecondary }}>Your weekly teaching schedule.</p>

        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden" }}>
          {loading ? (
            <p style={{ padding: "40px 16px", textAlign: "center", color: colors.textSecondary }}>Loading...</p>
          ) : !hasAnyEntries ? (
            <p style={{ padding: "40px 16px", textAlign: "center", color: colors.textSecondary }}>
              No timetable entries yet. Once the admin assigns your schedule, it'll appear here.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: colors.background }}>
                  <th style={thStyle}></th>
                  {DAYS.map((day) => (
                    <th key={day} style={thStyle}>{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period) => (
                  <tr key={period} style={{ borderTop: `1px solid ${colors.border}` }}>
                    <td style={{ ...tdStyle, color: colors.textSecondary, fontWeight: 600 }}>{period}</td>
                    {DAYS.map((day) => {
                      const entry = schedule[`${day}-${period}`];
                      return (
                        <td key={day} style={tdStyle}>
                          {entry ? (
                            <div>
                              <div style={{ fontWeight: 600 }}>{entry.subject}</div>
                              <div style={{ fontSize: 12, color: colors.textSecondary }}>{entry.class}</div>
                            </div>
                          ) : (
                            <span style={{ color: colors.border }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}

const thStyle = { padding: "10px 12px", fontSize: 13, color: colors.textSecondary, textAlign: "left" };
const tdStyle = { padding: "10px 12px", fontSize: 14 };
