
import React, { useEffect, useMemo, useState } from "react";
import {
    FiCalendar,
    FiCheckCircle,
    FiChevronDown,
    FiClock,
    FiRefreshCw,
    FiSearch,
    FiUsers,
    FiXCircle,
} from "react-icons/fi";

import Layout from "../../Layout";
import "./ClassTeacherAttendance.css";

const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000";

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

const FUTURE_VIEWS = [
    {
        key: "daily",
        label: "Daily",
        active: true,
    },
    {
        key: "weekly",
        label: "Weekly",
        active: false,
    },
    {
        key: "monthly",
        label: "Monthly",
        active: false,
    },
    {
        key: "termly",
        label: "Termly",
        active: false,
    },
];


// =============================================================
// TODAY
// =============================================================

function todayValue() {
    return new Date().toISOString().split("T")[0];
}


// =============================================================
// NORMALIZE STUDENTS
// =============================================================

function normalizeStudents(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.students)) {
        return data.students;
    }

    if (Array.isArray(data?.records)) {
        return data.records;
    }

    if (Array.isArray(data?.data)) {
        return data.data;
    }

    return [];
}


// =============================================================
// NORMALIZE ATTENDANCE RESPONSE
// =============================================================

function normalizeAttendance(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.records)) {
        return data.records;
    }

    if (Array.isArray(data?.attendance)) {
        return data.attendance;
    }

    if (Array.isArray(data?.data)) {
        return data.data;
    }

    return [];
}


// =============================================================
// CONVERT DATABASE ATTENDANCE TO STATUS
// =============================================================
//
// Supports:
// present: true
// present: false
// status: "Present"
// status: "Absent"
// attendance_status: "Present"
// attendance_status: "Absent"
//

function getAttendanceStatus(record) {
    if (!record) {
        return null;
    }

    // ---------------------------------------------------------
    // Backend boolean format
    // ---------------------------------------------------------

    if (typeof record.present === "boolean") {
        return record.present
            ? "Present"
            : "Absent";
    }

    // ---------------------------------------------------------
    // String boolean format
    // ---------------------------------------------------------

    if (
        record.present === "true" ||
        record.present === "True" ||
        record.present === 1 ||
        record.present === "1"
    ) {
        return "Present";
    }

    if (
        record.present === "false" ||
        record.present === "False" ||
        record.present === 0 ||
        record.present === "0"
    ) {
        return "Absent";
    }

    // ---------------------------------------------------------
    // Status format
    // ---------------------------------------------------------

    if (typeof record.status === "string") {
        const status =
            record.status.trim().toLowerCase();

        if (status === "present") {
            return "Present";
        }

        if (status === "absent") {
            return "Absent";
        }
    }

    // ---------------------------------------------------------
    // Alternative backend status field
    // ---------------------------------------------------------

    if (
        typeof record.attendance_status ===
        "string"
    ) {
        const status =
            record.attendance_status
                .trim()
                .toLowerCase();

        if (status === "present") {
            return "Present";
        }

        if (status === "absent") {
            return "Absent";
        }
    }

    return null;
}


// =============================================================
// COMPONENT
// =============================================================

export default function ClassTeacherAttendance() {

    const [studentClass, setStudentClass] =
        useState("P2");

    const [selectedDate, setSelectedDate] =
        useState(todayValue());

    const [students, setStudents] =
        useState([]);

    const [attendance, setAttendance] =
        useState({});

    const [loadingStudents, setLoadingStudents] =
        useState(false);

    const [loadingAttendance, setLoadingAttendance] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [search, setSearch] =
        useState("");

    const [message, setMessage] =
        useState("");

    const [error, setError] =
        useState("");

    const [activeView, setActiveView] =
        useState("daily");


    // =========================================================
    // LOAD STUDENTS
    // =========================================================

    const loadStudents = async () => {

        setLoadingStudents(true);
        setError("");

        try {

            const response = await fetch(
                `${API_URL}/students/class/${encodeURIComponent(
    studentClass
)}`
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data?.error ||
                    data?.message ||
                    "Failed to load students."
                );
            }

            const loadedStudents =
                normalizeStudents(data);

            setStudents(loadedStudents);

        } catch (err) {

            setStudents([]);

            setError(
                err.message ||
                "Failed to load students."
            );

        } finally {

            setLoadingStudents(false);
        }
    };


    // =========================================================
    // LOAD SUBMITTED ATTENDANCE
    // =========================================================
    //
    // IMPORTANT:
    // This reads the attendance already stored by the
    // Teacher Attendance page / backend.
    //
    // The response can contain:
    //
    // { student_id, present: true }
    //
    // OR
    //
    // { student_id, status: "Present" }
    //
    // =========================================================

    const loadDailyAttendance = async () => {

        setLoadingAttendance(true);
        setError("");

        try {

            const params =
                new URLSearchParams({
                    student_class:
                        studentClass,

                    date:
                        selectedDate,
                });

            const response = await fetch(
                `${API_URL}/attendance?${params.toString()}`
);

const data =
    await response.json();

if (!response.ok) {
    throw new Error(
        data?.error ||
        data?.message ||
        "Failed to load submitted attendance."
    );
}

const records =
    normalizeAttendance(data);

const mapped = {};

records.forEach((record) => {

    if (!record?.student_id) {
        return;
    }

    const status =
        getAttendanceStatus(record);

    if (status) {

        mapped[
            record.student_id
            ] = status;

    }
});

setAttendance(mapped);

} catch (err) {

    setAttendance({});

    setError(
        err.message ||
        "Failed to load submitted attendance."
    );

} finally {

    setLoadingAttendance(false);
}
};


