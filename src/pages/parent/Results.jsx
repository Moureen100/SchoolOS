import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Layout from "../../Layout";
import { colors } from "../../theme";
import "./Results.css";

/* ------------------------------------------------------------------ */
/*  School details: change these to your real school                   */
/* ------------------------------------------------------------------ */
const SCHOOL = {
  name: "Your School Name",
  motto: "Excellence in Learning",
  address: "P.O. Box 0000, Kampala, Uganda",
  phone: "+256 700 000 000",
  email: "info@yourschool.ac.ug",
  headTeacher: "Head Teacher",
};
const API = "http://localhost:5000/api";
const USE_DEMO_DATA = true; // set to false once the backend is live
const TERMS = ["Term 1", "Term 2", "Term 3"];

const GRADING_KEY = [
  { grade: "A", range: "80 - 100", meaning: "Excellent" },
  { grade: "B", range: "70 - 79", meaning: "Very good" },
  { grade: "C", range: "60 - 69", meaning: "Good" },
  { grade: "D", range: "50 - 59", meaning: "Fair" },
  { grade: "E", range: "0 - 49", meaning: "Needs support" },
];

/* ------------------------------------------------------------------ */
/*  Demo data (shows the page before the backend is ready)             */
/*  Row shape: { student_id, year, term, subject, ca, exam, initials } */
/*  ca = coursework out of 40, exam = end of term exam out of 60       */
/* ------------------------------------------------------------------ */
const DEMO_CHILDREN = [
  { student_id: "S001", student_name: "Amina Nakato", gender: "Female", class_name: "Primary 5", stream: "Blue", admission_no: "ADM-2022-014", admission_date: "2022-02-07", photo: "" },
  { student_id: "S002", student_name: "Daniel Nakato", gender: "Male", class_name: "Primary 2", stream: "Red", admission_no: "ADM-2025-031", admission_date: "2025-02-03", photo: "" },
];
const r = (student_id, year, term, subject, ca, exam, initials) => ({ student_id, year, term, subject, ca, exam, initials });
const DEMO_HISTORY = [
  r("S001", 2025, "Term 1", "Mathematics", 30, 48, "OK"), r("S001", 2025, "Term 1", "English", 28, 43, "NJ"),
  r("S001", 2025, "Term 1", "Science", 26, 40, "AM"), r("S001", 2025, "Term 1", "Social Studies", 29, 41, "KT"),
  r("S001", 2025, "Term 2", "Mathematics", 33, 49, "OK"), r("S001", 2025, "Term 2", "English", 29, 45, "NJ"),
  r("S001", 2025, "Term 2", "Science", 28, 42, "AM"), r("S001", 2025, "Term 2", "Social Studies", 30, 44, "KT"),
  r("S001", 2026, "Term 1", "Mathematics", 36, 52, "OK"), r("S001", 2026, "Term 1", "English", 31, 48, "NJ"),
  r("S001", 2026, "Term 1", "Science", 34, 50, "AM"), r("S001", 2026, "Term 1", "Social Studies", 32, 46, "KT"),
  r("S001", 2026, "Term 1", "Religious Education", 35, 52, "BS"), r("S001", 2026, "Term 1", "Luganda", 30, 44, "NG"),
  r("S002", 2026, "Term 1", "Mathematics", 36, 54, "MP"), r("S002", 2026, "Term 1", "English", 33, 50, "MP"),
];
const DEMO_TERM_INFO = [
  { student_id: "S001", year: 2026, term: "Term 1", position: 3, class_size: 42, days_present: 58, days_open: 60, conduct: "Excellent", class_teacher_comment: "Amina is a dedicated and well-mannered pupil. Keep up the hard work.", head_teacher_comment: "A very good result. Aim even higher next term.", next_term_begins: "2026-05-11", fees_balance: 120000 },
  { student_id: "S001", year: 2025, term: "Term 2", position: 6, class_size: 40, days_present: 55, days_open: 58, conduct: "Good", class_teacher_comment: "Steady progress in all subjects.", head_teacher_comment: "Good effort. Keep improving.", next_term_begins: "2025-09-08", fees_balance: 0 },
];
const DEMO_DIARY = [
  { student_id: "S001", date: "2026-03-12", author: "Ms. Achieng (Class Teacher)", type: "Achievement", note: "Led the class in the science fair and explained the experiment clearly." },
  { student_id: "S001", date: "2026-02-20", author: "Mr. Okello (Maths)", type: "Note", note: "Please revise the 7 and 8 times tables at home." },
  { student_id: "S001", date: "2025-09-18", author: "Ms. Achieng (Class Teacher)", type: "Behaviour", note: "Very helpful to classmates during group work." },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function gradeFor(score) {
  const s = Number(score);
  if (s >= 80) return { grade: "A", remark: "Excellent" };
  if (s >= 70) return { grade: "B", remark: "Very good" };
  if (s >= 60) return { grade: "C", remark: "Good" };
  if (s >= 50) return { grade: "D", remark: "Fair" };
  return { grade: "E", remark: "Needs support" };
}

/* Works whether the backend sends ca + exam or just a single score */
function totalOf(row) {
  if (row.ca != null && row.exam != null) return Number(row.ca) + Number(row.exam);
  return Number(row.score);
}

function summarise(rows) {
  if (!rows.length) return { total: 0, average: 0, grade: "-", remark: "" };
  const total = rows.reduce((s, x) => s + totalOf(x), 0);
  const average = total / rows.length;
  return { total, average, ...gradeFor(average) };
}

function ordinal(n) {
  const v = n % 100;
  const s = ["th", "st", "nd", "rd"];
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function autoComment(average, who) {
  if (average >= 80) return who === "teacher" ? "An outstanding performance. Keep it up." : "Excellent work. Keep aiming high.";
  if (average >= 70) return who === "teacher" ? "A very good term. Maintain this effort." : "Very good. Continue working hard.";
  if (average >= 60) return who === "teacher" ? "Good progress. More effort will give better results." : "Good. There is room to improve.";
  if (average >= 50) return who === "teacher" ? "Fair performance. Needs more practice and revision." : "Fair. Work harder next term.";
  return who === "teacher" ? "Needs close support and daily revision at home." : "Must improve. Parents please follow up closely.";
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function Results() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState("");
  const [year, setYear] = useState("");
  const [term, setTerm] = useState("Term 1");
  const [tab, setTab] = useState("report"); // report | diary | progress
  const [history, setHistory] = useState([]);
  const [termInfo, setTermInfo] = useState([]);
  const [diary, setDiary] = useState([]);
  const [diaryType, setDiaryType] = useState("All");
  const [loading, setLoading] = useState(true);
  const [printMode, setPrintMode] = useState(null); // "term" | "full" | null

  // Theme colours passed to CSS (also needed on the print sheet)
  const themeVars = {
    "--c-primary": colors.primary,
    "--c-text-secondary": colors.textSecondary,
    "--c-surface": colors.surface,
    "--c-border": colors.border,
    "--c-background": colors.background,
  };

  /* 1. Children linked to this parent */
  useEffect(() => {
    if (USE_DEMO_DATA) {
      setChildren(DEMO_CHILDREN);
      setSelectedChild(DEMO_CHILDREN[0].student_id);
      setLoading(false);
      return;
    }
    // Backend returns: [{ student_id, student_name, gender, class_name, stream,
    //                     admission_no, admission_date, photo }]
    fetch(`${API}/parent/children`)
        .then((res) => res.json())
        .then((data) => {
          setChildren(data);
          if (data.length) setSelectedChild(data[0].student_id);
        })
        .finally(() => setLoading(false));
  }, []);

  /* 2. Results since admission, term info and diary for the selected child */
  useEffect(() => {
    if (!selectedChild) return;
    const pickLatest = (rows) => {
      const ys = [...new Set(rows.map((x) => x.year))].sort((a, b) => b - a);
      setYear(ys[0] ? String(ys[0]) : "");
    };
    if (USE_DEMO_DATA) {
      const h = DEMO_HISTORY.filter((x) => x.student_id === selectedChild);
      setHistory(h);
      setTermInfo(DEMO_TERM_INFO.filter((x) => x.student_id === selectedChild));
      setDiary(DEMO_DIARY.filter((x) => x.student_id === selectedChild));
      pickLatest(h);
      return;
    }
    // [{ year, term, subject, ca, exam, initials }]  (or { ..., score } only)
    fetch(`${API}/results/history?student_id=${selectedChild}`)
        .then((res) => res.json())
        .then((data) => { setHistory(data); pickLatest(data); });
    // [{ year, term, position, class_size, days_present, days_open, conduct,
    //    class_teacher_comment, head_teacher_comment, next_term_begins, fees_balance }]
    fetch(`${API}/results/term-info?student_id=${selectedChild}`)
        .then((res) => res.json())
        .then((data) => setTermInfo(data));
    // [{ date, author, type, note }]
    fetch(`${API}/diary?student_id=${selectedChild}`)
        .then((res) => res.json())
        .then((data) => setDiary(data));
  }, [selectedChild]);

  const child = children.find((c) => c.student_id === selectedChild);

  const years = useMemo(
      () => [...new Set(history.map((x) => x.year))].sort((a, b) => b - a),
      [history]
  );

  const periods = useMemo(() => {
    const map = new Map();
    history.forEach((x) => {
      const key = `${x.year}|${x.term}`;
      if (!map.has(key)) map.set(key, { year: x.year, term: x.term, rows: [] });
      map.get(key).rows.push(x);
    });
    return [...map.values()].sort(
        (a, b) => a.year - b.year || TERMS.indexOf(a.term) - TERMS.indexOf(b.term)
    );
  }, [history]);

  const currentPeriod = periods.find((p) => String(p.year) === String(year) && p.term === term);
  const infoFor = (p) => termInfo.find((i) => String(i.year) === String(p.year) && i.term === p.term) || {};

  const filteredDiary = diary
      .filter((d) => diaryType === "All" || d.type === diaryType)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

  /* Print / save as PDF */
  const downloadPdf = (mode) => {
    setPrintMode(mode);
    setTimeout(() => window.print(), 200); // wait for the sheet to render
  };
  useEffect(() => {
    const done = () => setPrintMode(null);
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, []);

  /* ---------------------------------------------------------------- */
  return (
      <Layout role="parent">
        <div className="results-page" style={themeVars}>
          <h1 className="rp-title">Results</h1>
          <p className="rp-subtitle">Report cards, teacher diary and progress since joining the school.</p>

          {loading ? (
              <EmptyState text="Loading..." />
          ) : children.length === 0 ? (
              <EmptyState text="No child linked to this account yet." />
          ) : (
              <>
                {/* Filters */}
                <div className="rp-filters">
                  <FilterField label="Child">
                    <select value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)}>
                      {children.map((c) => (
                          <option key={c.student_id} value={c.student_id}>{c.student_name}</option>
                      ))}
                    </select>
                  </FilterField>
                  {tab === "report" && (
                      <>
                        <FilterField label="Year">
                          <select value={year} onChange={(e) => setYear(e.target.value)}>
                            {years.map((y) => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </FilterField>
                        <FilterField label="Term">
                          <select value={term} onChange={(e) => setTerm(e.target.value)}>
                            {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </FilterField>
                      </>
                  )}
                  {tab === "diary" && (
                      <FilterField label="Entry type">
                        <select value={diaryType} onChange={(e) => setDiaryType(e.target.value)}>
                          {["All", "Achievement", "Behaviour", "Note"].map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </FilterField>
                  )}
                </div>

                {/* Tabs and download buttons */}
                <div className="rp-toolbar">
                  <div className="rp-tabs" role="tablist">
                    {[["report", "Report card"], ["diary", "Diary"], ["progress", "Progress"]].map(([key, label]) => (
                        <button key={key} role="tab" aria-selected={tab === key}
                                className={`rp-tab ${tab === key ? "is-active" : ""}`} onClick={() => setTab(key)}>
                          {label}
                        </button>
                    ))}
                  </div>
                  <div className="rp-actions">
                    <button className="rp-btn rp-btn-outline" onClick={() => downloadPdf("term")} disabled={!currentPeriod}>
                      Download this term (PDF)
                    </button>
                    <button className="rp-btn" onClick={() => downloadPdf("full")} disabled={!periods.length}>
                      Download full report (PDF)
                    </button>
                  </div>
                </div>

                {/* REPORT CARD PREVIEW */}
                {tab === "report" && (
                    currentPeriod ? (
                        <div className="rc-preview">
                          <ReportCard child={child} period={currentPeriod} info={infoFor(currentPeriod)} />
                        </div>
                    ) : (
                        <EmptyState text="No results published for this term yet." />
                    )
                )}

                {/* DIARY */}
                {tab === "diary" && (
                    <div className="rp-panel">
                      {filteredDiary.length === 0 ? (
                          <p className="rp-empty">No diary entries yet.</p>
                      ) : (
                          filteredDiary.map((d, i) => (
                              <div className="rp-diary-item" key={i}>
                                <div className="rp-diary-head">
                                  <span className={`rp-tag rp-tag-${d.type.toLowerCase()}`}>{d.type}</span>
                                  <span className="rp-diary-date">{formatDate(d.date)}</span>
                                </div>
                                <p className="rp-diary-note">{d.note}</p>
                                <div className="rp-diary-author">{d.author}</div>
                              </div>
                          ))
                      )}
                    </div>
                )}

                {/* PROGRESS */}
                {tab === "progress" && (
                    <div className="rp-panel rp-pad">
                      <ProgressBars periods={periods} />
                    </div>
                )}
              </>
          )}
        </div>

        {/* PRINT SHEET: rendered straight into <body> so it prints cleanly */}
        {printMode && child &&
            createPortal(
                <div className="report-sheet" style={themeVars}>
                  {printMode === "term" && currentPeriod && (
                      <ReportCard child={child} period={currentPeriod} info={infoFor(currentPeriod)} />
                  )}
                  {printMode === "full" && (
                      <>
                        <CoverPage child={child} periods={periods} diary={diary} />
                        {periods.map((p) => (
                            <ReportCard key={`${p.year}${p.term}`} child={child} period={p} info={infoFor(p)} />
                        ))}
                      </>
                  )}
                </div>,
                document.body
            )}
      </Layout>
  );
}

/* ------------------------------------------------------------------ */
/*  The real school report card                                        */
/* ------------------------------------------------------------------ */
function ReportCard({ child, period, info }) {
  const { rows, term, year } = period;
  const sum = summarise(rows);
  const days = info.days_open ? `${info.days_present} of ${info.days_open} days` : "";

  return (
      <section className="rc-page">
        <div className="rc-frame">
          <span className="rc-watermark">{SCHOOL.name.charAt(0)}</span>

          {/* School header */}
          <header className="rc-head">
            <div className="rc-crest">{SCHOOL.name.charAt(0)}</div>
            <div className="rc-school">
              <h1>{SCHOOL.name}</h1>
              <p className="rc-motto">"{SCHOOL.motto}"</p>
              <p className="rc-contact">{SCHOOL.address} &nbsp;|&nbsp; {SCHOOL.phone} &nbsp;|&nbsp; {SCHOOL.email}</p>
            </div>
            <div className="rc-photo">
              {child.photo ? <img src={child.photo} alt={child.student_name} /> : <span>Passport photo</span>}
            </div>
          </header>

          <div className="rc-banner">End of {term} Report Card &mdash; {year}</div>

          {/* Pupil details */}
          <div className="rc-bio">
            <BioField label="Pupil's name" value={child.student_name} wide />
            <BioField label="Class" value={`${child.class_name}${child.stream ? " " + child.stream : ""}`} />
            <BioField label="Admission no." value={child.admission_no} />
            <BioField label="Gender" value={child.gender} />
            <BioField label="Term / Year" value={`${term}, ${year}`} />
            <BioField label="Position in class" value={info.position ? `${ordinal(info.position)} out of ${info.class_size}` : ""} />
            <BioField label="Attendance" value={days} />
          </div>

          {/* Marks */}
          <table className="rc-marks">
            <thead>
            <tr>
              <th className="rc-left">Subject</th>
              <th>Coursework<small>/ 40</small></th>
              <th>Exam<small>/ 60</small></th>
              <th>Total<small>/ 100</small></th>
              <th>Grade</th>
              <th className="rc-left">Teacher's remark</th>
              <th>Initials</th>
            </tr>
            </thead>
            <tbody>
            {rows.map((x) => {
              const total = totalOf(x);
              const g = gradeFor(total);
              return (
                  <tr key={x.subject}>
                    <td className="rc-left rc-subject">{x.subject}</td>
                    <td>{x.ca ?? ""}</td>
                    <td>{x.exam ?? ""}</td>
                    <td className="rc-total">{total}</td>
                    <td><span className={`rc-grade rc-grade-${g.grade}`}>{g.grade}</span></td>
                    <td className="rc-left rc-remark">{g.remark}</td>
                    <td className="rc-initials">{x.initials}</td>
                  </tr>
              );
            })}
            </tbody>
            <tfoot>
            <tr>
              <td className="rc-left" colSpan={3}>Total marks &nbsp;/&nbsp; Average</td>
              <td className="rc-total">{sum.total}</td>
              <td colSpan={3} className="rc-left">
                Average <b>{sum.average.toFixed(1)}%</b> &nbsp;&middot;&nbsp; Overall grade <b>{sum.grade}</b> ({sum.remark})
              </td>
            </tr>
            </tfoot>
          </table>

          {/* Key + conduct */}
          <div className="rc-row">
            <div className="rc-box rc-key">
              <h3>Grading key</h3>
              {GRADING_KEY.map((k) => (
                  <div key={k.grade} className="rc-key-line">
                    <b>{k.grade}</b><span>{k.range}</span><em>{k.meaning}</em>
                  </div>
              ))}
            </div>
            <div className="rc-box">
              <h3>General conduct</h3>
              <p className="rc-conduct">{info.conduct || "Good"}</p>
              <h3>Fees balance</h3>
              <p className="rc-conduct">
                {info.fees_balance === undefined
                    ? "-"
                    : Number(info.fees_balance) === 0
                        ? "Cleared"
                        : `UGX ${Number(info.fees_balance).toLocaleString()}`}
              </p>
              <h3>Next term begins</h3>
              <p className="rc-conduct">{info.next_term_begins ? formatDate(info.next_term_begins) : "-"}</p>
            </div>
          </div>

          {/* Comments */}
          <div className="rc-comment">
            <h3>Class teacher's comment</h3>
            <p>{info.class_teacher_comment || autoComment(sum.average, "teacher")}</p>
            <div className="rc-sign"><span /> Signature &amp; date</div>
          </div>
          <div className="rc-comment">
            <h3>{SCHOOL.headTeacher}'s comment</h3>
            <p>{info.head_teacher_comment || autoComment(sum.average, "head")}</p>
            <div className="rc-sign"><span /> Signature &amp; date</div>
            <div className="rc-stamp"><span>School<br />stamp</span></div>
          </div>

          <footer className="rc-foot">
            This report is not valid without the school stamp &middot; Parent / guardian signature: ____________________
          </footer>
        </div>
      </section>
  );
}

function BioField({ label, value, wide }) {
  return (
      <div className={`rc-field ${wide ? "rc-field-wide" : ""}`}>
        <span className="rc-field-label">{label}</span>
        <span className="rc-field-value">{value}</span>
      </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Cover page for the full report (progress since joining)            */
/* ------------------------------------------------------------------ */
function CoverPage({ child, periods, diary }) {
  return (
      <section className="rc-page">
        <div className="rc-frame">
          <header className="rc-head">
            <div className="rc-crest">{SCHOOL.name.charAt(0)}</div>
            <div className="rc-school">
              <h1>{SCHOOL.name}</h1>
              <p className="rc-motto">"{SCHOOL.motto}"</p>
              <p className="rc-contact">{SCHOOL.address} &nbsp;|&nbsp; {SCHOOL.phone} &nbsp;|&nbsp; {SCHOOL.email}</p>
            </div>
            <div className="rc-photo">
              {child.photo ? <img src={child.photo} alt={child.student_name} /> : <span>Passport photo</span>}
            </div>
          </header>
          <div className="rc-banner">Full Academic Report &mdash; since joining the school</div>

          <div className="rc-bio">
            <BioField label="Pupil's name" value={child.student_name} wide />
            <BioField label="Current class" value={child.class_name} />
            <BioField label="Admission no." value={child.admission_no} />
            <BioField label="Date joined" value={formatDate(child.admission_date)} />
            <BioField label="Terms recorded" value={String(periods.length)} />
          </div>

          <div className="rc-comment">
            <h3>Average by term</h3>
            <ProgressBars periods={periods} />
          </div>

          {diary.length > 0 && (
              <div className="rc-comment">
                <h3>Diary highlights</h3>
                <ul className="rc-diary-list">
                  {[...diary].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6).map((d, i) => (
                      <li key={i}><b>{formatDate(d.date)} ({d.type}):</b> {d.note} <i>({d.author})</i></li>
                  ))}
                </ul>
              </div>
          )}

          <footer className="rc-foot">The term report cards follow on the next pages.</footer>
        </div>
      </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Small components                                                   */
/* ------------------------------------------------------------------ */
function ProgressBars({ periods }) {
  if (!periods.length) return <p className="rp-empty">No results recorded yet.</p>;
  return (
      <div className="pb-list">
        {periods.map((p) => {
          const s = summarise(p.rows);
          return (
              <div className="pb-row" key={`${p.year}${p.term}`}>
                <span className="pb-label">{p.term}, {p.year}</span>
                <div className="pb-track">
                  <div className="pb-fill" style={{ width: `${Math.min(100, s.average)}%` }} />
                </div>
                <span className="pb-value">{s.average.toFixed(1)}% ({s.grade})</span>
              </div>
          );
        })}
      </div>
  );
}

function FilterField({ label, children }) {
  return (
      <label className="rp-field">
        <span>{label}</span>
        {children}
      </label>
  );
}

function EmptyState({ text }) {
  return <div className="rp-panel rp-empty">{text}</div>;
}