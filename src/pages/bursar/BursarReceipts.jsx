import { useState } from "react";
import { Page, Card, Field, Message, money } from "./BursarUI";
import "./BursarReceipts.css";

// SAMPLE DATA - replace with GET /bursar/receipts, PATCH /bursar/receipts/:id (backend should write the audit log)
const SEED = [
    { id: "RC-0101", student: "Namuli Grace", amount: 450000, method: "Bursar Office", date: "2026-10-08", status: "valid" },
    { id: "RC-0102", student: "Okello Brian", amount: 150000, method: "Mobile Money", date: "2026-10-08", status: "valid" },
    { id: "RC-0103", student: "Mugisha David", amount: 300000, method: "Bank Slip", date: "2026-10-09", status: "valid" },
];

export default function BursarReceipts() {
    const [receipts, setReceipts] = useState(SEED);
    const [log, setLog] = useState([]);
    const [edit, setEdit] = useState(null);       // { id, amount, reason, mode: "edit" | "cancel" }
    const [notice, setNotice] = useState(null);

    const addLog = (r, action, detail, reason) =>
        setLog((l) => [{ at: new Date().toLocaleString(), receipt: r.id, action, detail, reason }, ...l]);

    const submit = () => {
        const r = receipts.find((x) => x.id === edit.id);
        if (!edit.reason.trim()) return setNotice({ error: true, text: "A reason is required for the audit log." });
        if (edit.mode === "cancel") {
            setReceipts(receipts.map((x) => (x.id === r.id ? { ...x, status: "cancelled" } : x)));
            addLog(r, "Cancelled", money(r.amount), edit.reason);
        } else {
            const amt = Number(edit.amount);
            if (!amt || amt <= 0) return setNotice({ error: true, text: "Enter a valid amount." });
            setReceipts(receipts.map((x) => (x.id === r.id ? { ...x, amount: amt } : x)));
            addLog(r, "Edited", `${money(r.amount)} to ${money(amt)}`, edit.reason);
        }
        setNotice({ text: `${r.id} ${edit.mode === "cancel" ? "cancelled" : "updated"}.` });
        setEdit(null);
    };

    return (
        <Page className="bursar-receipts-content" title="Receipts & Audit Log" subtitle="Cancel or correct a receipt. Every change is recorded">
            <Message text={notice?.text} error={notice?.error} />
            <div className="bs-grid">
                <Card title="Receipts" accent="blue" wide>
                    <div className="bs-scroll">
                        <table className="bs-table">
                            <thead><tr><th>Receipt</th><th>Student</th><th>Method</th><th>Date</th><th className="bs-num">Amount</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                            {receipts.map((r) => (
                                <tr key={r.id} className={r.status === "cancelled" ? "is-cancelled" : ""}>
                                    <td>{r.id}</td><td>{r.student}</td><td>{r.method}</td><td>{r.date}</td>
                                    <td className="bs-num">{money(r.amount)}</td>
                                    <td><span className={`bs-badge ${r.status === "valid" ? "is-ok" : "is-off"}`}>{r.status === "valid" ? "Valid" : "Cancelled"}</span></td>
                                    <td>{r.status === "valid" && (
                                        <span className="bs-flex">
                                            <button type="button" className="bs-btn bs-btn--sm" onClick={() => setEdit({ id: r.id, amount: r.amount, reason: "", mode: "edit" })}>Edit</button>
                                            <button type="button" className="bs-btn bs-btn--sm bs-btn--danger" onClick={() => setEdit({ id: r.id, amount: r.amount, reason: "", mode: "cancel" })}>Cancel</button>
                                        </span>)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {edit && (
                    <Card title={`${edit.mode === "cancel" ? "Cancel" : "Edit"} receipt ${edit.id}`} accent="yellow" wide>
                        {edit.mode === "edit" && (
                            <Field label="Correct amount (UGX)"><input type="number" min="1" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} /></Field>
                        )}
                        <Field label="Reason (saved in the audit log)"><textarea value={edit.reason} onChange={(e) => setEdit({ ...edit, reason: e.target.value })} /></Field>
                        <div className="bs-flex">
                            <button type="button" className="bs-primary" onClick={submit}>Confirm {edit.mode === "cancel" ? "Cancel" : "Edit"}</button>
                            <button type="button" className="bs-btn" onClick={() => setEdit(null)}>Back</button>
                        </div>
                    </Card>
                )}

                <Card title="Audit Log" accent="navy" wide>
                    {log.length === 0 ? <div className="bs-empty">No changes yet.</div> : (
                        <div className="bs-scroll">
                            <table className="bs-table">
                                <thead><tr><th>When</th><th>Receipt</th><th>Action</th><th>Detail</th><th>Reason</th></tr></thead>
                                <tbody>{log.map((l, i) => <tr key={i}><td>{l.at}</td><td>{l.receipt}</td><td>{l.action}</td><td>{l.detail}</td><td>{l.reason}</td></tr>)}</tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
        </Page>
    );
}
