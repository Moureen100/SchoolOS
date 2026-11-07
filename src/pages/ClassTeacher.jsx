import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
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
    FiEye,
    FiX,
    FiPrinter,
    FiCamera,
    FiTrash2,
    FiEdit3,
    FiRotateCcw,
} from "react-icons/fi";

const API_URL = import.meta.env.VITE_API_URL;

// where to send the teacher when his session is not valid
const LOGIN_PATH = "/login/class-teacher";

// school details printed on the report card (change these)
const SCHOOL = {
    name: "Your School Name",
    motto: "Excellence in Learning",
    address: "P.O. Box 0000, Kampala, Uganda",
    phone: "+256 700 000 000",
    email: "info@yourschool.ac.ug",
    headTeacher: "Head Teacher",
};

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
// BROWSER SAVE / LOAD
// Only the passport photo still uses this now.
// Signature and remarks are saved on the server.
// =========================================================

function readSaved(key, fallback) {

    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function writeSaved(key, value) {

    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
        console.error("Could not save changes:", err);
    }
}

// =========================================================
// FETCH WITH THE LOGIN TOKEN (GET or POST)
// Every class teacher request must carry the token, the
// server uses it to decide which class he may see.
//
// authFetch(url)                      -> GET
// authFetch(url, { method: "POST", body: {...} })
// =========================================================

