import { useState } from "react";
import { FaPlus } from "react-icons/fa";
import { Page, Card, Field, Message, Stat, money } from "./BursarUI";
import "./Expenses.css";

const CATEGORIES = ["Salaries", "Utilities", "Food & Lunch", "Stationery", "Repairs", "Transport", "Other"];
// SAMPLE DATA - replace with GET/POST /bursar/expenses
const SEED = [
    { id: 1, date: "2026-10-09", category: "Utilities", note: "Electricity token", amount: 120000 },
    { id: 2, date: "2026-10-09", category: "Stationery", note: "Chalk and registers", amount: 60000 },
];
const today = () => new Date().toISOString().slice(0, 10);

export default function Expenses() {
    const [items, setItems] = useState(SEED);
    const [form, setForm] = useState({ date: today(), category: "", note: "", amount: "" });
    const [notice, setNotice] = useState("");

    const add = (e) => {
        e.preventDefault();
        if (!form.category || !Number(form.amount)) return;
        setItems([{ id: Date.now(), ...form, amount: Number(form.amount) }, ...items]);
        setForm({ ...form, note: "", amount: "" });
        setNotice("Expense recorded.");
    };
    const todayTotal = items.filter((i) => i.date === today()).reduce((t, i) => t + i.amount, 0);
    const allTotal = items.reduce((t, i) => t + i.amount, 0);

    return (
        <Page className="expenses-content" title="Expenses" subtitle="Record what the school spends">
            <Message text={notice} />
            <div className="bs-grid">
                <Stat label="Spent today" value={money(todayTotal)} accent="navy" />
                <Stat label="Total recorded" value={money(allTotal)} accent="blue" />
                <Card title="Add Expense" accent="yellow" wide>
                    <form onSubmit={add} style={{ display: "contents" }}>
                        <div className="bs-row">
                            <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
                            <Field label="Category"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">Select category</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
                        </div>
                        <div className="bs-row">
                            <Field label="Amount (UGX)"><input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
                            <Field label="Note"><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
                        </div>
                        <button type="submit" className="bs-primary" style={{ alignSelf: "flex-start" }} disabled={!form.category || !Number(form.amount)}><FaPlus /> Add Expense</button>
                    </form>
                </Card>
                <Card title="Expense List" accent="green" wide>
                    <div className="bs-scroll">
                        <table className="bs-table">
                            <thead><tr><th>Date</th><th>Category</th><th>Note</th><th className="bs-num">Amount</th></tr></thead>
                            <tbody>
                            {items.map((i) => <tr key={i.id}><td>{i.date}</td><td>{i.category}</td><td>{i.note || "—"}</td><td className="bs-num">{money(i.amount)}</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </Page>
    );
}
