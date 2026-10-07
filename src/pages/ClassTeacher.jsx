import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";          // NEW
import Layout from "../Layout";
import "./ClassTeacher.css";

import {
    FiFileText,
    FiRefreshCw,
    FiSend,
    FiCheckCircle,
    FiAlertCircle,
    FiAward,
    FiLoader,
    FiSearch,
    FiChevronLeft,
    FiChevronRight,
    FiFilter,
    FiUsers,
    FiLayers,
    FiCheckSquare,
    FiBarChart2,
} from "react-icons/fi";

const API_URL = import.meta.env.VITE_API_URL;

// NEW: where to send the teacher when his session is not valid
const LOGIN_PATH = "/login/class-teacher";

// =========================================================
// GRADE POINTS
// Lower points = better aggregate
// =========================================================

const GRADE_POINTS = {
    D1: 1,
    D2: 2,
    C3: 3,
    C4: 4,
    C5: 5,
    C6: 6,
    P7: 7,
    P8: 8,
    F9: 9,
};

// =========================================================
// ASSESSMENT ORDER
// =========================================================

const ASSESSMENT_ORDER = [
    "B.O.T",
    "Test",
    "Mid-Term",
    "Holiday Package",
    "End of Term",
];

// How many students are shown in the table at one time
const PAGE_SIZES = [25, 50, 100];

// =========================================================
// NEW: FETCH WITH THE LOGIN TOKEN
// Every class teacher request must carry the token, the
// server uses it to decide which class he may see.
// =========================================================

async function authFetch(url) {

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
    });

    const data = await response.json().catch(() => ({}));

    return { response, data };
}

// =========================================================
// MAIN COMPONENT
// =========================================================

