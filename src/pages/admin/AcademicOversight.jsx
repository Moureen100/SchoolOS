import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Layout from "../../Layout";
import "./AcademicOversight.css";

/* -------------------------------------------------------
   API CONFIGURATION
------------------------------------------------------- */

const API_BASE = String(import.meta.env.VITE_API_URL || "")
    .trim()
    .replace(/\/+$/, "");

const SUBMISSIONS_URL = `${API_BASE}/api/admin/report-submissions`;
const SYSTEM_CONFIG_URL = `${API_BASE}/system_configuration`;
const SCHOOL_LOGO_URL = `${API_BASE}/school_configuration/logo`;
const ACADEMIC_SETTINGS_URL = `${API_BASE}/api/school-academic-settings`;

const SIGN_DESIGN = "banner";

const TERMS = ["All terms", "Term 1", "Term 2", "Term 3"];

const ASSESSMENTS = [
    "All assessments",
    "B.O.T",
    "Test",
    "Mid-Term",
    "Holiday Package",
    "End of Term",
];

const SCHOOL = {
    name: "",
    email: "",
    headTeacher: "Head Teacher",
};

const EMPTY_SCHOOL_PROFILE = {
    schoolName: "",
    email: "",
    motto: "",
    location: "",
    address: "",
    phone: "",
    directorPhone: "",
    logoUrl: "",
};

function mapSchoolProfile(info) {
    return {
        motto: String(info?.motto || "").trim(),
        location: String(info?.location || "").trim(),
        address: String(info?.address || "").trim(),
        phone: String(
            info?.school_telephone || info?.phone || ""
        ).trim(),
        directorPhone: String(
            info?.director_telephone || info?.director_phone || ""
        ).trim(),
    };
}

/* -------------------------------------------------------
   AUTHENTICATION
------------------------------------------------------- */

function getToken() {
    return (
        localStorage.getItem("class_teacher_token") ||
        sessionStorage.getItem("class_teacher_token") ||
        localStorage.getItem("classTeacherToken") ||
        sessionStorage.getItem("classTeacherToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        ""
    ).trim();
}

/* -------------------------------------------------------
   SCHOOL ACCOUNT DETAILS
------------------------------------------------------- */

function getSchoolDetails() {
    const candidates = [];

    const preferredKeys = [
        "school",
        "school_account",
        "schoolAccount",
        "school_info",
        "schoolInfo",
        "school_data",
        "schoolData",
        "user",
        "admin",
        "login_response",
        "loginResponse",
        "auth",
        "auth_user",
        "authUser",
    ];

    function addCandidate(storage, key) {
        try {
            const raw = storage.getItem(key);

            if (!raw) return;

            try {
                candidates.push(JSON.parse(raw));
            } catch {
                if (
                    [
                        "school_name",
                        "school_email",
                        "creator_email",
                    ].includes(key)
                ) {
                    candidates.push({ [key]: raw });
                }
            }
        } catch {
            // Storage may be unavailable.
        }
    }

    [localStorage, sessionStorage].forEach((storage) => {
        preferredKeys.forEach((key) => addCandidate(storage, key));

        try {
            for (let i = 0; i < storage.length; i += 1) {
                const key = storage.key(i);

                if (key && !preferredKeys.includes(key)) {
                    addCandidate(storage, key);
                }
            }
        } catch {
            // Ignore unavailable storage.
        }
    });

    function findSchool(value, depth = 0) {
        if (!value || typeof value !== "object" || depth > 4) {
            return null;
        }

        const name =
            value.school_name ||
            value.schoolName ||
            value.name ||
            "";

        const email =
            value.school_email ||
            value.schoolEmail ||
            value.creator_email ||
            value.creatorEmail ||
            value.email ||
            "";

        if (
            name ||
            value.school_email ||
            value.schoolEmail ||
            value.creator_email ||
            value.creatorEmail
        ) {
            return {
                name: String(name || "").trim(),
                email: String(email || "").trim(),
            };
        }

        for (const [key, nested] of Object.entries(value)) {
            if (nested && typeof nested === "object") {
                const found = findSchool(nested, depth + 1);

                if (found && (found.name || found.email)) {
                    return found;
                }
            }

            if (
                typeof nested === "string" &&
                ["school", "school_account", "schoolAccount"].includes(key)
            ) {
                try {
                    const parsed = JSON.parse(nested);
                    const found = findSchool(parsed, depth + 1);

                    if (found && (found.name || found.email)) {
                        return found;
                    }
                } catch {
                    // Not JSON; continue.
                }
            }
        }

        return null;
    }

    for (const candidate of candidates) {
        const found = findSchool(candidate);

        if (found && (found.name || found.email)) {
            return found;
        }
    }

    const readPlain = (key) => {
        try {
            return (
                localStorage.getItem(key) ||
                sessionStorage.getItem(key) ||
                ""
            );
        } catch {
            return "";
        }
    };

    return {
        name: readPlain("school_name") || readPlain("schoolName"),
        email:
            readPlain("school_email") ||
            readPlain("schoolEmail") ||
            readPlain("creator_email") ||
            readPlain("creatorEmail"),
    };
}

/* -------------------------------------------------------
   API REQUEST HELPER
------------------------------------------------------- */

async function apiRequest(url, options = {}) {
    if (!API_BASE || !url) {
        throw new Error(
            "The API URL is missing. Check VITE_API_URL in your frontend .env file, then restart Vite."
        );
    }

    const token = getToken();

    if (!token) {
        throw new Error(
            'No login token was found. Log in to the SchoolOS admin portal again. The expected storage key is "token".'
        );
    }

    const headers = {
        Accept: "application/json",
        ...options.headers,
    };

    if (options.body) {
        headers["Content-Type"] = "application/json";
    }

    headers.Authorization = `Bearer ${token}`;

    let response;

    try {
        response = await fetch(url, {
            ...options,
            credentials: "omit",
            headers,
        });
    } catch (error) {
        console.error("Academic Oversight fetch failed:", {
            url,
            message: error?.message,
            error,
        });

        throw new Error(
            `The browser could not read a response from ${url}. Check the browser Console for a CORS or network error.`
        );
    }

    const contentType = response.headers.get("content-type") || "";

    let data;

    try {
        data = contentType.includes("application/json")
            ? await response.json()
            : await response.text();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const message =
            typeof data === "object" && data !== null
                ? data.message ||
                data.error ||
                data.msg ||
                JSON.stringify(data)
                : data;

        if (response.status === 401) {
            throw new Error(
                `HTTP 401 Unauthorized: ${
                    message ||
                    "The server rejected the token. Check whether this endpoint accepts the admin JWT."
                }`
            );
        }

        if (response.status === 403) {
            throw new Error(
                `HTTP 403 Forbidden: ${
                    message ||
                    "The authenticated account is not permitted to perform this action."
                }`
            );
        }

        if (response.status === 404) {
            throw new Error(
                `HTTP 404 Not Found: ${
                    message ||
                    "The Flask endpoint was not found. Verify the registered route and URL prefix."
                }`
            );
        }

        throw new Error(
            `HTTP ${response.status}: ${
                message || response.statusText || "Request failed"
            }`
        );
    }

    return data;
}

/* -------------------------------------------------------
   DATA HELPERS
------------------------------------------------------- */

function normalizeSubmissions(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.submissions)) return data.submissions;
    if (Array.isArray(data?.reports)) return data.reports;
    if (Array.isArray(data?.items)) return data.items;

    return [];
}

function displayDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDate(d) {
    if (!d) return "";

    const raw = String(d);

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [year, month, day] = raw.split("-").map(Number);
        const date = new Date(year, month - 1, day);

        return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    }

    const date = new Date(d);

    if (Number.isNaN(date.getTime())) return raw;

    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function statusLabel(status) {
    const value = String(status || "submitted").toLowerCase();

    if (value === "approved") return "Approved";
    if (value === "returned") return "Returned";
    if (value === "rejected") return "Rejected";

    return "Awaiting review";
}

function statusClass(status) {
    const value = String(status || "submitted").toLowerCase();

    if (value === "approved") return "ao-status-approved";

    if (value === "returned" || value === "rejected") {
        return "ao-status-returned";
    }

    return "ao-status-pending";
}

function getClassName(item) {
    return (
        item.class_level ||
        item.class ||
        item.student_class ||
        "Class not specified"
    );
}

function getTeacherName(item) {
    return (
        item.teacher_name ||
        item.teacher?.name ||
        item.teacher?.full_name ||
        item.teacher_email ||
        item.teacher?.email ||
        `Teacher #${item.teacher_id ?? "—"}`
    );
}

function getSubmissionId(item) {
    return item.id ?? item.submission_id;
}

function getTeacherSignature(payload, submission) {
    const raw =
        payload?.teacher_signature ||
        payload?.class_teacher_signature ||
        payload?.signature ||
        submission?.teacher_signature ||
        null;

    if (!raw) return { name: "", signedOn: "" };

    if (typeof raw === "string") {
        return { name: raw, signedOn: "" };
    }

    return {
        name: raw.name || raw.signed_name || "",
        signedOn: raw.signed_on || raw.signedOn || "",
    };
}

/* -------------------------------------------------------
   RESULTS HELPERS
------------------------------------------------------- */

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

function gradeTone(grade) {
    const value = String(grade || "").toUpperCase();

    if (value.startsWith("D")) return "ao-grade-d";
    if (value.startsWith("C")) return "ao-grade-c";
    if (value.startsWith("P")) return "ao-grade-p";
    if (value.startsWith("F")) return "ao-grade-f";

    return "ao-grade-none";
}

function reportGradeClass(grade) {
    const value = String(grade || "").trim().toUpperCase();

    if (value === "D1" || value === "D2") return "rc-grade-A";
    if (["C3", "C4", "C5", "C6"].includes(value)) return "rc-grade-B";
    if (value === "P7" || value === "P8") return "rc-grade-D";
    if (value === "F9") return "rc-grade-E";

    return "";
}

