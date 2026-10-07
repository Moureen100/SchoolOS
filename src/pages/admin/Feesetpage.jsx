import React, { useState, useMemo } from "react";
import {
    FaSearch,
    FaEdit,
    FaTrash,
    FaChevronDown,
    FaTimes,
    FaSave,
    FaMoneyBillWave,
    FaWallet,
    FaBalanceScale,
    FaPercentage,
} from "react-icons/fa";
import Layout from "../../Layout";
import "./FeeSet.css";

// =====================================================
// OPTIONS
// =====================================================
const CLASS_OPTIONS = [
    "Nursery", "Middle", "Top",
    "P.1", "P.2", "P.3", "P.4", "P.5", "P.6", "P.7",
];
const YEARS = ["2025", "2026", "2027"];
const TERMS = ["Term 1", "Term 2", "Term 3"];
const METHODS = ["Bursar Office", "School Pay", "Mobile Money", "Bank Slip"];

const METHOD_CLASS = {
    "Bursar Office": "navy",
    "School Pay": "blue",
    "Mobile Money": "yellow",
    "Bank Slip": "green",
};

// =====================================================
// HELPERS
// =====================================================
const money = (n) => `UGX ${Number(n || 0).toLocaleString("en-UG")}`;

let idCounter = 100;
const uid = () => ++idCounter;

const classLabel = (s) => (s.stream ? `${s.level} ${s.stream}` : s.level);

// =====================================================
// SAMPLE DATA (replace with API calls when the backend is ready)
// =====================================================
const P = { year: "2026", term: "Term 3" };

const SEED_STUDENTS = [
    { id: 1, name: "Namuli Grace", level: "P.1", stream: "A" },
    { id: 2, name: "Okello Brian", level: "P.3", stream: "B" },
    { id: 3, name: "Nakato Esther", level: "P.5", stream: "A" },
    { id: 4, name: "Mugisha David", level: "P.6", stream: "A" },
    { id: 5, name: "Atim Sarah", level: "P.7", stream: "B" },
    { id: 6, name: "Kato Samuel", level: "Top", stream: "" },
    { id: 7, name: "Nabirye Joan", level: "P.2", stream: "A" },
    { id: 8, name: "Ssemwogerere Peter", level: "P.4", stream: "C" },
];

const SEED_FEES = [
    ["Top", 300000], ["P.1", 350000], ["P.2", 350000], ["P.3", 380000],
    ["P.4", 400000], ["P.5", 420000], ["P.6", 450000], ["P.7", 500000],
].map(([level, amount]) => ({ id: uid(), ...P, level, amount }));

const SEED_SPECIALS = [
    { id: uid(), studentId: 2, ...P, amount: 200000, reason: "Bursary" },
];

const SEED_PAYMENTS = [
    [1, 350000, "School Pay", "SP-88121"],
    [2, 100000, "Mobile Money", "MM-5521"],
    [2, 50000, "Bursar Office", "RC-0042"],
    [3, 200000, "Bank Slip", "BS-7731"],
    [4, 450000, "Mobile Money", "MM-6610"],
    [6, 100000, "Bursar Office", "RC-0051"],
].map(([studentId, amount, method, reference]) => ({
    id: uid(), studentId, ...P, amount, method, reference,
    date: "2026-09-12",
}));

// =====================================================
// SMALL SELECT COMPONENT
// =====================================================
const SelectBox = ({ value, onChange, children }) => (
    <div className="fs-select">
        <select value={value} onChange={onChange}>
            {children}
        </select>
        <FaChevronDown className="fs-caret" />
    </div>
);

