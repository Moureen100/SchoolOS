import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FiSearch,
    FiPlus,
    FiRefreshCw,
    FiChevronLeft,
    FiChevronRight,
    FiX,
} from "react-icons/fi";

import Layout from "../../Layout";
import "./StudentList.css";

// =========================================================
// BACKEND URL
// =========================================================

const API_URL = import.meta.env.VITE_API_URL;

const PAGE_SIZES = [25, 50, 100];

// =========================================================
// HELPERS
// =========================================================

function getTeacher(student) {
    return (
        student.class_teacher ||
        student.teacher_name ||
        student.teacher ||
        ""
    );
}

// Default is ACTIVE unless the backend clearly says inactive
function getStatus(student) {
    if (typeof student.is_active === "boolean") {
        return student.is_active ? "active" : "inactive";
    }

    if (typeof student.active === "boolean") {
        return student.active ? "active" : "inactive";
    }

    const text = String(student.status || "")
        .trim()
        .toLowerCase();

    if (text === "inactive") return "inactive";

    return "active";
}

function getInitials(name) {
    const parts = String(name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length === 0) {
        return "?";
    }

    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }

    return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase();
}

function sortText(a, b) {
    return String(a).localeCompare(String(b), undefined, {
        numeric: true,
    });
}

// =========================================================
// MAIN COMPONENT
// =========================================================

