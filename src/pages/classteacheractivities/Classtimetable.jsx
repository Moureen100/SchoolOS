import React, { useEffect, useMemo, useState } from "react";

import {
    FiPlus,
    FiTrash2,
    FiSave,
    FiEdit3,
    FiCopy,
    FiX,
    FiCheck,
    FiClock,
    FiUser,
    FiBookOpen,
    FiCoffee,
    FiMoon,
    FiSun,
    FiAlertCircle,
    FiRefreshCw,
} from "react-icons/fi";

import Layout from "../../Layout";
import "./Classtimetable.css";

/* =========================================================
   API
========================================================= */

const API_ROOT = String(
    import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const API_PREFIX = API_ROOT.endsWith("/api")
    ? API_ROOT
    : `${API_ROOT}/api`;

const BASE = `${API_PREFIX}/class-timetable`;
const CLASS_TEACHER_BASE = `${API_PREFIX}/class-teacher`;


/* =========================================================
   CONSTANTS
========================================================= */

const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
];

const DAY_SHORT = {
    Monday: "Mon",
    Tuesday: "Tue",
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
};

const MORNING_PREP_ID = "morning-prep";
const NIGHT_PREP_ID = "night-prep";

const PREPS = "Preps";

const DEFAULT_ROOMS = [
    "Classroom",
    "Science Lab",
    "Computer Lab",
    "Library",
    "Playground",
    "Assembly Ground",
    "Staff Room",
    "Other",
];


/* =========================================================
   DEFAULT SCHOOL PERIODS
   SCHOOL DAY STARTS AT 7:30 AM
========================================================= */

const DEFAULT_PERIODS = [
    {
        id: "p1",
        label: "P1",
        start: "07:30",
        end: "08:10",
        kind: "lesson",
        position: 1,
    },
    {
        id: "p2",
        label: "P2",
        start: "08:10",
        end: "08:50",
        kind: "lesson",
        position: 2,
    },
    {
        id: "p3",
        label: "P3",
        start: "08:50",
        end: "09:30",
        kind: "lesson",
        position: 3,
    },
    {
        id: "break-1",
        label: "Break",
        start: "09:30",
        end: "10:00",
        kind: "break",
        position: 4,
    },
    {
        id: "p4",
        label: "P4",
        start: "10:00",
        end: "10:40",
        kind: "lesson",
        position: 5,
    },
    {
        id: "p5",
        label: "P5",
        start: "10:40",
        end: "11:20",
        kind: "lesson",
        position: 6,
    },
    {
        id: "p6",
        label: "P6",
        start: "11:20",
        end: "12:00",
        kind: "lesson",
        position: 7,
    },
    {
        id: "lunch",
        label: "Lunch",
        start: "12:00",
        end: "13:00",
        kind: "break",
        position: 8,
    },
    {
        id: "p7",
        label: "P7",
        start: "13:00",
        end: "13:40",
        kind: "lesson",
        position: 9,
    },
    {
        id: "p8",
        label: "P8",
        start: "13:40",
        end: "14:20",
        kind: "lesson",
        position: 10,
    },
    {
        id: "p9",
        label: "P9",
        start: "14:20",
        end: "15:00",
        kind: "lesson",
        position: 11,
    },
    {
        id: "tea-break",
        label: "Tea Break",
        start: "15:00",
        end: "15:30",
        kind: "break",
        position: 12,
    },
    {
        id: "p10",
        label: "P10",
        start: "15:30",
        end: "16:10",
        kind: "lesson",
        position: 13,
    },
];


/* =========================================================
   HELPERS
========================================================= */

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function normaliseTime(value) {
    if (!value) return "";

    if (typeof value === "string") {
        return value.slice(0, 5);
    }

    return "";
}

function timeToMinutes(value) {
    if (!value || !value.includes(":")) {
        return 0;
    }

    const [h, m] = value.split(":").map(Number);

    return h * 60 + m;
}

function buildWeekDates() {
    const today = new Date();
    const day = today.getDay();

    const mondayOffset = day === 0 ? -6 : 1 - day;

    const monday = new Date(today);

    monday.setDate(
        today.getDate() + mondayOffset
    );

    return DAYS.reduce((acc, name, index) => {
        const date = new Date(monday);

        date.setDate(
            monday.getDate() + index
        );

        acc[name] = date;

        return acc;
    }, {});
}

function getAuthToken() {
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken") ||
        ""
    );
}


/* =========================================================
   AUTH FETCH
========================================================= */

async function authFetch(url, options = {}) {
    const token = getAuthToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    console.log("🌐 REQUEST:", {
        url,
        method: options.method || "GET",
    });

    const response = await fetch(url, {
        ...options,
        headers,
    });

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    console.log("🌐 RESPONSE:", {
        url,
        status: response.status,
        data,
    });

    return {
        response,
        data,
    };
}


/* =========================================================
   EXTRACT MY CLASS

   BACKEND CURRENT RESPONSE:

   [
       {
           "id": 4,
           "teacher_class_id": 4,
           "level": "P.2",
           "stream": "",
           "label": "P.2",
           "isClassTeacher": false
       }
   ]
========================================================= */

function extractMyClass(data) {
    console.log(
        "🧩 EXTRACTING CLASS FROM:",
        data
    );

    let raw = null;

    /*
       IMPORTANT:
       /my-class currently returns an ARRAY.
    */

    if (Array.isArray(data)) {
        raw = data.length > 0
            ? data[0]
            : null;
    } else if (
        data &&
        typeof data === "object"
    ) {
        raw =
            data.teacherClass ||
            data.teacher_class ||
            data.classInfo ||
            data.class_info ||
            data.data?.teacherClass ||
            data.data?.teacher_class ||
            data.data?.classInfo ||
            data.data?.class_info ||
            data.data ||
            data;
    }

    console.log(
        "🧩 EXTRACTED CLASS OBJECT:",
        raw
    );

    if (
        !raw ||
        typeof raw !== "object"
    ) {
        console.error(
            "❌ NO CLASS OBJECT FOUND"
        );

        return {
            id: null,
            label: "My class",
            studentClass: "",
            stream: "",
            raw: null,
        };
    }

    /*
       The backend now gives:
       id: 4
       teacher_class_id: 4
    */

    const id =
        raw.id ??
        raw.teacher_class_id ??
        raw.teacherClassId ??
        raw.teacherClassID;

    const studentClass =
        raw.level ??
        raw.student_class ??
        raw.studentClass ??
        raw.class_name ??
        raw.className ??
        "";

    const stream =
        raw.stream ??
        raw.class_stream ??
        "";

    const label =
        raw.label ||
        raw.classLabel ||
        raw.class_label ||
        [studentClass, stream]
            .filter(Boolean)
            .join(" - ") ||
        "My class";

    console.log(
        "🆔 EXTRACTED TEACHER CLASS ID:",
        id
    );

    console.log(
        "🏫 EXTRACTED CLASS LABEL:",
        label
    );

    return {
        id:
            id !== null &&
            id !== undefined
                ? Number(id)
                : null,

        label,

        studentClass,

        stream,

        raw,
    };
}


/* =========================================================
   BUILD SERVER DATA
========================================================= */