async function authFetch(url, options = {}) {

    const { method = "GET", body } = options;

    const headers = {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
    };

    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
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
    // HIS CLASS(ES), LOADED FROM THE SERVER
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
    const [assessmentFilter, setAssessmentFilter] = useState("B.O.T");

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
    // REPORT CARD POPUP (null = closed)
    // =====================================================

    const [reportRow, setReportRow] = useState(null);

    // =====================================================
    // SIGNATURE (class teacher only, sign once per class)
    // { name: "Mr. Okello", signedOn: "2026-10-18" }
    // GET  /api/class-teacher/signature?class=P.5
    // POST /api/class-teacher/signature   { class, name }
    // =====================================================

    const [teacherSign, setTeacherSign] = useState({ name: "", signedOn: "" });
    const [signSaving, setSignSaving] = useState(false);
    const [signError, setSignError] = useState("");


    const [submissionError, setSubmissionError] = useState("");
    const [submissionMessage, setSubmissionMessage] = useState("");

    // =====================================================
    // REPORT REMARKS FOR THE WHOLE CLASS (conduct + comments)
    // { [student_id]: { conduct, teacher_comment, ... } }
    // GET /api/class-teacher/report-remarks?class&term&year&assessment
    // =====================================================

    const [remarks, setRemarks] = useState({});
    const [remarksLoaded, setRemarksLoaded] = useState(false);

    // =====================================================
    // SEND TO ADMIN
    // =====================================================

    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    // =====================================================
    // SESSION NOT VALID -> BACK TO LOGIN
    // =====================================================

    function logoutToLogin() {
        localStorage.clear();
        navigate(LOGIN_PATH, { replace: true });
    }

    // =====================================================
    // LOAD HIS CLASS FROM THE SERVER (once)
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
    // LOAD THE SAVED SIGNATURE (follows the selected class)
    // =====================================================

    useEffect(() => {

        setSignError("");

        if (!studentClass) {
            setTeacherSign({ name: "", signedOn: "" });
            return;
        }

        let cancelled = false;

        async function loadSignature() {

            try {

                const { response, data } = await authFetch(
                    `${API_URL}/api/class-teacher/signature` +
                    `?class=${encodeURIComponent(studentClass)}`
                );

                if (cancelled) {
                    return;
                }

                if (response.status === 401) {
                    logoutToLogin();
                    return;
                }

                if (!response.ok) {
                    throw new Error(
                        data.message || "Could not load your signature"
                    );
                }

                setTeacherSign({
                    name: data.name || "",
                    signedOn: data.signed_on || "",
                });

            } catch (err) {

                if (cancelled) {
                    return;
                }

                console.error("Error getting signature:", err);
                setTeacherSign({ name: "", signedOn: "" });
                setSignError(err.message || "Could not load your signature");
            }
        }

        loadSignature();

        return () => {
            cancelled = true;
        };

    }, [studentClass]);

    // name = "" removes the signature
    async function saveTeacherSign(name) {

        if (!studentClass) {
            return;
        }

        setSignSaving(true);
        setSignError("");

        try {

            const { response, data } = await authFetch(
                `${API_URL}/api/class-teacher/signature`,
                {
                    method: "POST",
                    body: { class: studentClass, name },
                }
            );

            if (response.status === 401) {
                logoutToLogin();
                return;
            }

            if (!response.ok) {
                throw new Error(
                    data.message || "Could not save your signature"
                );
            }

            setTeacherSign({
                name: data.name || "",
                signedOn: data.signed_on || "",
            });

        } catch (err) {

            console.error("Error saving signature:", err);
            setSignError(err.message || "Could not save your signature");

        } finally {

            setSignSaving(false);
        }
    }

    // =====================================================
    // CLASS OPTIONS = ONLY HIS CLASSES
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

            const url =
                `${API_URL}/api/class-teacher/marks` +
                `?class=${encodeURIComponent(studentClass)}` +
                `&term=${encodeURIComponent(term)}` +
                `&year=${encodeURIComponent(year)}` +
                `&assessment_type=${encodeURIComponent(assessmentFilter)}`;

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
    }, [year, term, studentClass, assessmentFilter]);

    // =====================================================
    // BACK TO PAGE 1 WHEN THE VIEW CHANGES
    // =====================================================

    useEffect(() => {
        setPage(1);
        setReportRow(null);          // close the report card
    }, [
        year,
        term,
        studentClass,
        stream,
        assessmentFilter,
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
    // LOAD THE SAVED REMARKS OF THE CLASS
    // (conduct + comments for the assessment on screen)
    // =====================================================

    useEffect(() => {

        setRemarks({});
        setRemarksLoaded(false);

        if (!studentClass || !activeAssessment) {
            return;
        }

        let cancelled = false;

        async function loadRemarks() {

            try {

                const url =
                    `${API_URL}/api/class-teacher/report-remarks` +
                    `?class=${encodeURIComponent(studentClass)}` +
                    `&term=${encodeURIComponent(term)}` +
                    `&year=${encodeURIComponent(year)}` +
                    `&assessment=${encodeURIComponent(activeAssessment)}`;

                const { response, data } = await authFetch(url);

                if (cancelled) {
                    return;
                }

                if (response.status === 401) {
                    logoutToLogin();
                    return;
                }

                if (!response.ok) {
                    throw new Error(
                        data.message || "Could not load report remarks"
                    );
                }

                const byStudent = {};

                (data.remarks || []).forEach((remark) => {
                    byStudent[remark.student_id] = remark;
                });

                setRemarks(byStudent);
                setRemarksLoaded(true);

            } catch (err) {

                if (cancelled) {
                    return;
                }

                // Report cards stay closed, so a failed load can
                // never be saved over the real remarks.
                console.error("Error getting report remarks:", err);
                setError(err.message || "Could not load report remarks");
            }
        }

        loadRemarks();

        return () => {
            cancelled = true;
        };

    }, [studentClass, term, year, activeAssessment]);

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
    // SUBMISSION READINESS FOR THE SELECTED ASSESSMENT ONLY
    // The button must not wait for marks in other assessments.
    // =====================================================

    const allExpectedSubmissions = activeAssessment
        ? getAssessmentSubjects(activeAssessment).map((subject) => ({
            subject,
            assessment: activeAssessment,
        }))
        : [];

    const allSubmitted =
        allExpectedSubmissions.length > 0 &&
        allExpectedSubmissions.every(({ subject, assessment }) =>
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
    // OPEN A REPORT CARD
    // Only once the saved remarks have loaded, so nothing
    // saved can be overwritten by the suggestions.
    // =====================================================

    function openReport(row) {

        if (!remarksLoaded) {
            return;
        }

        setReportRow(row);
    }

    // =====================================================
    // SEND REPORT
    // =====================================================


    async function handleSendToAdmin() {
        if (sending) return;

        setSubmissionError("");
        setSubmissionMessage("");

        if (!API_URL) {
            setSubmissionError(
                "Backend URL is missing. Check your VITE_API_URL configuration."
            );
            return;
        }

        if (!studentClass || !activeAssessment || !students.length) {
            setSubmissionError(
                "Please select a class and assessment with students loaded."
            );
            return;
        }

        if (!allSubmitted) {
            setSubmissionError(
                `Complete all required student marks for ${activeAssessment} before submitting.`
            );
            return;
        }

        setSending(true);

        try {
            const { response, data } = await authFetch(
                `${API_URL}/api/class-teacher/report-submissions`,
                {
                    method: "POST",
                    body: {
                        class: studentClass,
                        term,
                        year: Number(year),
                        assessment: activeAssessment,
                        note: ""
                    }
                }
            );

            if (response.status === 401) {
                logoutToLogin();
                return;
            }

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    data.error ||
                    `Submission failed. Server returned HTTP ${response.status}.`
                );
            }

            setSent(true);
            setSubmissionMessage(
                data.message ||
                `${activeAssessment} report submitted successfully.`
            );
        } catch (error) {
            console.error("Report submission error:", error);
            setSent(false);
            setSubmissionError(
                error.message ||
                "Could not submit the report. Check your connection and try again."
            );
        } finally {
            setSending(false);
        }
    }


    // =====================================================
    // PAGE
    // =====================================================

    const submittedSubjects = activeAssessment
        ? getSubmittedSubjects(activeAssessment)
        : [];

    const openStudentRemark = reportRow
        ? remarks[reportRow.student.student_id] || null
        : null;

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
                            value={
                                activeAssessment
                                    ? allSubmitted
                                        ? `${activeAssessment} complete`
                                        : `${activeAssessment} pending`
                                    : "No assessment"
                            }
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

                        {/* ASSESSMENT */}

                        <div className="filter-field">

                            <label>Assessment</label>

                            <div className="select-wrapper">

                                <select
                                    value={assessmentFilter}
                                    onChange={(e) => {
                                        setAssessmentFilter(e.target.value);
                                        setSelectedAssessment("");
                                        setStream("all");
                                    }}
                                >
                                    {ASSESSMENT_ORDER.map((assessment) => (
                                        <option key={assessment} value={assessment}>
                                            {assessment}
                                        </option>
                                    ))}
                                </select>

                            </div>

                        </div>

                        {/* CLASS (only his own class or classes) */}

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
                    SIGNATURE (class teacher signs once)
                ================================================= */}

                <SectionLabel
                    icon={<FiEdit3 />}
                    eyebrow="Sign once"
                >
                    Class teacher signature
                </SectionLabel>

                <div className="sign-setup">

                    <p className="sign-setup-note">
                        Type your name once and press Sign. Your signature
                        is saved and appears automatically on every
                        student's report card for{" "}
                        {studentClass || "your class"}.
                    </p>

                    <div className="sign-setup-grid">

                        <SignatureSetup
                            label="Class teacher signature"
                            hint={
                                studentClass
                                    ? `Used on every ${studentClass} report`
                                    : "Waiting for your class"
                            }
                            placeholder="Type your name to sign"
                            sign={teacherSign}
                            disabled={!studentClass}
                            saving={signSaving}
                            error={signError}
                            onSign={saveTeacherSign}
                            onRemove={() => saveTeacherSign("")}
                        />

                    </div>

                </div>

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
                                        <th>Report</th>

                                    </tr>

                                    </thead>

                                    <tbody>

                                    {pageRows.length === 0 && (

                                        <tr>
                                            <td
                                                colSpan={
                                                    assessmentSubjects.length + 6
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

                                                    {/* STUDENT (click opens the report card) */}

                                                    <td className="student-cell">

                                                        <button
                                                            type="button"
                                                            className="student-open"
                                                            title="Open report card"
                                                            disabled={!remarksLoaded}
                                                            onClick={() =>
                                                                openReport({
                                                                    student,
                                                                    aggregate,
                                                                    position,
                                                                })
                                                            }
                                                        >

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

                                                        </button>

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

                                                    {/* REPORT BUTTON */}

                                                    <td className="report-cell">

                                                        <button
                                                            type="button"
                                                            className="view-report-btn"
                                                            disabled={!remarksLoaded}
                                                            onClick={() =>
                                                                openReport({
                                                                    student,
                                                                    aggregate,
                                                                    position,
                                                                })
                                                            }
                                                        >
                                                            <FiEye />
                                                            View
                                                        </button>

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

                {/* =================================================
    SEND REPORT TO ADMIN — BACKEND CONNECTED
================================================= */}
                <div className="send-report-area">
                    <div className="send-report-content">
                        <div className="send-report-icon">
                            <FiSend />
                        </div>

                        <div>
                            <h3>Submit assessment report to admin</h3>

                            <p>
                                Submit the marks for{" "}
                                <strong>
                                    {activeAssessment || "no assessment selected"}
                                </strong>
                                {" "}for {studentClass || "your class"}, {term} {year}.
                                Only the selected assessment must be complete.
                                Other assessments can remain incomplete.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className={
                            allSubmitted && !sent
                                ? "send-report-button"
                                : "send-report-button disabled"
                        }
                        onClick={handleSendToAdmin}
                        disabled={
                            !allSubmitted ||
                            sending ||
                            sent ||
                            !activeAssessment ||
                            !studentClass
                        }
                    >
                        {sending ? (
                            <FiLoader className="spin" />
                        ) : sent ? (
                            <FiCheckCircle />
                        ) : (
                            <FiSend />
                        )}

                        {sending
                            ? "Submitting to admin..."
                            : sent
                                ? "Report submitted"
                                : "Send report to admin"}
                    </button>

                    {!allSubmitted && activeAssessment && (
                        <p className="waiting-message" role="status">
                            <FiAlertCircle />
                            Complete the required marks for {activeAssessment} before
                            submitting this assessment.
                        </p>
                    )}

                    {submissionError && (
                        <p className="waiting-message" role="alert">
                            <FiAlertCircle />
                            {submissionError}
                        </p>
                    )}

                    {sent && (
                        <p className="success-message" role="status">
                            <FiCheckCircle />
                            {submissionMessage}
                        </p>
                    )}
                </div>

            </div>

            {/* =================================================
                REPORT CARD POPUP
            ================================================= */}

            {reportRow && remarksLoaded && (

                <ReportCard
                    key={reportRow.student.student_id}
                    student={reportRow.student}
                    assessment={activeAssessment}
                    subjects={assessmentSubjects}
                    position={reportRow.position}
                    aggregate={reportRow.aggregate}
                    classSize={
                        allRows.filter((row) => row.position !== null)
                            .length
                    }
                    term={term}
                    year={year}
                    studentClass={studentClass}
                    teacherSign={teacherSign}
                    nextTermBegins={
                        (openStudentRemark &&
                            openStudentRemark.next_term_begins) || ""
                    }
                    savedRemark={openStudentRemark}
                    onSaved={(remark) =>
                        setRemarks((previous) => ({
                            ...previous,
                            [remark.student_id]: remark,
                        }))
                    }
                    onClose={() => setReportRow(null)}
                />

            )}

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
// SIGNATURE SETUP (on the main page, sign once)
// The teacher types his name and presses Sign. The name is
// saved on the server (POST) and shown in signature style.
// =========================================================

function SignatureSetup({
                            label,
                            hint,
                            placeholder,
                            sign,
                            disabled = false,
                            saving = false,
                            error = "",
                            onSign,
                            onRemove,
                        }) {

    const [draft, setDraft] = useState(sign.name);

    // when the saved name changes (class switched, saved, removed)
    useEffect(() => {
        setDraft(sign.name);
    }, [sign.name]);

    const trimmed = draft.trim();
    const canSign = !disabled && !saving && trimmed && trimmed !== sign.name;

    return (

        <div className="sign-setup-card">

            <div className="sign-setup-top">

                <div>
                    <strong>{label}</strong>
                    <small>{hint}</small>
                </div>

                {sign.name && (
                    <button
                        type="button"
                        className="sign-setup-clear"
                        onClick={onRemove}
                        disabled={saving}
                        title="Remove signature"
                    >
                        <FiTrash2 />
                        Remove
                    </button>
                )}

            </div>

            <input
                type="text"
                className="sign-setup-input"
                placeholder={placeholder}
                value={draft}
                maxLength={40}
                disabled={disabled || saving}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && canSign) {
                        onSign(trimmed);
                    }
                }}
            />

            <button
                type="button"
                className="load-marks-button"
                disabled={!canSign}
                onClick={() => onSign(trimmed)}
            >
                {saving ? (
                    <FiLoader className="spin" />
                ) : (
                    <FiEdit3 />
                )}
                {saving ? "Saving..." : sign.name ? "Update signature" : "Sign"}
            </button>

            {error && (
                <p className="waiting-message">
                    <FiAlertCircle />
                    {error}
                </p>
            )}

            <div className="sign-setup-preview">

                {sign.name ? (
                    <>
                        <span className="rc-signature">{sign.name}</span>
                        {sign.signedOn && (
                            <span className="rc-sign-date">
                                {formatDate(sign.signedOn)}
                            </span>
                        )}
                    </>
                ) : (
                    <span className="sign-setup-empty">Not signed yet</span>
                )}

            </div>

        </div>
    );
}