// =========================================================
// LOAD STUDENTS WHEN CLASS CHANGES
// =========================================================

useEffect(() => {

    loadStudents();

}, [studentClass]);


// =========================================================
// LOAD SUBMITTED ATTENDANCE
// WHEN CLASS OR DATE CHANGES
// =========================================================

useEffect(() => {

    loadDailyAttendance();

}, [
    studentClass,
    selectedDate,
]);


// =========================================================
// SET DEFAULT ONLY FOR STUDENTS WITHOUT A DATABASE RECORD
// =========================================================
//
// This is important.
//
// We DO NOT overwrite a submitted record.
//
// If backend says:
// ST001 = Absent
//
// it remains Absent.
//
// Only students with no attendance record get Present
// as the initial editable value.
//
// =========================================================

useEffect(() => {

    if (!students.length) {
        return;
    }

    setAttendance((previous) => {

        const next = {
            ...previous,
        };

        students.forEach((student) => {

            if (
                !next[
                    student.student_id
                    ]
            ) {

                next[
                    student.student_id
                    ] = "Present";
            }
        });

        return next;
    });

}, [students]);


// =========================================================
// CHANGE STUDENT STATUS
// =========================================================

const setStudentStatus = (
    studentId,
    status
) => {

    setAttendance((previous) => ({
        ...previous,
        [studentId]: status,
    }));

    setMessage("");
    setError("");
};


// =========================================================
// MARK ALL
// =========================================================

const markAll = (status) => {

    const next = {};

    students.forEach((student) => {

        next[
            student.student_id
            ] = status;

    });

    setAttendance(next);

    setMessage("");
    setError("");
};


// =========================================================
// SAVE / UPDATE ATTENDANCE
// =========================================================

const saveAttendance = async () => {

    if (!students.length) {

        setError(
            "There are no students in the selected class."
        );

        return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {

        const records =
            students.map((student) => ({
                student_id:
                student.student_id,

                present:
                    attendance[
                        student.student_id
                        ] === "Present",
            }));


        const response = await fetch(
            `${API_URL}/attendance`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",
                },

                body: JSON.stringify({

                    student_class:
                    studentClass,

                    date:
                    selectedDate,

                    records,
                }),
            }
        );


        const data =
            await response
                .json()
                .catch(() => null);


        if (!response.ok) {

            throw new Error(
                data?.error ||
                data?.message ||
                "Failed to save attendance."
            );
        }


        // Reload exactly what is in database

        await loadDailyAttendance();


        setMessage(
            `Attendance for ${studentClass} on ${formatDisplayDate(
                selectedDate
            )} was saved successfully.`
        );

    } catch (err) {

        setError(
            err.message ||
            "Failed to save attendance."
        );

    } finally {

        setSaving(false);
    }
};


// =========================================================
// FILTER STUDENTS
// =========================================================