function buildFromServer(data) {
    console.log(
        "🗓️ BUILDING TIMETABLE FROM SERVER:",
        data
    );

    /*
       Support:

       {
           periods: [],
           timetables: []
       }

       OR

       {
           periods: [],
           entries: []
       }

       OR an array of timetable rows.
    */

    let serverPeriods = [];

    let serverEntries = [];

    if (Array.isArray(data)) {
        serverEntries = data;
    } else {
        serverPeriods = Array.isArray(
            data?.periods
        )
            ? data.periods
            : [];

        serverEntries = Array.isArray(
            data?.timetables
        )
            ? data.timetables
            : Array.isArray(
                data?.entries
            )
                ? data.entries
                : [];
    }


    /* =====================================================
       BUILD PERIODS FROM BACKEND
    ===================================================== */

    let periods = [];

    if (serverPeriods.length > 0) {
        periods = serverPeriods.map(
            (p, index) => {
                const kind =
                    p.kind ||
                    "lesson";

                let id = p.id;

                if (!id) {
                    if (
                        kind === "break"
                    ) {
                        id = `break-${index}`;
                    } else if (
                        kind === "prep"
                    ) {
                        id =
                            index % 2 === 0
                                ? MORNING_PREP_ID
                                : NIGHT_PREP_ID;
                    } else {
                        id = `server-period-${index}`;
                    }
                }

                return {
                    id,

                    label:
                        p.label ||
                        p.periodLabel ||
                        p.period_label ||
                        `P${index + 1}`,

                    start:
                        normaliseTime(
                            p.startTime
                        ) ||
                        normaliseTime(
                            p.start_time
                        ) ||
                        normaliseTime(
                            p.start
                        ),

                    end:
                        normaliseTime(
                            p.endTime
                        ) ||
                        normaliseTime(
                            p.end_time
                        ) ||
                        normaliseTime(
                            p.end
                        ),

                    kind,

                    position:
                        Number.isFinite(
                            Number(
                                p.position
                            )
                        )
                            ? Number(
                                p.position
                            )
                            : index + 1,
                };
            }
        );
    }


    /* =====================================================
       INFER PERIODS FROM ENTRIES
    ===================================================== */

    if (
        periods.length === 0 &&
        serverEntries.length > 0
    ) {
        const unique = new Map();

        serverEntries.forEach(
            (entry, index) => {
                const start =
                    normaliseTime(
                        entry.startTime
                    ) ||
                    normaliseTime(
                        entry.start_time
                    );

                const end =
                    normaliseTime(
                        entry.endTime
                    ) ||
                    normaliseTime(
                        entry.end_time
                    );

                if (!start || !end) {
                    return;
                }

                const label =
                    entry.periodLabel ||
                    entry.period_label ||
                    `P${index + 1}`;

                const kind =
                    entry.kind ||
                    (
                        String(
                            entry.subject ||
                            entry.subjectName ||
                            entry.subject_name ||
                            ""
                        )
                            .toLowerCase() ===
                        "preps"
                            ? "prep"
                            : "lesson"
                    );

                const key =
                    `${start}-${end}-${label}`;

                if (!unique.has(key)) {
                    unique.set(key, {
                        id: `server-${unique.size + 1}`,
                        label,
                        start,
                        end,
                        kind,
                        position:
                            unique.size + 1,
                    });
                }
            }
        );

        periods =
            Array.from(
                unique.values()
            );
    }


    /* =====================================================
       FALLBACK TO DEFAULT SCHOOL DAY
    ===================================================== */

    if (periods.length === 0) {
        periods =
            clone(DEFAULT_PERIODS);
    }


    /* =====================================================
       ADD EXTRA SERVER TIMES
    ===================================================== */

    serverEntries.forEach(
        (entry, index) => {
            const start =
                normaliseTime(
                    entry.startTime
                ) ||
                normaliseTime(
                    entry.start_time
                );

            const end =
                normaliseTime(
                    entry.endTime
                ) ||
                normaliseTime(
                    entry.end_time
                );

            if (!start || !end) {
                return;
            }

            const exists =
                periods.some(
                    (p) =>
                        p.start === start &&
                        p.end === end
                );

            if (!exists) {
                periods.push({
                    id: `server-extra-${index}`,

                    label:
                        entry.periodLabel ||
                        entry.period_label ||
                        `P${periods.length + 1}`,

                    start,
                    end,

                    kind:
                        entry.kind ||
                        "lesson",

                    position:
                        periods.length + 1,
                });
            }
        }
    );


    /* =====================================================
       SORT PERIODS BY TIME
    ===================================================== */

    periods.sort(
        (a, b) =>
            timeToMinutes(a.start) -
            timeToMinutes(b.start)
    );

    periods =
        periods.map(
            (p, index) => ({
                ...p,
                position:
                    index + 1,
            })
        );


    /* =====================================================
       BUILD TIMETABLE ENTRIES
    ===================================================== */

    const timetable =
        serverEntries.map(
            (entry, index) => {
                const start =
                    normaliseTime(
                        entry.startTime
                    ) ||
                    normaliseTime(
                        entry.start_time
                    );

                const end =
                    normaliseTime(
                        entry.endTime
                    ) ||
                    normaliseTime(
                        entry.end_time
                    );

                const entryKind =
                    entry.kind ||
                    (
                        String(
                            entry.subject ||
                            entry.subjectName ||
                            entry.subject_name ||
                            ""
                        )
                            .toLowerCase() ===
                        "preps"
                            ? "prep"
                            : "lesson"
                    );

                let subject =
                    entry.subject ||
                    entry.subjectName ||
                    entry.subject_name ||
                    "";

                if (
                    entryKind ===
                    "prep"
                ) {
                    subject = PREPS;
                }

                const teacherId =
                    entry.teacherId ??
                    entry.teacher_id ??
                    entry.teacher?.id ??
                    null;

                const teacherSubjectId =
                    entry.teacherSubjectId ??
                    entry.teacher_subject_id ??
                    entry.teacherSubject?.id ??
                    null;

                return {
                    id:
                        entry.id ??
                        `server-entry-${index}`,

                    day:
                        entry.day ||
                        entry.dayName ||
                        entry.day_name ||
                        "Monday",

                    startTime: start,

                    endTime: end,

                    periodLabel:
                        entry.periodLabel ||
                        entry.period_label ||
                        periods.find(
                            (p) =>
                                p.start === start &&
                                p.end === end
                        )?.label ||
                        "",

                    teacherId:
                        teacherId !== null &&
                        teacherId !== undefined
                            ? String(
                                teacherId
                            )
                            : "",

                    teacherSubjectId,

                    subject,

                    room:
                        entry.room ||
                        "",

                    status:
                        entry.status ||
                        "active",

                    note:
                        entry.note ||
                        "",
                };
            }
        );

    console.log(
        "🗓️ FINAL PERIODS:",
        periods
    );

    console.log(
        "🗓️ FINAL TIMETABLE:",
        timetable
    );

    return {
        periods,
        timetable,
    };
}


/* =========================================================
   EMPTY WEEK
========================================================= */

function makeEmptyWeek(
    periods
) {
    const result = [];

    DAYS.forEach(
        (day) => {
            periods.forEach(
                (period) => {
                    if (
                        period.kind !==
                        "lesson" &&
                        period.kind !==
                        "prep"
                    ) {
                        return;
                    }

                    result.push({
                        id:
                            `${day}-${period.id}`,

                        day,

                        startTime:
                        period.start,

                        endTime:
                        period.end,

                        periodLabel:
                        period.label,

                        teacherId:
                            "",

                        teacherSubjectId:
                            null,

                        subject:
                            period.kind ===
                            "prep"
                                ? PREPS
                                : "",

                        room:
                            "",

                        status:
                            "active",

                        note:
                            "",
                    });
                }
            );
        }
    );

    return result;
}