// =========================================================
// REPORT CARD (same A4 design as the parent Results page)
// Popup preview + Print / Save PDF
//
// The system fills in general conduct, the class teacher's
// comment and the head teacher's comment from the student's
// average. The class teacher can edit or remove any of them,
// and can bring the suggested text back with one click.
//
// SAVING: changes are sent to the server (POST
// /api/class-teacher/report-remarks) about 0.7 seconds after
// the teacher stops typing, and again when the card is closed.
//
// null  = not touched, the system suggestion is shown
// ""    = the teacher removed it on purpose
//
// The class teacher signature comes from the Signature section
// on the page. There is no head teacher signature, and the
// class teacher does not type the next term date.
// =========================================================

const GRADE_REMARKS = {
    D1: "Outstanding",
    D2: "Very good",
    C3: "Good",
    C4: "Fairly good",
    C5: "Fair",
    C6: "Satisfactory",
    P7: "Pass",
    P8: "Weak pass",
    F9: "Fail",
};

const REPORT_GRADING_KEY = [
    { grade: "D1 - D2", points: "1 - 2", meaning: "Distinction" },
    { grade: "C3 - C6", points: "3 - 6", meaning: "Credit" },
    { grade: "P7 - P8", points: "7 - 8", meaning: "Pass" },
    { grade: "F9", points: "9", meaning: "Fail" },
];

