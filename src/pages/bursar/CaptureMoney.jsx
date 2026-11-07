
import { useEffect, useMemo, useState, useCallback } from "react";
import Layout from "../../Layout";
import "./CaptureMoney.css";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const CURRENT_YEAR = new Date().getFullYear();

const TERMS = ["Term 1", "Term 2", "Term 3"];

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

const ugx = (amount) =>
    "UGX " + Number(amount || 0).toLocaleString("en-UG");

const methodInfo = (method) =>
    METHODS[method] || {
        label: method || "Other",
        tag: "cm-tag--navy",
    };

const today = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

/*
 * AUTHENTICATION
 *
 * The backend requires:
 * Authorization: Bearer <token>
 *
 * This checks common token storage keys.
 * If your login uses a different key, add it here.
 */
function getAuthToken() {
    const possibleKeys = [
        "access_token",
        "accessToken",
        "token",
        "teacher_token",
        "teacherToken",
        "bursar_token",
        "bursarToken",
    ];

    for (const key of possibleKeys) {
        const token = localStorage.getItem(key);

        if (token) {
            return token;
        }
    }

    return null;
}

function authHeaders(json = false) {
    const token = getAuthToken();

    if (!token) {
        throw new Error(
            "Your login session could not be found. Please log in again."
        );
    }

    return {
        Authorization: `Bearer ${token}`,
        ...(json ? { "Content-Type": "application/json" } : {}),
    };
}

async function readResponse(response) {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            `Request failed (${response.status})`
        );
    }

    return data;
}