export default function StudentList() {
    const navigate = useNavigate();

    // =====================================================
    // DATA
    // =====================================================

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // student_id currently being changed (prevents double clicks)
    const [statusUpdating, setStatusUpdating] = useState(null);

    // =====================================================
    // FILTERS
    // =====================================================

    const [search, setSearch] = useState("");
    const [classFilter, setClassFilter] = useState("all");
    const [streamFilter, setStreamFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [teacherFilter, setTeacherFilter] = useState("all");

    // =====================================================
    // PAGINATION
    // =====================================================

    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);

    // =====================================================
    // GET ALL STUDENTS
    // =====================================================

    async function loadStudents() {
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_URL}/students`);

            let data = [];

            try {
                data = await res.json();
            } catch {
                data = [];
            }

            if (!res.ok) {
                throw new Error(
                    data.message ||
                    data.error ||
                    `Server responded with ${res.status}`
                );
            }

            const list = Array.isArray(data)
                ? data
                : data.students || [];

            setStudents(list);
        } catch (err) {
            console.error("Error loading students:", err);

            setError(err.message || "Could not load students");

            setStudents([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadStudents();
    }, []);

    // =====================================================
    // ACTIVATE / DEACTIVATE STUDENT (click the status badge)
    // =====================================================

    async function changeStudentStatus(student) {
        const studentId = student.student_id;

        if (!studentId) {
            setError("Student ID is missing.");
            return;
        }

        const currentStatus = getStatus(student);

        // active -> deactivate, inactive -> activate
        const action =
            currentStatus === "active"
                ? "deactivate"
                : "activate";

        setStatusUpdating(studentId);
        setError("");

        try {
            const res = await fetch(
                `${API_URL}/students/${studentId}/${action}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            let data = null;

            try {
                data = await res.json();
            } catch {
                data = null;
            }

            if (!res.ok) {
                throw new Error(
                    data?.message ||
                    data?.error ||
                    (typeof data === "string" ? data : "") ||
                    `Could not ${action} student`
                );
            }

            // Update the student in the frontend state.
            // We set every possible field so getStatus()
            // always reads the new value.
            const isNowActive = action === "activate";

            setStudents((currentStudents) =>
                currentStudents.map((item) =>
                    item.student_id === studentId
                        ? {
                            ...item,
                            status: isNowActive
                                ? "active"
                                : "inactive",
                            is_active: isNowActive,
                            active: isNowActive,
                        }
                        : item
                )
            );
        } catch (err) {
            console.error(
                `Error trying to ${action} student:`,
                err
            );

            setError(
                err.message || `Could not ${action} student`
            );
        } finally {
            setStatusUpdating(null);
        }
    }

    // =====================================================
    // RESET PAGE WHEN FILTERS CHANGE
    // =====================================================

    useEffect(() => {
        setPage(1);
    }, [
        search,
        classFilter,
        streamFilter,
        statusFilter,
        teacherFilter,
        pageSize,
    ]);

    // =====================================================
    // FILTER OPTIONS
    // =====================================================

    const classOptions = [
        ...new Set(
            students
                .map((s) => s.student_class)
                .filter(Boolean)
        ),
    ].sort(sortText);

    const streamOptions = [
        ...new Set(
            students
                .filter(
                    (s) =>
                        classFilter === "all" ||
                        s.student_class === classFilter
                )
                .map((s) => s.stream)
                .filter(Boolean)
        ),
    ].sort(sortText);

    const teacherOptions = [
        ...new Set(
            students
                .map(getTeacher)
                .filter(Boolean)
        ),
    ].sort(sortText);

    const hasTeacher = teacherOptions.length > 0;

    // =====================================================
    // APPLY FILTERS
    // =====================================================

    const searchText = search.trim().toLowerCase();

    const filtered = students.filter((student) => {
        if (
            classFilter !== "all" &&
            student.student_class !== classFilter
        ) {
            return false;
        }

        if (
            streamFilter !== "all" &&
            student.stream !== streamFilter
        ) {
            return false;
        }

        if (
            statusFilter !== "all" &&
            getStatus(student) !== statusFilter
        ) {
            return false;
        }

        if (
            teacherFilter !== "all" &&
            getTeacher(student) !== teacherFilter
        ) {
            return false;
        }

        if (!searchText) {
            return true;
        }

        return (
            String(student.student_name || "")
                .toLowerCase()
                .includes(searchText) ||
            String(student.student_id || "")
                .toLowerCase()
                .includes(searchText) ||
            String(student.guardian_name || "")
                .toLowerCase()
                .includes(searchText)
        );
    });

    const filtersActive =
        searchText !== "" ||
        classFilter !== "all" ||
        streamFilter !== "all" ||
        statusFilter !== "all" ||
        teacherFilter !== "all";

    function clearFilters() {
        setSearch("");
        setClassFilter("all");
        setStreamFilter("all");
        setStatusFilter("all");
        setTeacherFilter("all");
    }

    // =====================================================
    // PAGINATION
    // =====================================================

    const totalRows = filtered.length;

    const totalPages = Math.max(
        1,
        Math.ceil(totalRows / pageSize)
    );

    const safePage = Math.min(page, totalPages);

    const startIndex = (safePage - 1) * pageSize;

    const pageRows = filtered.slice(
        startIndex,
        startIndex + pageSize
    );

    const showingFrom =
        totalRows === 0 ? 0 : startIndex + 1;

    const showingTo = startIndex + pageRows.length;

    // =====================================================
    // TABLE COLUMN COUNT
    // Student, Class, Stream, Gender, Contact, Guardian, Status
    // + Teacher (optional)
    // =====================================================

    const columnCount = 7 + (hasTeacher ? 1 : 0);

    // =====================================================
    // PAGE
    // =====================================================

    return (
        <Layout role="admin">
            <div className="student-list-content">

                {/* PAGE HEADER */}

                <header className="sl-page-header">

                    <div className="sl-header-text">

                        <h1 className="sl-page-title">
                            Students
                        </h1>

                        <p className="sl-page-subtitle">
                            Every student added to the school, with
                            class, stream and guardian details
                        </p>

                    </div>

                    <button
                        type="button"
                        className="sl-btn-primary"
                        onClick={() =>
                            navigate("/admin/students/new")
                        }
                    >
                        <FiPlus />
                        Add student
                    </button>

                </header>

                {/* SUMMARY */}

                <div className="sl-summary">

                    <div className="sl-stat">
                        <span className="sl-stat-label">
                            Total students
                        </span>
                        <strong className="sl-stat-value">
                            {students.length}
                        </strong>
                    </div>

                    <div className="sl-stat sl-stat--green">
                        <span className="sl-stat-label">
                            Classes
                        </span>
                        <strong className="sl-stat-value">
                            {classOptions.length}
                        </strong>
                    </div>

                    <div className="sl-stat sl-stat--yellow">
                        <span className="sl-stat-label">
                            {filtersActive
                                ? "Matching filters"
                                : "Showing"}
                        </span>
                        <strong className="sl-stat-value">
                            {totalRows}
                        </strong>
                    </div>

                </div>

                {/* ERROR */}

                {error && (
                    <div
                        className="sl-message sl-message--error"
                        role="alert"
                    >
                        {error}
                    </div>
                )}

                {/* TABLE CARD */}

                <section className="sl-table-card">

                    {/* FILTER HEADER */}

                    <div className="sl-table-header">

                        <h2 className="sl-table-title">
                            All students
                        </h2>

                        <div className="sl-table-controls">

                            {/* SEARCH */}

                            <div className="sl-control">

                                <span className="sl-control-label">
                                    Search
                                </span>

                                <div className="sl-search-input">

                                    <FiSearch className="sl-search-icon" />

                                    <input
                                        type="text"
                                        placeholder="Name, ID or guardian"
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(e.target.value)
                                        }
                                    />

                                </div>

                            </div>

                            {/* CLASS */}

                            <div className="sl-control">

                                <span className="sl-control-label">
                                    Class
                                </span>

                                <div className="sl-select-wrapper">

                                    <select
                                        value={classFilter}
                                        onChange={(e) => {
                                            setClassFilter(
                                                e.target.value
                                            );

                                            setStreamFilter("all");
                                        }}
                                    >

                                        <option value="all">
                                            All classes
                                        </option>

                                        {classOptions.map((c) => (
                                            <option
                                                key={`class-${c}`}
                                                value={c}
                                            >
                                                {c}
                                            </option>
                                        ))}

                                    </select>

                                </div>

                            </div>

                            {/* STREAM */}

                            <div className="sl-control">

                                <span className="sl-control-label">
                                    Stream
                                </span>

                                <div className="sl-select-wrapper">

                                    <select
                                        value={streamFilter}
                                        onChange={(e) =>
                                            setStreamFilter(
                                                e.target.value
                                            )
                                        }
                                    >

                                        <option value="all">
                                            All streams
                                        </option>

                                        {streamOptions.map((s) => (
                                            <option
                                                key={`stream-${s}`}
                                                value={s}
                                            >
                                                Stream {s}
                                            </option>
                                        ))}

                                    </select>

                                </div>

                            </div>

                            {/* TEACHER */}

                            {hasTeacher && (
                                <div className="sl-control">

                                    <span className="sl-control-label">
                                        Teacher
                                    </span>

                                    <div className="sl-select-wrapper">

                                        <select
                                            value={teacherFilter}
                                            onChange={(e) =>
                                                setTeacherFilter(
                                                    e.target.value
                                                )
                                            }
                                        >

                                            <option value="all">
                                                All teachers
                                            </option>

                                            {teacherOptions.map((t) => (
                                                <option
                                                    key={`teacher-${t}`}
                                                    value={t}
                                                >
                                                    {t}
                                                </option>
                                            ))}

                                        </select>

                                    </div>

                                </div>
                            )}

                            {/* STATUS */}

                            <div className="sl-control">

                                <span className="sl-control-label">
                                    Status
                                </span>

                                <div className="sl-select-wrapper">

                                    <select
                                        value={statusFilter}
                                        onChange={(e) =>
                                            setStatusFilter(
                                                e.target.value
                                            )
                                        }
                                    >

                                        <option value="all">
                                            All
                                        </option>

                                        <option value="active">
                                            Active
                                        </option>

                                        <option value="inactive">
                                            Inactive
                                        </option>

                                    </select>

                                </div>

                            </div>

                        </div>

                    </div>

                    {/* TOOLBAR */}

                    <div className="sl-toolbar">

                        <span className="sl-count">
                            Showing {showingFrom}–{showingTo} of{" "}
                            {totalRows} students
                        </span>

                        <div className="sl-toolbar-right">

                            {filtersActive && (
                                <button
                                    type="button"
                                    className="sl-chip-btn"
                                    onClick={clearFilters}
                                >
                                    <FiX />
                                    Clear filters
                                </button>
                            )}

                            <button
                                type="button"
                                className="sl-dark-btn"
                                onClick={loadStudents}
                                disabled={loading}
                            >

                                <FiRefreshCw
                                    className={
                                        loading ? "sl-spin" : ""
                                    }
                                />

                                Refresh

                            </button>

                            <div className="sl-select-wrapper sl-page-size">

                                <select
                                    value={pageSize}
                                    onChange={(e) =>
                                        setPageSize(
                                            Number(e.target.value)
                                        )
                                    }
                                >

                                    {PAGE_SIZES.map((size) => (
                                        <option
                                            key={`page-size-${size}`}
                                            value={size}
                                        >
                                            {size} per page
                                        </option>
                                    ))}

                                </select>

                            </div>

                        </div>

                    </div>

                    {/* TABLE */}

                    <div className="sl-table-scroll">

                        <table className="sl-table">

                            <thead>

                            <tr>
                                <th>Student</th>
                                <th>Class</th>
                                <th>Stream</th>
                                <th>Gender</th>
                                <th>Contact</th>
                                <th>Guardian</th>
                                {hasTeacher && <th>Teacher</th>}
                                <th>Status</th>
                            </tr>

                            </thead>

                            <tbody>

                            {/* LOADING */}

                            {loading && (
                                <tr key="loading-row">
                                    <td
                                        colSpan={columnCount}
                                        className="sl-empty-row"
                                    >
                                        Loading students...
                                    </td>
                                </tr>
                            )}

                            {/* EMPTY */}

                            {!loading &&
                                pageRows.length === 0 && (
                                    <tr key="empty-row">
                                        <td
                                            colSpan={columnCount}
                                            className="sl-empty-row"
                                        >
                                            {students.length === 0
                                                ? "No students have been added yet."
                                                : "No students match your filters."}
                                        </td>
                                    </tr>
                                )}

                            {/* STUDENTS */}

                            {!loading &&
                                pageRows.map((student, index) => {

                                    const status =
                                        getStatus(student);

                                    const updating =
                                        statusUpdating ===
                                        student.student_id;

                                    // guaranteed unique key
                                    const rowKey =
                                        student.student_id
                                            ? `student-${student.student_id}`
                                            : `student-row-${startIndex + index}`;

                                    return (
                                        <tr
                                            key={rowKey}
                                            className={
                                                status === "inactive"
                                                    ? "sl-row-inactive"
                                                    : ""
                                            }
                                        >

                                            {/* STUDENT */}

                                            <td>
                                                <div className="sl-student-cell">

                                                        <span className="sl-avatar">
                                                            {getInitials(
                                                                student.student_name
                                                            )}
                                                        </span>

                                                    <div>

                                                        <div className="sl-student-name">
                                                            {student.student_name ||
                                                                "—"}
                                                        </div>

                                                        <div className="sl-student-id">
                                                            {student.student_id ||
                                                                "—"}
                                                        </div>

                                                    </div>

                                                </div>
                                            </td>

                                            {/* CLASS */}

                                            <td>
                                                    <span className="sl-badge sl-badge--navy">
                                                        {student.student_class ||
                                                            "—"}
                                                    </span>
                                            </td>

                                            {/* STREAM */}

                                            <td>
                                                {student.stream ? (
                                                    <span className="sl-badge sl-badge--blue">
                                                            {student.stream}
                                                        </span>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>

                                            {/* GENDER */}

                                            <td className="sl-capitalize">
                                                {student.gender || "—"}
                                            </td>

                                            {/* CONTACT */}

                                            <td>
                                                <div className="sl-two-line">

                                                        <span>
                                                            {student.phone_number ||
                                                                "—"}
                                                        </span>

                                                    <small>
                                                        {student.email || ""}
                                                    </small>

                                                </div>
                                            </td>

                                            {/* GUARDIAN */}

                                            <td>
                                                <div className="sl-two-line">

                                                        <span>
                                                            {student.guardian_name ||
                                                                "—"}
                                                        </span>

                                                    <small>
                                                        {student.relationship
                                                            ? `${student.relationship} · `
                                                            : ""}
                                                        {student.phone || ""}
                                                    </small>

                                                </div>
                                            </td>

                                            {/* TEACHER */}

                                            {hasTeacher && (
                                                <td>
                                                    {getTeacher(student) ||
                                                        "—"}
                                                </td>
                                            )}

                                            {/* STATUS (CLICK TO CHANGE) */}

                                            <td>
                                                <button
                                                    type="button"
                                                    className={`sl-status sl-status--${status} sl-status--clickable`}
                                                    onClick={() =>
                                                        changeStudentStatus(
                                                            student
                                                        )
                                                    }
                                                    disabled={updating}
                                                    title={
                                                        status === "active"
                                                            ? "Click to deactivate"
                                                            : "Click to activate"
                                                    }
                                                >
                                                    {updating
                                                        ? "Saving..."
                                                        : status === "active"
                                                            ? "Active"
                                                            : "Inactive"}
                                                </button>
                                            </td>

                                        </tr>
                                    );
                                })}

                            </tbody>

                        </table>

                    </div>

                    {/* PAGINATION */}

                    {!loading && totalRows > 0 && (
                        <div className="sl-pagination">

                            <button
                                type="button"
                                className="sl-dark-btn"
                                onClick={() =>
                                    setPage(Math.max(1, safePage - 1))
                                }
                                disabled={safePage <= 1}
                            >
                                <FiChevronLeft />
                                Previous
                            </button>

                            <span className="sl-page-info">
                                Page {safePage} of {totalPages}
                            </span>

                            <button
                                type="button"
                                className="sl-dark-btn"
                                onClick={() =>
                                    setPage(
                                        Math.min(
                                            totalPages,
                                            safePage + 1
                                        )
                                    )
                                }
                                disabled={safePage >= totalPages}
                            >
                                Next
                                <FiChevronRight />
                            </button>

                        </div>
                    )}

                </section>

            </div>
        </Layout>
    );
}