const CONDUCT_OPTIONS = [
    "Excellent",
    "Very good",
    "Good",
    "Fair",
    "Needs improvement",
];

// ---------------------------------------------------------
// SYSTEM SUGGESTED REMARKS (based on the average)
// ---------------------------------------------------------

function getSuggestedConduct(average) {

    if (average >= 80) {
        return "Excellent";
    }

    if (average >= 65) {
        return "Very good";
    }

    if (average >= 50) {
        return "Good";
    }

    if (average >= 35) {
        return "Fair";
    }

    return "Needs improvement";
}

function getTeacherComment(average) {

    if (average >= 80) {
        return "An outstanding performance. Keep it up.";
    }

    if (average >= 65) {
        return "A very good result. Aim even higher next time.";
    }

    if (average >= 50) {
        return "Good effort. More practice will lift your results.";
    }

    if (average >= 35) {
        return "A fair result. Please put in more work in the weak subjects.";
    }

    return "Needs serious improvement. Extra support and daily revision are advised.";
}

function getHeadComment(average) {

    if (average >= 80) {
        return "Excellent results. The school is proud of you. Keep up this high standard.";
    }

    if (average >= 65) {
        return "A very good performance. Keep working hard and you will do even better.";
    }

    if (average >= 50) {
        return "A good result. With more effort and discipline, you can improve further.";
    }

    if (average >= 35) {
        return "A fair performance. You are encouraged to work harder and seek help in the weak subjects.";
    }

    return "The result is below expectation. Serious effort, close supervision and daily revision are needed.";
}