export default function CaptureMoney() {
    const [date, setDate] = useState(today());

    const [academicYear, setAcademicYear] = useState(CURRENT_YEAR);
    const [term, setTerm] = useState("Term 1");

    const [form, setForm] = useState({
        student_id: "",
        amount: "",
        date: today(),
        method: "cash",
        purpose: "",
    });

    const [recent, setRecent] = useState([]);
    const [balances, setBalances] = useState([]);

    const [dayClass, setDayClass] = useState("all");
    const [daySearch, setDaySearch] = useState("");

    const [balClass, setBalClass] = useState("all");
    const [balSearch, setBalSearch] = useState("");

    const [loading, setLoading] = useState(false);
    const [loadingBalances, setLoadingBalances] = useState(false);
    const [saving, setSaving] = useState(false);

    const [notice, setNotice] = useState(null);

    const say = useCallback((type, message) => {
        setNotice({ type, text: message });
    }, []);

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    // =====================================================
    // LOAD PAYMENTS FOR SELECTED DATE
    // GET /payments?date=YYYY-MM-DD
    // =====================================================

    const getPaymentsForDay = useCallback(async (selectedDate) => {
        setLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/payments?date=${encodeURIComponent(selectedDate)}`,
                {
                    method: "GET",
                    headers: authHeaders(),
                }
            );

            const data = await readResponse(response);

            setRecent(Array.isArray(data) ? data : []);
        } catch (error) {
            setRecent([]);
            say("error", error.message || "Could not load payments.");
        } finally {
            setLoading(false);
        }
    }, [say]);

    // =====================================================
    // LOAD STUDENT FEE BALANCES
    // GET /payments/balances?year=2026&term=Term 1
    // =====================================================

    const getBalances = useCallback(async () => {
        setLoadingBalances(true);

        try {
            const params = new URLSearchParams({
                year: String(academicYear),
                term,
            });

            const response = await fetch(
                `${API_URL}/payments/balances?${params.toString()}`,
                {
                    method: "GET",
                    headers: authHeaders(),
                }
            );

            const data = await readResponse(response);

            /*
             * The backend returns:
             * {
             *   students: [...],
             *   count: ...,
             *   total_fee: ...,
             *   total_paid: ...,
             *   total_balance: ...
             * }
             */

            setBalances(
                Array.isArray(data)
                    ? data
                    : Array.isArray(data.students)
                        ? data.students
                        : []
            );
        } catch (error) {
            setBalances([]);
            say("error", error.message || "Could not load fee balances.");
        } finally {
            setLoadingBalances(false);
        }
    }, [academicYear, term, say]);

    // Load payments when the selected date changes.
    useEffect(() => {
        if (!API_URL) {
            say("error", "VITE_API_URL is not configured.");
            return;
        }

        getPaymentsForDay(date);
    }, [date, getPaymentsForDay, say]);

    // Load balances when academic year or term changes.
    useEffect(() => {
        if (!API_URL) return;

        getBalances();
    }, [getBalances]);

    // =====================================================
    // CAPTURE MANUAL PAYMENT
    // POST /payments
    // =====================================================

    async function handleSubmit(event) {
        event.preventDefault();

        setNotice(null);

        const studentId = form.student_id.trim();
        const amount = Number(form.amount);

        if (!studentId) {
            say("error", "Enter the student's ID.");
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            say("error", "Enter a valid payment amount greater than zero.");
            return;
        }

        if (!form.date) {
            say("error", "Select the payment date.");
            return;
        }

        if (!academicYear || !term) {
            say("error", "Select the academic year and term.");
            return;
        }

        setSaving(true);

        try {
            const payload = {
                student_id: studentId,
                amount,
                date: form.date,
                method: form.method,
                purpose: form.purpose.trim() || "School fees",
                year: Number(academicYear),
                term,
            };

            const response = await fetch(`${API_URL}/payments`, {
                method: "POST",
                headers: authHeaders(true),
                body: JSON.stringify(payload),
            });

            await readResponse(response);

            say("success", "Payment captured successfully.");

            setDate(form.date);

            // Refresh both tables after a successful payment.
            await Promise.all([
                getPaymentsForDay(form.date),
                getBalances(),
            ]);

            setForm((previous) => ({
                ...previous,
                student_id: "",
                amount: "",
                purpose: "",
            }));
        } catch (error) {
            say(
                "error",
                error.message || "Something went wrong while saving the payment."
            );
        } finally {
            setSaving(false);
        }
    }

    // =====================================================
    // NORMALIZE PAYMENT RESPONSE
    // =====================================================

    const payments = useMemo(() => {
        return recent
            .map((record) => record.payment || record)
            .filter(Boolean);
    }, [recent]);

    // =====================================================
    // DAILY PAYMENT FIGURES
    // =====================================================

    const total = (...methods) =>
        payments
            .filter(
                (payment) =>
                    methods.length === 0 ||
                    methods.includes(payment.method)
            )
            .reduce(
                (sum, payment) => sum + Number(payment.amount || 0),
                0
            );

    const count = (...methods) =>
        payments.filter((payment) =>
            methods.includes(payment.method)
        ).length;

    // =====================================================
    // CLASS FILTER OPTIONS
    // =====================================================

    const classOptions = useMemo(() => {
        const classes = new Set();

        payments.forEach((payment) => {
            if (payment.student_class) {
                classes.add(payment.student_class);
            }
        });

        balances.forEach((student) => {
            if (student.student_class) {
                classes.add(student.student_class);
            }
        });

        return [...classes].sort();
    }, [payments, balances]);

    // =====================================================
    // FILTER DAILY PAYMENTS
    // =====================================================

    const dayRows = payments.filter((payment) => {
        const matchesClass =
            dayClass === "all" ||
            payment.student_class === dayClass;

        const search = daySearch.toLowerCase();

        const matchesSearch =
            (payment.student_name || "").toLowerCase().includes(search) ||
            (payment.student_id || "").toLowerCase().includes(search);

        return matchesClass && matchesSearch;
    });

    // =====================================================
    // FILTER STUDENT BALANCES
    // =====================================================

    const balanceRows = balances.filter((student) => {
        const matchesClass =
            balClass === "all" ||
            student.student_class === balClass;

        const search = balSearch.toLowerCase();

        const matchesSearch =
            (student.student_name || "").toLowerCase().includes(search) ||
            (student.student_id || "").toLowerCase().includes(search);

        return matchesClass && matchesSearch;
    });

    // =====================================================
    // STUDENT PAYMENT STATUS
    // =====================================================

    const getStatus = (student) => {
        if (Number(student.balance) <= 0) {
            return ["paid", "Cleared"];
        }

        if (Number(student.total_paid) > 0) {
            return ["partial", "Partial"];
        }

        return ["unpaid", "Unpaid"];
    };

    // =====================================================
    // REUSABLE FILTER COMPONENTS
    // =====================================================

    const classFilter = (value, onChange) => (
        <div className="cm-select">
            <select
                className="cm-input"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            >
                <option value="all">All classes</option>

                {classOptions.map((className) => (
                    <option key={className} value={className}>
                        {className}
                    </option>
                ))}
            </select>

            <i className="fa-solid fa-chevron-down cm-caret" />
        </div>
    );

    const searchBox = (value, onChange) => (
        <div className="cm-search">
            <i className="fa-solid fa-magnifying-glass cm-search-icon" />

            <input
                className="cm-input"
                placeholder="Search student"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );

    // =====================================================
    // PAGE
    // =====================================================

    return (
        <Layout role="bursar">
            <div className="capture-money-content">

                {/* ================= HERO ================= */}

                <header className="cm-hero">
                    <div className="cm-hero-text">
                        <h1 className="cm-hero-title">
                            Capture money
                        </h1>

                        <p className="cm-hero-sub">
                            Record school fee payments and monitor student balances.
                        </p>
                    </div>

                    <div className="cm-hero-date">
                        <label className="cm-field">
                            <span className="cm-label cm-label--light">
                                Payment date
                            </span>

                            <input
                                type="date"
                                className="cm-input"
                                value={date}
                                onChange={(event) => setDate(event.target.value)}
                            />
                        </label>

                        <label className="cm-field">
                            <span className="cm-label cm-label--light">
                                Academic year
                            </span>

                            <input
                                type="number"
                                className="cm-input"
                                min="2000"
                                max="2100"
                                value={academicYear}
                                onChange={(event) =>
                                    setAcademicYear(event.target.value)
                                }
                            />
                        </label>

                        <label className="cm-field">
                            <span className="cm-label cm-label--light">
                                Academic term
                            </span>

                            <div className="cm-select">
                                <select
                                    className="cm-input"
                                    value={term}
                                    onChange={(event) => setTerm(event.target.value)}
                                >
                                    {TERMS.map((item) => (
                                        <option key={item} value={item}>
                                            {item}
                                        </option>
                                    ))}
                                </select>

                                <i className="fa-solid fa-chevron-down cm-caret" />
                            </div>
                        </label>
                    </div>
                </header>

                {/* ================= SUMMARY ================= */}

                <section className="cm-stats">
                    <article className="cm-stat">
                        <span className="cm-hex">
                            <i className="fa-solid fa-coins" />
                        </span>

                        <div>
                            <div className="cm-label">
                                Collected on {date}
                            </div>

                            <div className="cm-stat-value">
                                {ugx(total())}
                            </div>
                        </div>
                    </article>

                    <article className="cm-stat cm-stat--green">
                        <span className="cm-hex">
                            <i className="fa-solid fa-building-columns" />
                        </span>

                        <div>
                            <div className="cm-label">SchoolPay</div>

                            <div className="cm-stat-value">
                                {ugx(total("schoolpay"))}
                            </div>
                        </div>
                    </article>

                    <article className="cm-stat cm-stat--yellow">
                        <span className="cm-hex">
                            <i className="fa-solid fa-mobile-screen" />
                        </span>

                        <div>
                            <div className="cm-label">Mobile money</div>

                            <div className="cm-stat-value">
                                {ugx(total("mobile_money", "mtn", "airtel"))}
                            </div>
                        </div>
                    </article>

                    <article className="cm-stat cm-stat--red">
                        <span className="cm-hex">
                            <i className="fa-solid fa-laptop" />
                        </span>

                        <div>
                            <div className="cm-label">Paid in system</div>

                            <div className="cm-stat-value">
                                {ugx(total("system"))}
                            </div>
                        </div>
                    </article>
                </section>

                {/* ================= CAPTURE PANELS ================= */}

                <section className="cm-capture-grid">

                    {/* MANUAL PAYMENT */}

                    <form
                        className="cm-panel cm-panel--manual"
                        onSubmit={handleSubmit}
                    >
                        <h2 className="cm-panel-title">
                            Manual payment
                        </h2>

                        <p className="cm-hint">
                            Record money received from a student or parent.
                            The payment will be attached to the selected academic period.
                        </p>

                        <div className="cm-row">
                            <label className="cm-field">
                                <span className="cm-label">
                                    Student ID
                                </span>

                                <input
                                    name="student_id"
                                    className="cm-input"
                                    placeholder="e.g. ST001"
                                    value={form.student_id}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label className="cm-field">
                                <span className="cm-label">
                                    Amount (UGX)
                                </span>

                                <input
                                    name="amount"
                                    type="number"
                                    min="1"
                                    step="1"
                                    className="cm-input"
                                    placeholder="e.g. 50000"
                                    value={form.amount}
                                    onChange={handleChange}
                                    required
                                />
                            </label>
                        </div>

                        <div className="cm-row">
                            <label className="cm-field">
                                <span className="cm-label">
                                    Payment date
                                </span>

                                <input
                                    name="date"
                                    type="date"
                                    className="cm-input"
                                    value={form.date}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label className="cm-field">
                                <span className="cm-label">
                                    Method
                                </span>

                                <div className="cm-select">
                                    <select
                                        name="method"
                                        className="cm-input"
                                        value={form.method}
                                        onChange={handleChange}
                                    >
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
                            <span className="cm-label">
                                Purpose
                            </span>

                            <input
                                name="purpose"
                                className="cm-input"
                                placeholder="e.g. School fees"
                                value={form.purpose}
                                onChange={handleChange}
                            />
                        </label>

                        <div className="cm-hint">
                            Academic period: <strong>{academicYear} · {term}</strong>
                        </div>

                        <button
                            type="submit"
                            className="cm-btn cm-btn--yellow"
                            disabled={saving}
                        >
                            <i className="fa-solid fa-plus" />

                            {saving ? "Saving…" : "Capture payment"}
                        </button>
                    </form>

                    {/* SCHOOLPAY INFORMATION */}

                    <div className="cm-panel cm-panel--green">
                        <h2 className="cm-panel-title">
                            SchoolPay
                        </h2>

                        <p className="cm-hint">
                            SchoolPay payment synchronization will be enabled
                            after the SchoolPay API integration is connected
                            to this backend.
                        </p>

                        <div className="cm-sync-line">
                            <span className="cm-label">
                                Recorded today
                            </span>

                            <span className="cm-strong">
                                {count("schoolpay")} payments · {ugx(total("schoolpay"))}
                            </span>
                        </div>

                        <button
                            type="button"
                            className="cm-btn cm-btn--dark"
                            disabled
                            title="SchoolPay integration is not connected yet"
                        >
                            <i className="fa-solid fa-link" />
                            Integration not connected
                        </button>
                    </div>

                    {/* MOBILE MONEY INFORMATION */}

                    <div className="cm-panel cm-panel--yellow">
                        <h2 className="cm-panel-title">
                            Mobile money
                        </h2>

                        <p className="cm-hint">
                            MTN MoMo and Airtel Money synchronization will
                            be enabled when their collection APIs are connected.
                        </p>

                        <div className="cm-sync-line">
                            <span className="cm-label">
                                Recorded today
                            </span>

                            <span className="cm-strong">
                                {count("mtn", "airtel", "mobile_money")} payments ·
                                {" "}{ugx(total("mtn", "airtel", "mobile_money"))}
                            </span>
                        </div>

                        <button
                            type="button"
                            className="cm-btn cm-btn--dark"
                            disabled
                            title="Mobile money integration is not connected yet"
                        >
                            <i className="fa-solid fa-link" />
                            Integration not connected
                        </button>
                    </div>

                    {/* SYSTEM PAYMENT INFORMATION */}

                    <div className="cm-panel cm-panel--red">
                        <h2 className="cm-panel-title">
                            System payments
                        </h2>

                        <p className="cm-hint">
                            Online payment synchronization will be enabled
                            when the SchoolOS payment gateway is connected.
                        </p>

                        <div className="cm-sync-line">
                            <span className="cm-label">
                                Recorded today
                            </span>

                            <span className="cm-strong">
                                {count("system")} payments · {ugx(total("system"))}
                            </span>
                        </div>

                        <button
                            type="button"
                            className="cm-btn cm-btn--dark"
                            disabled
                            title="System payment integration is not connected yet"
                        >
                            <i className="fa-solid fa-link" />
                            Integration not connected
                        </button>
                    </div>
                </section>

                {/* ================= NOTICE ================= */}

                {notice && (
                    <div className={`cm-notice cm-notice--${notice.type}`}>
                        {notice.text}
                    </div>
                )}

                {/* ================= DAILY PAYMENTS ================= */}

                <section className="cm-card">
                    <div className="cm-card-head">
                        <h2 className="cm-card-title">
                            Payments on {date}
                        </h2>

                        <div className="cm-controls">
                            {classFilter(dayClass, setDayClass)}
                            {searchBox(daySearch, setDaySearch)}
                        </div>
                    </div>

                    <div className="cm-scroll">
                        <table className="cm-table">
                            <thead>
                            <tr>
                                <th>Student</th>
                                <th>Class</th>
                                <th>Method</th>
                                <th>Purpose</th>
                                <th>Amount paid</th>
                            </tr>
                            </thead>

                            <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan="5" className="cm-empty">
                                        Loading payments…
                                    </td>
                                </tr>
                            )}

                            {!loading && dayRows.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="cm-empty">
                                        No payments recorded for this day.
                                    </td>
                                </tr>
                            )}

                            {!loading && dayRows.map((payment, index) => (
                                <tr
                                    key={
                                        payment.id ||
                                        `${payment.student_id}-${payment.date}-${index}`
                                    }
                                >
                                    <td>
                                        <div className="cm-person">
                                                <span className="cm-avatar">
                                                    {(payment.student_name || "?")[0]}
                                                </span>

                                            <div>
                                                <div className="cm-strong">
                                                    {payment.student_name || "Unknown student"}
                                                </div>

                                                <div className="cm-label">
                                                    {payment.student_id}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td>
                                        {payment.student_class || "—"}
                                        {payment.stream ? ` • ${payment.stream}` : ""}
                                    </td>

                                    <td>
                                            <span className={`cm-tag ${methodInfo(payment.method).tag}`}>
                                                {methodInfo(payment.method).label}
                                            </span>
                                    </td>

                                    <td>
                                        {payment.purpose || "General payment"}
                                    </td>

                                    <td className="cm-paid">
                                        {ugx(payment.amount)}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* ================= REMAINING FEE BALANCE ================= */}

                <section className="cm-card">
                    <div className="cm-card-head">
                        <div>
                            <h2 className="cm-card-title">
                                Remaining fee balance per student
                            </h2>

                            <p className="cm-hint">
                                {academicYear} · {term} — based on configured
                                class fees, special allocations and recorded payments.
                            </p>
                        </div>

                        <div className="cm-controls">
                            {classFilter(balClass, setBalClass)}
                            {searchBox(balSearch, setBalSearch)}
                        </div>
                    </div>

                    <div className="cm-scroll">
                        <table className="cm-table">
                            <thead>
                            <tr>
                                <th>Student</th>
                                <th>Class</th>
                                <th>Total fee</th>
                                <th>Total paid</th>
                                <th>Balance</th>
                                <th>Status</th>
                            </tr>
                            </thead>

                            <tbody>
                            {loadingBalances && (
                                <tr>
                                    <td colSpan="6" className="cm-empty">
                                        Loading student fee balances…
                                    </td>
                                </tr>
                            )}

                            {!loadingBalances && balanceRows.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="cm-empty">
                                        No students found for this academic period.
                                    </td>
                                </tr>
                            )}

                            {!loadingBalances && balanceRows.map((student) => {
                                const [statusKey, statusLabel] = getStatus(student);

                                return (
                                    <tr key={student.student_id}>
                                        <td>
                                            <div className="cm-person">
                                                    <span className="cm-avatar">
                                                        {(student.student_name || "?")[0]}
                                                    </span>

                                                <div>
                                                    <div className="cm-strong">
                                                        {student.student_name}
                                                    </div>

                                                    <div className="cm-label">
                                                        {student.student_id}
                                                    </div>

                                                    {student.fee_type === "special_allocation" && (
                                                        <div className="cm-label">
                                                            Special allocation
                                                            {student.allocation_reason
                                                                ? `: ${student.allocation_reason}`
                                                                : ""}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            {student.student_class || "—"}
                                            {student.stream ? ` • ${student.stream}` : ""}
                                        </td>

                                        <td>
                                            {ugx(student.total_fee)}
                                        </td>

                                        <td className="cm-paid">
                                            {ugx(student.total_paid)}
                                        </td>

                                        <td className={
                                            Number(student.balance) > 0
                                                ? "cm-owed"
                                                : "cm-paid"
                                        }>
                                            {ugx(student.balance)}
                                        </td>

                                        <td>
                                                <span className={`cm-status cm-status--${statusKey}`}>
                                                    {statusLabel}
                                                </span>
                                        </td>
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
