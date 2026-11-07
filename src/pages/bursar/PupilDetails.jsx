
import { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const CLASS_OPTIONS = [
    "Nursery",
    "Middle",
    "Top",
    "P1",
    "P2",
    "P3",
    "P4",
    "P5",
    "P6",
    "P7",
];

const currentYear = new Date().getFullYear();

const formatMoney = (amount) => {
    if (amount === null || amount === undefined || amount === "") {
        return "Not set";
    }

    return `UGX ${Number(amount).toLocaleString("en-UG")}`;
};



const getToken = () => {
    return (
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        ""
    );
};



export default function PupilDetails() {
    const [search, setSearch] = useState("");
    const [className, setClassName] = useState("");
    const [year, setYear] = useState(String(currentYear));
    const [term, setTerm] = useState("Term 1");

    const [pupils, setPupils] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchPupils = useCallback(async () => {
        if (!API_URL) {
            setError(
                "Backend URL is missing. Check VITE_API_URL in your frontend .env file."
            );
            setPupils([]);
            setLoading(false);
            return;
        }

        const token = getToken();

        if (!token) {
            setError(
                "Your login session was not found. Please log in again."
            );
            setPupils([]);
            setLoading(false);
            return;
        }

        if (!year.trim() || !term.trim()) {
            setError("Please select the academic year and term.");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const params = new URLSearchParams({
                year: year.trim(),
                term: term.trim(),
            });

            if (className.trim()) {
                params.set("class_name", className.trim());
            }

            const url = `${API_URL}/api/pupils-fees-details?${params.toString()}`;

            console.log("Loading pupils' fee details from:", url);

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json().catch(() => ({}));

            if (response.status === 401) {
                throw new Error(
                    "Your session has expired or the token is invalid. Please log in again."
                );
            }

            if (response.status === 403) {
                throw new Error(
                    "You are not authorized to view these pupil records."
                );
            }

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    `Unable to load pupils. Server returned ${response.status}.`
                );
            }

            // The new backend returns { success, pupils: [...] }.
            if (!Array.isArray(data.pupils)) {
                throw new Error(
                    "The backend response did not contain the expected pupils array."
                );
            }

            setPupils(data.pupils);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Pupils' fee details error:", err);
            setError(
                err.message || "Unable to load pupils' fee details."
            );
            setPupils([]);
        } finally {
            setLoading(false);
        }
    }, [year, term, className]);

    useEffect(() => {
        fetchPupils();
    }, [fetchPupils]);

    const filteredPupils = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return pupils;
        }

        return pupils.filter((pupil) => {
            const fullName = [
                pupil.student_name,
                pupil.middle_name,
                pupil.last_name,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const studentId = String(
                pupil.student_id || ""
            ).toLowerCase();

            return (
                fullName.includes(query) ||
                studentId.includes(query) ||
                String(pupil.student_class || "")
                    .toLowerCase()
                    .includes(query)
            );
        });
    }, [pupils, search]);

    const specialCount = useMemo(
        () =>
            pupils.filter(
                (pupil) => pupil.has_special_allocation
            ).length,
        [pupils]
    );

    const missingFeeCount = useMemo(
        () =>
            pupils.filter(
                (pupil) => pupil.fee_type === "FEE_NOT_SET"
            ).length,
        [pupils]
    );

    const standardFeeTotal = useMemo(
        () =>
            pupils.reduce(
                (total, pupil) =>
                    total + Number(pupil.effective_fee ?? 0),
                0
            ),
        [pupils]
    );

    return (
        <Layout role="bursar">
            <div style={styles.page}>
                <div style={styles.header}>
                    <div>
                        <p style={styles.eyebrow}>
                            BURSAR PORTAL / FEES
                        </p>

                        <h1 style={styles.heading}>
                            Pupils Fees Details
                        </h1>

                        <p style={styles.subtitle}>
                            View pupils by class, check standard fees,
                            and identify pupils receiving special
                            fee allocations or waivers.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={fetchPupils}
                        disabled={loading}
                        style={{
                            ...styles.refreshButton,
                            opacity: loading ? 0.6 : 1,
                        }}
                    >
                        {loading ? "Loading..." : "↻ Refresh"}
                    </button>
                </div>

                {/* FILTERS */}
                <section style={styles.filterPanel}>
                    <div style={styles.field}>
                        <label style={styles.label}>
                            Search pupil
                        </label>

                        <input
                            type="text"
                            placeholder="Name or student ID..."
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>
                            Class
                        </label>

                        <select
                            value={className}
                            onChange={(e) =>
                                setClassName(e.target.value)
                            }
                            style={styles.input}
                        >
                            <option value="">
                                All classes
                            </option>

                            {CLASS_OPTIONS.map((classOption) => (
                                <option
                                    key={classOption}
                                    value={classOption}
                                >
                                    {classOption}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>
                            Academic year
                        </label>

                        <input
                            type="number"
                            min="2000"
                            max="2100"
                            value={year}
                            onChange={(e) =>
                                setYear(e.target.value)
                            }
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>
                            Term
                        </label>

                        <select
                            value={term}
                            onChange={(e) =>
                                setTerm(e.target.value)
                            }
                            style={styles.input}
                        >
                            <option value="Term 1">Term 1</option>
                            <option value="Term 2">Term 2</option>
                            <option value="Term 3">Term 3</option>
                        </select>
                    </div>
                </section>

                {/* SUMMARY CARDS */}
                <div style={styles.summaryGrid}>
                    <SummaryCard
                        label="Pupils displayed"
                        value={pupils.length.toLocaleString()}
                        description={
                            className
                                ? `Class ${className}`
                                : "All classes"
                        }
                        accent="#2563eb"
                    />

                    <SummaryCard
                        label="Special allocations"
                        value={specialCount.toLocaleString()}
                        description="Bursaries, discounts and waivers"
                        accent="#7c3aed"
                    />

                    <SummaryCard
                        label="Fees not configured"
                        value={missingFeeCount.toLocaleString()}
                        description="Standard fee missing"
                        accent="#d97706"
                    />

                    <SummaryCard
                        label="Total effective fees"
                        value={formatMoney(standardFeeTotal)}
                        description="Based on displayed pupils"
                        accent="#15803d"
                    />
                </div>

                {/* INFORMATION */}
                <div style={styles.info}>
                    <strong>How the fee is calculated:</strong>{" "}
                    A pupil with a special allocation uses that
                    allocation amount. Otherwise, the standard fee
                    for the pupil's class is used. A zero allocation
                    means a full waiver.
                </div>

                {/* TABLE */}
                <section style={styles.tablePanel}>
                    <div style={styles.tableHeader}>
                        <div>
                            <h2 style={styles.tableTitle}>
                                Pupil fee register
                            </h2>

                            <p style={styles.tableSubtitle}>
                                {term}, {year}
                                {className ? ` · ${className}` : ""}
                            </p>
                        </div>

                        <span style={styles.count}>
                            {filteredPupils.length} pupils
                        </span>
                    </div>

                    {error ? (
                        <div style={styles.errorBox}>
                            <strong>Unable to load pupil records</strong>
                            <p style={{ margin: "8px 0 14px" }}>
                                {error}
                            </p>

                            <button
                                type="button"
                                onClick={fetchPupils}
                                style={styles.retryButton}
                            >
                                Try again
                            </button>
                        </div>
                    ) : loading && pupils.length === 0 ? (
                        <div style={styles.emptyState}>
                            Loading pupils' fee details...
                        </div>
                    ) : filteredPupils.length === 0 ? (
                        <div style={styles.emptyState}>
                            {pupils.length === 0
                                ? "No pupils were returned for this class and academic period."
                                : "No pupils match your search."}
                        </div>
                    ) : (
                        <div style={styles.tableScroll}>
                            <table style={styles.table}>
                                <thead>
                                <tr>
                                    <th style={styles.th}>Pupil</th>
                                    <th style={styles.th}>Student ID</th>
                                    <th style={styles.th}>Class</th>
                                    <th style={styles.th}>Standard fee</th>
                                    <th style={styles.th}>Special allocation</th>
                                    <th style={styles.th}>Effective fee</th>
                                    <th style={styles.th}>Fee status</th>
                                </tr>
                                </thead>

                                <tbody>
                                {filteredPupils.map((pupil) => {
                                    const fullName = [
                                        pupil.student_name,
                                        pupil.middle_name,
                                        pupil.last_name,
                                    ]
                                        .filter(Boolean)
                                        .join(" ");

                                    const allocation =
                                        pupil.special_allocation;

                                    return (
                                        <tr
                                            key={`${pupil.student_id}-${pupil.year}-${pupil.term}`}
                                        >
                                            <td style={styles.td}>
                                                <strong style={styles.pupilName}>
                                                    {fullName || "Unnamed pupil"}
                                                </strong>

                                                <span style={styles.secondaryText}>
                                                        {pupil.stream || "No stream"}
                                                    </span>
                                            </td>

                                            <td style={styles.td}>
                                                {pupil.student_id || "—"}
                                            </td>

                                            <td style={styles.td}>
                                                {pupil.student_class || "—"}
                                            </td>

                                            <td style={styles.td}>
                                                {formatMoney(
                                                    pupil.standard_fee
                                                )}
                                            </td>

                                            <td style={styles.td}>
                                                {pupil.has_special_allocation ? (
                                                    <div>
                                                            <span
                                                                style={{
                                                                    ...styles.badge,
                                                                    background: "#f3e8ff",
                                                                    color: "#6b21a8",
                                                                }}
                                                            >
                                                                {Number(
                                                                    allocation?.amount ?? 0
                                                                ) === 0
                                                                    ? "Full waiver"
                                                                    : "Special allocation"}
                                                            </span>

                                                        <div
                                                            style={{
                                                                marginTop: 5,
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {formatMoney(
                                                                allocation?.amount
                                                            )}
                                                        </div>

                                                        <span
                                                            style={styles.secondaryText}
                                                        >
                                                                {allocation?.reason ||
                                                                    "Special case"}
                                                            </span>
                                                    </div>
                                                ) : (
                                                    <span style={styles.muted}>
                                                            None
                                                        </span>
                                                )}
                                            </td>

                                            <td style={styles.td}>
                                                <strong>
                                                    {formatMoney(
                                                        pupil.effective_fee
                                                    )}
                                                </strong>
                                            </td>

                                            <td style={styles.td}>
                                                <FeeBadge
                                                    feeType={pupil.fee_type}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div style={styles.footer}>
                        <span>
                            Showing {filteredPupils.length} of{" "}
                            {pupils.length} pupils loaded from the backend.
                        </span>

                        {lastUpdated && (
                            <span>
                                Updated{" "}
                                {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                </section>
            </div>
        </Layout>
    );
}

function SummaryCard({ label, value, description, accent }) {
    return (
        <div
            style={{
                ...styles.summaryCard,
                borderTop: `3px solid ${accent}`,
            }}
        >
            <p style={styles.cardLabel}>{label}</p>

            <h2 style={styles.cardValue}>{value}</h2>

            <p style={styles.cardDescription}>{description}</p>
        </div>
    );
}

function FeeBadge({ feeType }) {
    const appearance = {
        STANDARD: {
            label: "Standard",
            background: "#dcfce7",
            color: "#166534",
        },
        SPECIAL_ALLOCATION: {
            label: "Special allocation",
            background: "#f3e8ff",
            color: "#6b21a8",
        },
        FULL_WAIVER: {
            label: "Fully waived",
            background: "#dbeafe",
            color: "#1d4ed8",
        },
        FEE_NOT_SET: {
            label: "Fee not set",
            background: "#fef3c7",
            color: "#92400e",
        },
    };

    const item = appearance[feeType] || appearance.FEE_NOT_SET;

    return (
        <span
            style={{
                ...styles.badge,
                background: item.background,
                color: item.color,
            }}
        >
            {item.label}
        </span>
    );
}

const styles = {
    page: {
        width: "100%",
        maxWidth: 1500,
        margin: "0 auto",
        padding: "8px 0 32px",
        fontFamily: "sans-serif",
        color: colors.primary,
    },

    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 24,
    },

    eyebrow: {
        fontSize: 11,
        letterSpacing: 1.5,
        fontWeight: 700,
        color: colors.textSecondary,
        marginBottom: 8,
    },

    heading: {
        fontSize: 29,
        lineHeight: 1.2,
        margin: "0 0 10px",
        color: colors.primary,
    },

    subtitle: {
        margin: 0,
        fontSize: 14,
        lineHeight: 1.6,
        color: colors.textSecondary,
        maxWidth: 650,
    },

    refreshButton: {
        border: "none",
        borderRadius: 8,
        padding: "11px 17px",
        background: colors.primary,
        color: "#ffffff",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
    },

    filterPanel: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        gap: 14,
        padding: 18,
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        marginBottom: 20,
    },

    field: {
        display: "flex",
        flexDirection: "column",
        gap: 7,
        minWidth: 0,
    },

    label: {
        fontSize: 12,
        fontWeight: 700,
        color: colors.textSecondary,
    },

    input: {
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        padding: "11px 12px",
        border: `1px solid ${colors.border}`,
        borderRadius: 7,
        background: "#ffffff",
        color: colors.primary,
        fontSize: 13,
        outline: "none",
    },

    summaryGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: 14,
        marginBottom: 20,
    },

    summaryCard: {
        minWidth: 0,
        padding: 17,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        background: colors.surface,
    },

    cardLabel: {
        margin: "0 0 12px",
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: 600,
    },

    cardValue: {
        margin: "0 0 9px",
        fontSize: 21,
        overflowWrap: "anywhere",
        color: colors.primary,
    },

    cardDescription: {
        margin: 0,
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 1.5,
    },

    info: {
        marginBottom: 20,
        padding: "14px 16px",
        border: "1px solid #bfdbfe",
        borderRadius: 9,
        background: "#eff6ff",
        color: "#1e40af",
        fontSize: 12,
        lineHeight: 1.7,
    },

    tablePanel: {
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        background: colors.surface,
        overflow: "hidden",
    },

    tableHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        padding: "18px 20px",
        borderBottom: `1px solid ${colors.border}`,
    },

    tableTitle: {
        margin: "0 0 6px",
        fontSize: 17,
        color: colors.primary,
    },

    tableSubtitle: {
        margin: 0,
        fontSize: 12,
        color: colors.textSecondary,
    },

    count: {
        fontSize: 12,
        fontWeight: 700,
        color: colors.primary,
        background: colors.background,
        padding: "7px 10px",
        borderRadius: 7,
    },

    tableScroll: {
        width: "100%",
        overflowX: "auto",
    },

    table: {
        width: "100%",
        minWidth: 1000,
        borderCollapse: "collapse",
        textAlign: "left",
    },

    th: {
        padding: "13px 15px",
        background: colors.background,
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        borderBottom: `1px solid ${colors.border}`,
    },

    td: {
        padding: "14px 15px",
        fontSize: 12,
        verticalAlign: "middle",
        borderBottom: `1px solid ${colors.border}`,
        color: colors.primary,
    },

    pupilName: {
        display: "block",
        minWidth: 120,
        fontSize: 12,
    },

    secondaryText: {
        display: "block",
        marginTop: 5,
        fontSize: 10,
        color: colors.textSecondary,
    },

    muted: {
        color: colors.textSecondary,
        fontSize: 12,
    },

    badge: {
        display: "inline-block",
        padding: "5px 8px",
        borderRadius: 5,
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: "nowrap",
    },

    emptyState: {
        padding: "45px 20px",
        textAlign: "center",
        color: colors.textSecondary,
        fontSize: 13,
    },

    errorBox: {
        padding: 24,
        color: "#b91c1c",
        fontSize: 13,
        lineHeight: 1.6,
    },

    retryButton: {
        padding: "9px 14px",
        border: "none",
        borderRadius: 6,
        background: "#b91c1c",
        color: "#ffffff",
        fontWeight: 700,
        cursor: "pointer",
    },

    footer: {
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10,
        padding: "13px 18px",
        fontSize: 11,
        color: colors.textSecondary,
    },
};
