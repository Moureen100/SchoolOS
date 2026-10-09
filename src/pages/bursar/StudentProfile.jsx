import { useState, useMemo } from "react";
import { FaPrint, FaCheckCircle, FaSearch } from "react-icons/fa";
import { Page, Card, Field, Message, money, SAMPLE_STUDENTS } from "./BursarUI";
import "./StudentProfile.css";

// SAMPLE payment history - replace with GET /bursar/students/:id/payments
const HISTORY = { 2: [["2026-09-02", "RC-0088", "Mobile Money", 100000], ["2026-10-08", "RC-0102", "Mobile Money", 50000]], 4: [["2026-09-15", "RC-0095", "Bank Slip", 300000]], 6: [["2026-09-20", "RC-0099", "Bursar Office", 80000]] };

export default function StudentProfile() {
    const [q, setQ] = useState("");
    const [sel, setSel] = useState(null);
    const [cleared, setCleared] = useState({});
    const [notice, setNotice] = useState("");

    const matches = useMemo(() => (q.trim() ? SAMPLE_STUDENTS.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())) : []), [q]);
    const rows = sel ? HISTORY[sel.id] || (sel.paid ? [["2026-09-01", "RC-0001", "Bursar Office", sel.paid]] : []) : [];
    const balance = sel ? sel.due - sel.paid : 0;

    const clear = () => { setCleared({ ...cleared, [sel.id]: true }); setNotice(`Clearance issued for ${sel.name}.`); };

    return (
        <Page className="student-profile-content" title="Student Financial Profile" subtitle="Payment history, statements and clearance">
            <Message text={notice} />
            <div className="bs-grid">
                <Card title="Find Student" accent="blue" wide>
                    <Field label="Search by name"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Start typing a name" /></Field>
                    <div className="bs-flex">
                        {matches.map((s) => <button type="button" key={s.id} className="bs-btn bs-btn--sm" onClick={() => { setSel(s); setQ(""); setNotice(""); }}><FaSearch /> {s.name} · {s.cls}</button>)}
                    </div>
                </Card>

                {sel && (
                    <>
                        <Card title={`${sel.name} · ${sel.cls}`} accent={balance > 0 ? "red" : "green"} wide>
                            <div className="bs-row">
                                <div><span className="bs-stat-label">Fees due</span><div className="bs-stat-value">{money(sel.due)}</div></div>
                                <div><span className="bs-stat-label">Paid</span><div className="bs-stat-value">{money(sel.paid)}</div></div>
                            </div>
                            <div><span className="bs-stat-label">Balance</span> <span className={`bs-badge ${balance > 0 ? "is-bad" : "is-ok"}`}>{balance > 0 ? money(balance) : "Fully paid"}</span></div>
                            <div className="bs-scroll">
                                <table className="bs-table">
                                    <thead><tr><th>Date</th><th>Receipt</th><th>Method</th><th className="bs-num">Amount</th></tr></thead>
                                    <tbody>
                                    {rows.length === 0 && <tr><td colSpan={4} className="bs-empty">No payments yet.</td></tr>}
                                    {rows.map(([d, r, m, a]) => <tr key={r}><td>{d}</td><td>{r}</td><td>{m}</td><td className="bs-num">{money(a)}</td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bs-flex bs-no-print">
                                <button type="button" className="bs-btn" onClick={() => window.print()}><FaPrint /> Print statement for parent</button>
                                {cleared[sel.id]
                                    ? <span className="bs-badge is-ok">Cleared</span>
                                    : <button type="button" className="bs-primary" disabled={balance > 0} onClick={clear} title={balance > 0 ? "Balance must be zero" : ""}><FaCheckCircle /> Issue clearance (leaving school)</button>}
                            </div>
                            {balance > 0 && <p className="bs-hint bs-no-print">Clearance is only available once the balance is zero.</p>}
                        </Card>
                    </>
                )}
            </div>
        </Page>
    );
}