function ordinal(n) {

    const v = n % 100;
    const s = ["th", "st", "nd", "rd"];

    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDate(d) {

    if (!d) {
        return "";
    }

    return new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

// Crop to a passport shape (3:4) and shrink, so it stays small
function resizePhoto(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onerror = () => reject(new Error("Could not read the photo"));

        reader.onload = () => {

            const img = new Image();

            img.onerror = () => reject(new Error("This is not a valid image"));

            img.onload = () => {

                const width = 300;
                const height = 400;

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const scale = Math.max(
                    width / img.width,
                    height / img.height
                );

                const drawW = img.width * scale;
                const drawH = img.height * scale;

                canvas
                    .getContext("2d")
                    .drawImage(
                        img,
                        (width - drawW) / 2,
                        (height - drawH) / 2,
                        drawW,
                        drawH
                    );

                resolve(canvas.toDataURL("image/jpeg", 0.85));
            };

            img.src = reader.result;
        };

        reader.readAsDataURL(file);
    });
}

// ---------------------------------------------------------
// POPUP: edit + preview on screen, print a clean A4 sheet
// ---------------------------------------------------------

function ReportCard({ onClose, savedRemark, onSaved, ...sheetProps }) {

    const { student, assessment, term, year } = sheetProps;

    const photoKey = `ct-photo:${student.student_id}`;

    const [printing, setPrinting] = useState(false);
    const [photoError, setPhotoError] = useState("");

    // what the teacher changed (null = still the system suggestion)
    const [extras, setExtras] = useState(() => ({
        conduct: savedRemark ? savedRemark.conduct : null,
        teacherComment: savedRemark ? savedRemark.teacher_comment : null,
        headComment: savedRemark ? savedRemark.head_comment : null,
    }));

    // saving to the server
    const [saveState, setSaveState] = useState("idle"); // idle | pending | saving | saved | error
    const [saveError, setSaveError] = useState("");

    const latestExtras = useRef(extras);
    const dirty = useRef(false);
    const timer = useRef(null);
    const saveNowRef = useRef(null);

    // passport photo (kept for the student, not per assessment)
    const [photo, setPhoto] = useState(
        () => readSaved(photoKey, "") || student.photo || ""
    );

    async function saveNow() {

        clearTimeout(timer.current);
        timer.current = null;

        if (!dirty.current) {
            return;
        }

        dirty.current = false;

        const current = latestExtras.current;

        setSaveState("saving");
        setSaveError("");

        try {

            const { response, data } = await authFetch(
                `${API_URL}/api/class-teacher/report-remarks`,
                {
                    method: "POST",
                    body: {
                        student_id: student.student_id,
                        term,
                        year,
                        assessment,
                        conduct: current.conduct ?? null,
                        teacher_comment: current.teacherComment ?? null,
                        head_comment: current.headComment ?? null,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(
                    response.status === 401
                        ? "Your session has expired. Please log in again."
                        : data.message || "Could not save the remarks"
                );
            }

            onSaved(data.remark);

            // something was typed while saving: it will save next
            setSaveState(dirty.current ? "pending" : "saved");

        } catch (err) {

            console.error("Error saving remarks:", err);

            dirty.current = true;
            setSaveError(err.message || "Could not save the remarks");
            setSaveState("error");
        }
    }

    // always points to the newest saveNow
    saveNowRef.current = saveNow;

    function updateExtras(patch) {

        const next = { ...latestExtras.current, ...patch };

        latestExtras.current = next;
        setExtras(next);

        dirty.current = true;
        setSaveState("pending");

        clearTimeout(timer.current);
        timer.current = setTimeout(() => saveNowRef.current(), 700);
    }

    // save anything still waiting when the card closes
    useEffect(() => {

        return () => {
            saveNowRef.current();
        };

    }, []);

    async function handlePhotoPick(e) {

        const file = e.target.files && e.target.files[0];

        e.target.value = "";

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            setPhotoError("Please choose an image file.");
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            setPhotoError("The photo is too large. Use one under 8 MB.");
            return;
        }

        try {
            const dataUrl = await resizePhoto(file);
            setPhoto(dataUrl);
            writeSaved(photoKey, dataUrl);
            setPhotoError("");
        } catch (err) {
            setPhotoError(err.message || "Could not use this photo.");
        }
    }

    function handlePhotoRemove() {

        setPhoto("");
        writeSaved(photoKey, "");
    }

    // Close with Escape, and stop the page behind from scrolling
    useEffect(() => {

        function onKey(e) {
            if (e.key === "Escape") {
                onClose();
            }
        }

        document.addEventListener("keydown", onKey);

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = previousOverflow;
        };

    }, [onClose]);

    // Clean up after printing (or if the popup closes)
    useEffect(() => {

        function finishPrint() {
            setPrinting(false);
            document.body.classList.remove("rc-printing");
            const style = document.getElementById("rc-page-style");
            if (style) {
                style.remove();
            }
        }

        window.addEventListener("afterprint", finishPrint);

        return () => {
            window.removeEventListener("afterprint", finishPrint);
            finishPrint();
        };

    }, []);

    function handlePrint() {

        // A4 with no browser margin, only while this report prints
        const style = document.createElement("style");
        style.id = "rc-page-style";
        style.textContent = "@page { size: A4; margin: 0; }";
        document.head.appendChild(style);

        document.body.classList.add("rc-printing");

        setPrinting(true);

        // wait for the print sheet to render
        setTimeout(() => window.print(), 200);
    }

    const statusText = {
        idle: "",
        pending: "Unsaved changes...",
        saving: "Saving...",
        saved: "All changes saved",
        error: saveError,
    }[saveState];

    return (

        <div
            className="rc-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={`Report card for ${student.student_name}`}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >

            <div className="rc-dialog">

                {/* TOOLBAR (not printed) */}

                <div className="rc-toolbar">

                    <div className="rc-toolbar-title">
                        <strong>Report card</strong>
                        <small>
                            Remarks are filled in by the system. Click a
                            highlighted field to change or remove it.
                            Changes save automatically.
                            {statusText ? ` ${statusText}` : ""}
                        </small>
                    </div>

                    <div className="rc-toolbar-actions">

                        <button
                            type="button"
                            className="rc-btn rc-btn-primary"
                            onClick={handlePrint}
                        >
                            <FiPrinter />
                            Print / Save PDF
                        </button>

                        <button
                            type="button"
                            className="rc-btn rc-btn-icon"
                            onClick={onClose}
                            aria-label="Close report card"
                        >
                            <FiX />
                        </button>

                    </div>

                </div>

                {photoError && (
                    <div className="rc-notice" role="alert">
                        {photoError}
                    </div>
                )}

                {saveState === "error" && (
                    <div className="rc-notice" role="alert">
                        {saveError} Your changes are still on screen, they
                        will be sent again when you type or close this card.
                    </div>
                )}

                {/* PREVIEW (editable) */}

                <div className="rc-scroll">

                    <ReportSheet
                        {...sheetProps}
                        extras={extras}
                        photo={photo}
                        editable
                        onExtras={updateExtras}
                        onPhotoPick={handlePhotoPick}
                        onPhotoRemove={handlePhotoRemove}
                    />

                </div>

            </div>

            {/* PRINT SHEET: rendered straight into <body> so it prints cleanly */}

            {printing &&
                createPortal(
                    <div className="report-sheet">
                        <ReportSheet
                            {...sheetProps}
                            extras={extras}
                            photo={photo}
                        />
                    </div>,
                    document.body
                )}

        </div>
    );
}

