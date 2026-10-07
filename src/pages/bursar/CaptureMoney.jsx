import { useEffect, useMemo, useState } from "react";
import Layout from "../../Layout";
import "./CaptureMoney.css";

const API_URL = import.meta.env.VITE_API_URL;

/* Set to false when your backend is ready */
const USE_DUMMY = true;

/* ================= DUMMY DATA (stands in for the backend) ================= */
const dayStr = (offset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
};

// paid_before = money already paid before the payments listed below
const DUMMY_STUDENTS = [
    { student_id: "STU001", student_name: "Namukasa Grace", student_class: "P.5", stream: "Blue", total_fee: 450000, paid_before: 200000 },
    { student_id: "STU002", student_name: "Okello Brian", student_class: "P.5", stream: "Red", total_fee: 450000, paid_before: 450000 },
    { student_id: "STU003", student_name: "Nakato Ruth", student_class: "P.6", stream: "Blue", total_fee: 500000, paid_before: 100000 },
    { student_id: "STU004", student_name: "Mugisha Daniel", student_class: "P.6", stream: "Red", total_fee: 500000, paid_before: 0 },
    { student_id: "STU005", student_name: "Atim Esther", student_class: "P.7", stream: "Blue", total_fee: 550000, paid_before: 300000 },
    { student_id: "STU006", student_name: "Kato Samuel", student_class: "P.7", stream: "Red", total_fee: 550000, paid_before: 150000 },
    { student_id: "STU007", student_name: "Nansubuga Joy", student_class: "P.5", stream: "Blue", total_fee: 450000, paid_before: 50000 },
    { student_id: "STU008", student_name: "Tumusiime Peter", student_class: "P.6", stream: "Blue", total_fee: 500000, paid_before: 250000 },
];

const DUMMY_PAYMENTS = [
    { ref: "CSH-001", student_id: "STU001", amount: 100000, date: dayStr(0), method: "cash", purpose: "Term 1 tuition" },
    { ref: "SP-1001", student_id: "STU003", amount: 150000, date: dayStr(0), method: "schoolpay", purpose: "Term 1 tuition" },
    { ref: "MTN-2001", student_id: "STU005", amount: 120000, date: dayStr(0), method: "mtn", purpose: "Term 1 tuition" },
    { ref: "CSH-002", student_id: "STU002", amount: 50000, date: dayStr(-1), method: "cash", purpose: "Uniform" },
    { ref: "SYS-3001", student_id: "STU008", amount: 80000, date: dayStr(-1), method: "system", purpose: "Term 1 tuition" },
];

// What each provider "sends" when the bursar presses capture
const DUMMY_INCOMING = {
    schoolpay: [
        { ref: "SP-1002", student_id: "STU004", amount: 200000, method: "schoolpay", purpose: "Term 1 tuition" },
        { ref: "SP-1003", student_id: "STU006", amount: 100000, method: "schoolpay", purpose: "Term 1 tuition" },
    ],
    mtn: [{ ref: "MTN-2002", student_id: "STU007", amount: 60000, method: "mtn", purpose: "Term 1 tuition" }],
    airtel: [{ ref: "AIR-4001", student_id: "STU001", amount: 75000, method: "airtel", purpose: "Term 1 tuition" }],
    system: [
        { ref: "SYS-3002", student_id: "STU003", amount: 90000, method: "system", purpose: "Term 1 tuition" },
        { ref: "SYS-3003", student_id: "STU005", amount: 130000, method: "system", purpose: "Term 1 tuition" },
    ],
};

/* ================= HELPERS ================= */
const METHODS = {
    cash: { label: "Cash", tag: "cm-tag--navy" },
    mobile_money: { label: "Mobile Money", tag: "cm-tag--yellow" },
    bank_transfer: { label: "Bank Transfer", tag: "cm-tag--blue" },
    cheque: { label: "Cheque", tag: "cm-tag--navy" },
    schoolpay: { label: "SchoolPay", tag: "cm-tag--blue" },
    mtn: { label: "MTN MoMo", tag: "cm-tag--yellow" },
    airtel: { label: "Airtel Money", tag: "cm-tag--red" },
    system: { label: "Paid in system", tag: "cm-tag--green" },
};

const ugx = (n) => "UGX " + Number(n || 0).toLocaleString();
const methodInfo = (m) => METHODS[m] || { label: m || "Other", tag: "cm-tag--navy" };

