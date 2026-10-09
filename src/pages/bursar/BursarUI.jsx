import Layout from "../../Layout";

// Shared building blocks for the new bursar pages.
export const money = (n) => `UGX ${Number(n || 0).toLocaleString("en-UG")}`;

export const Page = ({ className, title, subtitle, children }) => (
    <Layout role="bursar">
        <div className={className}>
            <header className="bs-header">
                <h1 className="bs-title">{title}</h1>
                <h2 className="bs-sub">{subtitle}</h2>
            </header>
            {children}
        </div>
    </Layout>
);

export const Card = ({ title, hint, accent = "blue", wide, children }) => (
    <div className={`bs-wrap ${wide ? "bs-wide" : ""}`}>
        <section className={`bs-card bs-${accent}`}>
            {title && <h3 className="bs-card-title">{title}</h3>}
            {hint && <p className="bs-hint">{hint}</p>}
            {children}
        </section>
    </div>
);

export const Stat = ({ label, value, note, accent }) => (
    <Card accent={accent}>
        <span className="bs-stat-label">{label}</span>
        <span className="bs-stat-value">{value}</span>
        {note && <span className="bs-stat-note">{note}</span>}
    </Card>
);

export const Field = ({ label, children }) => (
    <label className="bs-field"><span className="bs-label">{label}</span>{children}</label>
);

export const Message = ({ text, error }) =>
    text ? <div className={`bs-message ${error ? "bs-message--error" : ""}`} role={error ? "alert" : "status"}>{text}</div> : null;

// SAMPLE DATA shared by the pages below - replace with Flask calls
// (GET /bursar/..., POST /bursar/...) when the backend is ready, like CaptureMoney's USE_DUMMY.
export const CLASSES = ["P.1", "P.2", "P.3", "P.4", "P.5", "P.6", "P.7"];
export const SAMPLE_STUDENTS = [
    { id: 1, name: "Namuli Grace", cls: "P.1", parent: "0772 100 001", due: 450000, paid: 450000 },
    { id: 2, name: "Okello Brian", cls: "P.3", parent: "0701 100 002", due: 450000, paid: 150000 },
    { id: 3, name: "Nakato Esther", cls: "P.5", parent: "0782 100 003", due: 520000, paid: 0 },
    { id: 4, name: "Mugisha David", cls: "P.6", parent: "0752 100 004", due: 520000, paid: 300000 },
    { id: 5, name: "Atim Sarah", cls: "P.7", parent: "0772 100 005", due: 600000, paid: 600000 },
    { id: 6, name: "Kato Samuel", cls: "P.4", parent: "0701 100 006", due: 480000, paid: 80000 },
];
