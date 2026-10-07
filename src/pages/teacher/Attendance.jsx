import { useState } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

// =====================================================
// API URL
// Comes from your .env file
//
// Example .env:
// VITE_API_URL=http://localhost:5000
// =====================================================

const API_BASE = import.meta.env.VITE_API_URL;


export default function Attendance() {

    // =====================================================
    // STATE
    // =====================================================

    const [studentClass, setStudentClass] = useState("");

    const [date, setDate] = useState(
        new Date().toISOString().slice(0, 10)
    );

    const [pupils, setPupils] = useState([]);

    const [loading, setLoading] = useState(false);

    const [saving, setSaving] = useState(false);

    const [saved, setSaved] = useState(false);

    const [error, setError] = useState("");


    // =====================================================
    // LOAD STUDENTS FROM SELECTED CLASS
    // =====================================================

    async function handleLoadClass() {

        if (!studentClass) {
            setError("Please select a class first.");
            return;
        }

        setLoading(true);
        setSaved(false);
        setError("");
        setPupils([]);

        try {

            // =================================================
            // GET STUDENTS BY CLASS
            //
            // Example:
            // GET http://localhost:5000/students/class/P2
            //
            // API_BASE comes from .env
            // =================================================

            const res = await fetch(
                `${API_BASE}/students/class/${studentClass}`
            );


            const data = await res.json();


            if (!res.ok) {

                throw new Error(
                    data.error || "Failed to load students"
                );

            }


            // =================================================
            // CONVERT BACKEND STUDENTS INTO FRONTEND DATA
            // =================================================

            const students = data.map((student) => ({

                id: student.student_id,

                name: student.student_name,

                studentClass: student.student_class,

                stream: student.stream,

                // Everyone starts as Present
                present: true

            }));


            setPupils(students);


        } catch (err) {

            console.error(
                "Error loading class:",
                err
            );

            setError(
                err.message ||
                "Failed to load class"
            );

        } finally {

            setLoading(false);

        }
    }


    // =====================================================
    // CHANGE STUDENT STATUS
    // =====================================================

    function setAttendanceStatus(id, status) {

        setPupils((prev) =>

            prev.map((pupil) => {

                if (pupil.id !== id) {
                    return pupil;
                }

                return {
                    ...pupil,
                    present: status === "Present"
                };

            })

        );

        setSaved(false);
    }


    // =====================================================
    // SUBMIT ATTENDANCE
    // =====================================================

    async function handleSubmit() {

        // -------------------------------------------------
        // CHECK CLASS
        // -------------------------------------------------

        if (!studentClass) {

            setError(
                "Please select a class."
            );

            return;
        }


        // -------------------------------------------------
        // CHECK DATE
        // -------------------------------------------------

        if (!date) {

            setError(
                "Please select a date."
            );

            return;
        }


        // -------------------------------------------------
        // CHECK STUDENTS
        // -------------------------------------------------

        if (pupils.length === 0) {

            setError(
                "Please load the class first."
            );

            return;
        }


        setSaving(true);
        setSaved(false);
        setError("");


        try {

            // =================================================
            // SEND ATTENDANCE TO BACKEND
            //
            // Backend receives:
            //
            // {
            //     student_class: "P2",
            //     date: "2026-09-22",
            //     records: [
            //         {
            //             student_id: "ST001",
            //             present: true
            //         }
            //     ]
            // }
            // =================================================

            const res = await fetch(
                `${API_BASE}/attendance`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        student_class: studentClass,

                        date: date,

                        records: pupils.map((pupil) => ({

                            student_id: pupil.id,

                            present: pupil.present

                        }))

                    })

                }
            );


            const data = await res.json();


            if (!res.ok) {

                throw new Error(
                    data.error ||
                    "Failed to submit attendance"
                );

            }


            // =================================================
            // SUCCESS
            // =================================================

            setSaved(true);


        } catch (err) {

            console.error(
                "Attendance submission error:",
                err
            );

            setError(
                err.message ||
                "Failed to submit attendance"
            );

        } finally {

            setSaving(false);

        }
    }


    // =====================================================
    // ATTENDANCE COUNTS
    // =====================================================

    const presentCount = pupils.filter(
        (pupil) => pupil.present
    ).length;


    const absentCount = pupils.filter(
        (pupil) => !pupil.present
    ).length;


    // =====================================================
    // PAGE
    // =====================================================

    return (

        <Layout role="teacher">

            <div
                style={{
                    maxWidth: 760,
                    fontFamily: "sans-serif"
                }}
            >

                {/* =================================================
                    PAGE HEADER
                ================================================= */}

                <h1
                    style={{
                        color: colors.primary,
                        marginBottom: 6
                    }}
                >
                    Attendance
                </h1>


                <p
                    style={{
                        color: colors.textSecondary,
                        marginTop: 0,
                        marginBottom: 24
                    }}
                >
                    Mark daily attendance for your class.
                </p>


                {/* =================================================
                    FILTER SECTION
                ================================================= */}

                <div
                    style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-end",
                        marginBottom: 20,
                        flexWrap: "wrap"
                    }}
                >

                    {/* CLASS */}

                    <FilterField label="Class">

                        <select
                            value={studentClass}
                            onChange={(e) => {

                                setStudentClass(
                                    e.target.value
                                );

                                setPupils([]);

                                setSaved(false);

                                setError("");

                            }}
                            style={selectStyle}
                        >

                            <option value="">
                                Select class...
                            </option>

                            <option value="P1">
                                P1
                            </option>

                            <option value="P2">
                                P2
                            </option>

                            <option value="P3">
                                P3
                            </option>

                            <option value="P4">
                                P4
                            </option>

                            <option value="P5">
                                P5
                            </option>

                            <option value="P6">
                                P6
                            </option>

                            <option value="P7">
                                P7
                            </option>

                        </select>

                    </FilterField>


                    {/* DATE */}

                    <FilterField label="Date">

                        <input
                            type="date"
                            value={date}
                            onChange={(e) => {

                                setDate(
                                    e.target.value
                                );

                                setSaved(false);

                                setError("");

                            }}
                            style={selectStyle}
                        />

                    </FilterField>


                    {/* LOAD CLASS */}

                    <button
                        onClick={handleLoadClass}
                        disabled={
                            !studentClass ||
                            loading
                        }
                        style={{
                            padding: "8px 16px",

                            background:
                                studentClass
                                    ? colors.primary
                                    : colors.border,

                            color: "white",

                            border: "none",

                            borderRadius: 6,

                            fontSize: 14,

                            cursor:
                                studentClass &&
                                !loading
                                    ? "pointer"
                                    : "not-allowed",

                            height: 36
                        }}
                    >
                        {loading
                            ? "Loading..."
                            : "Load class list"}
                    </button>

                </div>


                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (

                    <div
                        style={{
                            padding: "10px 14px",
                            marginBottom: 16,
                            borderRadius: 7,
                            background:
                            colors.warningLight,
                            color:
                            colors.warning,
                            fontSize: 13
                        }}
                    >
                        {error}
                    </div>

                )}


                {/* =================================================
                    CLASS SUMMARY
                ================================================= */}

                {pupils.length > 0 && (

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px 16px",
                            marginBottom: 12,
                            background:
                            colors.background,
                            border:
                                `1px solid ${colors.border}`,
                            borderRadius: 8
                        }}
                    >

                        <div>

                            <div
                                style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color:
                                    colors.textPrimary
                                }}
                            >
                                {studentClass}
                            </div>

                            <div
                                style={{
                                    fontSize: 12,
                                    color:
                                    colors.textSecondary,
                                    marginTop: 3
                                }}
                            >
                                Attendance for {date}
                            </div>

                        </div>


                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                                fontSize: 12
                            }}
                        >

                            <span
                                style={{
                                    padding:
                                        "5px 10px",
                                    borderRadius: 999,
                                    background:
                                    colors.accentLight,
                                    color:
                                    colors.accent
                                }}
                            >
                                {presentCount} Present
                            </span>


                            <span
                                style={{
                                    padding:
                                        "5px 10px",
                                    borderRadius: 999,
                                    background:
                                    colors.warningLight,
                                    color:
                                    colors.warning
                                }}
                            >
                                {absentCount} Absent
                            </span>

                        </div>

                    </div>

                )}


                {/* =================================================
                    STUDENT LIST
                ================================================= */}

                <div
                    style={{
                        background:
                        colors.surface,

                        border:
                            `1px solid ${colors.border}`,

                        borderRadius: 10,

                        overflow: "hidden"
                    }}
                >

                    {pupils.length === 0 ? (

                        <p
                            style={{
                                padding: "40px 16px",
                                textAlign: "center",
                                color:
                                colors.textSecondary
                            }}
                        >
                            Select a class, then load the
                            class list.
                        </p>

                    ) : (

                        <>

                            {/* LIST HEADER */}

                            <div
                                style={{
                                    padding:
                                        "11px 16px",

                                    fontSize: 13,

                                    color:
                                    colors.textSecondary,

                                    background:
                                    colors.background
                                }}
                            >
                                {pupils.length} students
                            </div>


                            {/* STUDENTS */}

                            {pupils.map((pupil) => (

                                <div
                                    key={pupil.id}
                                    style={{
                                        display: "flex",
                                        justifyContent:
                                            "space-between",
                                        alignItems:
                                            "center",
                                        gap: 16,
                                        padding:
                                            "14px 16px",
                                        borderTop:
                                            `1px solid ${colors.border}`
                                    }}
                                >

                                    {/* STUDENT DETAILS */}

                                    <div
                                        style={{
                                            minWidth: 0
                                        }}
                                    >

                                        <div
                                            style={{
                                                fontSize: 14,
                                                fontWeight: 500,
                                                color:
                                                colors.textPrimary
                                            }}
                                        >
                                            {pupil.name}
                                        </div>


                                        <div
                                            style={{
                                                display: "flex",
                                                gap: 8,
                                                marginTop: 4,
                                                fontSize: 12,
                                                color:
                                                colors.textSecondary
                                            }}
                                        >

                                            <span>
                                                {pupil.id}
                                            </span>

                                            {pupil.stream && (

                                                <span>
                                                    Stream{" "}
                                                    {pupil.stream}
                                                </span>

                                            )}

                                        </div>

                                    </div>


                                    {/* =================================================
                                        STATUS SECTION
                                    ================================================= */}

                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 6,
                                            flexShrink: 0
                                        }}
                                    >

                                        {/* PRESENT */}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setAttendanceStatus(
                                                    pupil.id,
                                                    "Present"
                                                )
                                            }
                                            style={{
                                                padding:
                                                    "6px 12px",

                                                border:
                                                    pupil.present
                                                        ? `1px solid ${colors.accent}`
                                                        : `1px solid ${colors.border}`,

                                                borderRadius: 6,

                                                background:
                                                    pupil.present
                                                        ? colors.accentLight
                                                        : colors.surface,

                                                color:
                                                    pupil.present
                                                        ? colors.accent
                                                        : colors.textSecondary,

                                                fontSize: 12,

                                                fontWeight:
                                                    pupil.present
                                                        ? 600
                                                        : 400,

                                                cursor:
                                                    "pointer"
                                            }}
                                        >
                                            Present
                                        </button>


                                        {/* ABSENT */}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setAttendanceStatus(
                                                    pupil.id,
                                                    "Absent"
                                                )
                                            }
                                            style={{
                                                padding:
                                                    "6px 12px",

                                                border:
                                                    !pupil.present
                                                        ? `1px solid ${colors.warning}`
                                                        : `1px solid ${colors.border}`,

                                                borderRadius: 6,

                                                background:
                                                    !pupil.present
                                                        ? colors.warningLight
                                                        : colors.surface,

                                                color:
                                                    !pupil.present
                                                        ? colors.warning
                                                        : colors.textSecondary,

                                                fontSize: 12,

                                                fontWeight:
                                                    !pupil.present
                                                        ? 600
                                                        : 400,

                                                cursor:
                                                    "pointer"
                                            }}
                                        >
                                            Absent
                                        </button>

                                    </div>

                                </div>

                            ))}

                        </>

                    )}

                </div>


                {/* =================================================
                    SUBMIT SECTION
                ================================================= */}

                {pupils.length > 0 && (

                    <div
                        style={{
                            marginTop: 20
                        }}
                    >

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={saving}
                            style={{
                                padding:
                                    "10px 20px",

                                background:
                                colors.accent,

                                color: "white",

                                border: "none",

                                borderRadius: 6,

                                fontSize: 15,

                                fontWeight: 500,

                                cursor:
                                    saving
                                        ? "not-allowed"
                                        : "pointer",

                                opacity:
                                    saving
                                        ? 0.7
                                        : 1
                            }}
                        >
                            {saving
                                ? "Submitting..."
                                : "Submit attendance"}
                        </button>


                        {/* SUCCESS */}

                        {saved && (

                            <div
                                style={{
                                    marginTop: 10,
                                    fontSize: 13,
                                    color:
                                    colors.accent
                                }}
                            >
                                Attendance submitted successfully
                                for {studentClass} on {date}.
                            </div>

                        )}

                    </div>

                )}

            </div>

        </Layout>
    );
}


/* =========================================================
   FILTER FIELD
========================================================= */

function FilterField({
                         label,
                         children
                     }) {

    return (

        <label
            style={{
                fontSize: 13,
                color:
                colors.textSecondary
            }}
        >

            <span
                style={{
                    display: "block",
                    marginBottom: 4
                }}
            >
                {label}
            </span>

            {children}

        </label>

    );
}


/* =========================================================
   INPUT / SELECT STYLE
========================================================= */

const selectStyle = {

    padding: "8px 10px",

    border:
        `1px solid ${colors.border}`,

    borderRadius: 6,

    fontSize: 14,

    height: 36,

    background:
    colors.surface

};