// ---------------------------------------------------------
// THE REPORT CARD PAPER
// editable = true on screen, false on the print sheet
// ---------------------------------------------------------

function ReportSheet({
                         student,
                         assessment,
                         subjects,
                         position,
                         aggregate,
                         classSize,
                         term,
                         year,
                         studentClass,
                         teacherSign = { name: "", signedOn: "" },
                         nextTermBegins = "",
                         extras = {},
                         photo = "",
                         editable = false,
                         onExtras = () => {},
                         onPhotoPick = () => {},
                         onPhotoRemove = () => {},
                     }) {

    const conductListId = useId();

    const marks = (student.marks || []).filter(
        (mark) => mark.assessment === assessment
    );

    const rows = subjects.map((subject) => {

        const mark = marks.find((m) => m.subject === subject);

        const grade = mark
            ? String(mark.grade || "").trim().toUpperCase()
            : "";

        return {
            subject,
            score: mark ? mark.score : null,
            grade,
            points: GRADE_POINTS[grade] ?? null,
            remark: GRADE_REMARKS[grade] || "",
        };
    });

    const scored = rows.filter((row) => row.score !== null);

    const total = scored.reduce(
        (sum, row) => sum + Number(row.score || 0),
        0
    );

    const average = scored.length > 0 ? total / scored.length : 0;

    const hasPosition = position !== null && position !== undefined;

    const feesBalance = student.fees_balance;

    // Remarks: what the teacher saved wins, then the server value
    // (conduct only), then the system suggestion.
    // null = not touched, "" = removed on purpose.
    const suggestedConduct = scored.length > 0
        ? getSuggestedConduct(average)
        : "";
    const suggestedTeacherComment = scored.length > 0
        ? getTeacherComment(average)
        : "";
    const suggestedHeadComment = scored.length > 0
        ? getHeadComment(average)
        : "";

    const conduct =
        extras.conduct ?? student.conduct ?? suggestedConduct;
    const teacherComment =
        extras.teacherComment ?? suggestedTeacherComment;
    const headComment =
        extras.headComment ?? suggestedHeadComment;

    return (

        <section className="rc-page">

            <div className="rc-frame">

                <span className="rc-watermark">
                    {SCHOOL.name.charAt(0)}
                </span>

                {/* School header */}

                <header className="rc-head">

                    <div className="rc-crest">
                        {SCHOOL.name.charAt(0)}
                    </div>

                    <div className="rc-school">
                        <h1>{SCHOOL.name}</h1>
                        <p className="rc-motto">"{SCHOOL.motto}"</p>
                        <p className="rc-contact">
                            {SCHOOL.address} &nbsp;|&nbsp; {SCHOOL.phone}{" "}
                            &nbsp;|&nbsp; {SCHOOL.email}
                        </p>
                    </div>

                    {/* Passport photo (optional) */}

                    <div className="rc-photo">

                        {photo ? (
                            <img src={photo} alt={student.student_name} />
                        ) : (
                            <span>Passport photo</span>
                        )}

                        {editable && (

                            <>
                                <label className="rc-photo-edit">
                                    <FiCamera />
                                    {photo ? "Change" : "Add"}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={onPhotoPick}
                                    />
                                </label>

                                {photo && (
                                    <button
                                        type="button"
                                        className="rc-photo-remove"
                                        onClick={onPhotoRemove}
                                        aria-label="Remove photo"
                                        title="Remove photo"
                                    >
                                        <FiTrash2 />
                                    </button>
                                )}
                            </>

                        )}

                    </div>

                </header>

                <div className="rc-banner">
                    {assessment} Report Card &mdash; {term}, {year}
                </div>

                {/* Pupil details */}

                <div className="rc-bio">

                    <BioField
                        label="Pupil's name"
                        value={student.student_name}
                        wide
                    />

                    <BioField
                        label="Class"
                        value={`${studentClass}${
                            student.stream ? " " + student.stream : ""
                        }`}
                    />

                    <BioField
                        label="Student ID"
                        value={student.student_id}
                    />

                    <BioField label="Gender" value={student.gender || ""} />

                    <BioField
                        label="Term / Year"
                        value={`${term}, ${year}`}
                    />

                    <BioField label="Assessment" value={assessment} />

                    <BioField
                        label="Position in class"
                        value={
                            hasPosition
                                ? `${ordinal(position)} out of ${classSize}`
                                : "Not ranked"
                        }
                    />

                </div>

                {/* Marks */}

                <table className="rc-marks">

                    <thead>

                    <tr>
                        <th className="rc-left">Subject</th>
                        <th>
                            Score<small>/ 100</small>
                        </th>
                        <th>Grade</th>
                        <th>
                            Points<small>lower is better</small>
                        </th>
                        <th className="rc-left">Teacher's remark</th>
                    </tr>

                    </thead>

                    <tbody>

                    {rows.map((row) => (

                        <tr key={row.subject}>

                            <td className="rc-left rc-subject">
                                {row.subject}
                            </td>

                            <td className="rc-total">
                                {row.score !== null ? row.score : ""}
                            </td>

                            <td>
                                {row.grade ? (
                                    <span
                                        className={`rc-grade ${getReportGradeClass(
                                            row.grade
                                        )}`}
                                    >
                                        {row.grade}
                                    </span>
                                ) : (
                                    ""
                                )}
                            </td>

                            <td>{row.points !== null ? row.points : ""}</td>

                            <td className="rc-left rc-remark">
                                {row.remark}
                            </td>

                        </tr>

                    ))}

                    </tbody>

                    <tfoot>

                    <tr>

                        <td className="rc-left">Total marks</td>

                        <td className="rc-total">{total}</td>

                        <td colSpan={3} className="rc-left">
                            Average <b>{average.toFixed(1)}%</b>{" "}
                            &nbsp;&middot;&nbsp; Aggregate{" "}
                            <b>
                                {aggregate !== null && aggregate !== undefined
                                    ? aggregate
                                    : "-"}
                            </b>{" "}
                            &nbsp;&middot;&nbsp; Position{" "}
                            <b>{hasPosition ? ordinal(position) : "-"}</b>
                        </td>

                    </tr>

                    </tfoot>

                </table>

                {/* Key + conduct */}

                <div className="rc-row">

                    <div className="rc-box rc-key">

                        <h3>Grading key</h3>

                        {REPORT_GRADING_KEY.map((k) => (

                            <div key={k.grade} className="rc-key-line">
                                <b>{k.grade}</b>
                                <span>Points {k.points}</span>
                                <em>{k.meaning}</em>
                            </div>

                        ))}

                    </div>

                    <div className="rc-box">

                        <h3>
                            General conduct
                            {editable && (
                                <ResetRemark
                                    visible={extras.conduct != null}
                                    onClick={() =>
                                        onExtras({ conduct: null })
                                    }
                                />
                            )}
                        </h3>

                        {editable ? (

                            <>
                                <input
                                    type="text"
                                    className="rc-edit"
                                    list={conductListId}
                                    placeholder="Choose or type"
                                    value={conduct}
                                    onChange={(e) =>
                                        onExtras({ conduct: e.target.value })
                                    }
                                />

                                <datalist id={conductListId}>
                                    {CONDUCT_OPTIONS.map((option) => (
                                        <option key={option} value={option} />
                                    ))}
                                </datalist>
                            </>

                        ) : (

                            <p
                                className={`rc-conduct ${
                                    conduct ? "" : "rc-blank"
                                }`}
                            >
                                {conduct}
                            </p>

                        )}

                        <h3>Fees balance</h3>

                        <p
                            className={`rc-conduct ${
                                feesBalance === undefined ||
                                feesBalance === null
                                    ? "rc-blank"
                                    : ""
                            }`}
                        >
                            {feesBalance === undefined || feesBalance === null
                                ? ""
                                : Number(feesBalance) === 0
                                    ? "Cleared"
                                    : `UGX ${Number(feesBalance).toLocaleString()}`}
                        </p>

                        {/* Not typed by the class teacher: it only shows
                            the date when the school has set one. */}

                        <h3>Next term begins</h3>

                        <p
                            className={`rc-conduct ${
                                nextTermBegins ? "" : "rc-blank"
                            }`}
                        >
                            {formatDate(nextTermBegins)}
                        </p>

                    </div>

                </div>

                {/* Class teacher's comment + his signature (from the page) */}

                <div className="rc-comment">

                    <h3>
                        Class teacher's comment
                        {editable && (
                            <ResetRemark
                                visible={extras.teacherComment != null}
                                onClick={() =>
                                    onExtras({ teacherComment: null })
                                }
                            />
                        )}
                    </h3>

                    {editable ? (

                        <textarea
                            className="rc-edit rc-edit-area"
                            rows={2}
                            placeholder="Write the class teacher's comment"
                            value={teacherComment}
                            onChange={(e) =>
                                onExtras({ teacherComment: e.target.value })
                            }
                        />

                    ) : (

                        <p>{teacherComment}</p>

                    )}

                    <SignatureDisplay sign={teacherSign} />

                </div>

                {/* Head teacher's comment (no signature) */}

                <div className="rc-comment">

                    <h3>
                        {SCHOOL.headTeacher}'s comment
                        {editable && (
                            <ResetRemark
                                visible={extras.headComment != null}
                                onClick={() =>
                                    onExtras({ headComment: null })
                                }
                            />
                        )}
                    </h3>

                    {editable ? (

                        <textarea
                            className="rc-edit rc-edit-area"
                            rows={2}
                            placeholder="Write the head teacher's comment"
                            value={headComment}
                            onChange={(e) =>
                                onExtras({ headComment: e.target.value })
                            }
                        />

                    ) : (

                        <p>{headComment}</p>

                    )}

                </div>

            </div>

        </section>
    );
}