/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Classtimetable() {
    const [myClass, setMyClass] =
        useState({
            id: null,
            label: "My class",
        });

    const [classLoading, setClassLoading] =
        useState(true);

    const [status, setStatus] =
        useState("loading");

    const [errorText, setErrorText] =
        useState("");

    const [successText, setSuccessText] =
        useState("");

    const [periods, setPeriods] =
        useState(
            clone(DEFAULT_PERIODS)
        );

    const [timetable, setTimetable] =
        useState([]);

    const [draft, setDraft] =
        useState(null);

    const [draftPeriods, setDraftPeriods] =
        useState(null);

    const [teachers, setTeachers] =
        useState([]);

    const [view, setView] =
        useState("week");

    const [selectedDay, setSelectedDay] =
        useState("Monday");

    const [allocationOpen, setAllocationOpen] =
        useState(false);

    const [allocationCell, setAllocationCell] =
        useState(null);

    const [saving, setSaving] =
        useState(false);

    const [editingPeriodId, setEditingPeriodId] =
        useState(null);

    const weekDates =
        useMemo(
            () => buildWeekDates(),
            []
        );


    /* =====================================================
       LOAD ASSIGNED CLASS
    ===================================================== */

    useEffect(() => {
        let alive = true;

        async function loadMyClass() {
            setClassLoading(true);
            setStatus("loading");
            setErrorText("");

            console.log(
                "========================================"
            );

            console.log(
                "🔥 LOADING CLASS TEACHER ASSIGNED CLASS"
            );

            console.log(
                "========================================"
            );

            try {
                const {
                    response,
                    data,
                } =
                    await authFetch(
                        `${CLASS_TEACHER_BASE}/my-class`
                    );

                console.log(
                    "🔥 MY CLASS STATUS:",
                    response.status
                );

                console.log(
                    "🔥 MY CLASS RESPONSE:",
                    data
                );

                if (!response.ok) {
                    throw new Error(
                        data?.message ||
                        data?.error ||
                        "Could not load your assigned class."
                    );
                }

                /*
                   THIS NOW CORRECTLY HANDLES:

                   [
                       {
                           id: 4,
                           teacher_class_id: 4,
                           level: "P.2"
                       }
                   ]
                */

                const extracted =
                    extractMyClass(
                        data
                    );

                console.log(
                    "🔥 EXTRACTED CLASS:",
                    extracted
                );

                console.log(
                    "🔥 EXTRACTED TEACHER CLASS ID:",
                    extracted.id
                );

                console.log(
                    "🔥 EXTRACTED CLASS LABEL:",
                    extracted.label
                );

                if (!extracted.id) {
                    console.error(
                        "❌ NO TEACHER CLASS ID FOUND"
                    );

                    console.error(
                        "❌ COMPLETE BACKEND RESPONSE:",
                        JSON.stringify(
                            data,
                            null,
                            2
                        )
                    );

                    throw new Error(
                        "Your assigned class could not be found."
                    );
                }

                if (!alive) {
                    return;
                }

                setMyClass({
                    id: extracted.id,
                    label: extracted.label,
                });

                setClassLoading(false);

            } catch (error) {
                console.error(
                    "❌ LOAD MY CLASS ERROR:",
                    error
                );

                if (!alive) {
                    return;
                }

                setClassLoading(false);

                setStatus("error");

                setErrorText(
                    error?.message ||
                    "Your assigned class could not be found."
                );
            }
        }

        loadMyClass();

        return () => {
            alive = false;
        };
    }, []);


    /* =====================================================
       LOAD TIMETABLE AFTER CLASS ID EXISTS
    ===================================================== */

    useEffect(() => {
        if (!myClass.id) {
            return;
        }

        let alive = true;

        async function loadTimetable() {
            setStatus("loading");
            setErrorText("");
            setSuccessText("");

            console.log(
                "========================================"
            );

            console.log(
                "🔥 LOADING TIMETABLE FOR TEACHER CLASS:",
                myClass.id
            );

            console.log(
                "🔥 CLASS LABEL:",
                myClass.label
            );

            console.log(
                "========================================"
            );

            try {
                const timetableUrl =
                    `${BASE}/class/${myClass.id}`;

                const teachersUrl =
                    `${BASE}/class/${myClass.id}/teachers`;

                console.log(
                    "🗓️ TIMETABLE URL:",
                    timetableUrl
                );

                console.log(
                    "👨‍🏫 TEACHERS URL:",
                    teachersUrl
                );

                const [
                    tt,
                    th,
                ] =
                    await Promise.all([
                        authFetch(
                            timetableUrl
                        ),
                        authFetch(
                            teachersUrl
                        ),
                    ]);

                console.log(
                    "🗓️ TIMETABLE SERVER DATA:",
                    tt.data
                );

                console.log(
                    "👨‍🏫 TEACHERS SERVER DATA:",
                    th.data
                );

                if (!tt.response.ok) {
                    throw new Error(
                        tt.data?.message ||
                        tt.data?.error ||
                        "Failed to load timetable."
                    );
                }

                const built =
                    buildFromServer(
                        tt.data || {}
                    );

                if (!alive) {
                    return;
                }

                setPeriods(
                    built.periods
                );

                setTimetable(
                    built.timetable
                );

                /*
                   TEACHERS
                */

                if (
                    th.response.ok &&
                    Array.isArray(
                        th.data?.teachers
                    )
                ) {
                    setTeachers(
                        th.data.teachers
                    );
                } else if (
                    th.response.ok &&
                    Array.isArray(
                        th.data
                    )
                ) {
                    setTeachers(
                        th.data
                    );
                } else {
                    console.warn(
                        "⚠️ No teachers array found:",
                        th.data
                    );

                    setTeachers([]);
                }

                setStatus("ready");

            } catch (error) {
                console.error(
                    "❌ LOAD TIMETABLE ERROR:",
                    error
                );

                if (!alive) {
                    return;
                }

                setStatus("error");

                setErrorText(
                    error?.message ||
                    "Failed to load timetable."
                );
            }
        }

        loadTimetable();

        return () => {
            alive = false;
        };
    }, [myClass.id]);


    /* =====================================================
       START EDITING
    ===================================================== */

    function startEditing() {
        setDraft(
            clone(timetable)
        );

        setDraftPeriods(
            clone(periods)
        );

        setView("create");

        setSuccessText("");
        setErrorText("");
    }


    /* =====================================================
       CANCEL EDITING
    ===================================================== */

    function cancelEditing() {
        setDraft(null);
        setDraftPeriods(null);

        setEditingPeriodId(null);

        setAllocationOpen(false);
        setAllocationCell(null);

        setView("week");

        setErrorText("");
    }


    /* =====================================================
       ADD ROW
    ===================================================== */

    function addRow(
        type = "lesson"
    ) {
        if (!draftPeriods) {
            return;
        }

        const sorted =
            [...draftPeriods].sort(
                (a, b) =>
                    timeToMinutes(
                        a.start
                    ) -
                    timeToMinutes(
                        b.start
                    )
            );

        let start = "16:10";
        let end = "16:50";

        let label =
            `P${sorted.length + 1}`;

        let kind = "lesson";

        if (
            type === "break"
        ) {
            start = "16:10";
            end = "16:30";
            label = "Break";
            kind = "break";
        }

        if (
            type === "morning"
        ) {
            start = "06:30";
            end = "07:30";
            label = "Morning Prep";
            kind = "prep";
        }

        if (
            type === "night"
        ) {
            start = "19:00";
            end = "21:00";
            label = "Night Prep";
            kind = "prep";
        }

        const newPeriod = {
            id:
                type === "morning"
                    ? MORNING_PREP_ID
                    : type === "night"
                        ? NIGHT_PREP_ID
                        : `new-${Date.now()}`,

            label,

            start,

            end,

            kind,

            position:
                sorted.length + 1,
        };

        setDraftPeriods(
            [
                ...draftPeriods,
                newPeriod,
            ]
        );

        if (
            kind === "lesson" ||
            kind === "prep"
        ) {
            const cells = [];

            DAYS.forEach(
                (day) => {
                    cells.push({
                        id:
                            `${day}-${newPeriod.id}`,

                        day,

                        startTime:
                        start,

                        endTime:
                        end,

                        periodLabel:
                        label,

                        teacherId:
                            "",

                        teacherSubjectId:
                            null,

                        subject:
                            kind === "prep"
                                ? PREPS
                                : "",

                        room:
                            "",

                        status:
                            "active",

                        note:
                            "",
                    });
                }
            );

            setDraft(
                (current) => [
                    ...(current || []),
                    ...cells,
                ]
            );
        }
    }


    /* =====================================================
       REMOVE PERIOD
    ===================================================== */

    function removePeriod(
        periodId
    ) {
        if (!draftPeriods) {
            return;
        }

        const target =
            draftPeriods.find(
                (p) =>
                    String(p.id) ===
                    String(periodId)
            );

        if (!target) {
            return;
        }

        if (
            !window.confirm(
                `Remove "${target.label}" (${target.start} - ${target.end})?`
            )
        ) {
            return;
        }

        setDraftPeriods(
            draftPeriods.filter(
                (p) =>
                    String(p.id) !==
                    String(periodId)
            )
        );

        setDraft(
            (current) =>
                (current || []).filter(
                    (cell) =>
                        !(
                            cell.periodLabel ===
                            target.label &&
                            cell.startTime ===
                            target.start &&
                            cell.endTime ===
                            target.end
                        )
                )
        );
    }


    /* =====================================================
       UPDATE PERIOD
    ===================================================== */

    function updatePeriod(
        periodId,
        patch
    ) {
        if (!draftPeriods) {
            return;
        }

        const oldPeriod =
            draftPeriods.find(
                (p) =>
                    String(p.id) ===
                    String(periodId)
            );

        if (!oldPeriod) {
            return;
        }

        const updated =
            draftPeriods.map(
                (period) => {
                    if (
                        String(
                            period.id
                        ) !==
                        String(
                            periodId
                        )
                    ) {
                        return period;
                    }

                    return {
                        ...period,
                        ...patch,
                    };
                }
            );

        setDraftPeriods(
            updated
        );

        const updatedPeriod =
            updated.find(
                (p) =>
                    String(p.id) ===
                    String(periodId)
            );

        if (!updatedPeriod) {
            return;
        }

        /*
           Update all weekly cells that belonged
           to the old period.
        */

        setDraft(
            (current) =>
                (current || []).map(
                    (cell) => {
                        if (
                            cell.periodLabel !==
                            oldPeriod.label ||
                            cell.startTime !==
                            oldPeriod.start ||
                            cell.endTime !==
                            oldPeriod.end
                        ) {
                            return cell;
                        }

                        return {
                            ...cell,

                            startTime:
                            updatedPeriod.start,

                            endTime:
                            updatedPeriod.end,

                            periodLabel:
                            updatedPeriod.label,

                            subject:
                                updatedPeriod.kind ===
                                "prep"
                                    ? PREPS
                                    : cell.subject,
                        };
                    }
                )
        );
    }


    /* =====================================================
       UPDATE CELL
    ===================================================== */

    function updateCell(
        day,
        period,
        patch
    ) {
        if (!draft) {
            return;
        }

        setDraft(
            (current) => {
                const existingIndex =
                    current.findIndex(
                        (cell) =>
                            cell.day === day &&
                            cell.periodLabel ===
                            period.label &&
                            cell.startTime ===
                            period.start &&
                            cell.endTime ===
                            period.end
                    );

                const nextCell = {
                    id:
                        existingIndex >= 0
                            ? current[
                                existingIndex
                                ].id
                            : `${day}-${period.id}`,

                    day,

                    startTime:
                    period.start,

                    endTime:
                    period.end,

                    periodLabel:
                    period.label,

                    teacherId:
                        "",

                    teacherSubjectId:
                        null,

                    subject:
                        period.kind === "prep"
                            ? PREPS
                            : "",

                    room:
                        "",

                    status:
                        "active",

                    note:
                        "",

                    ...(existingIndex >= 0
                        ? current[
                            existingIndex
                            ]
                        : {}),

                    ...patch,
                };

                if (
                    existingIndex >= 0
                ) {
                    const next = [
                        ...current,
                    ];

                    next[
                        existingIndex
                        ] = nextCell;

                    return next;
                }

                return [
                    ...current,
                    nextCell,
                ];
            }
        );
    }


    /* =====================================================
       GET CELL
    ===================================================== */

    function getCell(
        source,
        day,
        period
    ) {
        return (
            source?.find(
                (cell) =>
                    cell.day === day &&
                    cell.periodLabel ===
                    period.label &&
                    cell.startTime ===
                    period.start &&
                    cell.endTime ===
                    period.end
            ) || null
        );
    }


    /* =====================================================
       TEACHER FILTER
    ===================================================== */

    function teachersFor(
        subject
    ) {
        if (!subject) {
            return teachers;
        }

        const wanted =
            String(subject)
                .trim()
                .toLowerCase();

        return teachers.filter(
            (teacher) => {
                const subjects =
                    Array.isArray(
                        teacher.subjects
                    )
                        ? teacher.subjects
                        : [];

                if (
                    subjects.length ===
                    0
                ) {
                    return true;
                }

                return subjects.some(
                    (item) => {
                        const name =
                            typeof item ===
                            "string"
                                ? item
                                : item?.name ||
                                item?.subject ||
                                item?.subject_name ||
                                "";

                        return (
                            String(
                                name
                            )
                                .trim()
                                .toLowerCase() ===
                            wanted
                        );
                    }
                );
            }
        );
    }


    /* =====================================================
       TEACHER NAME
    ===================================================== */

    function describe(
        teacherId
    ) {
        if (!teacherId) {
            return "Unallocated";
        }

        const teacher =
            teachers.find(
                (t) =>
                    String(t.id) ===
                    String(
                        teacherId
                    )
            );

        return (
            teacher?.name ||
            teacher?.teacher_name ||
            teacher?.full_name ||
            teacher?.firstName ||
            teacher?.first_name ||
            "Unknown teacher"
        );
    }


    /* =====================================================
       OPEN ALLOCATION
    ===================================================== */

    function openAllocation(
        day,
        period
    ) {
        const source =
            draft || timetable;

        const cell =
            getCell(
                source,
                day,
                period
            ) || {
                id:
                    `${day}-${period.id}`,

                day,

                startTime:
                period.start,

                endTime:
                period.end,

                periodLabel:
                period.label,

                teacherId:
                    "",

                teacherSubjectId:
                    null,

                subject:
                    period.kind === "prep"
                        ? PREPS
                        : "",

                room:
                    "",

                status:
                    "active",

                note:
                    "",
            };

        setAllocationCell({
            ...cell,
            periodKind:
            period.kind,
        });

        setAllocationOpen(
            true
        );
    }


    /* =====================================================
       OPEN NEW LESSON ALLOCATION FROM PERIOD TABLE
    ===================================================== */

    function openNewAllocation() {
        const availablePeriods =
            (draftPeriods || periods || []).filter(
                (period) =>
                    period.kind === "lesson" ||
                    period.kind === "prep"
            );

        if (availablePeriods.length === 0) {
            setErrorText("Add a lesson period first before creating an allocation.");
            return;
        }

        const period =
            availablePeriods.find((item) => item.kind === "lesson") ||
            availablePeriods[0];

        setAllocationCell({
            id: `${selectedDay}-${period.id}-new`,
            day: selectedDay || "Monday",
            startTime: period.start,
            endTime: period.end,
            periodLabel: period.label,
            teacherId: "",
            teacherSubjectId: null,
            subject: period.kind === "prep" ? PREPS : "",
            room: "",
            status: "active",
            note: "",
            periodKind: period.kind,
            isNewAllocation: true,
        });

        setAllocationOpen(true);
        setErrorText("");
    }


    /* =====================================================
       CLOSE ALLOCATION
    ===================================================== */

    function closeAllocation() {
        setAllocationOpen(false);
        setAllocationCell(null);
    }


    /* =====================================================
       SAVE ALLOCATION
    ===================================================== */

    function saveAllocation() {
        if (!allocationCell) {
            return;
        }

        const period =
            (
                draftPeriods ||
                periods
            ).find(
                (p) =>
                    p.label ===
                    allocationCell.periodLabel &&
                    p.start ===
                    allocationCell.startTime &&
                    p.end ===
                    allocationCell.endTime
            );

        if (!period) {
            closeAllocation();
            return;
        }

        updateCell(
            allocationCell.day,
            period,
            {
                teacherId:
                allocationCell.teacherId,

                subject:
                    allocationCell.periodKind ===
                    "prep"
                        ? PREPS
                        : allocationCell.subject,

                room:
                allocationCell.room,

                status:
                    allocationCell.status ||
                    "active",

                note:
                allocationCell.note,
            }
        );

        closeAllocation();
    }


    /* =====================================================
       COPY MONDAY
    ===================================================== */

    function copyMondayToWeek() {
        if (
            !draft ||
            !draftPeriods
        ) {
            return;
        }

        const mondayCells =
            draft.filter(
                (cell) =>
                    cell.day ===
                    "Monday"
            );

        setDraft(
            (current) => {
                let next = [
                    ...(current || []),
                ];

                DAYS.filter(
                    (day) =>
                        day !== "Monday"
                ).forEach(
                    (day) => {
                        mondayCells.forEach(
                            (mondayCell) => {
                                const existingIndex =
                                    next.findIndex(
                                        (cell) =>
                                            cell.day ===
                                            day &&
                                            cell.periodLabel ===
                                            mondayCell.periodLabel &&
                                            cell.startTime ===
                                            mondayCell.startTime &&
                                            cell.endTime ===
                                            mondayCell.endTime
                                    );

                                const copied = {
                                    ...mondayCell,

                                    id:
                                        `${day}-${mondayCell.periodLabel}`,

                                    day,
                                };

                                if (
                                    existingIndex >=
                                    0
                                ) {
                                    next[
                                        existingIndex
                                        ] = copied;
                                } else {
                                    next.push(
                                        copied
                                    );
                                }
                            }
                        );
                    }
                );

                return next;
            }
        );

        setSuccessText(
            "Monday timetable copied to the other days."
        );
    }


    /* =====================================================
       CLEAR ALL
    ===================================================== */

    function clearAll() {
        if (!draft) {
            return;
        }

        if (
            !window.confirm(
                "Clear all timetable allocations?"
            )
        ) {
            return;
        }

        setDraft(
            makeEmptyWeek(
                draftPeriods ||
                periods
            )
        );
    }


    /* =====================================================
       VALIDATE PERIODS
    ===================================================== */

    function validatePeriods() {
        const source =
            draftPeriods || [];

        for (
            const period of source
            ) {
            if (
                !period.start ||
                !period.end
            ) {
                return `Please enter start and end time for ${period.label}.`;
            }

            if (
                timeToMinutes(
                    period.end
                ) <=
                timeToMinutes(
                    period.start
                )
            ) {
                return `${period.label}: end time must be after start time.`;
            }
        }

        const sorted =
            [...source].sort(
                (a, b) =>
                    timeToMinutes(
                        a.start
                    ) -
                    timeToMinutes(
                        b.start
                    )
            );

        for (
            let i = 1;
            i < sorted.length;
            i++
        ) {
            const previous =
                sorted[i - 1];

            const current =
                sorted[i];

            if (
                timeToMinutes(
                    current.start
                ) <
                timeToMinutes(
                    previous.end
                )
            ) {
                return `Time overlap between "${previous.label}" and "${current.label}".`;
            }
        }

        return null;
    }


    /* =====================================================
       SAVE & ALLOCATE
    ===================================================== */

    async function handleAllocate() {
        if (!myClass.id) {
            setErrorText(
                "Your assigned class could not be found."
            );

            return;
        }

        if (
            !draft ||
            !draftPeriods
        ) {
            return;
        }

        const validation =
            validatePeriods();

        if (validation) {
            setErrorText(
                validation
            );

            return;
        }

        /*
           Only check lessons that actually have
           a subject entered.
        */

        const withoutTeacher =
            draft.filter(
                (cell) =>
                    cell.subject &&
                    cell.subject !== "" &&
                    cell.subject !==
                    PREPS &&
                    !cell.teacherId
            );

        if (
            withoutTeacher.length >
            0
        ) {
            setErrorText(
                "Please allocate a teacher to every lesson before saving."
            );

            return;
        }

        /*
           Prep also requires a teacher
           when it has been created.
        */

        const unallocatedPrep =
            draft.filter(
                (cell) =>
                    cell.subject ===
                    PREPS &&
                    !cell.teacherId
            );

        if (
            unallocatedPrep.length >
            0
        ) {
            setErrorText(
                "Please allocate a teacher to every prep period before saving."
            );

            return;
        }

        setSaving(true);
        setErrorText("");
        setSuccessText("");

        try {
            const payload = {
                /*
                   PERIOD DEFINITIONS
                */

                periods:
                    draftPeriods.map(
                        (p, index) => ({
                            label:
                            p.label,

                            start:
                            p.start,

                            end:
                            p.end,

                            kind:
                            p.kind,

                            position:
                                index + 1,
                        })
                    ),

                /*
                   WEEKLY ALLOCATIONS
                */

                entries:
                    draft
                        .filter(
                            (cell) =>
                                cell.subject ||
                                cell.teacherId ||
                                cell.note
                        )
                        .map(
                            (cell) => ({
                                day:
                                cell.day,

                                startTime:
                                cell.startTime,

                                endTime:
                                cell.endTime,

                                periodLabel:
                                cell.periodLabel,

                                teacherId:
                                    cell.teacherId
                                        ? Number(
                                            cell.teacherId
                                        )
                                        : null,

                                subject:
                                cell.subject,

                                room:
                                    cell.room ||
                                    "",

                                status:
                                    cell.status ||
                                    "active",

                                note:
                                    cell.note ||
                                    "",

                                kind:
                                    cell.subject ===
                                    PREPS
                                        ? "prep"
                                        : "lesson",
                            })
                        ),
            };

            console.log(
                "========================================"
            );

            console.log(
                "💾 SAVING CLASS TIMETABLE"
            );

            console.log(
                "💾 TEACHER CLASS ID:",
                myClass.id
            );

            console.log(
                "💾 PAYLOAD:",
                payload
            );

            console.log(
                "========================================"
            );

            const {
                response,
                data,
            } =
                await authFetch(
                    `${BASE}/class/${myClass.id}/save`,
                    {
                        method:
                            "PUT",

                        body:
                            JSON.stringify(
                                payload
                            ),
                    }
                );

            console.log(
                "💾 SAVE STATUS:",
                response.status
            );

            console.log(
                "💾 SAVE RESPONSE:",
                data
            );

            if (!response.ok) {
                throw new Error(
                    data?.message ||
                    data?.error ||
                    "Failed to save timetable."
                );
            }

            /*
               Build returned server data.
            */

            const built =
                buildFromServer(
                    data || {}
                );

            /*
               Keep the actual edited period
               structure in the UI.
            */

            const finalPeriods =
                draftPeriods.map(
                    (p, index) => ({
                        ...p,
                        position:
                            index + 1,
                    })
                );

            setPeriods(
                finalPeriods
            );

            /*
               If backend returned timetable
               entries, use them.

               Otherwise keep the user's
               current draft.
            */

            if (
                built.timetable.length >
                0
            ) {
                setTimetable(
                    built.timetable
                );

                setDraft(
                    clone(
                        built.timetable
                    )
                );
            } else {
                setTimetable(
                    clone(draft)
                );

                setDraft(
                    clone(draft)
                );
            }

            setDraftPeriods(
                clone(
                    finalPeriods
                )
            );

            setSuccessText(
                "Timetable saved and allocated successfully."
            );

            setView("week");

            setAllocationOpen(
                false
            );

            setAllocationCell(
                null
            );

        } catch (error) {
            console.error(
                "❌ SAVE TIMETABLE ERROR:",
                error
            );

            setErrorText(
                error?.message ||
                "Failed to save timetable."
            );
        } finally {
            setSaving(false);
        }
    }


    /* =====================================================
       VIEW DATA
    ===================================================== */

    const sourceLessons =
        draft || timetable;

    const sourcePeriods =
        draftPeriods || periods;

    const currentPeriods =
        [...sourcePeriods].sort(
            (a, b) =>
                timeToMinutes(
                    a.start
                ) -
                timeToMinutes(
                    b.start
                )
        );

    const creating =
        view === "create";


    /* =====================================================
       LOADING
    ===================================================== */

    if (
        classLoading ||
        status === "loading"
    ) {
        return (
            <Layout>
                <div className="class-timetable-page">
                    <div className="timetable-loading">

                        <FiRefreshCw
                            className="spin"
                        />

                        <h2>
                            Loading timetable...
                        </h2>

                        <p>
                            Finding your assigned
                            class and timetable.
                        </p>

                    </div>
                </div>
            </Layout>
        );
    }


    /* =====================================================
       ERROR
    ===================================================== */

    if (
        status === "error" &&
        !myClass.id
    ) {
        return (
            <Layout>
                <div className="class-timetable-page">

                    <div className="timetable-error">

                        <FiAlertCircle />

                        <h2>
                            Your assigned class
                            could not be found.
                        </h2>

                        <p>
                            {errorText}
                        </p>

                        <button
                            type="button"
                            className="primary-btn"
                            onClick={() =>
                                window.location.reload()
                            }
                        >
                            <FiRefreshCw />

                            Try Again
                        </button>

                        <div
                            style={{
                                marginTop: 20,
                                padding: 16,
                                background: "#f5f5f5",
                                borderRadius: 12,
                                textAlign: "left",
                            }}
                        >
                            <strong>
                                Developer debug
                            </strong>

                            <p>
                                Open F12 →
                                Console and
                                look for:
                            </p>

                            <code>
                                🔥 MY CLASS RESPONSE
                            </code>

                            <br />

                            <code>
                                🆔 EXTRACTED TEACHER CLASS ID
                            </code>
                        </div>

                    </div>

                </div>
            </Layout>
        );
    }


    /* =====================================================
       MAIN UI
    ===================================================== */

    return (
        <Layout>

            <div className="class-timetable-page">

                {/* =================================================
                    HEADER
                ================================================= */}

                <div className="timetable-header">

                    <div className="timetable-title">

                        <div className="title-icon">
                            <FiClock />
                        </div>

                        <div>
                            <h1>
                                Class Timetable
                            </h1>

                            <p>
                                {myClass.label}
                            </p>
                        </div>

                    </div>

                    <div className="timetable-actions">

                        {!creating && (
                            <button
                                type="button"
                                className="primary-btn"
                                onClick={
                                    startEditing
                                }
                            >
                                <FiEdit3 />

                                Edit Timetable
                            </button>
                        )}

                        {creating && (
                            <>
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={
                                        cancelEditing
                                    }
                                >
                                    <FiX />

                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className="primary-btn"
                                    onClick={
                                        handleAllocate
                                    }
                                    disabled={
                                        saving
                                    }
                                >
                                    {saving ? (
                                        <>
                                            <FiRefreshCw
                                                className="spin"
                                            />

                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <FiSave />

                                            Save & Allocate
                                        </>
                                    )}
                                </button>
                            </>
                        )}

                    </div>

                </div>


                {/* =================================================
                    ALERTS
                ================================================= */}

                {errorText && (
                    <div className="timetable-alert error">

                        <FiAlertCircle />

                        <span>
                            {errorText}
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                setErrorText("")
                            }
                        >
                            <FiX />
                        </button>

                    </div>
                )}

                {successText && (
                    <div className="timetable-alert success">

                        <FiCheck />

                        <span>
                            {successText}
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                setSuccessText("")
                            }
                        >
                            <FiX />
                        </button>

                    </div>
                )}


                {/* =================================================
                    TOOLBAR
                ================================================= */}

                <div className="timetable-toolbar">

                    <div className="view-switch">

                        <button
                            type="button"
                            className={
                                view === "week"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                setView("week")
                            }
                        >
                            Week
                        </button>

                        <button
                            type="button"
                            className={
                                view === "day"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                setView("day")
                            }
                        >
                            Day
                        </button>

                        {creating && (
                            <button
                                type="button"
                                className={
                                    view ===
                                    "create"
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setView(
                                        "create"
                                    )
                                }
                            >
                                Create
                            </button>
                        )}

                    </div>


                    {creating && (
                        <div className="editor-actions">

                            <button
                                type="button"
                                onClick={() =>
                                    addRow(
                                        "lesson"
                                    )
                                }
                            >
                                <FiPlus />

                                Lesson
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    addRow(
                                        "break"
                                    )
                                }
                            >
                                <FiCoffee />

                                Break
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    addRow(
                                        "morning"
                                    )
                                }
                            >
                                <FiSun />

                                Morning Prep
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    addRow(
                                        "night"
                                    )
                                }
                            >
                                <FiMoon />

                                Night Prep
                            </button>

                            <button
                                type="button"
                                onClick={
                                    copyMondayToWeek
                                }
                            >
                                <FiCopy />

                                Copy Monday
                            </button>

                            <button
                                type="button"
                                className="danger-outline"
                                onClick={
                                    clearAll
                                }
                            >
                                <FiTrash2 />

                                Clear
                            </button>

                        </div>
                    )}

                </div>


                {/* =================================================
                    DAY SELECTOR
                ================================================= */}

                {view === "day" && (
                    <div className="day-selector">

                        {DAYS.map(
                            (day) => (
                                <button
                                    type="button"
                                    key={day}
                                    className={
                                        selectedDay ===
                                        day
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() =>
                                        setSelectedDay(
                                            day
                                        )
                                    }
                                >
                                    <strong>
                                        {
                                            DAY_SHORT[
                                                day
                                                ]
                                        }
                                    </strong>

                                    <span>
                                        {weekDates[
                                            day
                                            ]?.toLocaleDateString(
                                            undefined,
                                            {
                                                day: "numeric",
                                                month: "short",
                                            }
                                        )}
                                    </span>
                                </button>
                            )
                        )}

                    </div>
                )}


                {/* =================================================
                    CREATE / EDITOR
                ================================================= */}

                {view === "create" && (
                    <div className="timetable-editor">

                        <div className="editor-heading">

                            <div>

                                <h2>
                                    Timetable Structure
                                </h2>

                                <p>
                                    Edit the real school
                                    time periods. Your
                                    school day starts at
                                    7:30 AM.
                                </p>

                            </div>

                            <div className="editor-count">
                                {sourcePeriods.length} periods
                            </div>

                        </div>


                        <div className="period-editor-list">

                            {currentPeriods.map(
                                (period) => (
                                    <EditorRow
                                        key={
                                            period.id
                                        }
                                        period={
                                            period
                                        }
                                        editing={
                                            editingPeriodId ===
                                            period.id
                                        }
                                        onEdit={() =>
                                            setEditingPeriodId(
                                                period.id
                                            )
                                        }
                                        onCancel={() =>
                                            setEditingPeriodId(
                                                null
                                            )
                                        }
                                        onChange={(
                                            patch
                                        ) =>
                                            updatePeriod(
                                                period.id,
                                                patch
                                            )
                                        }
                                        onDelete={() =>
                                            removePeriod(
                                                period.id
                                            )
                                        }
                                    />
                                )
                            )}

                        </div>

                        <div className="period-allocation-add">
                            <button
                                type="button"
                                className="period-add-allocation-btn"
                                onClick={openNewAllocation}
                            >
                                <FiPlus />
                                Add Lesson Allocation
                            </button>

                            <p>
                                Add a subject, teacher and room to any lesson period.
                            </p>
                        </div>

                    </div>
                )}


                {/* =================================================
                    WEEK VIEW
                ================================================= */}

                {view === "week" && (
                    <div className="timetable-grid">

                        <div className="week-grid-header">

                            <div className="period-column-header">
                                Period
                            </div>

                            {DAYS.map(
                                (day) => (
                                    <div
                                        key={day}
                                        className="day-column-header"
                                    >
                                        <strong>
                                            {
                                                DAY_SHORT[
                                                    day
                                                    ]
                                            }
                                        </strong>

                                        <span>
                                            {weekDates[
                                                day
                                                ]?.toLocaleDateString(
                                                undefined,
                                                {
                                                    day: "numeric",
                                                    month: "short",
                                                }
                                            )}
                                        </span>
                                    </div>
                                )
                            )}

                        </div>


                        {currentPeriods.map(
                            (period) => (
                                <React.Fragment
                                    key={
                                        period.id
                                    }
                                >

                                    <PeriodHead
                                        period={
                                            period
                                        }
                                        creating={
                                            creating
                                        }
                                    />

                                    {period.kind ===
                                    "break" ? (
                                        <BreakBar
                                            period={
                                                period
                                            }
                                            days={
                                                DAYS
                                            }
                                        />
                                    ) : (
                                        <WeekRow
                                            period={
                                                period
                                            }
                                            days={
                                                DAYS
                                            }
                                            source={
                                                sourceLessons
                                            }
                                            teachers={
                                                teachers
                                            }
                                            creating={
                                                creating
                                            }
                                            onAllocate={
                                                openAllocation
                                            }
                                        />
                                    )}

                                </React.Fragment>
                            )
                        )}

                    </div>
                )}


                {/* =================================================
                    DAY VIEW
                ================================================= */}

                {view === "day" && (
                    <div className="day-timetable">

                        <div className="day-view-title">

                            <div>

                                <h2>
                                    {selectedDay}
                                </h2>

                                <p>
                                    {weekDates[
                                        selectedDay
                                        ]?.toLocaleDateString(
                                        undefined,
                                        {
                                            weekday:
                                                "long",
                                            day:
                                                "numeric",
                                            month:
                                                "long",
                                            year:
                                                "numeric",
                                        }
                                    )}
                                </p>

                            </div>

                        </div>


                        <div className="day-period-list">

                            {currentPeriods.map(
                                (period) => {

                                    const cell =
                                        getCell(
                                            sourceLessons,
                                            selectedDay,
                                            period
                                        );

                                    if (
                                        period.kind ===
                                        "break"
                                    ) {
                                        return (
                                            <BreakBar
                                                key={
                                                    period.id
                                                }
                                                period={
                                                    period
                                                }
                                                days={[
                                                    selectedDay,
                                                ]}
                                            />
                                        );
                                    }

                                    return (
                                        <LessonCard
                                            key={
                                                period.id
                                            }
                                            day={
                                                selectedDay
                                            }
                                            period={
                                                period
                                            }
                                            cell={
                                                cell
                                            }
                                            teacher={
                                                describe(
                                                    cell?.teacherId
                                                )
                                            }
                                            creating={
                                                creating
                                            }
                                            onAllocate={() =>
                                                openAllocation(
                                                    selectedDay,
                                                    period
                                                )
                                            }
                                        />
                                    );
                                }
                            )}

                        </div>

                    </div>
                )}


                {/* =================================================
                    ALLOCATION DRAWER
                ================================================= */}

                {allocationOpen &&
                    allocationCell && (
                        <div className="allocation-overlay">

                            <div
                                className="allocation-backdrop"
                                onClick={
                                    closeAllocation
                                }
                            />

                            <aside className="allocation-panel">

                                <div className="allocation-header">

                                    <div>

                                        <span>
                                            Allocate
                                        </span>

                                        <h2>
                                            {
                                                allocationCell.periodLabel
                                            }
                                        </h2>

                                        <p>
                                            {
                                                allocationCell.day
                                            }

                                            {" · "}

                                            {
                                                allocationCell.startTime
                                            }

                                            {" - "}

                                            {
                                                allocationCell.endTime
                                            }
                                        </p>

                                    </div>

                                    <button
                                        type="button"
                                        onClick={
                                            closeAllocation
                                        }
                                    >
                                        <FiX />
                                    </button>

                                </div>


                                <div className="allocation-form">

                                    {allocationCell.isNewAllocation && (
                                        <>
                                            {/* DAY */}

                                            <label>
                                                <span>
                                                    <FiClock />
                                                    Day
                                                </span>

                                                <select
                                                    value={allocationCell.day || "Monday"}
                                                    onChange={(e) =>
                                                        setAllocationCell((current) => ({
                                                            ...current,
                                                            day: e.target.value,
                                                        }))
                                                    }
                                                >
                                                    {DAYS.map((day) => (
                                                        <option key={day} value={day}>
                                                            {day}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>

                                            {/* PERIOD */}

                                            <label>
                                                <span>
                                                    <FiClock />
                                                    Period
                                                </span>

                                                <select
                                                    value={`${allocationCell.periodLabel}|${allocationCell.startTime}|${allocationCell.endTime}`}
                                                    onChange={(e) => {
                                                        const selected = (draftPeriods || periods || []).find(
                                                            (item) =>
                                                                `${item.label}|${item.start}|${item.end}` === e.target.value
                                                        );

                                                        if (!selected) return;

                                                        setAllocationCell((current) => ({
                                                            ...current,
                                                            startTime: selected.start,
                                                            endTime: selected.end,
                                                            periodLabel: selected.label,
                                                            periodKind: selected.kind,
                                                            subject: selected.kind === "prep" ? PREPS : current.subject,
                                                        }));
                                                    }}
                                                >
                                                    {(draftPeriods || periods || [])
                                                        .filter(
                                                            (item) =>
                                                                item.kind === "lesson" ||
                                                                item.kind === "prep"
                                                        )
                                                        .map((item) => (
                                                            <option
                                                                key={item.id}
                                                                value={`${item.label}|${item.start}|${item.end}`}
                                                            >
                                                                {item.label} — {item.start} - {item.end}
                                                            </option>
                                                        ))}
                                                </select>
                                            </label>
                                        </>
                                    )}

                                    {/* SUBJECT */}

                                    <label>

                                        <span>
                                            <FiBookOpen />

                                            Subject
                                        </span>

                                        {allocationCell.periodKind ===
                                        "prep" ? (
                                            <input
                                                value={
                                                    PREPS
                                                }
                                                disabled
                                            />
                                        ) : (
                                            <input
                                                value={
                                                    allocationCell.subject ||
                                                    ""
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    setAllocationCell(
                                                        (
                                                            current
                                                        ) => ({
                                                            ...current,

                                                            subject:
                                                            e.target.value,

                                                            teacherId:
                                                                "",
                                                        })
                                                    )
                                                }
                                                placeholder="Enter subject"
                                            />
                                        )}

                                    </label>


                                    {/* TEACHER */}

                                    <label>

                                        <span>
                                            <FiUser />

                                            Teacher
                                        </span>

                                        <select
                                            value={
                                                allocationCell.teacherId ||
                                                ""
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setAllocationCell(
                                                    (
                                                        current
                                                    ) => ({
                                                        ...current,

                                                        teacherId:
                                                        e.target.value,
                                                    })
                                                )
                                            }
                                        >

                                            <option value="">
                                                Select teacher
                                            </option>

                                            {teachersFor(
                                                allocationCell.periodKind ===
                                                "prep"
                                                    ? ""
                                                    : allocationCell.subject
                                            ).map(
                                                (
                                                    teacher
                                                ) => (
                                                    <option
                                                        key={
                                                            teacher.id
                                                        }
                                                        value={
                                                            teacher.id
                                                        }
                                                    >
                                                        {teacher.name ||
                                                            teacher.teacher_name ||
                                                            teacher.full_name ||
                                                            teacher.firstName ||
                                                            teacher.first_name ||
                                                            `Teacher ${teacher.id}`}
                                                    </option>
                                                )
                                            )}

                                        </select>

                                    </label>


                                    {/* ROOM */}

                                    <label>

                                        <span>
                                            Room
                                        </span>

                                        <select
                                            value={
                                                allocationCell.room ||
                                                ""
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setAllocationCell(
                                                    (
                                                        current
                                                    ) => ({
                                                        ...current,

                                                        room:
                                                        e.target.value,
                                                    })
                                                )
                                            }
                                        >

                                            <option value="">
                                                Select room
                                            </option>

                                            {DEFAULT_ROOMS.map(
                                                (
                                                    room
                                                ) => (
                                                    <option
                                                        key={
                                                            room
                                                        }
                                                        value={
                                                            room
                                                        }
                                                    >
                                                        {
                                                            room
                                                        }
                                                    </option>
                                                )
                                            )}

                                        </select>

                                    </label>


                                    {/* NOTE */}

                                    <label>

                                        <span>
                                            Note
                                        </span>

                                        <textarea
                                            value={
                                                allocationCell.note ||
                                                ""
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setAllocationCell(
                                                    (
                                                        current
                                                    ) => ({
                                                        ...current,

                                                        note:
                                                        e.target.value,
                                                    })
                                                )
                                            }
                                            placeholder="Optional note"
                                            rows={4}
                                        />

                                    </label>

                                </div>


                                <div className="allocation-footer">

                                    <button
                                        type="button"
                                        className="secondary-btn"
                                        onClick={
                                            closeAllocation
                                        }
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        className="primary-btn"
                                        onClick={
                                            saveAllocation
                                        }
                                    >
                                        <FiCheck />

                                        Apply Allocation
                                    </button>

                                </div>

                            </aside>

                        </div>
                    )}

            </div>

        </Layout>
    );
}


/* =========================================================
   EDITOR ROW
========================================================= */

function EditorRow({
                       period,
                       editing,
                       onEdit,
                       onCancel,
                       onChange,
                       onDelete,
                   }) {
    const isBreak =
        period.kind === "break";

    const isPrep =
        period.kind === "prep";

    return (
        <div
            className={`editor-row ${
                isBreak
                    ? "is-break"
                    : ""
            } ${
                isPrep
                    ? "is-prep"
                    : ""
            }`}
        >

            <div className="editor-period-icon">

                {isPrep ? (
                    <FiMoon />
                ) : isBreak ? (
                    <FiCoffee />
                ) : (
                    <FiClock />
                )}

            </div>


            <div className="editor-period-name">

                <strong>
                    {period.label}
                </strong>

                <span>
                    {isPrep
                        ? "Prep"
                        : isBreak
                            ? "Break"
                            : "Lesson"}
                </span>

            </div>


            {editing ? (
                <>

                    <input
                        value={
                            period.label
                        }
                        onChange={(e) =>
                            onChange({
                                label:
                                e.target
                                    .value,
                            })
                        }
                        className="period-label-input"
                    />

                    <input
                        type="time"
                        value={
                            period.start
                        }
                        onChange={(e) =>
                            onChange({
                                start:
                                e.target
                                    .value,
                            })
                        }
                    />

                    <span className="time-arrow">
                        →
                    </span>

                    <input
                        type="time"
                        value={
                            period.end
                        }
                        onChange={(e) =>
                            onChange({
                                end:
                                e.target
                                    .value,
                            })
                        }
                    />

                    <button
                        type="button"
                        className="save-period-btn"
                        onClick={
                            onCancel
                        }
                    >
                        <FiCheck />
                    </button>

                </>
            ) : (
                <>

                    <div className="editor-time">

                        <FiClock />

                        <span>
                            {period.start}
                        </span>

                        <span>
                            →
                        </span>

                        <span>
                            {period.end}
                        </span>

                    </div>


                    <div className="editor-kind">

                        {isPrep
                            ? "PREP"
                            : isBreak
                                ? "BREAK"
                                : "LESSON"}

                    </div>


                    <button
                        type="button"
                        onClick={
                            onEdit
                        }
                        title="Edit time"
                    >
                        <FiEdit3 />
                    </button>

                </>
            )}


            <button
                type="button"
                className="delete-period-btn"
                onClick={
                    onDelete
                }
                title="Remove period"
            >
                <FiTrash2 />
            </button>

        </div>
    );
}


/* =========================================================
   PERIOD HEADER
========================================================= */

function PeriodHead({
                        period,
                        creating,
                    }) {
    return (
        <div className="period-head">

            <div className="period-head-left">

                <div className="period-badge">

                    {period.kind ===
                    "prep" ? (
                        <FiMoon />
                    ) : period.kind ===
                    "break" ? (
                        <FiCoffee />
                    ) : (
                        <FiClock />
                    )}

                </div>

                <div>

                    <strong>
                        {period.label}
                    </strong>

                    <span>
                        {period.start}
                        {" - "}
                        {period.end}
                    </span>

                </div>

            </div>


            {creating &&
                period.kind ===
                "lesson" && (
                    <span className="period-type">
                        Lesson
                    </span>
                )}

            {creating &&
                period.kind ===
                "prep" && (
                    <span className="period-type prep">
                        Prep
                    </span>
                )}

            {creating &&
                period.kind ===
                "break" && (
                    <span className="period-type break">
                        Break
                    </span>
                )}

        </div>
    );
}


/* =========================================================
   WEEK ROW
========================================================= */

function WeekRow({
                     period,
                     days,
                     source,
                     creating,
                     onAllocate,
                 }) {
    return (
        <div className="week-row">

            <div className="period-label-cell">

                <strong>
                    {period.label}
                </strong>

                <span>
                    {period.start}
                    {" - "}
                    {period.end}
                </span>

            </div>


            {days.map(
                (day) => {
                    const cell =
                        getCellStatic(
                            source,
                            day,
                            period
                        );

                    return (
                        <div
                            key={day}
                            className="lesson-cell"
                        >

                            {cell?.subject ? (
                                <LessonCard
                                    day={
                                        day
                                    }
                                    period={
                                        period
                                    }
                                    cell={
                                        cell
                                    }
                                    teacher={
                                        cell.teacherId
                                            ? "Allocated"
                                            : "Unallocated"
                                    }
                                    creating={
                                        creating
                                    }
                                    onAllocate={
                                        onAllocate
                                    }
                                />
                            ) : (
                                <FreeSlot
                                    day={
                                        day
                                    }
                                    period={
                                        period
                                    }
                                    creating={
                                        creating
                                    }
                                    onAllocate={
                                        onAllocate
                                    }
                                />
                            )}

                        </div>
                    );
                }
            )}

        </div>
    );
}


/* =========================================================
   STATIC CELL FINDER
========================================================= */

function getCellStatic(
    source,
    day,
    period
) {
    return (
        source?.find(
            (cell) =>
                cell.day === day &&
                cell.periodLabel ===
                period.label &&
                cell.startTime ===
                period.start &&
                cell.endTime ===
                period.end
        ) || null
    );
}


/* =========================================================
   LESSON CARD
========================================================= */

function LessonCard({
                        day,
                        period,
                        cell,
                        teacher,
                        creating,
                        onAllocate,
                    }) {
    const isPrep =
        period.kind === "prep" ||
        cell?.subject === PREPS;

    return (
        <button
            type="button"
            className={`lesson-card ${
                isPrep
                    ? "prep-card"
                    : ""
            }`}
            onClick={() =>
                creating &&
                onAllocate(
                    day,
                    period
                )
            }
        >

            <div className="lesson-card-top">

                <span className="lesson-subject">
                    {cell?.subject ||
                        "Free"}
                </span>

                {creating && (
                    <FiEdit3 />
                )}

            </div>


            {cell?.teacherId ? (
                <span className="lesson-teacher">

                    <FiUser />

                    {teacher ===
                    "Allocated"
                        ? "Teacher allocated"
                        : teacher}

                </span>
            ) : (
                <span className="lesson-unallocated">

                    <FiAlertCircle />

                    No teacher

                </span>
            )}


            {cell?.room && (
                <span className="lesson-room">
                    {cell.room}
                </span>
            )}

        </button>
    );
}


/* =========================================================
   FREE SLOT
========================================================= */

function FreeSlot({
                      day,
                      period,
                      creating,
                      onAllocate,
                  }) {
    return (
        <button
            type="button"
            className="free-slot"
            onClick={() =>
                creating &&
                onAllocate(
                    day,
                    period
                )
            }
        >

            <FiPlus />

            <span>
                {creating
                    ? "Allocate lesson"
                    : "Free"}
            </span>

        </button>
    );
}


/* =========================================================
   BREAK BAR
========================================================= */

function BreakBar({
                      period,
                      days,
                  }) {
    return (
        <div className="break-row">

            <div className="break-label">

                <FiCoffee />

                <strong>
                    {period.label}
                </strong>

                <span>
                    {period.start}
                    {" - "}
                    {period.end}
                </span>

            </div>


            {days.map(
                (day) => (
                    <div
                        key={day}
                        className="break-cell"
                    >
                        <span>
                            {period.label}
                        </span>
                    </div>
                )
            )}

        </div>
    );
}