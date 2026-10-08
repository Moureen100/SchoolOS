import React, { useEffect, useMemo, useRef, useState } from "react";

import {
    FiPlus,
    FiTrash2,
    FiSave,
    FiEdit3,
    FiCopy,
    FiX,
    FiCheck,
    FiUser,
    FiBookOpen,
    FiCoffee,
    FiMoon,
    FiAlertCircle,
    FiRefreshCw,
    FiMapPin,
} from "react-icons/fi";

import Layout from "../../Layout";
import "./ClassTimetable.css";


/* =========================================================
   API
   ========================================================= */

const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000";


/* =========================================================
   CLASS
   =========================================================

   IMPORTANT:
   The class is NOT used to determine which teachers the
   logged-in Class Teacher can access.

   The backend determines the Class Teacher's class from
   the logged-in teacher's authentication token.

   This label is currently only used for display.
   ========================================================= */

const CLASS_LABEL = "P.2";


/* =========================================================
   SUBJECTS
   ========================================================= */

const SEED_SUBJECTS = [
    ["Mathematics", 1],
    ["English", 2],
    ["Science", 3],
    ["Social Studies", 4],
    ["Religious Education", 5],
    ["Physical Education", 6],
];


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

const PREPS = "Preps";

const ROOMS = [
    "Classroom",
    "Science Lab",
    "Computer Lab",
    "Library",
    "Playground",
    "Assembly Ground",
    "Staff Room",
    "Other",
];

const KIND_LABEL = {
    lesson: "Lesson",
    break: "Break",
    prep: "Prep",
};


/* =========================================================
   PERIOD HELPER
   ========================================================= */

const mk = (
    id,
    label,
    start,
    end,
    kind,
    position
) => ({
    id,
    label,
    start,
    end,
    kind,
    position,
});


/* =========================================================
   DEFAULT PERIODS
   ========================================================= */

const DEFAULT_PERIODS = [
    mk("p1", "P1", "07:30", "08:10", "lesson", 1),
    mk("p2", "P2", "08:10", "08:50", "lesson", 2),
    mk("p3", "P3", "08:50", "09:30", "lesson", 3),

    mk(
        "break-1",
        "Break",
        "09:30",
        "10:00",
        "break",
        4
    ),

    mk("p4", "P4", "10:00", "10:40", "lesson", 5),
    mk("p5", "P5", "10:40", "11:20", "lesson", 6),
    mk("p6", "P6", "11:20", "12:00", "lesson", 7),

    mk(
        "lunch",
        "Lunch",
        "12:00",
        "13:00",
        "break",
        8
    ),

    mk("p7", "P7", "13:00", "13:40", "lesson", 9),
    mk("p8", "P8", "13:40", "14:20", "lesson", 10),
    mk("p9", "P9", "14:20", "15:00", "lesson", 11),

    mk(
        "tea-break",
        "Tea Break",
        "15:00",
        "15:30",
        "break",
        12
    ),

    mk("p10", "P10", "15:30", "16:10", "lesson", 13),
];


/* =========================================================
   HELPERS
   ========================================================= */

const clone = (v) =>
    JSON.parse(JSON.stringify(v));


const toMin = (v) => {
    if (!v || !v.includes(":")) {
        return 0;
    }

    const [h, m] = v
        .split(":")
        .map(Number);

    return h * 60 + m;
};


const fromMin = (m) => {
    const x = Math.max(
        0,
        Math.min(23 * 60 + 59, m)
    );

    return `${String(
        Math.floor(x / 60)
    ).padStart(2, "0")}:${String(
        x % 60
    ).padStart(2, "0")}`;
};


const sortPeriods = (list) =>
    [...list].sort(
        (a, b) =>
            toMin(a.start) - toMin(b.start)
    );


const sameSlot = (cell, p) =>
    cell.startTime === p.start &&
    cell.endTime === p.end;


const findCell = (cells, day, p) =>
    cells.find(
        (c) =>
            c.day === day &&
            sameSlot(c, p)
    ) || null;


const snapshot = (p, c) =>
    JSON.stringify({
        p,
        c,
    });


const toneOf = (subject) => {
    let h = 0;

    for (
        const ch of String(subject || "")
        ) {
        h =
            (h * 31 +
                ch.charCodeAt(0)) %
            8;
    }

    return h;
};


/* =========================================================
   BUILD WEEK DATES
   ========================================================= */

function buildWeekDates() {
    const today = new Date();

    const day = today.getDay();

    const monday = new Date(today);

    monday.setDate(
        today.getDate() +
        (day === 0
            ? -6
            : 1 - day)
    );

    return DAYS.reduce(
        (acc, name, i) => {
            const d = new Date(monday);

            d.setDate(
                monday.getDate() + i
            );

            acc[name] = d;

            return acc;
        },
        {}
    );
}


const fmtDate = (d) =>
    d?.toLocaleDateString(
        undefined,
        {
            day: "numeric",
            month: "short",
        }
    );


/* =========================================================
   DEMO CELLS

   We are keeping the timetable lesson data local for now.

   ONLY THE TEACHER DROPDOWN is connected to the backend.
   ========================================================= */

function seedCells(periods) {
    const cells = [];

    DAYS.forEach((day, d) => {
        periods
            .filter(
                (p) => p.kind === "lesson"
            )
            .slice(0, 8)
            .forEach((p, i) => {
                const [
                    subject,
                    teacher,
                ] =
                    SEED_SUBJECTS[
                    (i + d) %
                    SEED_SUBJECTS.length
                        ];

                cells.push({
                    id: `${day}-${p.id}`,
                    day,
                    startTime: p.start,
                    endTime: p.end,
                    periodLabel: p.label,
                    teacherId: String(
                        teacher
                    ),
                    subject,
                    room: "Classroom",
                    status: "active",
                    note: "",
                });
            });
    });

    return cells;
}


