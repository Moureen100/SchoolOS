import { useState, useEffect } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

const API_URL = import.meta.env.VITE_API_URL;

export default function Records() {

    const [range, setRange] = useState("daily");
    const [records, setRecords] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    // ================= GET DATE RANGE =================

    const getDateRange = () => {

        const today = new Date();

        // ===== DAILY =====

        if (range === "daily") {

            const date = today.toISOString().slice(0, 10);

            return {
                start_date: date,
                end_date: date
            };
        }


        // ===== WEEKLY =====

        if (range === "weekly") {

            const day = today.getDay();

            // Sunday = 0
            // Monday = 1
            // Tuesday = 2
            // ...

            const monday = new Date(today);

            const difference = day === 0 ? -6 : 1 - day;

            monday.setDate(today.getDate() + difference);


            const sunday = new Date(monday);

            sunday.setDate(monday.getDate() + 6);


            return {
                start_date: monday.toISOString().slice(0, 10),
                end_date: sunday.toISOString().slice(0, 10)
            };
        }


        // ===== MONTHLY =====

        if (range === "monthly") {

            const firstDay = new Date(
                today.getFullYear(),
                today.getMonth(),
                1
            );

            const lastDay = new Date(
                today.getFullYear(),
                today.getMonth() + 1,
                0
            );


            return {
                start_date: firstDay.toISOString().slice(0, 10),
                end_date: lastDay.toISOString().slice(0, 10)
            };
        }

    };


    // ================= GET PAYMENT RECORDS =================

    const getRecords = async () => {

        try {

            setLoading(true);
            setError("");

            const {
                start_date,
                end_date
            } = getDateRange();


            const response = await fetch(
                `${API_URL}/payments/records?start_date=${start_date}&end_date=${end_date}`
            );


            const data = await response.json();


            console.log("Records response:", data);


            if (!response.ok) {

                throw new Error(
                    data.message || "Failed to load payment records"
                );
            }


            setRecords(data.records || []);

            setTotal(Number(data.total || 0));


        } catch (error) {

            console.error("Records error:", error);

            setError(
                error.message ||
                "Something went wrong while loading records."
            );

            setRecords([]);
            setTotal(0);

        } finally {

            setLoading(false);

        }

    };


    // ================= LOAD WHEN RANGE CHANGES =================

    useEffect(() => {

        getRecords();

    }, [range]);


    return (
        <Layout role="bursar">

            <div
                style={{
                    maxWidth: 900,
                    fontFamily: "sans-serif"
                }}
            >

                {/* ================= HEADER ================= */}

                <h1 style={{ color: colors.primary }}>
                    Records
                </h1>

                <p style={{ color: colors.textSecondary }}>
                    View daily, weekly and monthly payment records.
                </p>


                {/* ================= RANGE BUTTONS ================= */}

                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 16
                    }}
                >

                    <ToggleButton
                        active={range === "daily"}
                        onClick={() => setRange("daily")}
                    >
                        Daily
                    </ToggleButton>


                    <ToggleButton
                        active={range === "weekly"}
                        onClick={() => setRange("weekly")}
                    >
                        Weekly
                    </ToggleButton>


                    <ToggleButton
                        active={range === "monthly"}
                        onClick={() => setRange("monthly")}
                    >
                        Monthly
                    </ToggleButton>

                </div>


                {/* ================= ERROR ================= */}

                {error && (

                    <div
                        style={{
                            marginBottom: 16,
                            padding: 12,
                            borderRadius: 8,
                            background: "#fee2e2",
                            color: "#b91c1c"
                        }}
                    >
                        {error}
                    </div>

                )}


                {/* ================= RECORDS TABLE ================= */}

                <div
                    style={{
                        background: colors.surface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 10,
                        overflow: "hidden"
                    }}
                >

                    {loading ? (

                        <p
                            style={{
                                padding: "40px 16px",
                                textAlign: "center",
                                color: colors.textSecondary
                            }}
                        >
                            Loading records...
                        </p>

                    ) : records.length === 0 ? (

                        <p
                            style={{
                                padding: "40px 16px",
                                textAlign: "center",
                                color: colors.textSecondary
                            }}
                        >
                            No {range} records to show.
                        </p>

                    ) : (

                        <>

                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse"
                                }}
                            >

                                <thead>

                                <tr
                                    style={{
                                        background: colors.background,
                                        textAlign: "left"
                                    }}
                                >

                                    <th style={thStyle}>
                                        Date
                                    </th>

                                    <th style={thStyle}>
                                        Student
                                    </th>

                                    <th style={thStyle}>
                                        Class
                                    </th>

                                    <th style={thStyle}>
                                        Amount
                                    </th>

                                    <th style={thStyle}>
                                        Method
                                    </th>

                                </tr>

                                </thead>


                                <tbody>

                                {records.map((item) => {

                                    const payment = item.payment;

                                    return (

                                        <tr
                                            key={payment.id}
                                            style={{
                                                borderTop:
                                                    `1px solid ${colors.border}`
                                            }}
                                        >

                                            <td style={tdStyle}>
                                                {payment.date}
                                            </td>

                                            <td style={tdStyle}>
                                                {payment.student_name}
                                            </td>

                                            <td style={tdStyle}>
                                                {payment.student_class}
                                            </td>

                                            <td style={tdStyle}>
                                                {Number(
                                                    payment.amount
                                                ).toLocaleString()}
                                            </td>

                                            <td style={tdStyle}>
                                                {payment.method}
                                            </td>

                                        </tr>

                                    );

                                })}

                                </tbody>

                            </table>


                            {/* ================= TOTAL ================= */}

                            <div
                                style={{
                                    padding: "14px 16px",
                                    borderTop:
                                        `1px solid ${colors.border}`,
                                    background: colors.background,
                                    textAlign: "right",
                                    fontWeight: 600,
                                    color: colors.primary
                                }}
                            >

                                Total:{" "}
                                {total.toLocaleString()}

                            </div>

                        </>

                    )}

                </div>

            </div>

        </Layout>
    );
}


// ================= TOGGLE BUTTON =================

function ToggleButton({
                          active,
                          onClick,
                          children
                      }) {

    return (

        <button
            onClick={onClick}
            style={{
                padding: "8px 16px",
                borderRadius: 6,
                border:
                    `1px solid ${
                        active
                            ? colors.primary
                            : colors.border
                    }`,
                background:
                    active
                        ? colors.primary
                        : colors.surface,
                color:
                    active
                        ? "white"
                        : colors.textPrimary,
                fontSize: 14,
                cursor: "pointer"
            }}
        >
            {children}
        </button>

    );
}


// ================= TABLE STYLES =================

const thStyle = {
    padding: "10px 16px",
    fontSize: 13,
    color: colors.textSecondary
};

const tdStyle = {
    padding: "10px 16px",
    fontSize: 14
};