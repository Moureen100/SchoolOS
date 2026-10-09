import { Link } from "react-router-dom";
import { FaMoneyBillWave, FaExclamationTriangle, FaReceipt, FaWallet, FaUserCircle, FaMobileAlt } from "react-icons/fa";
import { Page, Card, Stat, money, SAMPLE_STUDENTS } from "./BursarUI";
import "./BursarDashboard.css";

// SAMPLE numbers - replace with GET /bursar/summary when the backend is ready
const TODAY = 1250000;
const EXPENSES_TODAY = 180000;
const MOMO_PENDING = 3;

export default function BursarDashboard() {
    const defaulters = SAMPLE_STUDENTS.filter((s) => s.paid < s.due);
    const owed = defaulters.reduce((t, s) => t + (s.due - s.paid), 0);

    return (
        <Page className="bursar-dashboard-content" title="Bursar Dashboard" subtitle="Fees, receipts, debtors and expenses at a glance">
            <div className="bs-grid">
                <Card accent="yellow" wide>
                    <div className="bs-flex" style={{ justifyContent: "space-between" }}>
                        <div>
                            <h3 className="bs-card-title">Receive Fees</h3>
                            <p className="bs-hint" style={{ margin: "6px 0 0" }}>Search student, enter amount, print receipt.</p>
                        </div>
                        <Link to="/bursar/capture-money" className="bs-primary bs-big"><FaMoneyBillWave /> RECEIVE FEES</Link>
                    </div>
                </Card>
            </div>

            <div className="bs-grid bs-grid--4">
                <Stat label="Today's collection" value={money(TODAY)} accent="green" />
                <Stat label="Defaulters" value={defaulters.length} note={`${money(owed)} owed`} accent="red" />
                <Stat label="Expenses today" value={money(EXPENSES_TODAY)} accent="navy" />
                <Stat label="MoMo auto-receipts" value={MOMO_PENDING} note="allocated today" accent="blue" />
            </div>

            <div className="bs-grid">
                {[
                    ["/bursar/receipts", "Receipts & Audit Log", "Cancel or edit a wrong receipt. Every change is logged.", <FaReceipt />, "blue"],
                    ["/bursar/defaulters", "Defaulters & Debt", "Filter debtors, send reminders, block report cards.", <FaExclamationTriangle />, "red"],
                    ["/bursar/expenses", "Expenses", "Record school spending and see totals.", <FaWallet />, "navy"],
                    ["/bursar/student-profile", "Student Financial Profile", "Payment history, statements and clearance.", <FaUserCircle />, "green"],
                ].map(([to, title, text, icon, accent]) => (
                    <Link key={to} to={to} style={{ textDecoration: "none", color: "inherit" }}>
                        <Card title={title} accent={accent}><p className="bs-hint" style={{ margin: 0 }}>{text}</p><span style={{ fontSize: 22, color: "#1a6ce0" }}>{icon}</span></Card>
                    </Link>
                ))}
            </div>
        </Page>
    );
}