/* =========================================================
   MAIN PAGE
   ========================================================= */

export default function Classtimetable() {

    const rootRef = useRef(null);

    const [cssMissing, setCssMissing] =
        useState(false);


    /* =====================================================
       GENERAL MESSAGES
       ===================================================== */

    const [errorText, setErrorText] =
        useState("");

    const [successText, setSuccessText] =
        useState("");


    /* =====================================================
       TIMETABLE STATE
       ===================================================== */

    const [periods, setPeriods] =
        useState(() =>
            clone(DEFAULT_PERIODS)
        );

    const [cells, setCells] =
        useState(() =>
            seedCells(DEFAULT_PERIODS)
        );

    const [saved, setSaved] =
        useState(() =>
            snapshot(
                clone(DEFAULT_PERIODS),
                seedCells(DEFAULT_PERIODS)
            )
        );


    /* =====================================================
       TEACHERS FROM BACKEND
       ===================================================== */

    const [teachers, setTeachers] =
        useState([]);

    const [teachersLoading, setTeachersLoading] =
        useState(false);

    const [teachersError, setTeachersError] =
        useState("");


    /* =====================================================
       PAGE STATE
       ===================================================== */

    const [view, setView] =
        useState("week");

    const [selectedDay, setSelectedDay] =
        useState("Monday");

    const [lessonModal, setLessonModal] =
        useState(null);

    const [periodModal, setPeriodModal] =
        useState(null);

    const [saving, setSaving] =
        useState(false);


    /* =====================================================
       WEEK
       ===================================================== */

    const weekDates = useMemo(
        () => buildWeekDates(),
        []
    );


    const dirty =
        snapshot(periods, cells) !== saved;

    const sorted =
        sortPeriods(periods);


    /* =====================================================
       LOAD TEACHERS
       =====================================================

       GET:
       /api/class-timetable/teachers

       The backend uses the logged-in teacher token to
       determine the Class Teacher's class.

       We do NOT send ?class=P.2.

       We do NOT send ?teacher=...

       The backend decides the allowed class.
       ===================================================== */
    /* =====================================================
       LOAD TEACHERS
       =====================================================
       GET:
       /api/class-timetable/teachers

       The backend uses the logged-in Class Teacher token
       to determine which class and stream they belong to.

       IMPORTANT:
       The SchoolOS Class Teacher login stores the JWT
       under localStorage key "token".
       ===================================================== */

    useEffect(() => {
        const loadTeachers = async () => {
            setTeachersLoading(true);
            setTeachersError("");

            try {
                // =================================================
                // GET THE SAME TOKEN USED BY THE CLASS TEACHER
                // =================================================
                const token = localStorage.getItem("token");

                if (!token) {
                    throw new Error(
                        "Your session has expired. Please log in again."
                    );
                }

                // =================================================
                // GET TEACHERS ASSIGNED TO THE LOGGED-IN
                // CLASS TEACHER'S CLASS
                // =================================================
                const response = await fetch(
                    `${API_URL}/api/class-timetable/teachers`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: "application/json",
                        },
                    }
                );

                let data = null;

                try {
                    data = await response.json();
                } catch {
                    data = null;
                }

                // =================================================
                // HANDLE BACKEND ERRORS
                // =================================================
                if (!response.ok) {
                    throw new Error(
                        data?.message ||
                        "Failed to load teachers."
                    );
                }

                // =================================================
                // CHECK RESPONSE FORMAT
                // =================================================
                if (
                    !data ||
                    !Array.isArray(data.teachers)
                ) {
                    throw new Error(
                        "The server returned an invalid teachers response."
                    );
                }

                // =================================================
                // SAVE TEACHERS
                // =================================================
                setTeachers(data.teachers);

                console.log(
                    "Teachers loaded for timetable:",
                    data.teachers
                );

                console.log(
                    "Class returned by backend:",
                    data.class
                );
            } catch (error) {
                console.error(
                    "GET /api/class-timetable/teachers failed:",
                    error
                );

                setTeachersError(
                    error.message ||
                    "Failed to load teachers."
                );
            } finally {
                setTeachersLoading(false);
            }
        };

        loadTeachers();
    }, []);

    /* =====================================================
       WARN IF CSS DID NOT LOAD
       ===================================================== */

    useEffect(() => {

        const v =
            rootRef.current &&
            getComputedStyle(
                rootRef.current
            )
                .getPropertyValue(
                    "--sctt-navy"
                )
                .trim();

        setCssMissing(!v);

    }, []);


    /* =====================================================
       TEACHER HELPERS
       ===================================================== */

    const teacherName = (id) => {

        const teacher =
            teachers.find(
                (t) =>
                    String(t.id) ===
                    String(id)
            );

        if (!teacher) {
            return "Unknown teacher";
        }

        return (
            teacher.firstName ||
            teacher.name ||
            "Unknown teacher"
        );
    };


    /* =====================================================
       ALL TEACHERS

       IMPORTANT:

       We intentionally do NOT filter teachers by subject.

       The backend has already returned only teachers
       belonging to the logged-in Class Teacher's class.

       Therefore the dropdown shows ALL teachers assigned
       to that class.
       ===================================================== */

    const teachersFor = () => {
        return teachers;
    };


    /* =====================================================
       PERIODS: ADD / EDIT / DELETE
       ===================================================== */

    const openAddPeriod = (
        after,
        kind = "lesson"
    ) => {

        const start =
            after
                ? after.end
                : sorted.length
                    ? sorted[
                    sorted.length - 1
                        ].end
                    : "07:30";

        const length =
            kind === "break"
                ? 20
                : kind === "prep"
                    ? 60
                    : 40;

        const lessonCount =
            sorted.filter(
                (p) =>
                    p.kind === "lesson"
            ).length;

        const label =
            kind === "break"
                ? "Break"
                : kind === "prep"
                    ? "Prep"
                    : `P${
                        lessonCount + 1
                    }`;


        setPeriodModal({
            mode: "add",
            error: "",

            period: {
                id: `new-${Date.now()}`,
                label,
                start,
                end: fromMin(
                    toMin(start) + length
                ),
                kind,
            },
        });
    };


    const openEditPeriod = (p) => {

        setPeriodModal({
            mode: "edit",
            error: "",
            original: p,
            period: {
                ...p,
            },
        });

    };


    const commitPeriod = () => {

        const {
            mode,
            original,
            period,
        } = periodModal;


        const fail = (error) => {

            setPeriodModal(
                (m) => ({
                    ...m,
                    error,
                })
            );

        };


        if (
            !period.label.trim()
        ) {
            return fail(
                "Enter a name for this period."
            );
        }


        if (
            !period.start ||
            !period.end
        ) {
            return fail(
                "Enter a start and end time."
            );
        }


        if (
            toMin(period.end) <=
            toMin(period.start)
        ) {
            return fail(
                "End time must be after the start time."
            );
        }


        const clash =
            periods
                .filter(
                    (p) =>
                        p.id !==
                        period.id
                )
                .find(
                    (p) =>
                        toMin(
                            period.start
                        ) <
                        toMin(
                            p.end
                        ) &&
                        toMin(
                            period.end
                        ) >
                        toMin(
                            p.start
                        )
                );


        if (clash) {

            return fail(
                `This overlaps "${clash.label}" (${clash.start} - ${clash.end}).`
            );

        }


        const clean = {
            ...period,
            label:
                period.label.trim(),
        };


        if (
            mode === "edit"
        ) {

            setCells((cs) =>
                cs

                    .filter(
                        (c) =>
                            !(
                                clean.kind ===
                                "break" &&
                                sameSlot(
                                    c,
                                    original
                                )
                            )
                    )

                    .map((c) =>
                        sameSlot(
                            c,
                            original
                        )
                            ? {
                                ...c,

                                startTime:
                                clean.start,

                                endTime:
                                clean.end,

                                periodLabel:
                                clean.label,

                                subject:
                                    clean.kind ===
                                    "prep"
                                        ? PREPS
                                        : c.subject,
                            }
                            : c
                    )
            );

        }


        setPeriods((ps) => {

            const list =
                mode === "add"
                    ? [
                        ...ps,
                        clean,
                    ]
                    : ps.map(
                        (p) =>
                            p.id ===
                            clean.id
                                ? clean
                                : p
                    );

            return sortPeriods(
                list
            ).map(
                (p, i) => ({
                    ...p,
                    position:
                        i + 1,
                })
            );

        });


        setPeriodModal(null);

    };


    const deletePeriod = (p) => {

        if (
            !window.confirm(
                `Delete "${p.label}" (${p.start} - ${p.end}) and all lessons in it?`
            )
        ) {
            return;
        }


        setPeriods(
            (ps) =>
                ps.filter(
                    (x) =>
                        x.id !== p.id
                )
        );


        setCells(
            (cs) =>
                cs.filter(
                    (c) =>
                        !sameSlot(
                            c,
                            p
                        )
                )
        );


        setPeriodModal(null);

    };


    /* =====================================================
       LESSONS
       ===================================================== */

    const openLesson = (
        day,
        p
    ) => {

        const cell =
            findCell(
                cells,
                day,
                p
            );


        setLessonModal({

            day,

            period: p,

            exists: !!cell,

            subject:
                cell?.subject ||
                (p.kind === "prep"
                    ? PREPS
                    : ""),

            teacherId:
                cell?.teacherId ||
                "",

            room:
                cell?.room ||
                "",

            note:
                cell?.note ||
                "",

            applyAll: false,

            error: "",
        });

    };


    const saveLesson = () => {

        const m =
            lessonModal;


        const subject =
            m.period.kind ===
            "prep"
                ? PREPS
                : m.subject.trim();


        if (!subject) {

            return setLessonModal(
                {
                    ...m,
                    error:
                        "Enter a subject for this lesson.",
                }
            );

        }


        /* -------------------------------------------------
           A normal lesson must have a teacher.
           ------------------------------------------------- */

        if (
            m.period.kind !==
            "prep" &&
            !m.teacherId
        ) {

            return setLessonModal(
                {
                    ...m,
                    error:
                        "Select a teacher for this lesson.",
                }
            );

        }


        const p =
            m.period;


        const targetDays =
            m.applyAll
                ? DAYS
                : [m.day];


        setCells((cs) => {

            const next = [
                ...cs,
            ];


            targetDays.forEach(
                (day) => {

                    const idx =
                        next.findIndex(
                            (c) =>
                                c.day ===
                                day &&
                                sameSlot(
                                    c,
                                    p
                                )
                        );


                    const cell = {

                        ...(idx >= 0
                            ? next[idx]
                            : {
                                id: `${day}-${p.id}`,
                                status:
                                    "active",
                            }),

                        day,

                        startTime:
                        p.start,

                        endTime:
                        p.end,

                        periodLabel:
                        p.label,

                        subject,

                        teacherId:
                        m.teacherId,

                        room:
                        m.room,

                        note:
                        m.note,
                    };


                    if (idx >= 0) {

                        next[idx] =
                            cell;

                    } else {

                        next.push(
                            cell
                        );

                    }

                }
            );


            return next;

        });


        setLessonModal(null);

    };


    const removeLesson = () => {

        const {
            day,
            period,
        } = lessonModal;


        setCells(
            (cs) =>
                cs.filter(
                    (c) =>
                        !(
                            c.day ===
                            day &&
                            sameSlot(
                                c,
                                period
                            )
                        )
                )
        );


        setLessonModal(null);

    };


    /* =====================================================
       COPY MONDAY
       ===================================================== */

    const copyMonday = () => {

        setCells((cs) => {

            const monday =
                cs.filter(
                    (c) =>
                        c.day ===
                        "Monday"
                );


            const next = [
                ...monday,
            ];


            DAYS.slice(1).forEach(
                (day) =>
                    monday.forEach(
                        (m) =>
                            next.push(
                                {
                                    ...m,

                                    id: `${day}-${m.startTime}`,

                                    day,
                                }
                            )
                    )
            );


            return next;

        });


        setSuccessText(
            "Monday copied to the other days."
        );

    };


    /* =====================================================
       CLEAR ALL
       ===================================================== */

    const clearAll = () => {

        if (
            !window.confirm(
                "Clear every lesson in the timetable?"
            )
        ) {
            return;
        }


        setCells([]);

    };


    /* =====================================================
       DISCARD
       ===================================================== */

    const discard = () => {

        const s =
            JSON.parse(
                saved
            );


        setPeriods(s.p);

        setCells(s.c);

        setErrorText("");

    };


    /* =====================================================
       SAVE
       =====================================================

       Still demo only for now.

       We have NOT connected timetable POST yet because
       we are first completing the teacher GET.
       ===================================================== */

    const handleSave = () => {

        if (
            cells.some(
                (c) =>
                    c.subject &&
                    !c.teacherId
            )
        ) {

            setErrorText(
                "Choose a teacher for every lesson before saving. Lessons marked “No teacher” need one."
            );

            return;
        }


        setSaving(true);

        setErrorText("");

        setSuccessText("");


        setTimeout(() => {

            setSaved(
                snapshot(
                    periods,
                    cells
                )
            );

            setSaving(false);

            setSuccessText(
                "Timetable saved (demo only, nothing is sent to a server)."
            );

        }, 500);

    };


    /* =====================================================
       COUNTS
       ===================================================== */

    const lessonCount =
        cells.filter(
            (c) =>
                c.subject
        ).length;


    const noTeacher =
        cells.filter(
            (c) =>
                c.subject &&
                !c.teacherId
        ).length;


    const lessonPeriodCount =
        periods.filter(
            (p) =>
                p.kind !==
                "break"
        ).length;


    /* =====================================================
       RENDER
       ===================================================== */

    return (

        <Layout>

            <div
                className="sctt-page"
                ref={rootRef}
            >

                {/* =================================================
                    CSS WARNING
                    ================================================= */}

                {cssMissing && (

                    <div
                        style={{
                            padding: 16,
                            margin:
                                "0 0 16px",
                            background:
                                "#fff3cd",
                            border:
                                "1px solid #e0b100",
                            borderRadius:
                                12,
                            color:
                                "#5c4400",
                            fontFamily:
                                "sans-serif",
                            fontSize: 14,
                        }}
                    >

                        <strong>
                            Stylesheet not
                            loaded.
                        </strong>{" "}

                        Make sure{" "}

                        <code>
                            ClassTimetable.css
                        </code>{" "}

                        is in the same
                        folder as this
                        file, then restart{" "}

                        <code>
                            npm run dev
                        </code>.

                    </div>

                )}


                {/* =================================================
                    HEADER
                    ================================================= */}

                <header className="sctt-header">

                    <div className="sctt-header-text">

                        <h1 className="sctt-title">
                            Class Timetable
                        </h1>

                        <p className="sctt-sub">

                            {CLASS_LABEL}:
                            {" "}
                            {lessonCount}
                            {" "}
                            lessons in
                            {" "}
                            {lessonPeriodCount}
                            {" "}
                            periods

                            {noTeacher >
                                0 && (

                                    <span className="sctt-warn-pill">

                                    {noTeacher}
                                        {" "}
                                        need a
                                    teacher

                                </span>

                                )}

                        </p>

                    </div>


                    <div className="sctt-header-actions">

                        <button
                            type="button"
                            className="sctt-btn-primary"
                            onClick={() =>
                                openAddPeriod(
                                    sorted[
                                    sorted.length -
                                    1
                                        ],
                                    "lesson"
                                )
                            }
                        >

                            <FiPlus />

                            Add period

                        </button>


                        <button
                            type="button"
                            className="sctt-btn-dark"
                            onClick={() =>
                                openAddPeriod(
                                    sorted[
                                    sorted.length -
                                    1
                                        ],
                                    "break"
                                )
                            }
                        >

                            <FiCoffee />

                            Add break

                        </button>

                    </div>

                </header>


                {/* =================================================
                    ERROR MESSAGE
                    ================================================= */}

                {errorText && (

                    <div className="sctt-message sctt-message--error">

                        <span>
                            {errorText}
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                setErrorText("")
                            }
                            aria-label="Dismiss"
                        >
                            <FiX />
                        </button>

                    </div>

                )}


                {/* =================================================
                    SUCCESS MESSAGE
                    ================================================= */}

                {successText && (

                    <div className="sctt-message sctt-message--success">

                        <span>
                            {successText}
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                setSuccessText("")
                            }
                            aria-label="Dismiss"
                        >
                            <FiX />
                        </button>

                    </div>

                )}


                {/* =================================================
                    TEACHER LOADING / ERROR
                    ================================================= */}

                {teachersLoading && (

                    <div className="sctt-message">

                        <span>
                            <FiRefreshCw className="sctt-spin" />
                            {" "}
                            Loading teachers for
                            your class...
                        </span>

                    </div>

                )}


                {teachersError && (

                    <div className="sctt-message sctt-message--error">

                        <span>
                            <FiAlertCircle />
                            {" "}
                            {teachersError}
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                window.location.reload()
                            }
                            aria-label="Reload"
                        >
                            <FiRefreshCw />
                        </button>

                    </div>

                )}


                {/* =================================================
                    TOOLBAR
                    ================================================= */}

                <section className="sctt-toolbar">

                    <div className="sctt-switch">

                        <button
                            type="button"
                            className={
                                view ===
                                "week"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                setView(
                                    "week"
                                )
                            }
                        >
                            Week
                        </button>


                        <button
                            type="button"
                            className={
                                view ===
                                "day"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                setView(
                                    "day"
                                )
                            }
                        >
                            Day
                        </button>

                    </div>


                    {view === "day" && (

                        <div className="sctt-days">

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

                                        {
                                            DAY_SHORT[
                                                day
                                                ]
                                        }

                                    </button>

                                )
                            )}

                        </div>

                    )}


                    <p className="sctt-hint">

                        Tap an empty
                        slot to add a
                        lesson. Tap a
                        lesson to change
                        it.

                    </p>


                    <div className="sctt-tools">

                        <button
                            type="button"
                            className="sctt-tool"
                            onClick={
                                copyMonday
                            }
                        >

                            <FiCopy />

                            Copy Monday

                        </button>


                        <button
                            type="button"
                            className="sctt-tool danger"
                            onClick={
                                clearAll
                            }
                        >

                            <FiTrash2 />

                            Clear

                        </button>

                    </div>

                </section>


                {/* =================================================
                    GRID
                    ================================================= */}

                <Grid
                    days={
                        view === "day"
                            ? [
                                selectedDay,
                            ]
                            : DAYS
                    }
                    weekDates={
                        weekDates
                    }
                    periods={
                        sorted
                    }
                    cells={
                        cells
                    }
                    teacherName={
                        teacherName
                    }
                    onCell={
                        openLesson
                    }
                    onEditPeriod={
                        openEditPeriod
                    }
                    onDeletePeriod={
                        deletePeriod
                    }
                    onInsert={(p) =>
                        openAddPeriod(
                            p,
                            "lesson"
                        )
                    }
                />


                {/* =================================================
                    SAVE BAR
                    ================================================= */}

                {dirty && (

                    <div className="sctt-savebar">

                        <span>

                            <FiAlertCircle />

                            You have
                            unsaved changes

                        </span>


                        <div>

                            <button
                                type="button"
                                className="sctt-btn-text"
                                onClick={
                                    discard
                                }
                                disabled={
                                    saving
                                }
                            >
                                Discard
                            </button>


                            <button
                                type="button"
                                className="sctt-btn-primary"
                                onClick={
                                    handleSave
                                }
                                disabled={
                                    saving
                                }
                            >

                                {saving ? (

                                    <>
                                        <FiRefreshCw className="sctt-spin" />

                                        Saving...
                                    </>

                                ) : (

                                    <>
                                        <FiSave />

                                        Save timetable
                                    </>

                                )}

                            </button>

                        </div>

                    </div>

                )}


                {/* =================================================
                    LESSON MODAL
                    ================================================= */}

                {lessonModal && (

                    <Modal
                        title={
                            lessonModal.exists
                                ? "Edit lesson"
                                : "Add lesson"
                        }
                        subtitle={
                            `${lessonModal.day}, ` +
                            `${lessonModal.period.label}, ` +
                            `${lessonModal.period.start} - ` +
                            `${lessonModal.period.end}`
                        }
                        onClose={() =>
                            setLessonModal(
                                null
                            )
                        }
                        footer={

                            <>

                                {lessonModal.exists ? (

                                    <button
                                        type="button"
                                        className="sctt-danger-link"
                                        onClick={
                                            removeLesson
                                        }
                                    >

                                        <FiTrash2 />

                                        Remove

                                    </button>

                                ) : (

                                    <span />

                                )}


                                <div className="sctt-footer-right">

                                    <button
                                        type="button"
                                        className="sctt-btn-text"
                                        onClick={() =>
                                            setLessonModal(
                                                null
                                            )
                                        }
                                    >
                                        Cancel
                                    </button>


                                    <button
                                        type="button"
                                        className="sctt-btn-primary"
                                        onClick={
                                            saveLesson
                                        }
                                    >

                                        <FiCheck />

                                        {lessonModal.exists
                                            ? "Update lesson"
                                            : "Add lesson"}

                                    </button>

                                </div>

                            </>

                        }
                    >

                        {/* =================================================
                            SUBJECT
                            ================================================= */}

                        <label className="sctt-field">

                            <span className="sctt-field-label">

                                <FiBookOpen />

                                Subject

                            </span>


                            {lessonModal.period.kind ===
                            "prep" ? (

                                <input
                                    value={
                                        PREPS
                                    }
                                    disabled
                                />

                            ) : (

                                <input
                                    autoFocus
                                    value={
                                        lessonModal.subject
                                    }
                                    placeholder="e.g. Mathematics"
                                    onChange={(e) =>
                                        setLessonModal(
                                            {
                                                ...lessonModal,

                                                subject:
                                                e
                                                    .target
                                                    .value,

                                                /*
                                                 * Reset the
                                                 * teacher when
                                                 * subject text
                                                 * changes.
                                                 */
                                                teacherId:
                                                    "",

                                                error:
                                                    "",
                                            }
                                        )
                                    }
                                />

                            )}

                        </label>


                        {/* =================================================
                            TEACHER DROPDOWN
                            ================================================= */}

                        <label className="sctt-field">

                            <span className="sctt-field-label">

                                <FiUser />

                                Teacher

                            </span>


                            <select
                                value={
                                    lessonModal.teacherId
                                }
                                onChange={(e) =>
                                    setLessonModal(
                                        {
                                            ...lessonModal,

                                            teacherId:
                                            e
                                                .target
                                                .value,

                                            error:
                                                "",
                                        }
                                    )
                                }
                                disabled={
                                    teachersLoading ||
                                    teachers.length ===
                                    0
                                }
                            >

                                <option value="">

                                    {teachersLoading
                                        ? "Loading teachers..."
                                        : teachers.length ===
                                        0
                                            ? "No teachers available"
                                            : "Select teacher"}

                                </option>


                                {teachersFor(
                                    lessonModal.subject
                                ).map(
                                    (t) => (

                                        <option
                                            key={
                                                t.id
                                            }
                                            value={
                                                t.id
                                            }
                                        >

                                            {
                                                t.firstName ||
                                                t.name ||
                                                "Unnamed teacher"
                                            }

                                            {t.employeeId
                                                ? ` — ${t.employeeId}`
                                                : ""}

                                        </option>

                                    )
                                )}

                            </select>


                            {!teachersLoading &&
                                !teachersError &&
                                teachers.length ===
                                0 && (

                                    <small
                                        style={{
                                            color:
                                                "#b42318",
                                            marginTop:
                                                6,
                                            display:
                                                "block",
                                        }}
                                    >

                                        No active
                                        teachers
                                        are assigned
                                        to this
                                        class.

                                    </small>

                                )}

                        </label>


                        {/* =================================================
                            ROOM
                            ================================================= */}

                        <label className="sctt-field">

                            <span className="sctt-field-label">

                                <FiMapPin />

                                Room

                            </span>


                            <select
                                value={
                                    lessonModal.room
                                }
                                onChange={(e) =>
                                    setLessonModal(
                                        {
                                            ...lessonModal,

                                            room:
                                            e
                                                .target
                                                .value,
                                        }
                                    )
                                }
                            >

                                <option value="">
                                    Select room
                                </option>


                                {ROOMS.map(
                                    (r) => (

                                        <option
                                            key={r}
                                            value={r}
                                        >
                                            {r}
                                        </option>

                                    )
                                )}

                            </select>

                        </label>


                        {/* =================================================
                            NOTE
                            ================================================= */}

                        <label className="sctt-field">

                            <span className="sctt-field-label">

                                Note{" "}

                                <em className="sctt-optional">
                                    (optional)
                                </em>

                            </span>


                            <textarea
                                rows={3}
                                value={
                                    lessonModal.note
                                }
                                onChange={(e) =>
                                    setLessonModal(
                                        {
                                            ...lessonModal,

                                            note:
                                            e
                                                .target
                                                .value,
                                        }
                                    )
                                }
                            />

                        </label>


                        {/* =================================================
                            APPLY ALL DAYS
                            ================================================= */}

                        <label className="sctt-check">

                            <input
                                type="checkbox"
                                checked={
                                    lessonModal.applyAll
                                }
                                onChange={(e) =>
                                    setLessonModal(
                                        {
                                            ...lessonModal,

                                            applyAll:
                                            e
                                                .target
                                                .checked,
                                        }
                                    )
                                }
                            />


                            <span>

                                Use for{" "}

                                {
                                    lessonModal
                                        .period
                                        .label
                                }

                                {" "}
                                on every
                                weekday

                            </span>

                        </label>


                        {/* =================================================
                            LESSON ERROR
                            ================================================= */}

                        {lessonModal.error && (

                            <p className="sctt-error">

                                <FiAlertCircle />

                                {" "}

                                {
                                    lessonModal.error
                                }

                            </p>

                        )}

                    </Modal>

                )}


                {/* =================================================
                    PERIOD MODAL
                    ================================================= */}

                {periodModal && (

                    <Modal
                        title={
                            periodModal.mode ===
                            "add"
                                ? "Add period"
                                : "Edit period"
                        }
                        subtitle="Set the name, type and time."
                        onClose={() =>
                            setPeriodModal(
                                null
                            )
                        }
                        footer={

                            <>

                                {periodModal.mode ===
                                "edit" ? (

                                    <button
                                        type="button"
                                        className="sctt-danger-link"
                                        onClick={() =>
                                            deletePeriod(
                                                periodModal.original
                                            )
                                        }
                                    >

                                        <FiTrash2 />

                                        Delete

                                    </button>

                                ) : (

                                    <span />

                                )}


                                <div className="sctt-footer-right">

                                    <button
                                        type="button"
                                        className="sctt-btn-text"
                                        onClick={() =>
                                            setPeriodModal(
                                                null
                                            )
                                        }
                                    >
                                        Cancel
                                    </button>


                                    <button
                                        type="button"
                                        className="sctt-btn-primary"
                                        onClick={
                                            commitPeriod
                                        }
                                    >

                                        <FiCheck />

                                        {periodModal.mode ===
                                        "add"
                                            ? "Add period"
                                            : "Save period"}

                                    </button>

                                </div>

                            </>

                        }
                    >

                        {/* =================================================
                            PERIOD NAME
                            ================================================= */}

                        <label className="sctt-field">

                            <span className="sctt-field-label">
                                Name
                            </span>


                            <input
                                value={
                                    periodModal
                                        .period
                                        .label
                                }
                                onChange={(e) =>
                                    setPeriodModal(
                                        {
                                            ...periodModal,

                                            error:
                                                "",

                                            period:
                                                {
                                                    ...periodModal.period,

                                                    label:
                                                    e
                                                        .target
                                                        .value,
                                                },
                                        }
                                    )
                                }
                            />

                        </label>


                        {/* =================================================
                            PERIOD KIND
                            ================================================= */}

                        <div className="sctt-kinds">

                            {Object.keys(
                                KIND_LABEL
                            ).map(
                                (k) => (

                                    <button
                                        type="button"
                                        key={k}
                                        className={
                                            periodModal
                                                .period
                                                .kind ===
                                            k
                                                ? "active"
                                                : ""
                                        }
                                        onClick={() =>
                                            setPeriodModal(
                                                {
                                                    ...periodModal,

                                                    period:
                                                        {
                                                            ...periodModal.period,

                                                            kind:
                                                            k,
                                                        },
                                                }
                                            )
                                        }
                                    >

                                        {k ===
                                        "break" ? (
                                            <FiCoffee />
                                        ) : k ===
                                        "prep" ? (
                                            <FiMoon />
                                        ) : (
                                            <FiBookOpen />
                                        )}

                                        {
                                            KIND_LABEL[
                                                k
                                                ]
                                        }

                                    </button>

                                )
                            )}

                        </div>


                        {/* =================================================
                            PERIOD TIME
                            ================================================= */}

                        <div className="sctt-field-row">

                            <label className="sctt-field">

                                <span className="sctt-field-label">
                                    Starts
                                </span>


                                <input
                                    type="time"
                                    value={
                                        periodModal
                                            .period
                                            .start
                                    }
                                    onChange={(e) =>
                                        setPeriodModal(
                                            {
                                                ...periodModal,

                                                error:
                                                    "",

                                                period:
                                                    {
                                                        ...periodModal.period,

                                                        start:
                                                        e
                                                            .target
                                                            .value,
                                                    },
                                            }
                                        )
                                    }
                                />

                            </label>


                            <label className="sctt-field">

                                <span className="sctt-field-label">
                                    Ends
                                </span>


                                <input
                                    type="time"
                                    value={
                                        periodModal
                                            .period
                                            .end
                                    }
                                    onChange={(e) =>
                                        setPeriodModal(
                                            {
                                                ...periodModal,

                                                error:
                                                    "",

                                                period:
                                                    {
                                                        ...periodModal.period,

                                                        end:
                                                        e
                                                            .target
                                                            .value,
                                                    },
                                            }
                                        )
                                    }
                                />

                            </label>

                        </div>


                        {/* =================================================
                            PERIOD WARNING
                            ================================================= */}

                        {periodModal.mode ===
                            "edit" &&
                            periodModal
                                .period
                                .kind ===
                            "break" &&
                            periodModal
                                .original
                                .kind !==
                            "break" && (

                                <p className="sctt-note">

                                    Changing this
                                    to a break
                                    removes its
                                    lessons.

                                </p>

                            )}


                        {periodModal.error && (

                            <p className="sctt-error">

                                <FiAlertCircle />

                                {" "}

                                {
                                    periodModal.error
                                }

                            </p>

                        )}

                    </Modal>

                )}

            </div>

        </Layout>

    );
}