export default function ClassTeacher() {

    const navigate = useNavigate();

    // =====================================================
    // NEW: HIS CLASS(ES), LOADED FROM THE SERVER
    // =====================================================

    const [myClasses, setMyClasses] = useState([]);
    const [classesLoaded, setClassesLoaded] = useState(false);

    // =====================================================
    // FILTERS: YEAR / TERM / CLASS / STREAM
    // =====================================================

    const currentYear = new Date().getFullYear();

    const [year, setYear] = useState(String(currentYear));
    const [term, setTerm] = useState("Term 1");
    const [studentClass, setStudentClass] = useState("");   // set after his classes load
    const [stream, setStream] = useState("all");

    // =====================================================
    // WHICH ASSESSMENT IS SHOWN (one at a time)
    // =====================================================

    const [selectedAssessment, setSelectedAssessment] = useState("");

    // =====================================================
    // TABLE CONTROLS: SEARCH + PAGINATION
    // =====================================================

    const [search, setSearch] = useState("");
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);

    // =====================================================
    // MARKS
    // =====================================================

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Used to ignore old responses when filters change quickly
    const requestId = useRef(0);

    // =====================================================
    // SEND TO ADMIN
    // =====================================================

    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    // =====================================================
    // NEW: SESSION NOT VALID -> BACK TO LOGIN
    // =====================================================

    function logoutToLogin() {
        localStorage.clear();
        navigate(LOGIN_PATH, { replace: true });
    }

    // =====================================================
    // NEW: LOAD HIS CLASS FROM THE SERVER (once)
    // =====================================================

    useEffect(() => {

        if (!localStorage.getItem("token")) {
            logoutToLogin();
            return;
        }

        async function loadMyClasses() {

            try {

                const { response, data } = await authFetch(
                    `${API_URL}/api/class-teacher/my-class`
                );

                if (response.status === 401) {
                    logoutToLogin();
                    return;
                }

                if (!response.ok) {
                    throw new Error(
                        data.message || "Could not load your class"
                    );
                }

                setMyClasses(Array.isArray(data) ? data : []);

                // start on his first class
                if (Array.isArray(data) && data.length > 0) {
                    setStudentClass(data[0].level);
                }

            } catch (err) {

                console.error("Error getting class teacher classes:", err);
                setError(err.message || "Could not load your class");

            } finally {

                setClassesLoaded(true);
            }
        }

        loadMyClasses();

    }, []);

    // =====================================================
    // NEW: CLASS OPTIONS = ONLY HIS CLASSES
    // =====================================================

    const classOptions = [
        ...new Set(myClasses.map((c) => c.level)),
    ];

    const myClassLabels = myClasses.map((c) => c.label).join(", ");

    // =====================================================
    // GET CLASS MARKS
    // =====================================================

    async function getClassMarks() {

        // no class yet (still loading, or he has none)
        if (!studentClass) {
            return;
        }

        const thisRequest = ++requestId.current;

        setLoading(true);
        setError("");
        setSent(false);

        try {

            // CHANGED: protected class teacher route + token
            const url =
                `${API_URL}/api/class-teacher/marks` +
                `?class=${encodeURIComponent(studentClass)}` +
                `&term=${encodeURIComponent(term)}` +
                `&year=${encodeURIComponent(year)}`;

            const { response, data } = await authFetch(url);

            // A newer request has started, ignore this one
            if (thisRequest !== requestId.current) {
                return;
            }

            if (response.status === 401) {
                logoutToLogin();
                return;
            }

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to get class marks"
                );
            }

            setStudents(data.students || []);

        } catch (err) {

            if (thisRequest !== requestId.current) {
                return;
            }

            console.error("Error getting class marks:", err);

            setError(err.message || "Could not load class marks");
            setStudents([]);

        } finally {

            if (thisRequest === requestId.current) {
                setLoading(false);
            }
        }
    }

    // =====================================================
    // RELOAD WHEN YEAR / TERM / CLASS CHANGE
    // =====================================================

    useEffect(() => {
        getClassMarks();
    }, [year, term, studentClass]);

    // =====================================================
    // BACK TO PAGE 1 WHEN THE VIEW CHANGES
    // =====================================================

    useEffect(() => {
        setPage(1);
    }, [
        year,
        term,
        studentClass,
        stream,
        selectedAssessment,
        search,
        pageSize,
    ]);

    // =====================================================
    // YEAR OPTIONS (this year and the 5 before it)
    // =====================================================

    const yearOptions = Array.from(
        { length: 6 },
        (_, i) => String(currentYear - i)
    );

    if (!yearOptions.includes(String(year))) {
        yearOptions.push(String(year));
    }

    // =====================================================
    // STREAM OPTIONS (taken from the loaded students)
    // =====================================================

    const streamOptions = [
        ...new Set(
            students
                .map((student) => student.stream)
                .filter(Boolean)
        ),
    ].sort((a, b) => String(a).localeCompare(String(b)));

    // =====================================================
    // ALL ASSESSMENTS, IN ORDER
    // =====================================================

    const assessments = [
        ...new Set(
            students.flatMap((student) =>
                (student.marks || [])
                    .map((mark) => mark.assessment)
                    .filter(Boolean)
            )
        ),
    ];

    const sortedAssessments = [...assessments].sort((a, b) => {

        const indexA = ASSESSMENT_ORDER.indexOf(a);
        const indexB = ASSESSMENT_ORDER.indexOf(b);

        if (indexA === -1 && indexB === -1) {
            return String(a).localeCompare(String(b));
        }

        if (indexA === -1) return 1;
        if (indexB === -1) return -1;

        return indexA - indexB;
    });

    // The assessment actually on screen
    const activeAssessment = sortedAssessments.includes(selectedAssessment)
        ? selectedAssessment
        : sortedAssessments[0] || "";

    // =====================================================
    // GET SUBJECTS FOR ASSESSMENT
    // =====================================================

    function getAssessmentSubjects(assessment) {

        return [
            ...new Set(
                students.flatMap((student) =>
                    (student.marks || [])
                        .filter((mark) => mark.assessment === assessment)
                        .map((mark) => mark.subject)
                        .filter(Boolean)
                )
            ),
        ];
    }

    // =====================================================
    // GET STUDENT MARK
    // =====================================================

    function getStudentMark(student, subject, assessment) {

        return (student.marks || []).find(
            (mark) =>
                mark.subject === subject &&
                mark.assessment === assessment
        );
    }

    // =====================================================
    // SUBMISSION INFORMATION (whole class, every stream)
    // =====================================================

    function getSubmissionInfo(subject, assessment) {

        const submittedCount = students.filter((student) =>
            getStudentMark(student, subject, assessment)
        ).length;

        const totalStudents = students.length;

        return {
            submitted:
                totalStudents > 0 && submittedCount === totalStudents,
            submittedCount,
            totalStudents,
        };
    }

    function getSubmittedSubjects(assessment) {

        return getAssessmentSubjects(assessment).filter(
            (subject) => getSubmissionInfo(subject, assessment).submitted
        );
    }

    // =====================================================
    // CHECK EVERYTHING IS SUBMITTED (all assessments)
    // =====================================================

    const allExpectedSubmissions = sortedAssessments.flatMap(
        (assessment) =>
            getAssessmentSubjects(assessment).map((subject) => ({
                subject,
                assessment,
            }))
    );

    const allSubmitted =
        allExpectedSubmissions.length > 0 &&
        allExpectedSubmissions.every(
            ({ subject, assessment }) =>
                getSubmissionInfo(subject, assessment).submitted
        );

    // =====================================================
    // STUDENT TOTAL / AVERAGE / AGGREGATE
    // =====================================================

    function getAssessmentMarks(student, assessment) {

        return (student.marks || []).filter(
            (mark) => mark.assessment === assessment
        );
    }

    function getStudentTotal(student, assessment) {

        return getAssessmentMarks(student, assessment).reduce(
            (total, mark) => total + Number(mark.score || 0),
            0
        );
    }

    function getStudentAverage(student, assessment) {

        const marks = getAssessmentMarks(student, assessment);

        if (marks.length === 0) {
            return 0;
        }

        const total = marks.reduce(
            (sum, mark) => sum + Number(mark.score || 0),
            0
        );

        return total / marks.length;
    }

    function isGradeable(mark) {

        const grade = String(mark.grade || "").trim().toUpperCase();

        return Object.prototype.hasOwnProperty.call(GRADE_POINTS, grade);
    }

    function getStudentAggregate(student, assessment) {

        const marks = getAssessmentMarks(student, assessment);

        let aggregate = 0;
        let gradedSubjects = 0;

        marks.forEach((mark) => {

            if (isGradeable(mark)) {

                const grade = String(mark.grade).trim().toUpperCase();

                aggregate += GRADE_POINTS[grade];
                gradedSubjects++;
            }
        });

        if (gradedSubjects === 0) {
            return null;
        }

        return aggregate;
    }

    function getAggregateSubjectCount(student, assessment) {

        return getAssessmentMarks(student, assessment).filter(isGradeable)
            .length;
    }

    // =====================================================
    // RANK STUDENTS BY AGGREGATE
    //
    // Positions are worked out across the WHOLE class, so a
    // student keeps the same position whichever stream filter
    // or search is on.
    // =====================================================

    function getStudentsRankedByAggregate(assessment) {

        const ranked = students
            .map((student) => ({
                student,
                aggregate: getStudentAggregate(student, assessment),
                subjects: getAggregateSubjectCount(student, assessment),
            }))
            .filter((item) => item.aggregate !== null)
            .sort((a, b) => a.aggregate - b.aggregate);

        let lastAggregate = null;
        let lastPosition = 0;

        return ranked.map((item, index) => {

            if (item.aggregate !== lastAggregate) {
                lastPosition = index + 1;
                lastAggregate = item.aggregate;
            }

            return { ...item, position: lastPosition };
        });
    }

    function getRowsInPositionOrder(assessment) {

        const ranked = getStudentsRankedByAggregate(assessment);

        const rankedIds = new Set(
            ranked.map((item) => item.student.student_id)
        );

        const unranked = students
            .filter((student) => !rankedIds.has(student.student_id))
            .map((student) => ({
                student,
                aggregate: null,
                subjects: 0,
                position: null,
            }));

        return [...ranked, ...unranked];
    }

    // =====================================================
    // ROWS ON SCREEN: stream filter -> search -> page
    // =====================================================

    const searchText = search.trim().toLowerCase();

    const allRows = activeAssessment
        ? getRowsInPositionOrder(activeAssessment)
        : [];

    const filteredRows = allRows.filter(({ student }) => {

        if (stream !== "all" && student.stream !== stream) {
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
                .includes(searchText)
        );
    });

    const totalRows = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const safePage = Math.min(page, totalPages);

    const startIndex = (safePage - 1) * pageSize;

    const pageRows = filteredRows.slice(
        startIndex,
        startIndex + pageSize
    );

    const showingFrom = totalRows === 0 ? 0 : startIndex + 1;
    const showingTo = startIndex + pageRows.length;

    const assessmentSubjects = activeAssessment
        ? getAssessmentSubjects(activeAssessment)
        : [];

    // =====================================================
    // SEND REPORT
    // =====================================================

    async function handleSendToAdmin() {

        setSending(true);

        // Temporary until admin endpoint is connected.
        await new Promise((resolve) => setTimeout(resolve, 500));

        setSending(false);
        setSent(true);
    }

    // =====================================================
    // PAGE
    // =====================================================

    const submittedSubjects = activeAssessment
        ? getSubmittedSubjects(activeAssessment)
        : [];

    return (
        <Layout role="classTeacher">

            <div className="class-teacher-page">

                {/* =================================================
                    HEADER
                ================================================= */}

                <div className="class-teacher-header">

                    <div className="header-text">

                        <div className="page-eyebrow">
                            <FiFileText />
                            Class teacher
                            {myClassLabels ? ` · ${myClassLabels}` : ""}
                        </div>

                        <h1>Report Compilation</h1>

                        <p>
                            Pick a year and term, then review one
                            assessment at a time and prepare the report
                            for your class.
                        </p>

                    </div>

                    <div className="header-stats">

                        <HeaderStat
                            icon={<FiUsers />}
                            label="Students"
                            value={students.length}
                        />

                        <HeaderStat
                            icon={<FiLayers />}
                            label="Assessments"
                            value={sortedAssessments.length}
                        />

                        <HeaderStat
                            icon={<FiCheckCircle />}
                            label="Status"
                            value={allSubmitted ? "Complete" : "Pending"}
                        />

                    </div>

                </div>

                {/* =================================================
                    FILTERS
                ================================================= */}

                <div className="teacher-filters">

                    <div className="filters-title">
                        <FiFilter />
                        Report filters
                    </div>

                    <div className="filters-row">

                        {/* YEAR */}

                        <div className="filter-field">

                            <label>Academic year</label>

                            <div className="select-wrapper">

                                <select
                                    value={year}
                                    onChange={(e) => {
                                        setYear(e.target.value);
                                        setStream("all");
                                    }}
                                >
                                    {yearOptions.map((y) => (
                                        <option key={y} value={y}>
                                            {y}
                                        </option>
                                    ))}
                                </select>

                            </div>

                        </div>

                        {/* TERM */}

                        <div className="filter-field">

                            <label>Term</label>

                            <div className="select-wrapper">

                                <select
                                    value={term}
                                    onChange={(e) => {
                                        setTerm(e.target.value);
                                        setStream("all");
                                    }}
                                >
                                    <option value="Term 1">Term 1</option>
                                    <option value="Term 2">Term 2</option>
                                    <option value="Term 3">Term 3</option>
                                </select>

                            </div>

                        </div>

                        {/* CLASS (CHANGED: only his own class or classes) */}

                        <div className="filter-field">

                            <label>Class</label>

                            <div className="select-wrapper">

                                <select
                                    value={studentClass}
                                    onChange={(e) => {
                                        setStudentClass(e.target.value);
                                        setStream("all");
                                    }}
                                    disabled={classOptions.length <= 1}
                                >
                                    {classOptions.length === 0 && (
                                        <option value="">
                                            {classesLoaded
                                                ? "No class assigned"
                                                : "Loading..."}
                                        </option>
                                    )}

                                    {classOptions.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>

                            </div>

                        </div>

                        {/* STREAM (only when the data has streams) */}

                        {streamOptions.length > 0 && (

                            <div className="filter-field">

                                <label>Stream</label>

                                <div className="select-wrapper">

                                    <select
                                        value={stream}
                                        onChange={(e) =>
                                            setStream(e.target.value)
                                        }
                                    >
                                        <option value="all">
                                            All streams
                                        </option>

                                        {streamOptions.map((s) => (
                                            <option key={s} value={s}>
                                                Stream {s}
                                            </option>
                                        ))}
                                    </select>

                                </div>

                            </div>

                        )}

                        <button
                            className="load-marks-button"
                            onClick={getClassMarks}
                            disabled={loading || !studentClass}
                        >

                            <FiRefreshCw
                                className={loading ? "spin" : ""}
                            />

                            {loading ? "Loading..." : "Refresh"}

                        </button>

                    </div>

                </div>

                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (

                    <div className="teacher-error">

                        <FiAlertCircle />

                        <div>
                            <strong>Unable to load report</strong>
                            <span>{error}</span>
                        </div>

                    </div>

                )}

                {/* =================================================
                    ASSESSMENT TABS (one assessment at a time)
                ================================================= */}

                {sortedAssessments.length > 0 && (

                    <div className="assessment-tabs">

                        <span className="assessment-tabs-label">
                            Assessment
                        </span>

                        <div className="assessment-tabs-list">

                            {sortedAssessments.map((assessment) => (

                                <button
                                    key={assessment}
                                    type="button"
                                    className={`assessment-tab ${getAssessmentClass(
                                        assessment
                                    )} ${
                                        assessment === activeAssessment
                                            ? "is-active"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        setSelectedAssessment(assessment)
                                    }
                                >
                                    {assessment}
                                </button>

                            ))}

                        </div>

                    </div>

                )}

                {/* =================================================
                    SUBJECT SUBMISSIONS (selected assessment)
                ================================================= */}

                <SectionLabel
                    icon={<FiCheckSquare />}
                    eyebrow="Submission tracking"
                >
                    Subject submissions
                </SectionLabel>

                {loading ? (

                    <div className="empty-state">

                        <FiLoader className="spin" />

                        <div>
                            <strong>Loading submissions</strong>
                            <span>
                                Please wait while class marks are retrieved.
                            </span>
                        </div>

                    </div>

                ) : sortedAssessments.length === 0 ? (

                    <div className="empty-state">

                        <div>
                            <strong>No marks uploaded</strong>
                            <span>
                                {classesLoaded && !studentClass
                                    ? "No class has been assigned to you yet. Please contact the admin."
                                    : `No subject marks have been uploaded for ${studentClass}, ${term} ${year} yet.`}
                            </span>
                        </div>

                    </div>

                ) : submittedSubjects.length === 0 ? (

                    <div className="empty-state">

                        <div>
                            <strong>No fully submitted subjects</strong>
                            <span>
                                No subject has marks for every student in{" "}
                                {activeAssessment} yet.
                            </span>
                        </div>

                    </div>

                ) : (

                    <div className="assessment-grid">

                        <div
                            className={`assessment-box ${getAssessmentClass(
                                activeAssessment
                            )}`}
                        >

                            <div className="assessment-box-header">

                                <div>
                                    <span className="assessment-small-label">
                                        ASSESSMENT
                                    </span>
                                    <h3>{activeAssessment}</h3>
                                </div>

                                <div className="assessment-year">
                                    {term} · {year}
                                </div>

                            </div>

                            <div className="submission-subject-grid">

                                {submittedSubjects.map((subject) => {

                                    const info = getSubmissionInfo(
                                        subject,
                                        activeAssessment
                                    );

                                    return (

                                        <div
                                            key={`${activeAssessment}-${subject}`}
                                            className="submission-subject-card"
                                        >

                                            <div className="submission-subject-top">

                                                <span className="mini-subject-icon">
                                                    {getSubjectInitial(subject)}
                                                </span>

                                                <div className="submitted-status">
                                                    <FiCheckCircle />
                                                    Submitted
                                                </div>

                                            </div>

                                            <strong className="submission-subject-name">
                                                {subject}
                                            </strong>

                                            <div className="submission-subject-meta">
                                                <span>Subject teacher</span>
                                                <span>
                                                    {info.submittedCount}/
                                                    {info.totalStudents}
                                                </span>
                                            </div>

                                        </div>

                                    );
                                })}

                            </div>

                        </div>

                    </div>

                )}

                {/* =================================================
                    CLASS MARKS (selected assessment, paginated)
                ================================================= */}

                <SectionLabel
                    icon={<FiBarChart2 />}
                    eyebrow="Academic performance"
                >
                    Class marks
                </SectionLabel>

                {loading ? (

                    <div className="empty-state">

                        <FiLoader className="spin" />

                        <div>
                            <strong>Loading class marks</strong>
                            <span>Preparing the marks table.</span>
                        </div>

                    </div>

                ) : sortedAssessments.length === 0 ? (

                    <div className="empty-state">

                        <div>
                            <strong>No student marks</strong>
                            <span>
                                There are no marks available for this
                                class, term and year.
                            </span>
                        </div>

                    </div>

                ) : (

                    <div className="marks-sections">

                        <div className="marks-assessment-block">

                            {/* TABLE HEADER */}

                            <div className="marks-table-header">

                                <div className="marks-title-area">

                                    <div className="marks-assessment-label">
                                        {activeAssessment}
                                    </div>

                                    <h2>Class marks</h2>

                                </div>

                                <div className="marks-meta">
                                    <span>{studentClass}</span>
                                    {stream !== "all" && (
                                        <span>Stream {stream}</span>
                                    )}
                                    <span>{term}</span>
                                    <span>{year}</span>
                                </div>

                            </div>

                            {/* TOOLBAR: SEARCH + PAGE SIZE */}

                            <div className="marks-toolbar">

                                <div className="marks-search">

                                    <FiSearch />

                                    <input
                                        type="text"
                                        placeholder="Search name or ID"
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(e.target.value)
                                        }
                                    />

                                </div>

                                <div className="marks-toolbar-right">

                                    <span className="marks-count">
                                        Showing {showingFrom}–{showingTo} of{" "}
                                        {totalRows} students
                                    </span>

                                    <div className="select-wrapper marks-page-size">

                                        <select
                                            value={pageSize}
                                            onChange={(e) =>
                                                setPageSize(
                                                    Number(e.target.value)
                                                )
                                            }
                                        >
                                            {PAGE_SIZES.map((size) => (
                                                <option key={size} value={size}>
                                                    {size} per page
                                                </option>
                                            ))}
                                        </select>

                                    </div>

                                </div>

                            </div>

                            {/* TABLE */}

                            <div className="marks-table-wrapper">

                                <table className="marks-table">

                                    <thead>

                                    <tr>

                                        <th className="position-header">
                                            Position
                                        </th>

                                        <th className="student-header">
                                            Student
                                        </th>

                                        {assessmentSubjects.map((subject) => (
                                            <th key={subject}>{subject}</th>
                                        ))}

                                        <th>Total</th>
                                        <th>Average</th>
                                        <th>Aggregate</th>

                                    </tr>

                                    </thead>

                                    <tbody>

                                    {pageRows.length === 0 && (

                                        <tr>
                                            <td
                                                colSpan={
                                                    assessmentSubjects.length + 5
                                                }
                                                className="marks-empty-row"
                                            >
                                                No students match your
                                                filters.
                                            </td>
                                        </tr>

                                    )}

                                    {pageRows.map(
                                        ({ student, aggregate, position }) => {

                                            const total = getStudentTotal(
                                                student,
                                                activeAssessment
                                            );

                                            const average = getStudentAverage(
                                                student,
                                                activeAssessment
                                            );

                                            return (

                                                <tr
                                                    key={`${activeAssessment}-${student.student_id}`}
                                                    className={
                                                        position !== null &&
                                                        position <= 3
                                                            ? `top-row top-${position}`
                                                            : ""
                                                    }
                                                >

                                                    {/* POSITION */}

                                                    <td className="position-cell">

                                                        {position !== null ? (

                                                            <span
                                                                className={
                                                                    position <= 3
                                                                        ? `position-badge rank-${position}`
                                                                        : "position-badge"
                                                                }
                                                            >
                                                                {position}
                                                            </span>

                                                        ) : (

                                                            <span className="missing-position">
                                                                —
                                                            </span>

                                                        )}

                                                    </td>

                                                    {/* STUDENT */}

                                                    <td className="student-cell">

                                                        <div className="student-inner">

                                                            <span className="student-avatar">
                                                                {getSubjectInitial(
                                                                    student.student_name
                                                                )}
                                                            </span>

                                                            <div>

                                                                <strong>
                                                                    {student.student_name}
                                                                </strong>

                                                                <small>
                                                                    ID: {student.student_id}
                                                                    {student.stream
                                                                        ? ` · Stream ${student.stream}`
                                                                        : ""}
                                                                </small>

                                                            </div>

                                                        </div>

                                                    </td>

                                                    {/* SUBJECT MARKS */}

                                                    {assessmentSubjects.map(
                                                        (subject) => {

                                                            const mark =
                                                                getStudentMark(
                                                                    student,
                                                                    subject,
                                                                    activeAssessment
                                                                );

                                                            return (

                                                                <td
                                                                    key={`${activeAssessment}-${student.student_id}-${subject}`}
                                                                >

                                                                    {mark ? (

                                                                        <div className="mark-cell">

                                                                            <strong>
                                                                                {mark.score}
                                                                            </strong>

                                                                            <span
                                                                                className={`grade-pill ${getGradeClass(
                                                                                    mark.grade
                                                                                )}`}
                                                                            >
                                                                                {mark.grade}
                                                                            </span>

                                                                        </div>

                                                                    ) : (

                                                                        <span className="missing-mark">
                                                                            —
                                                                        </span>

                                                                    )}

                                                                </td>

                                                            );
                                                        }
                                                    )}

                                                    {/* TOTAL */}

                                                    <td className="total-cell">
                                                        <strong>{total}</strong>
                                                    </td>

                                                    {/* AVERAGE */}

                                                    <td className="average-cell">
                                                        <strong>
                                                            {Number(average).toFixed(1)}
                                                        </strong>
                                                    </td>

                                                    {/* AGGREGATE */}

                                                    <td className="aggregate-cell">

                                                        {aggregate !== null ? (

                                                            <div className="aggregate-display">

                                                                <strong>
                                                                    {aggregate}
                                                                </strong>

                                                                <small>
                                                                    {getAggregateSubjectCount(
                                                                        student,
                                                                        activeAssessment
                                                                    )}{" "}
                                                                    subjects
                                                                </small>

                                                            </div>

                                                        ) : (

                                                            <span className="missing-aggregate">
                                                                —
                                                            </span>

                                                        )}

                                                    </td>

                                                </tr>

                                            );
                                        }
                                    )}

                                    </tbody>

                                </table>

                            </div>

                            {/* PAGINATION */}

                            {totalRows > 0 && (

                                <div className="marks-pagination">

                                    <button
                                        type="button"
                                        className="page-btn"
                                        onClick={() =>
                                            setPage(Math.max(1, safePage - 1))
                                        }
                                        disabled={safePage <= 1}
                                    >
                                        <FiChevronLeft />
                                        Previous
                                    </button>

                                    <span className="page-info">
                                        Page {safePage} of {totalPages}
                                    </span>

                                    <button
                                        type="button"
                                        className="page-btn"
                                        onClick={() =>
                                            setPage(
                                                Math.min(totalPages, safePage + 1)
                                            )
                                        }
                                        disabled={safePage >= totalPages}
                                    >
                                        Next
                                        <FiChevronRight />
                                    </button>

                                </div>

                            )}

                        </div>

                    </div>

                )}

                {/* =================================================
                    GRADING
                ================================================= */}

                <SectionLabel
                    icon={<FiAward />}
                    eyebrow="Report preparation"
                >
                    Grading & position
                </SectionLabel>

                <div className="grading-card">

                    <div className="grading-icon">
                        <FiAward />
                    </div>

                    <div>

                        <h3>Class report preparation</h3>

                        <p>
                            Subject marks, totals, averages, grade-point
                            aggregates and class positions are calculated
                            from the uploaded marks for each assessment.
                            Positions are worked out across the whole
                            class, so a student keeps the same position
                            when you filter by stream or search. Students
                            without gradeable marks are shown at the
                            bottom.
                        </p>

                    </div>

                </div>

                {/* =================================================
                    SEND REPORT
                ================================================= */}

                <div className="send-report-area">

                    <div className="send-report-content">

                        <div className="send-report-icon">
                            <FiSend />
                        </div>

                        <div>

                            <h3>Ready to submit the class report?</h3>

                            <p>
                                The report can be sent to the administrator
                                once all required subject marks have been
                                submitted.
                            </p>

                        </div>

                    </div>

                    <button
                        className={
                            allSubmitted
                                ? "send-report-button"
                                : "send-report-button disabled"
                        }
                        onClick={handleSendToAdmin}
                        disabled={!allSubmitted || sending}
                    >

                        <FiSend className={sending ? "spin" : ""} />

                        {sending ? "Sending..." : "Send report to admin"}

                    </button>

                    {!allSubmitted &&
                        submissionsExist(allExpectedSubmissions) && (

                            <p className="waiting-message">
                                <FiAlertCircle />
                                Some required subject marks are still
                                outstanding.
                            </p>

                        )}

                    {sent && (

                        <p className="success-message">
                            <FiCheckCircle />
                            Report sent to admin.
                        </p>

                    )}

                </div>

            </div>

        </Layout>
    );
}

// =========================================================
// SECTION LABEL
// =========================================================

function SectionLabel({ icon, eyebrow, children }) {

    return (

        <div className="section-label">

            {icon && (
                <span className="section-label-icon">{icon}</span>
            )}

            <div>
                <small>{eyebrow}</small>
                <strong>{children}</strong>
            </div>

            <span className="section-line" />

        </div>
    );
}

// =========================================================
// HEADER STAT
// =========================================================

function HeaderStat({ icon, label, value }) {

    return (

        <div className="header-stat">

            {icon && <span className="header-stat-icon">{icon}</span>}

            <div>
                <small>{label}</small>
                <strong>{value}</strong>
            </div>

        </div>
    );
}

// =========================================================
// SUBJECT / NAME INITIAL
// =========================================================

function getSubjectInitial(value) {

    if (!value) {
        return "?";
    }

    return String(value).trim().charAt(0).toUpperCase();
}

// =========================================================
// GRADE CSS CLASS
// =========================================================

function getGradeClass(grade) {

    const value = String(grade || "").trim().toUpperCase();

    if (value === "D1" || value === "D2") {
        return "grade-distinction";
    }

    if (["C3", "C4", "C5", "C6"].includes(value)) {
        return "grade-credit";
    }

    if (value === "P7" || value === "P8") {
        return "grade-pass";
    }

    if (value === "F9") {
        return "grade-fail";
    }

    return "grade-default";
}

// =========================================================
// ASSESSMENT CSS CLASS
// =========================================================

function getAssessmentClass(assessment) {

    switch (assessment) {

        case "B.O.T":
            return "assessment-bot";

        case "Test":
            return "assessment-test";

        case "Mid-Term":
            return "assessment-midterm";

        case "Holiday Package":
            return "assessment-holiday";

        case "End of Term":
            return "assessment-end";

        default:
            return "assessment-default";
    }
}

// =========================================================
// CHECK IF SUBMISSIONS EXIST
// =========================================================

function submissionsExist(submissions) {

    return submissions.length > 0;
}