function ordinal(n) {
    const v = n % 100;
    const s = ["th", "st", "nd", "rd"];

    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getSuggestedConduct(average) {
    if (average >= 80) return "Excellent";
    if (average >= 65) return "Very good";
    if (average >= 50) return "Good";
    if (average >= 35) return "Fair";

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

function buildResults(payload) {
    const students = Array.isArray(payload?.students)
        ? payload.students
        : [];

    const subjectSet = new Set(
        Array.isArray(payload?.subjects) ? payload.subjects : []
    );

    students.forEach((student) => {
        Object.keys(student.marks || {}).forEach((subject) => {
            subjectSet.add(subject);
        });
    });

    const subjects = [...subjectSet].sort((a, b) =>
        a.localeCompare(b)
    );

    const rows = students.map((student) => {
        const marks = student.marks || {};

        const present = subjects
            .map((subject) => marks[subject])
            .filter(Boolean);

        const total = present.reduce(
            (sum, mark) => sum + Number(mark.score || 0),
            0
        );

        const average = present.length ? total / present.length : 0;

        let aggregate = 0;
        let gradedSubjects = 0;

        present.forEach((mark) => {
            const grade = String(mark.grade || "").trim().toUpperCase();

            if (Object.prototype.hasOwnProperty.call(GRADE_POINTS, grade)) {
                aggregate += GRADE_POINTS[grade];
                gradedSubjects += 1;
            }
        });

        return {
            studentId: student.student_id,
            name:
                student.name ||
                student.student_name ||
                student.student_id ||
                "Unnamed student",
            stream: student.stream || "",
            gender: student.gender || "",
            photo: student.photo || "",
            conduct: student.conduct ?? null,
            teacherComment:
                student.teacher_comment ?? student.teacherComment ?? null,
            headComment:
                student.head_comment ?? student.headComment ?? null,
            feesBalance: student.fees_balance ?? student.feesBalance ?? null,
            nextTermBegins:
                student.next_term_begins ||
                student.nextTermBegins ||
                "",
            marks,
            total,
            average,
            aggregate: gradedSubjects > 0 ? aggregate : null,
            gradedSubjects,
            position: null,
        };
    });

    const ranked = rows
        .filter((row) => row.aggregate !== null)
        .sort((a, b) => a.aggregate - b.aggregate);

    let lastAggregate = null;
    let lastPosition = 0;

    ranked.forEach((row, index) => {
        if (row.aggregate !== lastAggregate) {
            lastPosition = index + 1;
            lastAggregate = row.aggregate;
        }

        row.position = lastPosition;
    });

    const unranked = rows
        .filter((row) => row.aggregate === null)
        .sort((a, b) => a.name.localeCompare(b.name));

    const ordered = [...ranked, ...unranked];

    return {
        subjects,
        rows: ordered,
        rankedCount: ranked.length,
        classAverage: rows.length
            ? rows.reduce((sum, row) => sum + row.average, 0) / rows.length
            : 0,
        topStudent: ranked[0] || null,
    };
}

function downloadCsv(filename, subjects, rows) {
    const escape = (value) =>
        `"${String(value ?? "").replace(/"/g, '""')}"`;

    const header = [
        "Position",
        "Student ID",
        "Name",
        "Stream",
        ...subjects.flatMap((subject) => [
            `${subject} score`,
            `${subject} grade`,
        ]),
        "Total",
        "Average",
        "Aggregate",
    ];

    const lines = rows.map((row) =>
        [
            row.position ?? "",
            row.studentId,
            row.name,
            row.stream,
            ...subjects.flatMap((subject) => [
                row.marks[subject]?.score ?? "",
                row.marks[subject]?.grade ?? "",
            ]),
            row.total,
            row.average.toFixed(1),
            row.aggregate ?? "",
        ]
            .map(escape)
            .join(",")
    );

    const blob = new Blob(
        [[header.map(escape).join(","), ...lines].join("\n")],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* -------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------- */

export default function AcademicOversight() {
    const [schoolInfo] = useState(() => getSchoolDetails());

    const [schoolProfile, setSchoolProfile] = useState(
        EMPTY_SCHOOL_PROFILE
    );

    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [search, setSearch] = useState("");
    const [termFilter, setTermFilter] = useState("All terms");
    const [assessmentFilter, setAssessmentFilter] =
        useState("All assessments");
    const [statusFilter, setStatusFilter] = useState("all");
    const [classFilter, setClassFilter] = useState("all");

    const [selected, setSelected] = useState(null);
    const [activeTab, setActiveTab] = useState("results");
    const [adminNote, setAdminNote] = useState("");
    const [reviewing, setReviewing] = useState(false);

    const [resultsState, setResultsState] = useState({
        loading: false,
        error: "",
        data: null,
    });

    const [studentSearch, setStudentSearch] = useState("");
    const [activeStudentId, setActiveStudentId] = useState(null);

    /* ---------------------------------------------------
       HEAD TEACHER SIGNATURE + NEXT TERM DATE
       DATABASE-BACKED SETTINGS
    --------------------------------------------------- */

    const [headSign, setHeadSign] = useState({
        name: "",
        signedOn: "",
    });

    const [headSignError, setHeadSignError] = useState("");
    const [nextTermDate, setNextTermDate] = useState("");
    const [nextTermDateError, setNextTermDateError] = useState("");

    const [academicSettingsLoading, setAcademicSettingsLoading] =
        useState(true);

    const [academicSettingsSaving, setAcademicSettingsSaving] =
        useState(false);

    const loadAcademicSettings = useCallback(async () => {
        setAcademicSettingsLoading(true);
        setHeadSignError("");
        setNextTermDateError("");

        try {
            const data = await apiRequest(ACADEMIC_SETTINGS_URL);

            setHeadSign({
                name: data?.head_teacher_name || "",
                signedOn: data?.head_teacher_signed_on
                    ? String(data.head_teacher_signed_on).slice(0, 10)
                    : "",
            });

            setNextTermDate(data?.next_term_begins || "");
        } catch (err) {
            console.error("Could not load academic settings:", err);

            setHeadSignError(
                `Could not load the saved signature: ${
                    err.message || "Please try again."
                }`
            );

            setNextTermDateError(
                `Could not load the saved next-term date: ${
                    err.message || "Please try again."
                }`
            );
        } finally {
            setAcademicSettingsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAcademicSettings();
    }, [loadAcademicSettings]);

    async function saveHeadSign(name) {
        const trimmedName = String(name || "").trim();

        if (academicSettingsSaving) return;

        setAcademicSettingsSaving(true);
        setHeadSignError("");
        setNextTermDateError("");
        setSuccess("");
        setError("");

        try {
            const data = await apiRequest(ACADEMIC_SETTINGS_URL, {
                method: "POST",
                body: JSON.stringify({
                    head_teacher_name: trimmedName || null,
                }),
            });

            const settings = data?.settings || {};

            setHeadSign({
                name: settings.head_teacher_name || "",
                signedOn: settings.head_teacher_signed_on
                    ? String(settings.head_teacher_signed_on).slice(0, 10)
                    : "",
            });

            setSuccess(
                trimmedName
                    ? "Head teacher signature saved to the school database."
                    : "Head teacher signature removed successfully."
            );
        } catch (err) {
            console.error("Could not save head teacher signature:", err);

            setHeadSignError(
                `Signature was not saved: ${
                    err.message || "Please try again."
                }`
            );
        } finally {
            setAcademicSettingsSaving(false);
        }
    }

    async function saveNextTermDate(dateValue) {
        if (academicSettingsSaving) return;

        setAcademicSettingsSaving(true);
        setNextTermDateError("");
        setHeadSignError("");
        setSuccess("");
        setError("");

        try {
            const data = await apiRequest(ACADEMIC_SETTINGS_URL, {
                method: "POST",
                body: JSON.stringify({
                    next_term_begins: dateValue || null,
                }),
            });

            const settings = data?.settings || {};

            setNextTermDate(settings.next_term_begins || "");

            setSuccess(
                dateValue
                    ? "Next-term opening date saved to the school database."
                    : "Next-term opening date cleared successfully."
            );
        } catch (err) {
            console.error("Could not save next-term date:", err);

            setNextTermDateError(
                `Next-term date was not saved: ${
                    err.message || "Please try again."
                }`
            );
        } finally {
            setAcademicSettingsSaving(false);
        }
    }

    /* LOAD SCHOOL PROFILE */

    const loadSchoolProfile = useCallback(async () => {
        if (!API_BASE) return;

        try {
            const data = await apiRequest(SYSTEM_CONFIG_URL);

            const info =
                data?.configuration ||
                data?.school_information ||
                null;

            const school = data?.school || {};

            setSchoolProfile((prev) => ({
                ...prev,
                schoolName: String(
                    school.school_name ||
                    school.name ||
                    prev.schoolName ||
                    ""
                ).trim(),
                email: String(
                    school.school_email ||
                    school.creator_email ||
                    school.email ||
                    prev.email ||
                    ""
                ).trim(),
                ...(info ? mapSchoolProfile(info) : {}),
            }));
        } catch (err) {
            console.warn(
                "Could not load the school configuration for the report card:",
                err
            );
        }

        try {
            const logoData = await apiRequest(SCHOOL_LOGO_URL);

            setSchoolProfile((prev) => ({
                ...prev,
                logoUrl: logoData?.logo_url || "",
            }));
        } catch (err) {
            console.warn(
                "Could not load the school logo for the report card:",
                err
            );
        }
    }, []);

    useEffect(() => {
        loadSchoolProfile();
    }, [loadSchoolProfile]);

    const loadSubmissions = useCallback(async (quiet = false) => {
        if (quiet) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setError("");

        try {
            const data = await apiRequest(SUBMISSIONS_URL);
            setSubmissions(normalizeSubmissions(data));
        } catch (err) {
            console.error(
                "Academic Oversight submissions request failed:",
                err
            );
            setError(err.message || "Unable to load submissions.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadSubmissions();
    }, [loadSubmissions]);

    /* LOAD RESULTS WHEN A SUBMISSION IS OPENED */

    const selectedId = selected ? getSubmissionId(selected) : null;

    useEffect(() => {
        if (selectedId == null) return undefined;

        let cancelled = false;

        setResultsState({
            loading: true,
            error: "",
            data: null,
        });

        apiRequest(
            `${SUBMISSIONS_URL}/${encodeURIComponent(selectedId)}/results`
        )
            .then((data) => {
                if (!cancelled) {
                    setResultsState({
                        loading: false,
                        error: "",
                        data,
                    });
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    console.error(
                        "Academic Oversight results request failed:",
                        err
                    );

                    setResultsState({
                        loading: false,
                        error: err.message,
                        data: null,
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [selectedId]);

    const results = useMemo(
        () =>
            resultsState.data
                ? buildResults(resultsState.data)
                : null,
        [resultsState.data]
    );

    const teacherSign = useMemo(
        () => getTeacherSignature(resultsState.data, selected),
        [resultsState.data, selected]
    );

    const visibleStudents = useMemo(() => {
        if (!results) return [];

        const query = studentSearch.trim().toLowerCase();

        return results.rows.filter(
            (row) =>
                !query ||
                row.name.toLowerCase().includes(query) ||
                String(row.studentId || "")
                    .toLowerCase()
                    .includes(query)
        );
    }, [results, studentSearch]);

    const activeStudent = useMemo(
        () =>
            results?.rows.find(
                (row) => row.studentId === activeStudentId
            ) || null,
        [results, activeStudentId]
    );

    const classOptions = useMemo(
        () =>
            [
                ...new Set(
                    submissions
                        .map(getClassName)
                        .filter(
                            (value) => value !== "Class not specified"
                        )
                ),
            ].sort((a, b) => a.localeCompare(b)),
        [submissions]
    );

    const filteredSubmissions = useMemo(() => {
        const query = search.trim().toLowerCase();

        return submissions.filter((item) => {
            const itemStatus = String(
                item.status || "submitted"
            ).toLowerCase();

            const searchFields = [
                getClassName(item),
                getTeacherName(item),
                item.term,
                item.assessment,
                item.year,
                item.teacher_note,
                item.admin_note,
            ];

            const matchesSearch =
                !query ||
                searchFields
                    .filter(Boolean)
                    .some((value) =>
                        String(value).toLowerCase().includes(query)
                    );

            const matchesTerm =
                termFilter === "All terms" ||
                item.term === termFilter;

            const matchesAssessment =
                assessmentFilter === "All assessments" ||
                item.assessment === assessmentFilter;

            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "pending" &&
                    !["approved", "returned", "rejected"].includes(
                        itemStatus
                    )) ||
                itemStatus === statusFilter;

            const matchesClass =
                classFilter === "all" ||
                getClassName(item) === classFilter;

            return (
                matchesSearch &&
                matchesTerm &&
                matchesAssessment &&
                matchesStatus &&
                matchesClass
            );
        });
    }, [
        submissions,
        search,
        termFilter,
        assessmentFilter,
        statusFilter,
        classFilter,
    ]);

    const stats = useMemo(() => {
        const approved = submissions.filter(
            (item) =>
                String(item.status || "").toLowerCase() === "approved"
        ).length;

        return {
            total: submissions.length,
            approved,
            pending: submissions.length - approved,
        };
    }, [submissions]);

    function openReview(item, tab = "results") {
        setSelected(item);
        setActiveTab(tab);
        setAdminNote(item.admin_note || "");
        setActiveStudentId(null);
        setStudentSearch("");
        setError("");
        setSuccess("");

        loadSchoolProfile();
    }

    function closeReview() {
        if (reviewing) return;

        setSelected(null);
        setAdminNote("");
        setActiveStudentId(null);

        setResultsState({
            loading: false,
            error: "",
            data: null,
        });
    }

    async function submitReview(event) {
        event.preventDefault();

        if (!selected) return;

        const id = getSubmissionId(selected);

        if (id == null) {
            setError(
                "This submission has no ID in the API response. Check the backend submission serializer."
            );
            return;
        }

        setReviewing(true);
        setError("");
        setSuccess("");

        try {
            await apiRequest(
                `${SUBMISSIONS_URL}/${encodeURIComponent(id)}/review`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        status: "approved",
                        admin_note: adminNote.trim(),
                    }),
                }
            );

            setSuccess("Report submission approved successfully.");

            setSelected(null);
            setAdminNote("");
            setActiveStudentId(null);

            await loadSubmissions(true);
        } catch (err) {
            console.error("Report approval failed:", err);

            if (String(err.message).includes("already approved")) {
                setSelected(null);
                setAdminNote("");
                setActiveStudentId(null);
                await loadSubmissions(true);
                setSuccess("This report was already approved.");
            } else {
                setError(err.message || "Unable to approve the report.");
            }
        } finally {
            setReviewing(false);
        }
    }

    const canDecide = selected
        ? String(selected.status || "submitted").toLowerCase() !==
        "approved"
        : false;

    return (
        <Layout role="admin">
            <main className="admin-page ao-page">
                <section className="ao-hero">
                    <div className="ao-hero-copy">
                        <span className="ao-eyebrow">
                            SCHOOLOS · ACADEMIC GOVERNANCE
                        </span>

                        <h1>Academic oversight</h1>

                        <p>
                            Receive class-teacher assessment reports, read
                            results for every class and student, and approve
                            reports before results are published to
                            parents.
                        </p>

                        <div className="ao-hero-meta">
                            <span>
                                <span className="ao-live-dot" />
                                Report review centre
                            </span>

                            <span>
                                {submissions.length} total submissions
                            </span>
                        </div>
                    </div>

                    <div className="ao-hero-art" aria-hidden="true">
                        <div className="ao-art-back" />
                        <div className="ao-art-sheet">
                            <span className="ao-art-line wide" />
                            <span className="ao-art-line" />
                            <span className="ao-art-line short" />
                            <div className="ao-art-check">✓</div>
                            <span className="ao-art-line wide" />
                            <span className="ao-art-line" />
                        </div>
                        <div className="ao-art-orbit">✓</div>
                    </div>
                </section>

                {error && (
                    <div className="ao-alert ao-alert-error" role="alert">
                        <span className="ao-alert-icon">!</span>
                        <div>
                            <strong>Action needs attention</strong>
                            <p>{error}</p>
                        </div>
                        <button
                            type="button"
                            className="ao-alert-close"
                            onClick={() => setError("")}
                            aria-label="Dismiss error"
                        >
                            ×
                        </button>
                    </div>
                )}

                {success && (
                    <div
                        className="ao-alert ao-alert-success"
                        role="status"
                    >
                        <span className="ao-alert-icon">✓</span>
                        <div>
                            <strong>Success</strong>
                            <p>{success}</p>
                        </div>
                        <button
                            type="button"
                            className="ao-alert-close"
                            onClick={() => setSuccess("")}
                            aria-label="Dismiss message"
                        >
                            ×
                        </button>
                    </div>
                )}

                <section className="ao-stats-grid">
                    <StatCard
                        label="All submissions"
                        value={stats.total}
                        detail="Reports received"
                        icon="▤"
                        color="blue"
                    />

                    <StatCard
                        label="Awaiting approval"
                        value={stats.pending}
                        detail="Require admin action"
                        icon="◷"
                        color="gold"
                    />

                    <StatCard
                        label="Approved reports"
                        value={stats.approved}
                        detail="Review completed"
                        icon="✓"
                        color="green"
                    />
                </section>

                {/* HEAD TEACHER SIGNATURE + NEXT TERM DATE */}

                <section
                    className={`ao-sign-panel ao-sign-${SIGN_DESIGN}`}
                    aria-labelledby="ao-sign-title"
                >
                    <div className="ao-sign-banner">
                        <div
                            className="ao-sign-banner-icon"
                            aria-hidden="true"
                        ></div>

                        <div className="ao-sign-banner-text">
                            <span className="ao-sign-kicker">
                                SIGN ONCE · USED ON EVERY REPORT
                            </span>

                            <h2 id="ao-sign-title">
                                Head teacher signature
                            </h2>

                            <p>
                                Type your name once and press Sign. Your
                                signature appears automatically under the
                                head teacher's comment on every student's
                                report card, including the printed copy.
                            </p>
                        </div>

                        <span
                            className={`ao-sign-badge ${
                                headSign.name
                                    ? "is-signed"
                                    : "is-unsigned"
                            }`}
                        >
                            <i />
                            {academicSettingsLoading
                                ? "Loading…"
                                : headSign.name
                                    ? "Signed"
                                    : "Not signed"}
                        </span>
                    </div>

                    <div className="ao-sign-body">
                        <HeadSignatureSetup
                            label={`${
                                schoolInfo.headTeacher ||
                                SCHOOL.headTeacher
                            } signature`}
                            hint="Applies to every report card in the school"
                            placeholder="Type your full name to sign"
                            sign={headSign}
                            error={headSignError}
                            saving={
                                academicSettingsLoading ||
                                academicSettingsSaving
                            }
                            onSign={saveHeadSign}
                            onRemove={() => saveHeadSign("")}
                            headTeacherName={
                                schoolInfo.headTeacher ||
                                SCHOOL.headTeacher
                            }
                        />

                        <div className="ao-next-term-setting">
                            <div className="ao-next-term-copy">
                                <strong>Next term begins</strong>

                                <p>
                                    Set the opening date for the next term.
                                    This date appears in the existing
                                    Next term begins section on every
                                    student's report card.
                                </p>
                            </div>

                            <label>
                                <span>Next term opening date</span>

                                <input
                                    type="date"
                                    value={nextTermDate}
                                    disabled={
                                        academicSettingsLoading ||
                                        academicSettingsSaving
                                    }
                                    onChange={(event) =>
                                        saveNextTermDate(
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            {academicSettingsLoading && (
                                <p className="ao-next-term-saved">
                                    Loading saved school settings…
                                </p>
                            )}

                            {!academicSettingsLoading && nextTermDate && (
                                <div className="ao-next-term-saved">
                                    <span className="ao-next-term-dot" />
                                    Saved date: {formatDate(nextTermDate)}
                                </div>
                            )}

                            {nextTermDateError && (
                                <p
                                    className="ao-next-term-error"
                                    role="alert"
                                >
                                    {nextTermDateError}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                <section className="ao-panel">
                    <div className="ao-section-heading">
                        <div>
                            <span className="ao-kicker">
                                INCOMING REPORTS
                            </span>

                            <h2>Class-teacher submissions</h2>

                            <p>
                                Open a submission to read the class results
                                table and each student's report, then
                                approve it.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="ao-button ao-button-secondary"
                            onClick={() => loadSubmissions(true)}
                            disabled={refreshing || loading}
                        >
                            <span
                                className={refreshing ? "ao-spin" : ""}
                            >
                                ↻
                            </span>

                            {refreshing ? "Refreshing…" : "Refresh"}
                        </button>
                    </div>

                    <div className="ao-filters">
                        <label className="ao-search">
                            <span>⌕</span>

                            <input
                                type="search"
                                placeholder="Search class, teacher or report…"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />
                        </label>

                        <select
                            aria-label="Filter by class"
                            value={classFilter}
                            onChange={(event) =>
                                setClassFilter(event.target.value)
                            }
                        >
                            <option value="all">All classes</option>

                            {classOptions.map((className) => (
                                <option key={className} value={className}>
                                    {className}
                                </option>
                            ))}
                        </select>

                        <select
                            aria-label="Filter by term"
                            value={termFilter}
                            onChange={(event) =>
                                setTermFilter(event.target.value)
                            }
                        >
                            {TERMS.map((term) => (
                                <option key={term} value={term}>
                                    {term}
                                </option>
                            ))}
                        </select>

                        <select
                            aria-label="Filter by assessment"
                            value={assessmentFilter}
                            onChange={(event) =>
                                setAssessmentFilter(event.target.value)
                            }
                        >
                            {ASSESSMENTS.map((assessment) => (
                                <option
                                    key={assessment}
                                    value={assessment}
                                >
                                    {assessment}
                                </option>
                            ))}
                        </select>

                        <select
                            aria-label="Filter by review status"
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                        >
                            <option value="all">All statuses</option>
                            <option value="pending">
                                Awaiting approval
                            </option>
                            <option value="approved">Approved</option>
                        </select>
                    </div>

                    <div className="ao-table-summary">
                        <span>
                            Showing{" "}
                            <strong>{filteredSubmissions.length}</strong>{" "}
                            of <strong>{submissions.length}</strong>{" "}
                            submissions
                        </span>

                        <span>Latest status from the server</span>
                    </div>

                    {loading ? (
                        <div className="ao-state">
                            <div className="ao-loader" />
                            <h3>Loading submissions</h3>
                            <p>
                                Connecting to the SchoolOS report service…
                            </p>
                        </div>
                    ) : error && submissions.length === 0 ? (
                        <div className="ao-state">
                            <div className="ao-state-icon">!</div>
                            <h3>Submissions could not be loaded</h3>
                            <p>
                                Check the API URL, Flask route, and account
                                authorization, then try again.
                            </p>

                            <button
                                type="button"
                                className="ao-button ao-button-primary"
                                onClick={() => loadSubmissions()}
                            >
                                Try again
                            </button>
                        </div>
                    ) : filteredSubmissions.length === 0 ? (
                        <div className="ao-state">
                            <div className="ao-state-icon">▤</div>

                            <h3>
                                {submissions.length
                                    ? "No matching submissions"
                                    : "No submissions received yet"}
                            </h3>

                            <p>
                                {submissions.length
                                    ? "Try changing your filters or search."
                                    : "Reports submitted by class teachers will appear here when the API returns them."}
                            </p>

                            {submissions.length > 0 && (
                                <button
                                    type="button"
                                    className="ao-button ao-button-secondary"
                                    onClick={() => {
                                        setSearch("");
                                        setClassFilter("all");
                                        setTermFilter("All terms");
                                        setAssessmentFilter(
                                            "All assessments"
                                        );
                                        setStatusFilter("all");
                                    }}
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="ao-table-wrap">
                            <table className="ao-table">
                                <thead>
                                <tr>
                                    <th>Class / Teacher</th>
                                    <th>Assessment</th>
                                    <th>Academic period</th>
                                    <th>Submitted</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                                </thead>

                                <tbody>
                                {filteredSubmissions.map(
                                    (item, index) => {
                                        const id =
                                            getSubmissionId(item);

                                        return (
                                            <tr
                                                key={
                                                    id ??
                                                    `${item.class_level}-${index}`
                                                }
                                            >
                                                <td>
                                                    <div className="ao-class-cell">
                                                            <span className="ao-class-avatar">
                                                                {String(
                                                                    getClassName(
                                                                        item
                                                                    )
                                                                )
                                                                    .slice(
                                                                        0,
                                                                        2
                                                                    )
                                                                    .toUpperCase()}
                                                            </span>

                                                        <div>
                                                            <strong>
                                                                {getClassName(
                                                                    item
                                                                )}
                                                            </strong>

                                                            <span>
                                                                    {getTeacherName(
                                                                        item
                                                                    )}
                                                                </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td>
                                                        <span className="ao-assessment">
                                                            {item.assessment ||
                                                                "—"}
                                                        </span>
                                                </td>

                                                <td>
                                                    <strong className="ao-term">
                                                        {item.term ||
                                                            "—"}
                                                    </strong>

                                                    <span className="ao-year">
                                                            {item.year ||
                                                                "—"}
                                                        </span>
                                                </td>

                                                <td className="ao-date">
                                                    {displayDate(
                                                        item.submitted_at
                                                    )}
                                                </td>

                                                <td>
                                                        <span
                                                            className={`ao-status ${statusClass(
                                                                item.status
                                                            )}`}
                                                        >
                                                            <span />
                                                            {statusLabel(
                                                                item.status
                                                            )}
                                                        </span>
                                                </td>

                                                <td>
                                                    <div className="ao-row-actions">
                                                        <button
                                                            type="button"
                                                            className="ao-review-link"
                                                            onClick={() =>
                                                                openReview(
                                                                    item,
                                                                    "results"
                                                                )
                                                            }
                                                        >
                                                            View results{" "}
                                                            <span>
                                                                    ▦
                                                                </span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="ao-review-link ao-review-link-solid"
                                                            onClick={() =>
                                                                openReview(
                                                                    item,
                                                                    "decision"
                                                                )
                                                            }
                                                        >
                                                            Approve{" "}
                                                            <span>
                                                                    ↗
                                                                </span>
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
                </section>

                <section className="ao-footer-note">
                    <span className="ao-footer-icon">i</span>

                    <p>
                        <strong>Academic governance:</strong> approving a
                        submission releases those results to parents in the
                        parent portal. Results stay hidden from parents
                        until you approve.
                    </p>
                </section>

                {selected && (
                    <div
                        className="ao-modal-backdrop"
                        role="presentation"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) {
                                closeReview();
                            }
                        }}
                    >
                        <section
                            className="ao-modal ao-modal-wide"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="ao-review-title"
                        >
                            <div className="ao-modal-header">
                                <div>
                                    <span className="ao-kicker">
                                        {getClassName(selected)} ·{" "}
                                        {selected.assessment || "—"} ·{" "}
                                        {selected.term || "—"}{" "}
                                        {selected.year || ""}
                                    </span>

                                    <h2 id="ao-review-title">
                                        {activeStudent
                                            ? "Student report"
                                            : "Class results and approval"}
                                    </h2>
                                </div>

                                <button
                                    type="button"
                                    className="ao-modal-close"
                                    onClick={closeReview}
                                    disabled={reviewing}
                                    aria-label="Close review"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="ao-review-summary">
                                <div>
                                    <span>Submitted by</span>
                                    <strong>
                                        {getTeacherName(selected)}
                                    </strong>
                                </div>

                                <div>
                                    <span>Submitted on</span>
                                    <strong>
                                        {displayDate(selected.submitted_at)}
                                    </strong>
                                </div>

                                <div>
                                    <span>Current status</span>
                                    <strong>
                                        {statusLabel(selected.status)}
                                    </strong>
                                </div>
                            </div>

                            {selected.teacher_note && (
                                <div className="ao-note-box">
                                    <span>TEACHER'S NOTE</span>
                                    <p>{selected.teacher_note}</p>
                                </div>
                            )}

                            <div className="ao-tabs" role="tablist">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === "results"}
                                    className={`ao-tab ${
                                        activeTab === "results"
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() => setActiveTab("results")}
                                >
                                    Results
                                    {results && <em>{results.rows.length}</em>}
                                </button>

                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === "decision"}
                                    className={`ao-tab ${
                                        activeTab === "decision"
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() => setActiveTab("decision")}
                                >
                                    Approval
                                </button>
                            </div>

                            {resultsState.data?.source === "live" && (
                                <div className="ao-note-box">
                                    <span>LIVE DATA</span>
                                    <p>
                                        This report was submitted before
                                        snapshots were enabled, so you are
                                        seeing the current marks, not a frozen
                                        copy.
                                    </p>
                                </div>
                            )}

                            {resultsState.data?.captured_at && (
                                <div className="ao-note-box">
                                    <span>SUBMITTED SNAPSHOT</span>
                                    <p>
                                        Marks exactly as the class teacher
                                        submitted them on{" "}
                                        {displayDate(
                                            resultsState.data.captured_at
                                        )}
                                        .
                                    </p>
                                </div>
                            )}

                            {activeTab === "results" && (
                                <div className="ao-results">
                                    {resultsState.loading ? (
                                        <div className="ao-state ao-state-compact">
                                            <div className="ao-loader" />
                                            <h3>Loading class results</h3>
                                            <p>
                                                Collecting marks for every
                                                student…
                                            </p>
                                        </div>
                                    ) : resultsState.error ? (
                                        <div className="ao-state ao-state-compact">
                                            <div className="ao-state-icon">
                                                !
                                            </div>
                                            <h3>
                                                Results could not be loaded
                                            </h3>
                                            <p>{resultsState.error}</p>
                                        </div>
                                    ) : !results ||
                                    results.rows.length === 0 ? (
                                        <div className="ao-state ao-state-compact">
                                            <div className="ao-state-icon">
                                                ▤
                                            </div>
                                            <h3>No marks found</h3>
                                            <p>
                                                No student marks were returned
                                                for this submission.
                                            </p>
                                        </div>
                                    ) : activeStudent ? (
                                        <StudentReport
                                            student={activeStudent}
                                            subjects={results.subjects}
                                            submission={selected}
                                            classSize={results.rankedCount}
                                            signature={teacherSign}
                                            headSignature={headSign}
                                            schoolInfo={schoolInfo}
                                            schoolProfile={schoolProfile}
                                            nextTermDate={nextTermDate}
                                            onBack={() =>
                                                setActiveStudentId(null)
                                            }
                                        />
                                    ) : (
                                        <>
                                            <div className="ao-results-stats">
                                                <div>
                                                    <span>Students</span>
                                                    <strong>
                                                        {results.rows.length}
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>Subjects</span>
                                                    <strong>
                                                        {
                                                            results.subjects
                                                                .length
                                                        }
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>Class average</span>
                                                    <strong>
                                                        {results.classAverage.toFixed(
                                                            1
                                                        )}
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>Top student</span>
                                                    <strong>
                                                        {results.topStudent
                                                            ?.name || "—"}
                                                    </strong>
                                                </div>
                                            </div>

                                            <div className="ao-results-toolbar">
                                                <label className="ao-search">
                                                    <span>⌕</span>
                                                    <input
                                                        type="search"
                                                        placeholder="Find a student by name or ID…"
                                                        value={studentSearch}
                                                        onChange={(event) =>
                                                            setStudentSearch(
                                                                event.target
                                                                    .value
                                                            )
                                                        }
                                                    />
                                                </label>

                                                <button
                                                    type="button"
                                                    className="ao-button ao-button-secondary"
                                                    onClick={() =>
                                                        downloadCsv(
                                                            `${getClassName(
                                                                selected
                                                            )}-${selected.assessment}-${selected.term}-${selected.year}.csv`.replace(
                                                                /\s+/g,
                                                                "_"
                                                            ),
                                                            results.subjects,
                                                            results.rows
                                                        )
                                                    }
                                                >
                                                    Download CSV
                                                </button>
                                            </div>

                                            <div className="ao-table-wrap ao-results-wrap">
                                                <table className="ao-table ao-results-table">
                                                    <thead>
                                                    <tr>
                                                        <th>Pos</th>
                                                        <th>Student</th>

                                                        {results.subjects.map(
                                                            (subject) => (
                                                                <th
                                                                    key={
                                                                        subject
                                                                    }
                                                                    className="ao-num"
                                                                >
                                                                    {
                                                                        subject
                                                                    }
                                                                </th>
                                                            )
                                                        )}

                                                        <th className="ao-num">
                                                            Total
                                                        </th>
                                                        <th className="ao-num">
                                                            Avg
                                                        </th>
                                                        <th className="ao-num">
                                                            Aggregate
                                                        </th>
                                                        <th>Report</th>
                                                    </tr>
                                                    </thead>

                                                    <tbody>
                                                    {visibleStudents.length ===
                                                    0 ? (
                                                        <tr>
                                                            <td
                                                                colSpan={
                                                                    results
                                                                        .subjects
                                                                        .length +
                                                                    6
                                                                }
                                                                className="ao-empty-row"
                                                            >
                                                                No student
                                                                matches
                                                                your
                                                                search.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        visibleStudents.map(
                                                            (row) => (
                                                                <tr
                                                                    key={
                                                                        row.studentId
                                                                    }
                                                                >
                                                                    <td>
                                                                            <span className="ao-position">
                                                                                {row.position ??
                                                                                    "—"}
                                                                            </span>
                                                                    </td>

                                                                    <td>
                                                                        <button
                                                                            type="button"
                                                                            className="ao-student-link"
                                                                            onClick={() =>
                                                                                setActiveStudentId(
                                                                                    row.studentId
                                                                                )
                                                                            }
                                                                        >
                                                                            <strong>
                                                                                {
                                                                                    row.name
                                                                                }
                                                                            </strong>
                                                                            <span>
                                                                                    {
                                                                                        row.studentId
                                                                                    }
                                                                                {row.stream
                                                                                    ? ` · ${row.stream}`
                                                                                    : ""}
                                                                                </span>
                                                                        </button>
                                                                    </td>

                                                                    {results.subjects.map(
                                                                        (
                                                                            subject
                                                                        ) => {
                                                                            const mark =
                                                                                row
                                                                                    .marks[
                                                                                    subject
                                                                                    ];

                                                                            return (
                                                                                <td
                                                                                    key={
                                                                                        subject
                                                                                    }
                                                                                    className="ao-num"
                                                                                >
                                                                                    {mark ? (
                                                                                        <span className="ao-mark">
                                                                                                <b>
                                                                                                    {
                                                                                                        mark.score
                                                                                                    }
                                                                                                </b>
                                                                                                <i
                                                                                                    className={gradeTone(
                                                                                                        mark.grade
                                                                                                    )}
                                                                                                >
                                                                                                    {mark.grade ||
                                                                                                        "—"}
                                                                                                </i>
                                                                                            </span>
                                                                                    ) : (
                                                                                        <span className="ao-missing">
                                                                                                —
                                                                                            </span>
                                                                                    )}
                                                                                </td>
                                                                            );
                                                                        }
                                                                    )}

                                                                    <td className="ao-num">
                                                                        <strong>
                                                                            {
                                                                                row.total
                                                                            }
                                                                        </strong>
                                                                    </td>

                                                                    <td className="ao-num">
                                                                        {row.average.toFixed(
                                                                            1
                                                                        )}
                                                                    </td>

                                                                    <td className="ao-num">
                                                                        {row.aggregate !==
                                                                        null ? (
                                                                            <strong>
                                                                                {
                                                                                    row.aggregate
                                                                                }
                                                                            </strong>
                                                                        ) : (
                                                                            "—"
                                                                        )}
                                                                    </td>

                                                                    <td>
                                                                        <button
                                                                            type="button"
                                                                            className="ao-review-link"
                                                                            onClick={() =>
                                                                                setActiveStudentId(
                                                                                    row.studentId
                                                                                )
                                                                            }
                                                                        >
                                                                            Open{" "}
                                                                            <span>
                                                                                    ↗
                                                                                </span>
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        )
                                                    )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === "decision" && (
                                <form onSubmit={submitReview}>
                                    {!canDecide && (
                                        <p className="ao-return-hint">
                                            This report is already approved.
                                        </p>
                                    )}

                                    <label className="ao-form-label">
                                        Note to the teacher (optional)

                                        <textarea
                                            value={adminNote}
                                            onChange={(event) =>
                                                setAdminNote(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Optional approval note…"
                                            rows={4}
                                            maxLength={1000}
                                            disabled={
                                                reviewing || !canDecide
                                            }
                                        />
                                    </label>

                                    <div className="ao-modal-actions">
                                        <button
                                            type="button"
                                            className="ao-button ao-button-secondary"
                                            onClick={closeReview}
                                            disabled={reviewing}
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            className="ao-button ao-button-primary"
                                            disabled={
                                                reviewing || !canDecide
                                            }
                                        >
                                            {reviewing
                                                ? "Approving…"
                                                : "Approve report"}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </section>
                    </div>
                )}
            </main>
        </Layout>
    );
}

/* -------------------------------------------------------
   HEAD SIGNATURE SETUP
------------------------------------------------------- */

function HeadSignatureSetup({
                                label,
                                hint,
                                placeholder,
                                sign,
                                error = "",
                                saving = false,
                                onSign,
                                onRemove,
                                headTeacherName = SCHOOL.headTeacher,
                            }) {
    const [draft, setDraft] = useState(sign.name);

    useEffect(() => {
        setDraft(sign.name);
    }, [sign.name]);

    const trimmed = draft.trim();
    const canSign = Boolean(trimmed) && trimmed !== sign.name;

    return (
        <div className="ao-sign-grid">
            <div className="ao-sign-form-card">
                <div className="ao-sign-form-head">
                    <strong>{label}</strong>
                    <small>{hint}</small>
                </div>

                <label className="ao-sign-field">
                    <span>Full name</span>

                    <input
                        type="text"
                        className="ao-sign-input"
                        placeholder={placeholder}
                        value={draft}
                        maxLength={40}
                        disabled={saving}
                        onChange={(event) =>
                            setDraft(event.target.value)
                        }
                        onKeyDown={(event) => {
                            if (
                                event.key === "Enter" &&
                                canSign &&
                                !saving
                            ) {
                                event.preventDefault();
                                onSign(trimmed);
                            }
                        }}
                    />
                </label>

                <div className="ao-sign-actions">
                    <button
                        type="button"
                        className="ao-sign-btn ao-sign-btn-primary"
                        disabled={!canSign || saving}
                        onClick={() => onSign(trimmed)}
                    >
                        {saving
                            ? "Saving…"
                            : sign.name
                                ? "Update signature"
                                : "Sign"}
                    </button>

                    {sign.name && (
                        <button
                            type="button"
                            className="ao-sign-btn ao-sign-btn-danger"
                            disabled={saving}
                            onClick={onRemove}
                        >
                            Remove
                        </button>
                    )}
                </div>

                {error && (
                    <p className="ao-sign-error" role="alert">
                        {error}
                    </p>
                )}

                <p className="ao-sign-foot">
                    {saving
                        ? "Please wait while SchoolOS saves your settings."
                        : "Saved in the school database and available after logging in on another device."}
                </p>
            </div>

            <div
                className="ao-sign-paper"
                aria-label="Signature preview"
            >
                <span className="ao-sign-paper-label">Preview</span>

                <div className="ao-sign-paper-line">
                    {sign.name ? (
                        <span className="rc-signature">
                            {sign.name}
                        </span>
                    ) : (
                        <span className="ao-sign-empty">
                            Not signed yet
                        </span>
                    )}
                </div>

                <div className="ao-sign-paper-meta">
                    <span>{headTeacherName}</span>
                    <span>
                        {sign.name && sign.signedOn
                            ? formatDate(sign.signedOn)
                            : "Signature & date"}
                    </span>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------
   STUDENT REPORT
------------------------------------------------------- */

function StudentReport({
                           student,
                           subjects,
                           submission,
                           classSize,
                           signature,
                           headSignature,
                           schoolInfo,
                           schoolProfile,
                           nextTermDate = "",
                           onBack,
                       }) {
    const [printing, setPrinting] = useState(false);

    useEffect(() => {
        function finishPrint() {
            setPrinting(false);
            document.body.classList.remove("rc-printing");

            const style = document.getElementById("rc-page-style");

            if (style) style.remove();
        }

        window.addEventListener("afterprint", finishPrint);

        return () => {
            window.removeEventListener("afterprint", finishPrint);
            finishPrint();
        };
    }, []);

    function handlePrint() {
        let style = document.getElementById("rc-page-style");

        if (!style) {
            style = document.createElement("style");
            style.id = "rc-page-style";
            document.head.appendChild(style);
        }

        style.textContent = "@page { size: A4; margin: 0; }";

        document.body.classList.add("rc-printing");
        setPrinting(true);

        setTimeout(() => window.print(), 200);
    }

    const sheetProps = {
        student,
        subjects,
        submission,
        classSize,
        signature,
        headSignature,
        schoolInfo,
        schoolProfile,
        nextTermDate,
    };

    return (
        <div className="rc-wrap">
            <div className="rc-actions">
                <button
                    type="button"
                    className="ao-button ao-button-secondary"
                    onClick={onBack}
                >
                    ← Back to class table
                </button>

                <button
                    type="button"
                    className="rc-print-btn"
                    onClick={handlePrint}
                >
                    Print / Save PDF
                </button>
            </div>

            <div className="rc-scroll">
                <ReportSheet {...sheetProps} />
            </div>

            {printing &&
                createPortal(
                    <div className="report-sheet">
                        <ReportSheet {...sheetProps} />
                    </div>,
                    document.body
                )}
        </div>
    );
}

/* -------------------------------------------------------
   SCHOOL CREST
------------------------------------------------------- */

function SchoolCrest({ logoUrl, initial, name }) {
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [logoUrl]);

    const showLogo = Boolean(logoUrl) && !failed;

    return (
        <div className={`rc-crest ${showLogo ? "rc-crest-logo" : ""}`}>
            {showLogo ? (
                <img
                    className="rc-crest-img"
                    src={logoUrl}
                    alt={`${name} logo`}
                    onError={() => setFailed(true)}
                />
            ) : (
                initial
            )}
        </div>
    );
}

/* -------------------------------------------------------
   REPORT SHEET
   Existing "Next term begins" section is reused.
------------------------------------------------------- */

function ReportSheet({
                         student,
                         subjects,
                         submission,
                         classSize,
                         signature,
                         headSignature,
                         schoolInfo = {},
                         schoolProfile = EMPTY_SCHOOL_PROFILE,
                         nextTermDate = "",
                     }) {
    const schoolName =
        schoolInfo.name ||
        schoolProfile.schoolName ||
        SCHOOL.name ||
        "School name unavailable";

    const schoolEmail =
        schoolInfo.email ||
        schoolProfile.email ||
        SCHOOL.email ||
        "";

    const schoolInitial =
        schoolName.trim().charAt(0).toUpperCase() || "S";

    const headTeacherTitle =
        schoolInfo.headTeacher || SCHOOL.headTeacher;

    const motto = schoolProfile.motto;

    const contactParts = [
        schoolProfile.location,
        schoolProfile.address,
        schoolProfile.phone ? `Tel: ${schoolProfile.phone}` : "",
        schoolProfile.directorPhone
            ? `${headTeacherTitle}: ${schoolProfile.directorPhone}`
            : "",
        schoolEmail,
    ].filter(Boolean);

    const assessment = submission.assessment || "Assessment";
    const term = submission.term || "";
    const year = submission.year || "";
    const className = getClassName(submission);

    const rows = subjects.map((subject) => {
        const mark = student.marks?.[subject];

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

    const scored = rows.filter(
        (row) => row.score !== null && row.score !== undefined
    );

    const total = scored.reduce(
        (sum, row) => sum + Number(row.score || 0),
        0
    );

    const average = scored.length ? total / scored.length : 0;

    const position = student.position;
    const hasPosition = position !== null && position !== undefined;

    const aggregate = student.aggregate;
    const fees = student.feesBalance;

    const conduct =
        student.conduct ??
        (scored.length ? getSuggestedConduct(average) : "");

    const teacherComment =
        student.teacherComment ??
        (scored.length ? getTeacherComment(average) : "");

    const headComment =
        student.headComment ??
        (scored.length ? getHeadComment(average) : "");

    const signName = signature?.name || "";
    const signedOn = signature?.signedOn || "";

    const headSignName = headSignature?.name || "";
    const headSignedOn = headSignature?.signedOn || "";

    /* School-wide saved date takes priority. */
    const effectiveNextTermDate =
        nextTermDate || student.nextTermBegins || "";

    return (
        <section className="rc-page">
            <div className="rc-frame">
                <span className="rc-watermark">{schoolInitial}</span>

                <header className="rc-head">
                    <SchoolCrest
                        logoUrl={schoolProfile.logoUrl}
                        initial={schoolInitial}
                        name={schoolName}
                    />

                    <div className="rc-school">
                        <h1>{schoolName}</h1>

                        {motto && <p className="rc-motto">"{motto}"</p>}

                        {contactParts.length > 0 && (
                            <p className="rc-contact">
                                {contactParts.join(" | ")}
                            </p>
                        )}
                    </div>

                    <div className="rc-photo">
                        {student.photo ? (
                            <img src={student.photo} alt={student.name} />
                        ) : (
                            <span>Passport photo</span>
                        )}
                    </div>
                </header>

                <div className="rc-banner">
                    {assessment} Report Card &mdash; {term}, {year}
                </div>

                <div className="rc-bio">
                    <BioField label="Pupil's name" value={student.name} wide />

                    <BioField
                        label="Class"
                        value={`${className}${
                            student.stream ? " " + student.stream : ""
                        }`}
                    />

                    <BioField
                        label="Student ID"
                        value={student.studentId || ""}
                    />

                    <BioField label="Gender" value={student.gender || ""} />

                    <BioField label="Term / Year" value={`${term}, ${year}`} />

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

                <table className="rc-marks">
                    <thead>
                    <tr>
                        <th className="rc-left">Subject</th>
                        <th>
                            Score<small>/ 100</small>
                        </th>
                        <th>Grade</th>
                        <th>
                            Points
                            <small>lower is better</small>
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
                                {row.score !== null &&
                                row.score !== undefined
                                    ? row.score
                                    : ""}
                            </td>

                            <td>
                                {row.grade ? (
                                    <span
                                        className={`rc-grade ${reportGradeClass(
                                            row.grade
                                        )}`}
                                    >
                                            {row.grade}
                                        </span>
                                ) : (
                                    ""
                                )}
                            </td>

                            <td>
                                {row.points !== null ? row.points : ""}
                            </td>

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
                                {aggregate !== null &&
                                aggregate !== undefined
                                    ? aggregate
                                    : "-"}
                            </b>{" "}
                            &nbsp;&middot;&nbsp; Position{" "}
                            <b>
                                {hasPosition ? ordinal(position) : "-"}
                            </b>
                        </td>
                    </tr>
                    </tfoot>
                </table>

                <div className="rc-row">
                    <div className="rc-box rc-key">
                        <h3>Grading key</h3>

                        {REPORT_GRADING_KEY.map((item) => (
                            <div key={item.grade} className="rc-key-line">
                                <b>{item.grade}</b>
                                <span>Points {item.points}</span>
                                <em>{item.meaning}</em>
                            </div>
                        ))}
                    </div>

                    <div className="rc-box">
                        <h3>General conduct</h3>

                        <p
                            className={`rc-conduct ${
                                conduct ? "" : "rc-blank"
                            }`}
                        >
                            {conduct}
                        </p>

                        <h3>Fees balance</h3>

                        <p
                            className={`rc-conduct ${
                                fees === undefined || fees === null
                                    ? "rc-blank"
                                    : ""
                            }`}
                        >
                            {fees === undefined || fees === null
                                ? ""
                                : Number(fees) === 0
                                    ? "Cleared"
                                    : `UGX ${Number(fees).toLocaleString()}`}
                        </p>

                        {/* Existing section: no duplicate added. */}
                        <h3>Next term begins</h3>

                        <p
                            className={`rc-conduct ${
                                effectiveNextTermDate ? "" : "rc-blank"
                            }`}
                        >
                            {formatDate(effectiveNextTermDate)}
                        </p>
                    </div>
                </div>

                <div className="rc-comment">
                    <h3>Class teacher's comment</h3>
                    <p>{teacherComment}</p>

                    <div className="rc-signblock">
                        <div className="rc-sign">
                            <div className="rc-sign-line">
                                <span className="rc-signature">
                                    {signName}
                                </span>

                                {signName && signedOn && (
                                    <span className="rc-sign-date">
                                        {formatDate(signedOn)}
                                    </span>
                                )}
                            </div>

                            <small>Signature &amp; date</small>
                        </div>
                    </div>
                </div>

                <div className="rc-comment">
                    <h3>{headTeacherTitle}'s comment</h3>
                    <p>{headComment}</p>

                    <div className="rc-signblock">
                        <div className="rc-sign">
                            <div className="rc-sign-line">
                                <span className="rc-signature">
                                    {headSignName}
                                </span>

                                {headSignName && headSignedOn && (
                                    <span className="rc-sign-date">
                                        {formatDate(headSignedOn)}
                                    </span>
                                )}
                            </div>

                            <small>Signature &amp; date</small>
                        </div>
                    </div>
                </div>
            </div>
        </section>
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

/* -------------------------------------------------------
   STAT CARD
------------------------------------------------------- */

function StatCard({ label, value, detail, icon, color }) {
    return (
        <section className={`ao-stat-card ao-stat-${color}`}>
            <div className="ao-stat-top">
                <span>{label}</span>
                <span className="ao-stat-icon">{icon}</span>
            </div>

            <strong className="ao-stat-value">{value}</strong>
            <span className="ao-stat-detail">{detail}</span>
            <div className="ao-stat-decoration" />
        </section>
    );
}