/* =========================================================
   MODAL
   ========================================================= */

function Modal({
                   title,
                   subtitle,
                   onClose,
                   footer,
                   children,
               }) {

    useEffect(() => {

        const onKey = (e) => {

            if (
                e.key ===
                "Escape"
            ) {
                onClose();
            }

        };


        window.addEventListener(
            "keydown",
            onKey
        );


        return () =>
            window.removeEventListener(
                "keydown",
                onKey
            );

    }, [onClose]);


    return (

        <div
            className="sctt-overlay"
            onClick={onClose}
        >

            <div
                className="sctt-modal-shadow"
                onClick={(e) =>
                    e.stopPropagation()
                }
            >

                <div
                    className="sctt-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label={title}
                >

                    <div className="sctt-modal-head">

                        <div>

                            <h2>
                                {title}
                            </h2>

                            <p>
                                {subtitle}
                            </p>

                        </div>


                        <button
                            type="button"
                            onClick={
                                onClose
                            }
                            aria-label="Close"
                        >

                            <FiX />

                        </button>

                    </div>


                    <div className="sctt-modal-body">

                        {children}

                    </div>


                    <div className="sctt-modal-foot">

                        {footer}

                    </div>

                </div>

            </div>

        </div>

    );
}


/* =========================================================
   GRID
   ========================================================= */