// =====================================================
// PAGE
// =====================================================
const FeeSetPage = () => {
    const [period, setPeriod] = useState(P);
    const { year, term } = period;

    const [students] = useState(SEED_STUDENTS);
    const [fees, setFees] = useState(SEED_FEES);
    const [specials, setSpecials] = useState(SEED_SPECIALS);
    const [payments, setPayments] = useState(SEED_PAYMENTS);

    const [feeForm, setFeeForm] = useState({ level: "", amount: "" });
    const [specialForm, setSpecialForm] = useState({ studentId: "", amount: "", reason: "" });
    const [payForm, setPayForm] = useState({ studentId: "", amount: "", method: "", reference: "" });
    const [message, setMessage] = useState(null);

    const [search, setSearch] = useState("");
    const [classFilter, setClassFilter] = useState("");
    const [methodFilter, setMethodFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const flash = (type, text) => setMessage({ type, text });
    const inPeriod = (x) => x.year === year && x.term === term;

    // =================================================
    // FEE PER STUDENT FOR THE SELECTED YEAR + TERM
    // special fee wins over the class fee
    // =================================================
    const rows = useMemo(() => {
        return students.map((s) => {
            const special = specials.find((x) => x.studentId === s.id && inPeriod(x));
            const standard = fees.find((f) => f.level === s.level && inPeriod(f))?.amount || 0;
            const due = special ? special.amount : standard;

            const pays = payments.filter((p) => p.studentId === s.id && inPeriod(p));
            const paid = pays.reduce((sum, p) => sum + p.amount, 0);
            const balance = Math.max(due - paid, 0);

            const status =
                due === 0 ? "No fee" : balance === 0 ? "Paid" : paid > 0 ? "Partial" : "Unpaid";

            return {
                ...s, special, due, paid, balance, status,
                methods: [...new Set(pays.map((p) => p.method))],
            };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [students, fees, specials, payments, year, term]);

    const totals = useMemo(() => {
        const expected = rows.reduce((a, r) => a + r.due, 0);
        const collected = rows.reduce((a, r) => a + r.paid, 0);
        const balance = rows.reduce((a, r) => a + r.balance, 0);
        return {
            expected, collected, balance,
            rate: expected ? Math.round((collected / expected) * 100) : 0,
        };
    }, [rows]);

    const periodFees = useMemo(
        () =>
            fees
                .filter(inPeriod)
                .sort((a, b) => CLASS_OPTIONS.indexOf(a.level) - CLASS_OPTIONS.indexOf(b.level)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [fees, year, term]
    );

    const periodSpecials = specials.filter(inPeriod);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter(
            (r) =>
                (q === "" || r.name.toLowerCase().includes(q)) &&
                (classFilter === "" || r.level === classFilter) &&
                (methodFilter === "" || r.methods.includes(methodFilter)) &&
                (statusFilter === "" || r.status === statusFilter)
        );
    }, [rows, search, classFilter, methodFilter, statusFilter]);

    // =================================================
    // 1. SET CLASS FEE (add or update for this year + term)
    // =================================================
    const handleSaveFee = (e) => {
        e.preventDefault();
        const amount = Number(feeForm.amount);

        if (!feeForm.level || !(amount > 0)) {
            return flash("error", "Choose a class and enter an amount above zero.");
        }

        const existing = fees.find((f) => f.level === feeForm.level && inPeriod(f));

        setFees((prev) =>
            existing
                ? prev.map((f) => (f.id === existing.id ? { ...f, amount } : f))
                : [...prev, { id: uid(), year, term, level: feeForm.level, amount }]
        );

        flash("success", `${feeForm.level} fee for ${term}, ${year} is now ${money(amount)}.`);
        setFeeForm({ level: "", amount: "" });
    };

    const handleEditFee = (f) => setFeeForm({ level: f.level, amount: String(f.amount) });

    const handleDeleteFee = (f) => {
        if (!window.confirm(`Remove the ${f.level} fee for ${term}, ${year}?`)) return;
        setFees((prev) => prev.filter((x) => x.id !== f.id));
    };

    // =================================================
    // 2. SPECIAL ALLOCATION (bursary, discount, waiver)
    // =================================================
    const handleSaveSpecial = (e) => {
        e.preventDefault();
        const amount = Number(specialForm.amount);
        const studentId = Number(specialForm.studentId);

        if (!studentId || specialForm.amount === "" || amount < 0) {
            return flash("error", "Choose a student and enter the special fee (0 means fully waived).");
        }

        const reason = specialForm.reason.trim() || "Special case";
        const existing = specials.find((x) => x.studentId === studentId && inPeriod(x));

        setSpecials((prev) =>
            existing
                ? prev.map((x) => (x.id === existing.id ? { ...x, amount, reason } : x))
                : [...prev, { id: uid(), studentId, year, term, amount, reason }]
        );

        const name = students.find((s) => s.id === studentId)?.name;
        flash("success", `${name} now pays ${money(amount)} for ${term}, ${year}.`);
        setSpecialForm({ studentId: "", amount: "", reason: "" });
    };

    const handleRemoveSpecial = (x) => setSpecials((prev) => prev.filter((y) => y.id !== x.id));

    // =================================================
    // 3. RECORD A PAYMENT
    // =================================================
    const handleRecordPayment = (e) => {
        e.preventDefault();
        const amount = Number(payForm.amount);
        const studentId = Number(payForm.studentId);
        const row = rows.find((r) => r.id === studentId);

        if (!row || !(amount > 0) || !payForm.method) {
            return flash("error", "Choose a student, an amount and a payment method.");
        }
        if (row.due === 0) {
            return flash("error", `No fee is set for ${row.level} in ${term}, ${year}. Set it first.`);
        }
        if (amount > row.balance) {
            return flash("error", `${row.name} only owes ${money(row.balance)}.`);
        }

        setPayments((prev) => [
            ...prev,
            {
                id: uid(), studentId, year, term, amount,
                method: payForm.method,
                reference: payForm.reference.trim(),
                date: new Date().toISOString().slice(0, 10),
            },
        ]);

        flash("success", `${money(amount)} received from ${row.name} (${payForm.method}).`);
        setPayForm({ studentId: "", amount: "", method: "", reference: "" });
    };

    const payStudent = rows.find((r) => r.id === Number(payForm.studentId));

    // =================================================
    // RENDER
    // =================================================
    return (
        <Layout role="admin">
            <div className="fee-set-content">
                {/* HEADER + PERIOD */}
                <header className="fs-page-header">
                    <div className="fs-header-text">
                        <h1 className="fs-title">Fee Management</h1>
                        <h2 className="fs-subtitle">
                            Set class fees, allocate special cases and track payments
                        </h2>
                    </div>

                    <div className="fs-period">
                        <label className="fs-control">
                            <span className="fs-control-label">Year</span>
                            <SelectBox
                                value={year}
                                onChange={(e) => setPeriod({ ...period, year: e.target.value })}
                            >
                                {YEARS.map((y) => <option key={y}>{y}</option>)}
                            </SelectBox>
                        </label>
                        <label className="fs-control">
                            <span className="fs-control-label">Term</span>
                            <SelectBox
                                value={term}
                                onChange={(e) => setPeriod({ ...period, term: e.target.value })}
                            >
                                {TERMS.map((t) => <option key={t}>{t}</option>)}
                            </SelectBox>
                        </label>
                    </div>
                </header>

                {/* SUMMARY */}
                <section className="fs-summary">
                    <div className="fs-stat fs-stat--blue">
                        <span className="fs-stat-icon"><FaMoneyBillWave /></span>
                        <div>
                            <div className="fs-stat-label">Total expected</div>
                            <div className="fs-stat-value">{money(totals.expected)}</div>
                        </div>
                    </div>
                    <div className="fs-stat fs-stat--green">
                        <span className="fs-stat-icon"><FaWallet /></span>
                        <div>
                            <div className="fs-stat-label">Revenue collected</div>
                            <div className="fs-stat-value">{money(totals.collected)}</div>
                        </div>
                    </div>
                    <div className="fs-stat fs-stat--red">
                        <span className="fs-stat-icon"><FaBalanceScale /></span>
                        <div>
                            <div className="fs-stat-label">Total balance</div>
                            <div className="fs-stat-value">{money(totals.balance)}</div>
                        </div>
                    </div>
                    <div className="fs-stat fs-stat--yellow">
                        <span className="fs-stat-icon"><FaPercentage /></span>
                        <div className="fs-stat-grow">
                            <div className="fs-stat-label">Collection rate</div>
                            <div className="fs-stat-value">{totals.rate}%</div>
                            <div className="fs-progress">
                                <span style={{ width: `${totals.rate}%` }} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* THREE FORM CARDS */}
                <div className="fs-form-grid">
                    {/* SET CLASS FEE */}
                    <form className="fs-fieldset fs-accent-blue" onSubmit={handleSaveFee}>
                        <h3 className="fs-legend">Set Class Fee</h3>
                        <p className="fs-hint">For {term}, {year}</p>

                        <label className="fs-field">
                            <span className="fs-field-label">Class</span>
                            <SelectBox
                                value={feeForm.level}
                                onChange={(e) => setFeeForm({ ...feeForm, level: e.target.value })}
                            >
                                <option value="">Select a class</option>
                                {CLASS_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                            </SelectBox>
                        </label>

                        <label className="fs-field">
                            <span className="fs-field-label">Fee amount (UGX)</span>
                            <input
                                type="number" min="0" placeholder="e.g. 400000"
                                value={feeForm.amount}
                                onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                            />
                        </label>

                        <button type="submit" className="fs-btn-primary">
                            <FaSave /> Save class fee
                        </button>
                    </form>

                    {/* SPECIAL ALLOCATION */}
                    <form className="fs-fieldset fs-accent-green" onSubmit={handleSaveSpecial}>
                        <h3 className="fs-legend">Special Allocation</h3>
                        <p className="fs-hint">Bursary, discount or waiver for one student</p>

                        <label className="fs-field">
                            <span className="fs-field-label">Student</span>
                            <SelectBox
                                value={specialForm.studentId}
                                onChange={(e) => setSpecialForm({ ...specialForm, studentId: e.target.value })}
                            >
                                <option value="">Select a student</option>
                                {students.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({classLabel(s)})
                                    </option>
                                ))}
                            </SelectBox>
                        </label>

                        <div className="fs-field-row">
                            <label className="fs-field">
                                <span className="fs-field-label">Special fee (UGX)</span>
                                <input
                                    type="number" min="0" placeholder="0 = waived"
                                    value={specialForm.amount}
                                    onChange={(e) => setSpecialForm({ ...specialForm, amount: e.target.value })}
                                />
                            </label>
                            <label className="fs-field">
                                <span className="fs-field-label">Reason</span>
                                <input
                                    type="text" placeholder="Bursary"
                                    value={specialForm.reason}
                                    onChange={(e) => setSpecialForm({ ...specialForm, reason: e.target.value })}
                                />
                            </label>
                        </div>

                        <button type="submit" className="fs-btn-dark">Allocate fee</button>

                        {periodSpecials.length > 0 && (
                            <div className="fs-chip-list">
                                {periodSpecials.map((x) => (
                                    <span className="fs-chip" key={x.id}>
                                        {students.find((s) => s.id === x.studentId)?.name}: {money(x.amount)}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSpecial(x)}
                                            aria-label="Remove special allocation"
                                        >
                                            <FaTimes />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </form>

                    {/* RECORD PAYMENT */}
                    <form className="fs-fieldset fs-accent-yellow" onSubmit={handleRecordPayment}>
                        <h3 className="fs-legend">Record Payment</h3>
                        <p className="fs-hint">
                            {payStudent
                                ? `${payStudent.name} owes ${money(payStudent.balance)}`
                                : "Money received from a student"}
                        </p>

                        <label className="fs-field">
                            <span className="fs-field-label">Student</span>
                            <SelectBox
                                value={payForm.studentId}
                                onChange={(e) => setPayForm({ ...payForm, studentId: e.target.value })}
                            >
                                <option value="">Select a student</option>
                                {students.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({classLabel(s)})
                                    </option>
                                ))}
                            </SelectBox>
                        </label>

                        <div className="fs-field-row">
                            <label className="fs-field">
                                <span className="fs-field-label">Amount (UGX)</span>
                                <input
                                    type="number" min="0" placeholder="Amount paid"
                                    value={payForm.amount}
                                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                                />
                            </label>
                            <label className="fs-field">
                                <span className="fs-field-label">Method</span>
                                <SelectBox
                                    value={payForm.method}
                                    onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                                >
                                    <option value="">Select method</option>
                                    {METHODS.map((m) => <option key={m}>{m}</option>)}
                                </SelectBox>
                            </label>
                        </div>

                        <label className="fs-field">
                            <span className="fs-field-label">Reference (optional)</span>
                            <input
                                type="text" placeholder="Receipt, slip or transaction no."
                                value={payForm.reference}
                                onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                            />
                        </label>

                        <button type="submit" className="fs-btn-primary">Record payment</button>
                    </form>
                </div>

                {message && (
                    <div
                        className={`fs-message fs-message--${message.type}`}
                        role={message.type === "error" ? "alert" : "status"}
                    >
                        {message.text}
                    </div>
                )}

                {/* CLASS FEE STRUCTURE */}
                <section className="fs-table-card">
                    <div className="fs-table-header">
                        <h3 className="fs-table-title">
                            Class Fees: {term}, {year}
                        </h3>
                    </div>
                    <div className="fs-table-scroll">
                        <table className="fs-table">
                            <thead>
                            <tr>
                                <th>Class</th>
                                <th>Fee per student</th>
                                <th>Students</th>
                                <th className="fs-actions-col">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {periodFees.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="fs-empty-row">
                                        No class fees set for this term yet.
                                    </td>
                                </tr>
                            )}
                            {periodFees.map((f) => (
                                <tr key={f.id}>
                                    <td className="fs-strong">{f.level}</td>
                                    <td>{money(f.amount)}</td>
                                    <td>{students.filter((s) => s.level === f.level).length}</td>
                                    <td>
                                        <div className="fs-row-actions">
                                            <button
                                                type="button"
                                                className="fs-icon-btn fs-icon-btn--edit"
                                                onClick={() => handleEditFee(f)}
                                                aria-label={`Edit ${f.level} fee`}
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                type="button"
                                                className="fs-icon-btn fs-icon-btn--delete"
                                                onClick={() => handleDeleteFee(f)}
                                                aria-label={`Delete ${f.level} fee`}
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* STUDENT PAYMENTS */}
                <section className="fs-table-card">
                    <div className="fs-table-header">
                        <h3 className="fs-table-title">Student Payments</h3>

                        <div className="fs-controls">
                            <label className="fs-control">
                                <span className="fs-control-label">Search</span>
                                <div className="fs-search">
                                    <FaSearch className="fs-search-icon" />
                                    <input
                                        type="text" placeholder="Student name"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            </label>
                            <label className="fs-control">
                                <span className="fs-control-label">Class</span>
                                <SelectBox value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                                    <option value="">All classes</option>
                                    {CLASS_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                                </SelectBox>
                            </label>
                            <label className="fs-control">
                                <span className="fs-control-label">Method</span>
                                <SelectBox value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
                                    <option value="">All methods</option>
                                    {METHODS.map((m) => <option key={m}>{m}</option>)}
                                </SelectBox>
                            </label>
                            <label className="fs-control">
                                <span className="fs-control-label">Status</span>
                                <SelectBox value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                    <option value="">All</option>
                                    <option>Paid</option>
                                    <option>Partial</option>
                                    <option>Unpaid</option>
                                </SelectBox>
                            </label>
                        </div>
                    </div>

                    <div className="fs-table-scroll">
                        <table className="fs-table">
                            <thead>
                            <tr>
                                <th>Student</th>
                                <th>Class</th>
                                <th>Fee due</th>
                                <th>Paid</th>
                                <th>Balance</th>
                                <th>Method</th>
                                <th>Status</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredRows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="fs-empty-row">
                                        No students match your search or filters.
                                    </td>
                                </tr>
                            )}
                            {filteredRows.map((r) => (
                                <tr key={r.id}>
                                    <td>
                                        <div className="fs-student-cell">
                                            <div className="fs-avatar">{r.name.charAt(0)}</div>
                                            <span className="fs-strong">{r.name}</span>
                                        </div>
                                    </td>
                                    <td>{classLabel(r)}</td>
                                    <td>
                                        {money(r.due)}
                                        {r.special && (
                                            <span className="fs-badge fs-badge--special" title={r.special.reason}>
                                                    Special
                                                </span>
                                        )}
                                    </td>
                                    <td className="fs-paid">{money(r.paid)}</td>
                                    <td className={r.balance > 0 ? "fs-owed" : "fs-paid"}>
                                        {money(r.balance)}
                                    </td>
                                    <td>
                                        <div className="fs-badges">
                                            {r.methods.length === 0 && "—"}
                                            {r.methods.map((m) => (
                                                <span key={m} className={`fs-badge fs-badge--${METHOD_CLASS[m]}`}>
                                                        {m}
                                                    </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                            <span className={`fs-status fs-status--${r.status.replace(" ", "").toLowerCase()}`}>
                                                {r.status}
                                            </span>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </Layout>
    );
};

export default FeeSetPage;