// ---------------------------------------------------------
// "USE SUGGESTED" BUTTON
// Shows only after the teacher changed the system remark.
// Never printed, because it is only rendered when editable.
// ---------------------------------------------------------

function ResetRemark({ visible, onClick }) {

    if (!visible) {
        return null;
    }

    return (

        <button
            type="button"
            className="rc-reset"
            onClick={onClick}
            title="Go back to the system suggestion"
        >
            <FiRotateCcw />
            Use suggested
        </button>
    );
}

// ---------------------------------------------------------
// SIGNATURE ON THE REPORT (display only)
// The name is set once on the page, here it is only shown in
// the handwritten signature style, with the date it was signed.
// ---------------------------------------------------------

function SignatureDisplay({ sign }) {

    const name = sign && sign.name ? sign.name : "";
    const signedOn = sign && sign.signedOn ? sign.signedOn : "";

    return (

        <div className="rc-signblock">

            <div className="rc-sign">

                <div className="rc-sign-line">

                    <span className="rc-signature">{name}</span>

                    {name && signedOn && (
                        <span className="rc-sign-date">
                            {formatDate(signedOn)}
                        </span>
                    )}

                </div>

                <small>Signature &amp; date</small>

            </div>

        </div>
    );
}

function BioField({ label, value, wide }) {

    return (

        <div className={`rc-field ${wide ? "rc-field-wide" : ""}`}>
            <span className="rc-field-label">{label}</span>
            <span className="rc-field-value">{value}</span>
        </div>
    );
}

// =========================================================
// GRADE CSS CLASS (report card)
// =========================================================

function getReportGradeClass(grade) {

    const value = String(grade || "").trim().toUpperCase();

    if (value === "D1" || value === "D2") {
        return "rc-grade-A";
    }

    if (["C3", "C4", "C5", "C6"].includes(value)) {
        return "rc-grade-B";
    }

    if (value === "P7" || value === "P8") {
        return "rc-grade-D";
    }

    if (value === "F9") {
        return "rc-grade-E";
    }

    return "";
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