function Grid({
                  days,
                  weekDates,
                  periods,
                  cells,
                  teacherName,
                  onCell,
                  onEditPeriod,
                  onDeletePeriod,
                  onInsert,
              }) {

    const todayKey =
        new Date().toDateString();


    return (

        <section
            className="sctt-card"
            style={{
                "--cols":
                days.length,
            }}
        >

            <div className="sctt-scroll">

                <div
                    className={`sctt-inner ${
                        days.length ===
                        1
                            ? "single"
                            : ""
                    }`}
                >

                    {/* =================================================
                        GRID HEADER
                        ================================================= */}

                    <div className="sctt-row sctt-head">

                        <div className="sctt-corner">
                            Period
                        </div>


                        {days.map(
                            (day) => (

                                <div
                                    key={day}
                                    className={`sctt-day ${
                                        weekDates[
                                            day
                                            ]?.toDateString() ===
                                        todayKey
                                            ? "is-today"
                                            : ""
                                    }`}
                                >

                                    <strong>

                                        {
                                            days.length ===
                                            1
                                                ? day
                                                : DAY_SHORT[
                                                    day
                                                    ]
                                        }

                                    </strong>


                                    <span>

                                        {fmtDate(
                                            weekDates[
                                                day
                                                ]
                                        )}

                                    </span>

                                </div>

                            )
                        )}

                    </div>


                    {/* =================================================
                        PERIOD ROWS
                        ================================================= */}

                    {periods.map(
                        (p) => (

                            <React.Fragment
                                key={p.id}
                            >

                                <div
                                    className={`sctt-row sctt-kind-${p.kind}`}
                                >

                                    {/* PERIOD INFO */}

                                    <div className="sctt-time">

                                        <div className="sctt-time-text">

                                            <strong>
                                                {p.label}
                                            </strong>

                                            <span>
                                                {p.start}
                                                {" - "}
                                                {p.end}
                                            </span>

                                        </div>


                                        <div className="sctt-time-tools">

                                            <button
                                                type="button"
                                                title="Edit time"
                                                aria-label={`Edit ${p.label}`}
                                                onClick={() =>
                                                    onEditPeriod(
                                                        p
                                                    )
                                                }
                                            >

                                                <FiEdit3 />

                                            </button>


                                            <button
                                                type="button"
                                                title="Delete period"
                                                aria-label={`Delete ${p.label}`}
                                                className="del"
                                                onClick={() =>
                                                    onDeletePeriod(
                                                        p
                                                    )
                                                }
                                            >

                                                <FiTrash2 />

                                            </button>

                                        </div>

                                    </div>


                                    {/* BREAK */}

                                    {p.kind ===
                                    "break" ? (

                                        <div className="sctt-break-wrap">

                                            <div className="sctt-break-band">

                                                <FiCoffee />

                                                {
                                                    p.label
                                                }

                                            </div>

                                        </div>

                                    ) : (

                                        /* LESSON CELLS */

                                        days.map(
                                            (
                                                day
                                            ) => {

                                                const cell =
                                                    findCell(
                                                        cells,
                                                        day,
                                                        p
                                                    );


                                                return (

                                                    <div
                                                        className="sctt-cell"
                                                        key={
                                                            day
                                                        }
                                                    >

                                                        {cell?.subject ? (

                                                            <LessonCard
                                                                cell={
                                                                    cell
                                                                }
                                                                teacher={teacherName(
                                                                    cell.teacherId
                                                                )}
                                                                onClick={() =>
                                                                    onCell(
                                                                        day,
                                                                        p
                                                                    )
                                                                }
                                                            />

                                                        ) : (

                                                            <button
                                                                type="button"
                                                                className="sctt-free"
                                                                onClick={() =>
                                                                    onCell(
                                                                        day,
                                                                        p
                                                                    )
                                                                }
                                                            >

                                                                <FiPlus />

                                                                Add lesson

                                                            </button>

                                                        )}

                                                    </div>

                                                );

                                            }
                                        )

                                    )}

                                </div>


                                {/* ADD PERIOD */}

                                <button
                                    type="button"
                                    className="sctt-insert"
                                    onClick={() =>
                                        onInsert(
                                            p
                                        )
                                    }
                                >

                                    <FiPlus />

                                    Add period
                                    after{" "}

                                    {
                                        p.label
                                    }

                                </button>

                            </React.Fragment>

                        )
                    )}


                    {/* EMPTY */}

                    {periods.length ===
                        0 && (

                            <div className="sctt-empty">

                                No periods yet.
                                Use “Add
                                period” above
                                to start.

                            </div>

                        )}

                </div>

            </div>

        </section>

    );
}


/* =========================================================
   LESSON CARD
   ========================================================= */

function LessonCard({
                        cell,
                        teacher,
                        onClick,
                    }) {

    const prep =
        cell.subject ===
        PREPS;


    return (

        <div
            className={`sctt-card3d ${
                prep
                    ? "prep"
                    : `tone-${toneOf(
                        cell.subject
                    )}`
            }`}
        >

            <button
                type="button"
                className="sctt-face"
                onClick={
                    onClick
                }
            >

                <span className="sctt-subject">

                    {cell.subject}

                </span>


                {cell.teacherId ? (

                    <span className="sctt-meta">

                        <FiUser />

                        {" "}

                        {teacher}

                    </span>

                ) : (

                    <span className="sctt-meta missing">

                        <FiAlertCircle />

                        No teacher

                    </span>

                )}


                {cell.room && (

                    <span className="sctt-meta room">

                        <FiMapPin />

                        {" "}

                        {cell.room}

                    </span>

                )}

            </button>

        </div>

    );
}