const filteredStudents =
    useMemo(() => {

        const term =
            search
                .trim()
                .toLowerCase();

        if (!term) {
            return students;
        }

        return students.filter(
            (student) => {

                const text = [

                    student.student_id,

                    student.student_name,

                    student.first_name,

                    student.middle_name,

                    student.last_name,

                    student.stream,

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return text.includes(term);
            }
        );

    }, [
        students,
        search,
    ]);


// =========================================================
// SUMMARY
// =========================================================

const presentCount =
    students.filter(
        (student) =>
            attendance[
                student.student_id
                ] === "Present"
    ).length;


const absentCount =
    students.filter(
        (student) =>
            attendance[
                student.student_id
                ] === "Absent"
    ).length;


const submittedCount =
    Object.keys(attendance)
        .filter((studentId) =>
            students.some(
                (student) =>
                    student.student_id ===
                    studentId
            )
        )
        .length;


const isLoading =
    loadingStudents ||
    loadingAttendance;


// =========================================================
// REFRESH
// =========================================================

const handleRefresh = () => {

    loadStudents();

    loadDailyAttendance();
};


// =========================================================
// RENDER
// =========================================================

return (

    <Layout>

        <div className="ct-attendance-page">

            {/* =====================================================
                    HEADER
                ===================================================== */}

            <header className="ct-attendance-header">

                <div>

                    <div className="ct-attendance-eyebrow">

                        <FiCheckCircle />

                        CLASS TEACHER

                    </div>

                    <h1>
                        Attendance
                    </h1>

                    <p>
                        Capture and review
                        attendance submitted
                        for your assigned class.
                    </p>

                </div>


                <button
                    type="button"
                    className="ct-refresh-btn"
                    onClick={
                        handleRefresh
                    }
                    disabled={
                        isLoading ||
                        saving
                    }
                >

                    <FiRefreshCw
                        className={
                            isLoading
                                ? "ct-spin"
                                : ""
                        }
                    />

                    Refresh

                </button>

            </header>


            {/* =====================================================
                    VIEW TABS
                ===================================================== */}

            <section className="ct-attendance-tabs">

                {FUTURE_VIEWS.map(
                    (view) => (

                        <button
                            key={
                                view.key
                            }
                            type="button"
                            className={`
                                    ct-attendance-tab
                                    ${
                                activeView ===
                                view.key
                                    ? "active"
                                    : ""
                            }
                                    ${
                                !view.active
                                    ? "coming-soon"
                                    : ""
                            }
                                `}
                            onClick={() =>
                                view.active &&
                                setActiveView(
                                    view.key
                                )
                            }
                            disabled={
                                !view.active
                            }
                        >

                            {view.label}

                            {!view.active && (
                                <span>
                                        Later
                                    </span>
                            )}

                        </button>

                    )
                )}

            </section>


            {/* =====================================================
                    DAILY VIEW
                ===================================================== */}

            {activeView === "daily" && (

                <>

                    {/* =================================================
                            CONTROLS
                        ================================================= */}

                    <section className="ct-attendance-controls">


                        {/* CLASS */}

                        <div className="ct-control-group">

                            <label htmlFor="attendance-class">
                                Class
                            </label>

                            <div className="ct-select-wrap">

                                <FiUsers />

                                <select
                                    id="attendance-class"
                                    value={
                                        studentClass
                                    }
                                    onChange={(
                                        event
                                    ) => {

                                        setStudentClass(
                                            event
                                                .target
                                                .value
                                        );

                                        setSearch(
                                            ""
                                        );

                                        setMessage(
                                            ""
                                        );

                                        setError(
                                            ""
                                        );
                                    }}
                                >

                                    {CLASS_OPTIONS.map(
                                        (
                                            className
                                        ) => (

                                            <option
                                                key={
                                                    className
                                                }
                                                value={
                                                    className
                                                }
                                            >
                                                {
                                                    className
                                                }
                                            </option>

                                        )
                                    )}

                                </select>

                                <FiChevronDown className="ct-select-arrow" />

                            </div>

                        </div>


                        {/* DATE */}

                        <div className="ct-control-group">

                            <label htmlFor="attendance-date">
                                Attendance date
                            </label>

                            <div className="ct-date-wrap">

                                <FiCalendar />

                                <input
                                    id="attendance-date"
                                    type="date"
                                    value={
                                        selectedDate
                                    }
                                    onChange={(
                                        event
                                    ) => {

                                        setSelectedDate(
                                            event
                                                .target
                                                .value
                                        );

                                        setMessage(
                                            ""
                                        );

                                        setError(
                                            ""
                                        );
                                    }}
                                />

                            </div>

                        </div>


                        {/* MARK ALL */}

                        <div className="ct-control-actions">

                            <button
                                type="button"
                                className="ct-secondary-btn"
                                onClick={() =>
                                    markAll(
                                        "Present"
                                    )
                                }
                                disabled={
                                    !students.length ||
                                    saving
                                }
                            >

                                <FiCheckCircle />

                                All Present

                            </button>


                            <button
                                type="button"
                                className="ct-secondary-btn danger-outline"
                                onClick={() =>
                                    markAll(
                                        "Absent"
                                    )
                                }
                                disabled={
                                    !students.length ||
                                    saving
                                }
                            >

                                <FiXCircle />

                                All Absent

                            </button>

                        </div>

                    </section>


                    {/* =================================================
                            ALERTS
                        ================================================= */}

                    {error && (

                        <div className="ct-alert ct-alert-error">

                            <FiXCircle />

                            <span>
                                    {error}
                                </span>

                        </div>

                    )}


                    {message && (

                        <div className="ct-alert ct-alert-success">

                            <FiCheckCircle />

                            <span>
                                    {message}
                                </span>

                        </div>

                    )}


                    {/* =================================================
                            SUMMARY
                        ================================================= */}

                    <section className="ct-attendance-summary">


                        <div className="ct-summary-card">

                            <div className="ct-summary-icon">
                                <FiUsers />
                            </div>

                            <div>

                                    <span>
                                        Total Students
                                    </span>

                                <strong>
                                    {
                                        students.length
                                    }
                                </strong>

                            </div>

                        </div>


                        <div className="ct-summary-card present">

                            <div className="ct-summary-icon">
                                <FiCheckCircle />
                            </div>

                            <div>

                                    <span>
                                        Present
                                    </span>

                                <strong>
                                    {
                                        presentCount
                                    }
                                </strong>

                            </div>

                        </div>


                        <div className="ct-summary-card absent">

                            <div className="ct-summary-icon">
                                <FiXCircle />
                            </div>

                            <div>

                                    <span>
                                        Absent
                                    </span>

                                <strong>
                                    {
                                        absentCount
                                    }
                                </strong>

                            </div>

                        </div>


                        <div className="ct-summary-card submitted">

                            <div className="ct-summary-icon">
                                <FiClock />
                            </div>

                            <div>

                                    <span>
                                        Loaded Records
                                    </span>

                                <strong>
                                    {
                                        submittedCount
                                    }
                                </strong>

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                            ATTENDANCE TABLE
                        ================================================= */}

                    <section className="ct-attendance-panel">


                        {/* PANEL HEADER */}

                        <div className="ct-panel-header">

                            <div>

                                <h2>
                                    {studentClass} Daily
                                    Attendance
                                </h2>

                                <p>

                                    {
                                        formatDisplayDate(
                                            selectedDate
                                        )
                                    }

                                    {" · "}

                                    Attendance already
                                    submitted by the
                                    teacher is loaded
                                    from the database.

                                </p>

                            </div>


                            {/* SEARCH */}

                            <div className="ct-search">

                                <FiSearch />

                                <input
                                    type="text"
                                    placeholder="Search student..."
                                    value={
                                        search
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setSearch(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />

                            </div>

                        </div>


                        {/* =================================================
                                LOADING
                            ================================================= */}

                        {isLoading ? (

                            <div className="ct-table-state">

                                <FiRefreshCw className="ct-spin" />

                                <strong>
                                    Loading attendance...
                                </strong>

                                <span>
                                        Getting the submitted
                                        attendance from the
                                        database.
                                    </span>

                            </div>

                        ) : students.length === 0 ? (

                            <div className="ct-table-state empty">

                                <FiUsers />

                                <strong>
                                    No students found
                                </strong>

                                <span>
                                        There are no students
                                        returned for{" "}
                                    {
                                        studentClass
                                    }.
                                    </span>

                            </div>

                        ) : filteredStudents.length === 0 ? (

                            <div className="ct-table-state empty">

                                <FiSearch />

                                <strong>
                                    No matching student
                                </strong>

                                <span>
                                        Try another student
                                        name or ID.
                                    </span>

                            </div>

                        ) : (

                            <div className="ct-table-scroll">

                                <table className="ct-attendance-table">

                                    <thead>

                                    <tr>

                                        <th>
                                            #
                                        </th>

                                        <th>
                                            Student
                                        </th>

                                        <th>
                                            Student ID
                                        </th>

                                        <th>
                                            Stream
                                        </th>

                                        <th>
                                            Attendance Status
                                        </th>

                                    </tr>

                                    </thead>


                                    <tbody>

                                    {filteredStudents.map(
                                        (
                                            student,
                                            index
                                        ) => {

                                            const status =
                                                attendance[
                                                    student.student_id
                                                    ] ||
                                                "Present";


                                            return (

                                                <tr
                                                    key={
                                                        student.student_id
                                                    }
                                                >

                                                    {/* NUMBER */}

                                                    <td className="ct-number-cell">

                                                        {String(
                                                            index +
                                                            1
                                                        ).padStart(
                                                            2,
                                                            "0"
                                                        )}

                                                    </td>


                                                    {/* STUDENT */}

                                                    <td>

                                                        <div className="ct-student-cell">

                                                            <div className="ct-avatar">

                                                                {getInitials(
                                                                    student
                                                                )}

                                                            </div>


                                                            <div>

                                                                <strong>
                                                                    {getStudentName(
                                                                        student
                                                                    )}
                                                                </strong>

                                                                <span>
                                                                            {
                                                                                student.student_id
                                                                            }
                                                                        </span>

                                                            </div>

                                                        </div>

                                                    </td>


                                                    {/* ID */}

                                                    <td>

                                                                <span className="ct-id-badge">

                                                                    {
                                                                        student.student_id
                                                                    }

                                                                </span>

                                                    </td>


                                                    {/* STREAM */}

                                                    <td>

                                                                <span className="ct-stream-badge">

                                                                    {
                                                                        student.stream ||
                                                                        "—"
                                                                    }

                                                                </span>

                                                    </td>


                                                    {/* STATUS */}

                                                    <td>

                                                        <div className="ct-status-buttons">

                                                            <button
                                                                type="button"
                                                                className={`
                                                                            ct-status-btn
                                                                            present
                                                                            ${
                                                                    status ===
                                                                    "Present"
                                                                        ? "selected"
                                                                        : ""
                                                                }
                                                                        `}
                                                                onClick={() =>
                                                                    setStudentStatus(
                                                                        student.student_id,
                                                                        "Present"
                                                                    )
                                                                }
                                                                disabled={
                                                                    saving
                                                                }
                                                            >

                                                                <FiCheckCircle />

                                                                Present

                                                            </button>


                                                            <button
                                                                type="button"
                                                                className={`
                                                                            ct-status-btn
                                                                            absent
                                                                            ${
                                                                    status ===
                                                                    "Absent"
                                                                        ? "selected"
                                                                        : ""
                                                                }
                                                                        `}
                                                                onClick={() =>
                                                                    setStudentStatus(
                                                                        student.student_id,
                                                                        "Absent"
                                                                    )
                                                                }
                                                                disabled={
                                                                    saving
                                                                }
                                                            >

                                                                <FiXCircle />

                                                                Absent

                                                            </button>

                                                        </div>

                                                    </td>

                                                </tr>

                                            );
                                        }
                                    )}

                                    </tbody>

                                </table>

                            </div>

                        )}


                        {/* =================================================
                                SAVE BAR
                            ================================================= */}

                        <div className="ct-save-bar">

                            <div>

                                <strong>
                                    {
                                        presentCount
                                    }{" "}
                                    Present ·{" "}
                                    {
                                        absentCount
                                    }{" "}
                                    Absent
                                </strong>

                                <span>
                                        Review or update
                                        the attendance for{" "}
                                    {
                                        studentClass
                                    }{" "}
                                    before saving.
                                    </span>

                            </div>


                            <button
                                type="button"
                                className="ct-save-btn"
                                onClick={
                                    saveAttendance
                                }
                                disabled={
                                    saving ||
                                    loadingStudents ||
                                    loadingAttendance ||
                                    !students.length
                                }
                            >

                                {saving ? (

                                    <>

                                        <FiRefreshCw className="ct-spin" />

                                        Saving...

                                    </>

                                ) : (

                                    <>

                                        <FiCheckCircle />

                                        Save Attendance

                                    </>

                                )}

                            </button>

                        </div>

                    </section>

                </>

            )}

        </div>

    </Layout>
);
}


// =============================================================
// GET STUDENT NAME
// =============================================================

function getStudentName(student) {

    if (student.student_name) {
        return student.student_name;
    }

    return [
        student.first_name,
        student.middle_name,
        student.last_name,
    ]
        .filter(Boolean)
        .join(" ") || "Unnamed Student";
}


// =============================================================
// GET INITIALS
// =============================================================

function getInitials(student) {

    return getStudentName(student)
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}


// =============================================================
// FORMAT DATE
// =============================================================

function formatDisplayDate(value) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }
    );
}