export default function CaptureMoney() {
    const [date, setDate] = useState(dayStr(0));
    const [form, setForm] = useState({
        student_id: "",
        amount: "",
        date: dayStr(0),
        method: "cash",
        purpose: "",
    });

    const [recent, setRecent] = useState([]);
    const [balances, setBalances] = useState([]);
    const [dummyPayments, setDummyPayments] = useState(DUMMY_PAYMENTS);

    const [dayClass, setDayClass] = useState("all");
    const [daySearch, setDaySearch] = useState("");
    const [balClass, setBalClass] = useState("all");
    const [balSearch, setBalSearch] = useState("");

    const [momo, setMomo] = useState("mtn");
    const [saving, setSaving] = useState(false);
    const [busy, setBusy] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingBalances, setLoadingBalances] = useState(false);
    const [notice, setNotice] = useState(null);

    const say = (type, text) => setNotice({ type, text });

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    /* ================= DUMMY MODE: build the same shapes the backend returns ================= */
    useEffect(() => {
        if (!USE_DUMMY) return;

        const studentOf = (id) => DUMMY_STUDENTS.find((s) => s.student_id === id);

        setRecent(
            dummyPayments
                .filter((p) => p.date === date)
                .map((p) => {
                    const s = studentOf(p.student_id) || {};
                    return {
                        payment: {
                            ...p,
                            student_name: s.student_name || p.student_id,
                            student_class: s.student_class,
                            stream: s.stream,
                        },
                    };
                })
        );

        setBalances(
            DUMMY_STUDENTS.map((s) => {
                const paid =
                    s.paid_before +
                    dummyPayments.filter((p) => p.student_id === s.student_id).reduce((t, p) => t + p.amount, 0);
                return {
                    student_id: s.student_id,
                    student_name: s.student_name,
                    student_class: s.student_class,
                    stream: s.stream,
                    total_fee: s.total_fee,
                    total_paid: paid,
                    balance: Math.max(s.total_fee - paid, 0),
                };
            })
        );
    }, [dummyPayments, date]);

    /* ================= REAL MODE: GET PAYMENTS FOR SELECTED DAY ================= */
    async function getPaymentsForDay(day) {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/payments?date=${day}`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(typeof data === "string" ? data : data.message || "Failed to get payments");
            }
            setRecent(data);
        } catch (err) {
            say("error", err.message || "Failed to load payments.");
            setRecent([]);
        } finally {
            setLoading(false);
        }
    }

    /* ASSUMED endpoint: GET /payments/balances
       returns [{ student_id, student_name, student_class, stream,
                  total_fee, total_paid, balance }] */
    async function getBalances() {
        setLoadingBalances(true);
        try {
            const response = await fetch(`${API_URL}/payments/balances`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(typeof data === "string" ? data : data.message || "Failed to get balances");
            }
            setBalances(data);
        } catch (err) {
            say("error", err.message || "Failed to load balances.");
            setBalances([]);
        } finally {
            setLoadingBalances(false);
        }
    }

    useEffect(() => {
        if (!USE_DUMMY) getPaymentsForDay(date);
    }, [date]);

    useEffect(() => {
        if (!USE_DUMMY) getBalances();
    }, []);

    /* ================= 1. MANUAL PAYMENT ================= */
    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setNotice(null);

        if (USE_DUMMY) {
            const exists = DUMMY_STUDENTS.some((s) => s.student_id === form.student_id.trim().toUpperCase());
            if (!exists) {
                say("error", "Student ID not found. Try STU001 to STU008.");
                setSaving(false);
                return;
            }
            setDummyPayments((prev) => [
                ...prev,
                {
                    ref: `MAN-${Date.now()}`,
                    student_id: form.student_id.trim().toUpperCase(),
                    amount: Number(form.amount),
                    date: form.date,
                    method: form.method,
                    purpose: form.purpose,
                },
            ]);
            say("success", "Payment captured successfully.");
            setDate(form.date);
            setForm((prev) => ({ ...prev, student_id: "", amount: "", purpose: "" }));
            setSaving(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/payments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(typeof data === "string" ? data : data.message || "Failed to capture payment");
            }
            say("success", "Payment captured successfully.");
            setDate(form.date);
            if (form.date === date) await getPaymentsForDay(date);
            await getBalances();
            setForm((prev) => ({ ...prev, student_id: "", amount: "", purpose: "" }));
        } catch (err) {
            say("error", err.message || "Something went wrong while saving the payment.");
        } finally {
            setSaving(false);
        }
    }

    /* ================= 2, 3 & 4. SCHOOLPAY / MOBILE MONEY / SYSTEM =================
       ASSUMED endpoint: POST /payments/sync/:provider   body { date }
       provider = schoolpay | mtn | airtel | system */
    async function capture(provider) {
        setBusy(provider);
        setNotice(null);

        if (USE_DUMMY) {
            setTimeout(() => {
                const incoming = DUMMY_INCOMING[provider] || [];
                const known = new Set(dummyPayments.map((p) => p.ref));
                const fresh = incoming.filter((p) => !known.has(p.ref)).map((p) => ({ ...p, date }));
                setDummyPayments((prev) => [...prev, ...fresh]);
                say(
                    "success",
                    fresh.length
                        ? `${fresh.length} new ${methodInfo(provider).label} payment(s) captured for ${date}.`
                        : `No new ${methodInfo(provider).label} payments. Everything is already captured.`
                );
                setBusy(null);
            }, 600);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/payments/sync/${provider}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || `error ${response.status}`);
            await getPaymentsForDay(date);
            await getBalances();
            say("success", `${methodInfo(provider).label} payments captured for ${date}.`);
        } catch (err) {
            say("error", `Could not capture ${methodInfo(provider).label} payments (${err.message}). Try again in a moment.`);
        } finally {
            setBusy(null);
        }
    }

    /* ================= FIGURES ================= */
    const payments = useMemo(() => recent.map((r) => r.payment).filter(Boolean), [recent]);

    const total = (...ms) =>
        payments
            .filter((p) => ms.length === 0 || ms.includes(p.method))
            .reduce((t, p) => t + Number(p.amount || 0), 0);
    const count = (...ms) => payments.filter((p) => ms.includes(p.method)).length;

    const classOptions = useMemo(() => {
        const set = new Set();
        payments.forEach((p) => p.student_class && set.add(p.student_class));
        balances.forEach((b) => b.student_class && set.add(b.student_class));
        return [...set].sort();
    }, [payments, balances]);

    const dayRows = payments.filter(
        (p) =>
            (dayClass === "all" || p.student_class === dayClass) &&
            (p.student_name || "").toLowerCase().includes(daySearch.toLowerCase())
    );

    const balanceRows = balances.filter(
        (b) =>
            (balClass === "all" || b.student_class === balClass) &&
            (b.student_name || "").toLowerCase().includes(balSearch.toLowerCase())
    );

    const status = (b) =>
        Number(b.balance) <= 0
            ? ["paid", "Cleared"]
            : Number(b.total_paid) > 0
                ? ["partial", "Partial"]
                : ["unpaid", "Unpaid"];

    const classFilter = (value, onChange) => (
        <div className="cm-select">
            <select className="cm-input" value={value} onChange={(e) => onChange(e.target.value)}>
                <option value="all">All classes</option>
                {classOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                ))}
            </select>
            <i className="fa-solid fa-chevron-down cm-caret" />
        </div>
    );

    const searchBox = (value, onChange) => (
        <div className="cm-search">
            <i className="fa-solid fa-magnifying-glass cm-search-icon" />
            <input
                className="cm-input" placeholder="Search student"
                value={value} onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );

    return (
        <Layout role="bursar">
            <div className="capture-money-content">
                {/* ===== Banner ===== */}
                <header className="cm-hero">
                    <div className="cm-hero-text">
                        <h1 className="cm-hero-title">Capture money</h1>
                        <p className="cm-hero-sub">Record and sync the day's fee payments in one place.</p>
                    </div>
                    <label className="cm-hero-date">
                        <span className="cm-label cm-label--light">Payment date</span>
                        <input type="date" className="cm-input" value={date} onChange={(e) => setDate(e.target.value)} />
                    </label>
                </header>

                {/* ===== Summary ===== */}
                <section className="cm-stats">
                    <article className="cm-stat">
                        <span className="cm-hex"><i className="fa-solid fa-coins" /></span>
                        <div>
                            <div className="cm-label">Collected on {date}</div>
                            <div className="cm-stat-value">{ugx(total())}</div>
                        </div>
                    </article>
                    <article className="cm-stat cm-stat--green">
                        <span className="cm-hex"><i className="fa-solid fa-building-columns" /></span>
                        <div>
                            <div className="cm-label">SchoolPay</div>
                            <div className="cm-stat-value">{ugx(total("schoolpay"))}</div>
                        </div>
                    </article>
                    <article className="cm-stat cm-stat--yellow">
                        <span className="cm-hex"><i className="fa-solid fa-mobile-screen" /></span>
                        <div>
                            <div className="cm-label">Mobile money</div>
                            <div className="cm-stat-value">{ugx(total("mobile_money", "mtn", "airtel"))}</div>
                        </div>
                    </article>
                    <article className="cm-stat cm-stat--red">
                        <span className="cm-hex"><i className="fa-solid fa-laptop" /></span>
                        <div>
                            <div className="cm-label">Paid in system</div>
                            <div className="cm-stat-value">{ugx(total("system"))}</div>
                        </div>
                    </article>
                </section>

                {/* ===== Capture panels ===== */}
                <section className="cm-capture-grid">
                    <form className="cm-panel cm-panel--manual" onSubmit={handleSubmit}>
                        <h2 className="cm-panel-title">Manual payment</h2>
                        <p className="cm-hint">For fees paid by hand at school, or SchoolPay slips the bursar received.</p>

                        <div className="cm-row">
                            <label className="cm-field">
                                <span className="cm-label">Student ID</span>
                                <input
                                    name="student_id" className="cm-input" placeholder="e.g. STU001"
                                    value={form.student_id} onChange={handleChange} required
                                />
                            </label>
                            <label className="cm-field">
                                <span className="cm-label">Amount (UGX)</span>
                                <input
                                    name="amount" type="number" min="0" className="cm-input" placeholder="e.g. 50000"
                                    value={form.amount} onChange={handleChange} required
                                />
                            </label>
                        </div>

                        <div className="cm-row">
                            <label className="cm-field">
                                <span className="cm-label">Date</span>
                                <input
                                    name="date" type="date" className="cm-input"
                                    value={form.date} onChange={handleChange}
                                />
                            </label>
                            <label className="cm-field">
                                <span className="cm-label">Method</span>
                                <div className="cm-select">
                                    <select name="method" className="cm-input" value={form.method} onChange={handleChange}>
                                        <option value="cash">Cash</option>
                                        <option value="mobile_money">Mobile Money</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="cheque">Cheque</option>
                                    </select>
                                    <i className="fa-solid fa-chevron-down cm-caret" />
                                </div>
                            </label>
                        </div>

                        <label className="cm-field">
                            <span className="cm-label">Purpose</span>
                            <input
                                name="purpose" className="cm-input" placeholder="e.g. Term 1 tuition"
                                value={form.purpose} onChange={handleChange}
                            />
                        </label>

                        <button type="submit" className="cm-btn cm-btn--yellow" disabled={saving}>
                            <i className="fa-solid fa-plus" /> {saving ? "Saving…" : "Capture payment"}
                        </button>
                    </form>

                    <div className="cm-panel cm-panel--green">
                        <h2 className="cm-panel-title">SchoolPay capture</h2>
                        <p className="cm-hint">
                            Pulls payments from the SchoolPay API for {date}. Payments already captured are skipped.
                        </p>
                        <div className="cm-sync-line">
                            <span className="cm-label">Captured on {date}</span>
                            <span className="cm-strong">
                                {count("schoolpay")} payments · {ugx(total("schoolpay"))}
                            </span>
                        </div>
                        <button className="cm-btn cm-btn--dark" disabled={busy === "schoolpay"} onClick={() => capture("schoolpay")}>
                            <i className="fa-solid fa-rotate" /> {busy === "schoolpay" ? "Capturing…" : "Capture from SchoolPay"}
                        </button>
                    </div>

                    <div className="cm-panel cm-panel--yellow">
                        <h2 className="cm-panel-title">Mobile money capture</h2>
                        <p className="cm-hint">Reads the MTN or Airtel collection record for {date}.</p>
                        <label className="cm-field">
                            <span className="cm-label">Network</span>
                            <div className="cm-select">
                                <select className="cm-input" value={momo} onChange={(e) => setMomo(e.target.value)}>
                                    <option value="mtn">MTN Mobile Money</option>
                                    <option value="airtel">Airtel Money</option>
                                </select>
                                <i className="fa-solid fa-chevron-down cm-caret" />
                            </div>
                        </label>
                        <div className="cm-sync-line">
                            <span className="cm-label">Captured on {date}</span>
                            <span className="cm-strong">
                                {count("mtn", "airtel")} payments · {ugx(total("mtn", "airtel"))}
                            </span>
                        </div>
                        <button className="cm-btn cm-btn--yellow" disabled={busy === momo} onClick={() => capture(momo)}>
                            <i className="fa-solid fa-rotate" /> {busy === momo ? "Capturing…" : `Capture from ${methodInfo(momo).label}`}
                        </button>
                    </div>

                    <div className="cm-panel cm-panel--red">
                        <h2 className="cm-panel-title">System payments</h2>
                        <p className="cm-hint">
                            Brings in fees that students or parents paid through the system on {date}.
                        </p>
                        <div className="cm-sync-line">
                            <span className="cm-label">Captured on {date}</span>
                            <span className="cm-strong">
                                {count("system")} payments · {ugx(total("system"))}
                            </span>
                        </div>
                        <button className="cm-btn cm-btn--dark" disabled={busy === "system"} onClick={() => capture("system")}>
                            <i className="fa-solid fa-rotate" /> {busy === "system" ? "Capturing…" : "Capture system payments"}
                        </button>
                    </div>
                </section>

                {notice && <div className={`cm-notice cm-notice--${notice.type}`}>{notice.text}</div>}

                {/* ===== Daily payments ===== */}
                <section className="cm-card">
                    <div className="cm-card-head">
                        <h2 className="cm-card-title">Payments on {date}</h2>
                        <div className="cm-controls">
                            {classFilter(dayClass, setDayClass)}
                            {searchBox(daySearch, setDaySearch)}
                        </div>
                    </div>
                    <div className="cm-scroll">
                        <table className="cm-table">
                            <thead>
                            <tr><th>Student</th><th>Class</th><th>Method</th><th>Purpose</th><th>Amount paid</th></tr>
                            </thead>
                            <tbody>
                            {loading && (
                                <tr><td colSpan="5" className="cm-empty">Loading payments…</td></tr>
                            )}
                            {!loading && dayRows.length === 0 && (
                                <tr><td colSpan="5" className="cm-empty">No payments recorded for this day.</td></tr>
                            )}
                            {!loading && dayRows.map((p, i) => (
                                <tr key={`${p.ref || p.student_id}-${p.date}-${p.amount}-${i}`}>
                                    <td>
                                        <div className="cm-person">
                                            <span className="cm-avatar">{(p.student_name || "?")[0]}</span>
                                            <div>
                                                <div className="cm-strong">{p.student_name}</div>
                                                <div className="cm-label">{p.student_id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{p.student_class}{p.stream ? ` • ${p.stream}` : ""}</td>
                                    <td><span className={`cm-tag ${methodInfo(p.method).tag}`}>{methodInfo(p.method).label}</span></td>
                                    <td>{p.purpose || "General payment"}</td>
                                    <td className="cm-paid">{ugx(p.amount)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* ===== Remaining fee balance per student ===== */}
                <section className="cm-card">
                    <div className="cm-card-head">
                        <h2 className="cm-card-title">Remaining fee balance per student</h2>
                        <div className="cm-controls">
                            {classFilter(balClass, setBalClass)}
                            {searchBox(balSearch, setBalSearch)}
                        </div>
                    </div>
                    <div className="cm-scroll">
                        <table className="cm-table">
                            <thead>
                            <tr>
                                <th>Student</th><th>Class</th><th>Total fee</th>
                                <th>Total paid</th><th>Balance</th><th>Status</th>
                            </tr>
                            </thead>
                            <tbody>
                            {loadingBalances && (
                                <tr><td colSpan="6" className="cm-empty">Loading balances…</td></tr>
                            )}
                            {!loadingBalances && balanceRows.length === 0 && (
                                <tr><td colSpan="6" className="cm-empty">No students match this filter.</td></tr>
                            )}
                            {!loadingBalances && balanceRows.map((b) => {
                                const [key, label] = status(b);
                                return (
                                    <tr key={b.student_id}>
                                        <td>
                                            <div className="cm-person">
                                                <span className="cm-avatar">{(b.student_name || "?")[0]}</span>
                                                <div>
                                                    <div className="cm-strong">{b.student_name}</div>
                                                    <div className="cm-label">{b.student_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{b.student_class}{b.stream ? ` • ${b.stream}` : ""}</td>
                                        <td>{ugx(b.total_fee)}</td>
                                        <td className="cm-paid">{ugx(b.total_paid)}</td>
                                        <td className={Number(b.balance) > 0 ? "cm-owed" : "cm-paid"}>{ugx(b.balance)}</td>
                                        <td><span className={`cm-status cm-status--${key}`}>{label}</span></td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </Layout>
    );
}