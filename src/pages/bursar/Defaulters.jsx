import { useState, useMemo } from "react";
import { FaSms, FaPrint } from "react-icons/fa";
import { Page, Card, Field, Message, money, CLASSES, SAMPLE_STUDENTS } from "./BursarUI";
import "./Defaulters.css";

export default function Defaulters() {
    const [students, setStudents] = useState(SAMPLE_STUDENTS.map((s) => ({ ...s, blocked: s.paid === 0 })));
    const [cls, setCls] = useState("");
    const [minOwed, setMinOwed] = useState("");
    const [picked, setPicked] = useState([]);
    const [notice, setNotice] = useState("");

    const rows = useMemo(() => students
        .map((s) => ({ ...s, owed: s.due - s.paid }))
        .filter((s) => s.owed > 0 && (!cls || s.cls === cls) && (!minOwed || s.owed >= Number(minOwed)))
        .sort((a, b) => b.owed - a.owed), [students, cls, minOwed]);

    const total = rows.reduce((t, s) => t + s.owed, 0);
    const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    const allPicked = rows.length > 0 && rows.every((r) => picked.includes(r.id));

    const remind = () => {
        // TODO: POST /bursar/reminders { studentIds, channel: "sms" | "whatsapp" }
        setNotice(`Reminder queued for ${picked.length} parent${picked.length === 1 ? "" : "s"}.`);
        setPicked([]);
    };

    return (
        <Page className="defaulters-content" title="Defaulters & Debt" subtitle="Who owes what, reminders and report card blocks">
            <Message text={notice} />
            <div className="bs-grid">
                <Card title="Filters" accent="blue" wide>
                    <div className="bs-row">
                        <Field label="Class"><select value={cls} onChange={(e) => setCls(e.target.value)}><option value="">All classes</option>{CLASSES.map((c) => <option key={c}>{c}</option>)}</select></Field>
                        <Field label="Minimum amount owed (UGX)"><input type="number" min="0" value={minOwed} onChange={(e) => setMinOwed(e.target.value)} /></Field>
                    </div>
                </Card>

                <Card title={`Defaulters (${rows.length}) · ${money(total)} owed`} accent="red" wide>
                    <div className="bs-flex bs-no-print">
                        <button type="button" className="bs-primary" disabled={!picked.length} onClick={remind}><FaSms /> Send SMS / WhatsApp reminder ({picked.length})</button>
                        <button type="button" className="bs-btn" onClick={() => window.print()}><FaPrint /> Debtors report for Headteacher</button>
                    </div>
                    <div className="bs-scroll">
                        <table className="bs-table">
                            <thead><tr>
                                <th className="bs-no-print"><input type="checkbox" aria-label="Select all" checked={allPicked} onChange={() => setPicked(allPicked ? [] : rows.map((r) => r.id))} /></th>
                                <th>Student</th><th>Class</th><th>Parent phone</th><th className="bs-num">Owed</th><th className="bs-no-print">Report card / exam</th>
                            </tr></thead>
                            <tbody>
                            {rows.length === 0 && <tr><td colSpan={6} className="bs-empty">No defaulters match these filters.</td></tr>}
                            {rows.map((s) => (
                                <tr key={s.id}>
                                    <td className="bs-no-print"><input type="checkbox" aria-label={`Select ${s.name}`} checked={picked.includes(s.id)} onChange={() => toggle(s.id)} /></td>
                                    <td>{s.name}</td><td>{s.cls}</td><td>{s.parent}</td><td className="bs-num">{money(s.owed)}</td>
                                    <td className="bs-no-print">
                                        <button type="button" className={`bs-badge ${s.blocked ? "is-bad" : "is-ok"}`} style={{ border: "none", cursor: "pointer" }}
                                                onClick={() => setStudents(students.map((x) => (x.id === s.id ? { ...x, blocked: !x.blocked } : x)))}
                                                aria-label={`${s.blocked ? "Unblock" : "Block"} ${s.name}`}>{s.blocked ? "Blocked" : "Allowed"}</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="bs-hint bs-no-print">The system should block blocked pupils' report cards and exam slips automatically (a backend rule).</p>
                </Card>
            </div>
        </Page>
    );
}
