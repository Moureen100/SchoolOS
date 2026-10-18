import React, { useEffect, useMemo, useRef, useState } from "react";

import {
    FiPlus,
    FiTrash2,
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

   The backend URL comes ONLY from the frontend .env file:

       VITE_API_URL=http://your-backend-url

   There is no hard-coded fallback. Restart `npm run dev`
   after changing .env.
   ========================================================= */

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

/* =========================================================
   CLASS
   The backend determines the actual class from the
   logged-in Class Teacher. CLASS_LABEL is only a fallback.
   ========================================================= */

const CLASS_LABEL = "P.2";

/* =========================================================
   CONSTANTS
   ========================================================= */

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

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

const mk = (id, label, start, end, kind, position) => ({
    id,
    label,
    start,
    end,
    kind,
    position,
});

/* =========================================================
   DEFAULT PERIODS (school times only, no dummy data)
   ========================================================= */

const DEFAULT_PERIODS = [
    mk("p1", "P1", "07:30", "08:10", "lesson", 1),
    mk("p2", "P2", "08:10", "08:50", "lesson", 2),
    mk("p3", "P3", "08:50", "09:30", "lesson", 3),
    mk("break-1", "Break", "09:30", "10:00", "break", 4),
    mk("p4", "P4", "10:00", "10:40", "lesson", 5),
    mk("p5", "P5", "10:40", "11:20", "lesson", 6),
    mk("p6", "P6", "11:20", "12:00", "lesson", 7),
    mk("lunch", "Lunch", "12:00", "13:00", "break", 8),
    mk("p7", "P7", "13:00", "13:40", "lesson", 9),
    mk("p8", "P8", "13:40", "14:20", "lesson", 10),
    mk("p9", "P9", "14:20", "15:00", "lesson", 11),
    mk("tea-break", "Tea Break", "15:00", "15:30", "break", 12),
    mk("p10", "P10", "15:30", "16:10", "lesson", 13),
];

/* =========================================================
   HELPERS
   ========================================================= */

const clone = (value) => JSON.parse(JSON.stringify(value));

const toMin = (value) => {
    if (!value || !value.includes(":")) {
        return 0;
    }

    const [h, m] = value.split(":").map(Number);

    return h * 60 + m;
};

const fromMin = (minutes) => {
    const x = Math.max(0, Math.min(23 * 60 + 59, minutes));

    return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(
        x % 60
    ).padStart(2, "0")}`;
};

const sortPeriods = (list) =>
    [...list].sort((a, b) => toMin(a.start) - toMin(b.start));

const sameSlot = (cell, period) =>
    cell.startTime === period.start && cell.endTime === period.end;

const findCell = (cells, day, period) =>
    cells.find((cell) => cell.day === day && sameSlot(cell, period)) ||
    null;

const toneOf = (subject) => {
    let h = 0;

    for (const ch of String(subject || "")) {
        h = (h * 31 + ch.charCodeAt(0)) % 8;
    }

    return h;
};

/* =========================================================
   EMPTY TIMETABLE CELLS
   ========================================================= */

function createEmptyCells(periods) {
    const cells = [];

    DAYS.forEach((day) => {
        periods
            .filter(
                (period) => period.kind === "lesson" || period.kind === "prep"
            )
            .forEach((period) => {
                cells.push({
                    id: `${day}-${period.id}`,
                    day,
                    startTime: period.start,
                    endTime: period.end,
                    periodLabel: period.label,

                    subject: "",
                    teacherId: "",
                    room: "",
                    note: "",

                    status: "empty",
                });
            });
    });

    return cells;
}

/* =========================================================
   BUILD WEEK DATES
   ========================================================= */

function buildWeekDates() {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);

    monday.setDate(today.getDate() + (day === 0 ? -6 : 1 - day));

    return DAYS.reduce((acc, name, index) => {
        const date = new Date(monday);

        date.setDate(monday.getDate() + index);

        acc[name] = date;

        return acc;
    }, {});
}

const fmtDate = (date) =>
    date?.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
    });

/* =========================================================
   ISO DATE  (backend expects YYYY-MM-DD)
   ========================================================= */

const toISODate = (dateValue) => {
    if (!dateValue) {
        return "";
    }

    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

/* =========================================================
   GET TIMETABLE HELPERS
   ========================================================= */

// "07:30:00" -> "07:30"
const hhmm = (value) => String(value || "").slice(0, 5);

const normalizeEntry = (e) => ({
    day: e.day,
    startTime: hhmm(e.startTime ?? e.start_time),
    endTime: hhmm(e.endTime ?? e.end_time),
    periodLabel: e.periodLabel ?? e.period_label ?? "",
    position: e.position ?? 0,
    kind: e.kind || "lesson",
    subject: e.subject || "",
    teacherId: e.teacherId ?? e.teacher_id ?? "",
    room: e.room || "",
    note: e.note || "",
});

// Accepts: {entries}, {timetable:{entries}}, {timetables:[{entries}]}, or an array
const extractEntries = (data) => {
    if (!data) {
        return [];
    }

    if (Array.isArray(data.entries)) {
        return data.entries;
    }

    const list = data.timetables ?? data.timetable ?? data;
    const arr = Array.isArray(list) ? list : [list];

    // Flat array of entries
    if (arr.length && arr.every((x) => x && x.day && x.subject)) {
        return arr;
    }

    return arr.flatMap((t) => (Array.isArray(t?.entries) ? t.entries : []));
};

// Keep default periods, add any saved period whose time slot is missing
const mergePeriods = (basePeriods, entries) => {
    const result = [...basePeriods];

    entries.forEach((entry) => {
        const exists = result.some(
            (p) => p.start === entry.startTime && p.end === entry.endTime
        );

        if (!exists && entry.startTime && entry.endTime) {
            result.push({
                id: `saved-${entry.startTime}-${entry.endTime}`,
                label: entry.periodLabel || "Period",
                start: entry.startTime,
                end: entry.endTime,
                kind: entry.kind === "prep" ? "prep" : "lesson",
                position: 0,
            });
        }
    });

    return sortPeriods(result).map((p, i) => ({
        ...p,
        position: i + 1,
    }));
};

/* =========================================================
   MAIN PAGE
   ========================================================= */

export default function Classtimetable() {
    const rootRef = useRef(null);

    const [cssMissing, setCssMissing] = useState(false);

    /* GENERAL MESSAGES */

    const [errorText, setErrorText] = useState("");
    const [successText, setSuccessText] = useState("");

    /* TIMETABLE STATE */

    const [periods, setPeriods] = useState(() => clone(DEFAULT_PERIODS));

    const [cells, setCells] = useState(() =>
        createEmptyCells(DEFAULT_PERIODS)
    );

    const [timetableLoading, setTimetableLoading] = useState(false);

    /* TEACHERS */

    const [teachers, setTeachers] = useState([]);
    const [teachersLoading, setTeachersLoading] = useState(false);
    const [teachersError, setTeachersError] = useState("");

    /* CLASS INFORMATION */

    const [classInfo, setClassInfo] = useState({
        level: CLASS_LABEL,
        stream: "",
    });

    /* PAGE STATE */

    const [view, setView] = useState("week");
    const [selectedDay, setSelectedDay] = useState("Monday");
    const [lessonModal, setLessonModal] = useState(null);
    const [periodModal, setPeriodModal] = useState(null);

    /* SAVING STATE (one lesson at a time) */

    const [saving, setSaving] = useState(false);

    /* WEEK */

    const weekDates = useMemo(() => buildWeekDates(), []);

    const sorted = sortPeriods(periods);

    /* =====================================================
       CHECK THAT VITE_API_URL EXISTS
       ===================================================== */

    useEffect(() => {
        if (!API_URL) {
            setErrorText(
                "VITE_API_URL is missing. Add it to your frontend .env file (next to package.json) and restart npm run dev."
            );
        }
    }, []);

    /* =====================================================
       LOAD TEACHERS

       GET: {VITE_API_URL}/api/class-timetable/teachers
       ===================================================== */

    useEffect(() => {
        if (!API_URL) {
            return;
        }

        const loadTeachers = async () => {
            setTeachersLoading(true);
            setTeachersError("");

            try {
                const token = localStorage.getItem("token");

                if (!token) {
                    throw new Error(
                        "Your session has expired. Please log in again."
                    );
                }

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

                if (!response.ok) {
                    throw new Error(
                        data?.message || "Failed to load teachers."
                    );
                }

                if (!data || !Array.isArray(data.teachers)) {
                    throw new Error(
                        "The server returned an invalid teachers response."
                    );
                }

                setTeachers(data.teachers);

                if (data.class) {
                    setClassInfo({
                        level: data.class.level || CLASS_LABEL,
                        stream: data.class.stream || "",
                    });
                }

                console.log("Teachers loaded for timetable:", data.teachers);
                console.log("Class returned by backend:", data.class);
            } catch (error) {
                console.error(
                    "GET /api/class-timetable/teachers failed:",
                    error
                );

                setTeachersError(
                    error.message || "Failed to load teachers."
                );
            } finally {
                setTeachersLoading(false);
            }
        };

        loadTeachers();
    }, []);

    /* =====================================================
       LOAD SAVED TIMETABLE

       GET: {VITE_API_URL}/api/class-timetable?weekStart=YYYY-MM-DD
       ===================================================== */

    useEffect(() => {
        if (!API_URL) {
            return;
        }

        const loadTimetable = async () => {
            setTimetableLoading(true);

            try {
                const token = localStorage.getItem("token");

                if (!token) {
                    throw new Error(
                        "Your session has expired. Please log in again."
                    );
                }

                const weekStart = toISODate(weekDates.Monday);

                const response = await fetch(
                    `${API_URL}/api/class-timetable?weekStart=${weekStart}`,
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

                // No timetable saved yet for this week: keep the empty grid
                if (response.status === 404) {
                    return;
                }

                if (!response.ok) {
                    throw new Error(
                        data?.message || "Failed to load timetable."
                    );
                }

                console.log("Timetable loaded:", data);

                const entries = extractEntries(data)
                    .map(normalizeEntry)
                    .filter(
                        (e) =>
                            e.day && e.startTime && e.endTime && e.subject
                    );

                /* Class info (if the backend returns it) */

                const tt = Array.isArray(data?.timetables)
                    ? data.timetables[0]
                    : data?.timetable || data;

                const lvl =
                    data?.class?.level ||
                    tt?.studentClass ||
                    tt?.student_class;

                const strm = data?.class?.stream ?? tt?.stream;

                if (lvl) {
                    setClassInfo({
                        level: lvl,
                        stream: strm || "",
                    });
                }

                if (entries.length === 0) {
                    return;
                }

                /* Build periods + cells from saved entries */

                const mergedPeriods = mergePeriods(DEFAULT_PERIODS, entries);

                const nextCells = createEmptyCells(mergedPeriods);

                entries.forEach((entry) => {
                    const index = nextCells.findIndex(
                        (cell) =>
                            cell.day === entry.day &&
                            cell.startTime === entry.startTime &&
                            cell.endTime === entry.endTime
                    );

                    if (index >= 0) {
                        nextCells[index] = {
                            ...nextCells[index],
                            periodLabel:
                                entry.periodLabel ||
                                nextCells[index].periodLabel,
                            subject: entry.subject,
                            teacherId:
                                entry.teacherId === null ||
                                entry.teacherId === undefined
                                    ? ""
                                    : String(entry.teacherId),
                            room: entry.room,
                            note: entry.note,
                            status: "active",
                        };
                    }
                });

                setPeriods(mergedPeriods);
                setCells(nextCells);
            } catch (error) {
                console.error("GET /api/class-timetable failed:", error);

                setErrorText(error.message || "Failed to load timetable.");
            } finally {
                setTimetableLoading(false);
            }
        };

        loadTimetable();
    }, [weekDates]);

    /* =====================================================
       WARN IF CSS DID NOT LOAD
       ===================================================== */

    useEffect(() => {
        const value =
            rootRef.current &&
            getComputedStyle(rootRef.current)
                .getPropertyValue("--sctt-navy")
                .trim();

        setCssMissing(!value);
    }, []);

    /* =====================================================
       TEACHER HELPERS
       ===================================================== */

    const teacherName = (id) => {
        const teacher = teachers.find(
            (t) => String(t.id) === String(id)
        );

        if (!teacher) {
            return "Unknown teacher";
        }

        return teacher.firstName || teacher.name || "Unknown teacher";
    };

    // Only teachers assigned to the selected subject
    const teachersFor = (subject) => {
        const selectedSubject = String(subject || "")
            .trim()
            .toLowerCase();

        if (!selectedSubject) {
            return [];
        }

        return teachers.filter((teacher) => {
            if (!Array.isArray(teacher.subjects)) {
                return false;
            }

            return teacher.subjects.some(
                (teacherSubject) =>
                    String(teacherSubject || "")
                        .trim()
                        .toLowerCase() === selectedSubject
            );
        });
    };

    /* =====================================================
       PERIODS: ADD / EDIT / DELETE
       ===================================================== */

    const openAddPeriod = (after, kind = "lesson") => {
        const start = after
            ? after.end
            : sorted.length
                ? sorted[sorted.length - 1].end
                : "07:30";

        const length = kind === "break" ? 20 : kind === "prep" ? 60 : 40;

        const lessonTotal = sorted.filter(
            (period) => period.kind === "lesson"
        ).length;

        const label =
            kind === "break"
                ? "Break"
                : kind === "prep"
                    ? "Prep"
                    : `P${lessonTotal + 1}`;

        setPeriodModal({
            mode: "add",
            error: "",

            period: {
                id: `new-${Date.now()}`,
                label,
                start,
                end: fromMin(toMin(start) + length),
                kind,
            },
        });
    };

    const openEditPeriod = (period) => {
        setPeriodModal({
            mode: "edit",
            error: "",
            original: period,
            period: { ...period },
        });
    };

    const commitPeriod = () => {
        const { mode, original, period } = periodModal;

        const fail = (error) => {
            setPeriodModal((current) => ({
                ...current,
                error,
            }));
        };

        if (!period.label.trim()) {
            return fail("Enter a name for this period.");
        }

        if (!period.start || !period.end) {
            return fail("Enter a start and end time.");
        }

        if (toMin(period.end) <= toMin(period.start)) {
            return fail("End time must be after the start time.");
        }

        const clash = periods
            .filter((p) => p.id !== period.id)
            .find(
                (p) =>
                    toMin(period.start) < toMin(p.end) &&
                    toMin(period.end) > toMin(p.start)
            );

        if (clash) {
            return fail(
                `This overlaps "${clash.label}" (${clash.start} - ${clash.end}).`
            );
        }

        const clean = {
            ...period,
            label: period.label.trim(),
        };

        if (mode === "edit") {
            setCells((currentCells) =>
                currentCells
                    .filter(
                        (cell) =>
                            !(
                                clean.kind === "break" &&
                                sameSlot(cell, original)
                            )
                    )
                    .map((cell) =>
                        sameSlot(cell, original)
                            ? {
                                ...cell,
                                startTime: clean.start,
                                endTime: clean.end,
                                periodLabel: clean.label,
                                subject:
                                    clean.kind === "prep"
                                        ? PREPS
                                        : cell.subject,
                            }
                            : cell
                    )
            );
        }

        setPeriods((currentPeriods) => {
            const list =
                mode === "add"
                    ? [...currentPeriods, clean]
                    : currentPeriods.map((item) =>
                        item.id === clean.id ? clean : item
                    );

            return sortPeriods(list).map((item, index) => ({
                ...item,
                position: index + 1,
            }));
        });

        setPeriodModal(null);
    };

    const deletePeriod = (period) => {
        if (
            !window.confirm(
                `Delete "${period.label}" (${period.start} - ${period.end}) and all lessons in it?`
            )
        ) {
            return;
        }

        setPeriods((currentPeriods) =>
            currentPeriods.filter((item) => item.id !== period.id)
        );

        setCells((currentCells) =>
            currentCells.filter((cell) => !sameSlot(cell, period))
        );

        setPeriodModal(null);
    };

    /* =====================================================
       LESSONS
       ===================================================== */

    const openLesson = (day, period) => {
        const cell = findCell(cells, day, period);

        setLessonModal({
            day,
            period,
            exists: !!cell?.subject,

            subject:
                cell?.subject || (period.kind === "prep" ? PREPS : ""),

            teacherId: cell?.teacherId || "",
            room: cell?.room || "",
            note: cell?.note || "",

            applyAll: false,
            error: "",
        });
    };

    /* =====================================================
       SAVE ONE LESSON

       POST {VITE_API_URL}/api/class-timetable
       Body: { studentClass, stream, weekStart, weekEnd, entry }

       If "applyAll" is checked, one request is made for
       each weekday.
       ===================================================== */

    const saveLesson = async () => {
        const modal = lessonModal;

        if (!modal) {
            return;
        }

        const period = modal.period;

        const subject =
            period.kind === "prep" ? PREPS : modal.subject.trim();

        if (!API_URL) {
            setLessonModal({
                ...modal,
                error: "VITE_API_URL is missing in your .env file.",
            });

            return;
        }

        /* VALIDATE SUBJECT */

        if (!subject) {
            setLessonModal({
                ...modal,
                error: "Enter a subject for this lesson.",
            });

            return;
        }

        /* NORMAL LESSON MUST HAVE TEACHER */

        if (period.kind !== "prep" && !modal.teacherId) {
            setLessonModal({
                ...modal,
                error: "Select a teacher for this lesson.",
            });

            return;
        }

        /* VERIFY TEACHER BELONGS TO SUBJECT */

        if (period.kind !== "prep" && modal.teacherId) {
            const validTeacher = teachersFor(subject).some(
                (teacher) => String(teacher.id) === String(modal.teacherId)
            );

            if (!validTeacher) {
                setLessonModal({
                    ...modal,
                    error: "The selected teacher is not assigned to this subject.",
                });

                return;
            }
        }

        /* AUTH TOKEN */

        const token = localStorage.getItem("token");

        if (!token) {
            setLessonModal({
                ...modal,
                error: "Your session has expired. Please log in again.",
            });

            return;
        }

        /* WEEK DATES */

        const weekStart = toISODate(weekDates.Monday);
        const weekEnd = toISODate(weekDates.Friday);

        /* TARGET DAYS */

        const targetDays = modal.applyAll ? DAYS : [modal.day];

        /* COMMON ENTRY DATA */

        const room = modal.room?.trim() || null;
        const note = modal.note?.trim() || null;

        const teacherId =
            period.kind === "prep" ? null : Number(modal.teacherId);

        setSaving(true);
        setErrorText("");
        setSuccessText("");

        try {
            const savedCells = [];

            for (const day of targetDays) {
                const entry = {
                    day,
                    periodLabel: period.label,
                    startTime: period.start,
                    endTime: period.end,
                    position: period.position,
                    kind: period.kind === "prep" ? "prep" : "lesson",
                    subject,
                    teacherId,
                    room,
                    note,
                    p8Only: false,
                };

                const payload = {
                    studentClass: classInfo.level,
                    stream: classInfo.stream || null,
                    weekStart,
                    weekEnd,
                    entry,
                };

                console.log("Saving timetable entry:", payload);

                const response = await fetch(`${API_URL}/api/class-timetable`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                    body: JSON.stringify(payload),
                });

                let data = null;

                try {
                    data = await response.json();
                } catch {
                    data = null;
                }

                if (!response.ok) {
                    throw new Error(
                        data?.message ||
                        `Failed to save ${day} ${period.label} (${response.status}).`
                    );
                }

                console.log(`Timetable entry saved for ${day}:`, data);

                savedCells.push({
                    id: `${day}-${period.id}`,
                    day,
                    startTime: period.start,
                    endTime: period.end,
                    periodLabel: period.label,
                    subject,
                    teacherId:
                        period.kind === "prep" ? "" : String(modal.teacherId),
                    room: modal.room || "",
                    note: modal.note || "",
                    status: "active",
                });
            }

            /* UPDATE LOCAL UI ONLY AFTER API SUCCESS */

            setCells((currentCells) => {
                const next = [...currentCells];

                savedCells.forEach((savedCell) => {
                    const index = next.findIndex(
                        (cell) =>
                            cell.day === savedCell.day &&
                            sameSlot(cell, period)
                    );

                    if (index >= 0) {
                        next[index] = savedCell;
                    } else {
                        next.push(savedCell);
                    }
                });

                return next;
            });

            setLessonModal(null);

            if (targetDays.length > 1) {
                setSuccessText(`${period.label} saved for all weekdays.`);
            } else {
                setSuccessText(
                    `${period.label} on ${modal.day} saved successfully.`
                );
            }
        } catch (error) {
            console.error("POST /api/class-timetable failed:", error);

            setLessonModal((current) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    error: error.message || "Failed to save lesson.",
                };
            });
        } finally {
            setSaving(false);
        }
    };

    /* =====================================================
       REMOVE LESSON

       NOTE: this only removes it from the screen.
       A DELETE endpoint is needed to remove it from the
       database permanently.
       ===================================================== */

    const removeLesson = () => {
        const { day, period } = lessonModal;

        setCells((currentCells) =>
            currentCells.map((cell) =>
                cell.day === day && sameSlot(cell, period)
                    ? {
                        ...cell,
                        subject: "",
                        teacherId: "",
                        room: "",
                        note: "",
                        status: "empty",
                    }
                    : cell
            )
        );

        setLessonModal(null);
    };

    /* =====================================================
       COPY MONDAY (screen only, not saved to the backend)
       ===================================================== */

    const copyMonday = () => {
        setCells((currentCells) => {
            const monday = currentCells.filter(
                (cell) => cell.day === "Monday" && cell.subject
            );

            const next = currentCells.filter(
                (cell) => !DAYS.slice(1).includes(cell.day)
            );

            DAYS.slice(1).forEach((day) => {
                monday.forEach((mondayCell) => {
                    next.push({
                        ...mondayCell,
                        id: `${day}-${mondayCell.startTime}`,
                        day,
                    });
                });
            });

            return next;
        });

        setSuccessText(
            "Monday copied to the other days. Save each copied lesson to store it."
        );
    };

    /* =====================================================
       CLEAR ALL (screen only, not deleted from the backend)
       ===================================================== */

    const clearAll = () => {
        if (!window.confirm("Clear every lesson in the timetable?")) {
            return;
        }

        setCells(createEmptyCells(periods));

        setSuccessText(
            "All timetable lessons have been cleared from the current view."
        );
    };

    /* =====================================================
       COUNTS
       ===================================================== */

    const lessonCount = cells.filter((cell) => cell.subject).length;

    const noTeacher = cells.filter(
        (cell) => cell.subject && cell.subject !== PREPS && !cell.teacherId
    ).length;

    const lessonPeriodCount = periods.filter(
        (period) => period.kind !== "break"
    ).length;

    /* =====================================================
       RENDER
       ===================================================== */

    return (
        <Layout>
            <div className="sctt-page" ref={rootRef}>
                {/* CSS WARNING */}

                {cssMissing && (
                    <div
                        style={{
                            padding: 16,
                            margin: "0 0 16px",
                            background: "#fff3cd",
                            border: "1px solid #e0b100",
                            borderRadius: 12,
                            color: "#5c4400",
                            fontFamily: "sans-serif",
                            fontSize: 14,
                        }}
                    >
                        <strong>Stylesheet not loaded.</strong> Make sure{" "}
                        <code>ClassTimetable.css</code> is in the same folder
                        as this file, then restart <code>npm run dev</code>.
                    </div>
                )}

                {/* HEADER */}

                <header className="sctt-header">
                    <div className="sctt-header-text">
                        <h1 className="sctt-title">Class Timetable</h1>

                        <p className="sctt-sub">
                            {classInfo.level}

                            {classInfo.stream && <>{" · "}{classInfo.stream}</>}

                            {" · "}

                            {lessonCount} lessons in {lessonPeriodCount} periods

                            {noTeacher > 0 && (
                                <span className="sctt-warn-pill">
                                    {noTeacher} need a teacher
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
                                    sorted[sorted.length - 1],
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
                                    sorted[sorted.length - 1],
                                    "break"
                                )
                            }
                        >
                            <FiCoffee />
                            Add break
                        </button>
                    </div>
                </header>

                {/* ERROR MESSAGE */}

                {errorText && (
                    <div className="sctt-message sctt-message--error">
                        <span>{errorText}</span>

                        <button
                            type="button"
                            onClick={() => setErrorText("")}
                            aria-label="Dismiss"
                        >
                            <FiX />
                        </button>
                    </div>
                )}

                {/* SUCCESS MESSAGE */}

                {successText && (
                    <div className="sctt-message sctt-message--success">
                        <span>{successText}</span>

                        <button
                            type="button"
                            onClick={() => setSuccessText("")}
                            aria-label="Dismiss"
                        >
                            <FiX />
                        </button>
                    </div>
                )}

                {/* TEACHER LOADING */}

                {teachersLoading && (
                    <div className="sctt-message">
                        <span>
                            <FiRefreshCw className="sctt-spin" /> Loading
                            teachers for your class...
                        </span>
                    </div>
                )}

                {/* TIMETABLE LOADING */}

                {timetableLoading && (
                    <div className="sctt-message">
                        <span>
                            <FiRefreshCw className="sctt-spin" /> Loading saved
                            timetable...
                        </span>
                    </div>
                )}

                {/* TEACHER ERROR */}

                {teachersError && (
                    <div className="sctt-message sctt-message--error">
                        <span>
                            <FiAlertCircle /> {teachersError}
                        </span>

                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            aria-label="Reload"
                        >
                            <FiRefreshCw />
                        </button>
                    </div>
                )}

                {/* TOOLBAR */}

                <section className="sctt-toolbar">
                    <div className="sctt-switch">
                        <button
                            type="button"
                            className={view === "week" ? "active" : ""}
                            onClick={() => setView("week")}
                        >
                            Week
                        </button>

                        <button
                            type="button"
                            className={view === "day" ? "active" : ""}
                            onClick={() => setView("day")}
                        >
                            Day
                        </button>
                    </div>

                    {view === "day" && (
                        <div className="sctt-days">
                            {DAYS.map((day) => (
                                <button
                                    type="button"
                                    key={day}
                                    className={
                                        selectedDay === day ? "active" : ""
                                    }
                                    onClick={() => setSelectedDay(day)}
                                >
                                    {DAY_SHORT[day]}
                                </button>
                            ))}
                        </div>
                    )}

                    <p className="sctt-hint">
                        Tap an empty slot to add a lesson. Tap a lesson to
                        change it.
                    </p>

                    <div className="sctt-tools">
                        <button
                            type="button"
                            className="sctt-tool"
                            onClick={copyMonday}
                        >
                            <FiCopy />
                            Copy Monday
                        </button>

                        <button
                            type="button"
                            className="sctt-tool danger"
                            onClick={clearAll}
                        >
                            <FiTrash2 />
                            Clear
                        </button>
                    </div>
                </section>

                {/* GRID */}

                <Grid
                    days={view === "day" ? [selectedDay] : DAYS}
                    weekDates={weekDates}
                    periods={sorted}
                    cells={cells}
                    teacherName={teacherName}
                    onCell={openLesson}
                    onEditPeriod={openEditPeriod}
                    onDeletePeriod={deletePeriod}
                    onInsert={(period) => openAddPeriod(period, "lesson")}
                />

                {/* LESSON MODAL */}

                {lessonModal && (
                    <Modal
                        title={
                            lessonModal.exists ? "Edit lesson" : "Add lesson"
                        }
                        subtitle={
                            `${lessonModal.day}, ` +
                            `${lessonModal.period.label}, ` +
                            `${lessonModal.period.start} - ` +
                            `${lessonModal.period.end}`
                        }
                        onClose={() => !saving && setLessonModal(null)}
                        footer={
                            <>
                                {lessonModal.exists ? (
                                    <button
                                        type="button"
                                        className="sctt-danger-link"
                                        onClick={removeLesson}
                                        disabled={saving}
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
                                            !saving && setLessonModal(null)
                                        }
                                        disabled={saving}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        className="sctt-btn-primary"
                                        onClick={saveLesson}
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <>
                                                <FiRefreshCw className="sctt-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <FiCheck />
                                                {lessonModal.exists
                                                    ? "Update lesson"
                                                    : "Save lesson"}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        }
                    >
                        {/* SUBJECT */}

                        <label className="sctt-field">
                            <span className="sctt-field-label">
                                <FiBookOpen />
                                Subject
                            </span>

                            {lessonModal.period.kind === "prep" ? (
                                <input value={PREPS} disabled />
                            ) : (
                                <input
                                    autoFocus
                                    value={lessonModal.subject}
                                    placeholder="e.g. Mathematics"
                                    onChange={(event) =>
                                        setLessonModal({
                                            ...lessonModal,
                                            subject: event.target.value,
                                            teacherId: "",
                                            error: "",
                                        })
                                    }
                                />
                            )}
                        </label>

                        {/* TEACHER */}

                        <label className="sctt-field">
                            <span className="sctt-field-label">
                                <FiUser />
                                Teacher
                            </span>

                            <select
                                value={lessonModal.teacherId}
                                onChange={(event) =>
                                    setLessonModal({
                                        ...lessonModal,
                                        teacherId: event.target.value,
                                        error: "",
                                    })
                                }
                                disabled={
                                    teachersLoading ||
                                    teachers.length === 0 ||
                                    lessonModal.period.kind === "prep"
                                }
                            >
                                <option value="">
                                    {lessonModal.period.kind === "prep"
                                        ? "No teacher required"
                                        : teachersLoading
                                            ? "Loading teachers..."
                                            : teachers.length === 0
                                                ? "No teachers available"
                                                : teachersFor(
                                                    lessonModal.subject
                                                ).length === 0
                                                    ? "No teacher for this subject"
                                                    : "Select teacher"}
                                </option>

                                {teachersFor(lessonModal.subject).map(
                                    (teacher) => (
                                        <option
                                            key={teacher.id}
                                            value={teacher.id}
                                        >
                                            {teacher.firstName ||
                                                teacher.name ||
                                                "Unnamed teacher"}

                                            {teacher.employeeId
                                                ? ` — ${teacher.employeeId}`
                                                : ""}
                                        </option>
                                    )
                                )}
                            </select>

                            {!teachersLoading &&
                                !teachersError &&
                                teachers.length === 0 && (
                                    <small
                                        style={{
                                            color: "#b42318",
                                            marginTop: 6,
                                            display: "block",
                                        }}
                                    >
                                        No active teachers are assigned to
                                        this class.
                                    </small>
                                )}
                        </label>

                        {/* ROOM */}

                        <label className="sctt-field">
                            <span className="sctt-field-label">
                                <FiMapPin />
                                Room
                            </span>

                            <select
                                value={lessonModal.room}
                                onChange={(event) =>
                                    setLessonModal({
                                        ...lessonModal,
                                        room: event.target.value,
                                    })
                                }
                            >
                                <option value="">Select room</option>

                                {ROOMS.map((room) => (
                                    <option key={room} value={room}>
                                        {room}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {/* NOTE */}

                        <label className="sctt-field">
                            <span className="sctt-field-label">
                                Note{" "}
                                <em className="sctt-optional">(optional)</em>
                            </span>

                            <textarea
                                rows={3}
                                value={lessonModal.note}
                                onChange={(event) =>
                                    setLessonModal({
                                        ...lessonModal,
                                        note: event.target.value,
                                    })
                                }
                            />
                        </label>

                        {/* APPLY ALL DAYS */}

                        <label className="sctt-check">
                            <input
                                type="checkbox"
                                checked={lessonModal.applyAll}
                                onChange={(event) =>
                                    setLessonModal({
                                        ...lessonModal,
                                        applyAll: event.target.checked,
                                    })
                                }
                                disabled={saving}
                            />

                            <span>
                                Use for {lessonModal.period.label} on every
                                weekday
                            </span>
                        </label>

                        {/* LESSON ERROR */}

                        {lessonModal.error && (
                            <p className="sctt-error">
                                <FiAlertCircle /> {lessonModal.error}
                            </p>
                        )}
                    </Modal>
                )}

                {/* PERIOD MODAL */}

                {periodModal && (
                    <Modal
                        title={
                            periodModal.mode === "add"
                                ? "Add period"
                                : "Edit period"
                        }
                        subtitle="Set the name, type and time."
                        onClose={() => setPeriodModal(null)}
                        footer={
                            <>
                                {periodModal.mode === "edit" ? (
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
                                        onClick={() => setPeriodModal(null)}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        className="sctt-btn-primary"
                                        onClick={commitPeriod}
                                    >
                                        <FiCheck />
                                        {periodModal.mode === "add"
                                            ? "Add period"
                                            : "Save period"}
                                    </button>
                                </div>
                            </>
                        }
                    >
                        {/* PERIOD NAME */}

                        <label className="sctt-field">
                            <span className="sctt-field-label">Name</span>

                            <input
                                value={periodModal.period.label}
                                onChange={(event) =>
                                    setPeriodModal({
                                        ...periodModal,
                                        error: "",
                                        period: {
                                            ...periodModal.period,
                                            label: event.target.value,
                                        },
                                    })
                                }
                            />
                        </label>

                        {/* PERIOD KIND */}

                        <div className="sctt-kinds">
                            {Object.keys(KIND_LABEL).map((kind) => (
                                <button
                                    type="button"
                                    key={kind}
                                    className={
                                        periodModal.period.kind === kind
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() =>
                                        setPeriodModal({
                                            ...periodModal,
                                            period: {
                                                ...periodModal.period,
                                                kind,
                                            },
                                        })
                                    }
                                >
                                    {kind === "break" ? (
                                        <FiCoffee />
                                    ) : kind === "prep" ? (
                                        <FiMoon />
                                    ) : (
                                        <FiBookOpen />
                                    )}

                                    {KIND_LABEL[kind]}
                                </button>
                            ))}
                        </div>

                        {/* PERIOD TIME */}

                        <div className="sctt-field-row">
                            <label className="sctt-field">
                                <span className="sctt-field-label">
                                    Starts
                                </span>

                                <input
                                    type="time"
                                    value={periodModal.period.start}
                                    onChange={(event) =>
                                        setPeriodModal({
                                            ...periodModal,
                                            error: "",
                                            period: {
                                                ...periodModal.period,
                                                start: event.target.value,
                                            },
                                        })
                                    }
                                />
                            </label>

                            <label className="sctt-field">
                                <span className="sctt-field-label">Ends</span>

                                <input
                                    type="time"
                                    value={periodModal.period.end}
                                    onChange={(event) =>
                                        setPeriodModal({
                                            ...periodModal,
                                            error: "",
                                            period: {
                                                ...periodModal.period,
                                                end: event.target.value,
                                            },
                                        })
                                    }
                                />
                            </label>
                        </div>

                        {/* PERIOD WARNING */}

                        {periodModal.mode === "edit" &&
                            periodModal.period.kind === "break" &&
                            periodModal.original.kind !== "break" && (
                                <p className="sctt-note">
                                    Changing this to a break removes its
                                    lessons.
                                </p>
                            )}

                        {periodModal.error && (
                            <p className="sctt-error">
                                <FiAlertCircle /> {periodModal.error}
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

function Modal({ title, subtitle, onClose, footer, children }) {
    useEffect(() => {
        const onKey = (event) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", onKey);

        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="sctt-overlay" onClick={onClose}>
            <div
                className="sctt-modal-shadow"
                onClick={(event) => event.stopPropagation()}
            >
                <div
                    className="sctt-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label={title}
                >
                    <div className="sctt-modal-head">
                        <div>
                            <h2>{title}</h2>
                            <p>{subtitle}</p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                        >
                            <FiX />
                        </button>
                    </div>

                    <div className="sctt-modal-body">{children}</div>

                    <div className="sctt-modal-foot">{footer}</div>
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
    const todayKey = new Date().toDateString();

    return (
        <section className="sctt-card" style={{ "--cols": days.length }}>
            <div className="sctt-scroll">
                <div
                    className={`sctt-inner ${
                        days.length === 1 ? "single" : ""
                    }`}
                >
                    {/* GRID HEADER */}

                    <div className="sctt-row sctt-head">
                        <div className="sctt-corner">Period</div>

                        {days.map((day) => (
                            <div
                                key={day}
                                className={`sctt-day ${
                                    weekDates[day]?.toDateString() ===
                                    todayKey
                                        ? "is-today"
                                        : ""
                                }`}
                            >
                                <strong>
                                    {days.length === 1
                                        ? day
                                        : DAY_SHORT[day]}
                                </strong>

                                <span>{fmtDate(weekDates[day])}</span>
                            </div>
                        ))}
                    </div>

                    {/* PERIOD ROWS */}

                    {periods.map((period) => (
                        <React.Fragment key={period.id}>
                            <div
                                className={`sctt-row sctt-kind-${period.kind}`}
                            >
                                {/* PERIOD INFO */}

                                <div className="sctt-time">
                                    <div className="sctt-time-text">
                                        <strong>{period.label}</strong>

                                        <span>
                                            {period.start}
                                            {" - "}
                                            {period.end}
                                        </span>
                                    </div>

                                    <div className="sctt-time-tools">
                                        <button
                                            type="button"
                                            title="Edit time"
                                            aria-label={`Edit ${period.label}`}
                                            onClick={() =>
                                                onEditPeriod(period)
                                            }
                                        >
                                            <FiEdit3 />
                                        </button>

                                        <button
                                            type="button"
                                            title="Delete period"
                                            aria-label={`Delete ${period.label}`}
                                            className="del"
                                            onClick={() =>
                                                onDeletePeriod(period)
                                            }
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </div>

                                {/* BREAK */}

                                {period.kind === "break" ? (
                                    <div className="sctt-break-wrap">
                                        <div className="sctt-break-band">
                                            <FiCoffee />
                                            {period.label}
                                        </div>
                                    </div>
                                ) : (
                                    /* LESSON / PREP CELLS */
                                    days.map((day) => {
                                        const cell = findCell(
                                            cells,
                                            day,
                                            period
                                        );

                                        return (
                                            <div
                                                className="sctt-cell"
                                                key={day}
                                            >
                                                {cell?.subject ? (
                                                    <LessonCard
                                                        cell={cell}
                                                        teacher={teacherName(
                                                            cell.teacherId
                                                        )}
                                                        onClick={() =>
                                                            onCell(
                                                                day,
                                                                period
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
                                                                period
                                                            )
                                                        }
                                                    >
                                                        <FiPlus />
                                                        Add lesson
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* ADD PERIOD */}

                            <button
                                type="button"
                                className="sctt-insert"
                                onClick={() => onInsert(period)}
                            >
                                <FiPlus />
                                Add period after {period.label}
                            </button>
                        </React.Fragment>
                    ))}

                    {/* EMPTY */}

                    {periods.length === 0 && (
                        <div className="sctt-empty">
                            No periods yet. Use “Add period” above to start.
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

function LessonCard({ cell, teacher, onClick }) {
    const prep = cell.subject === PREPS;

    return (
        <div
            className={`sctt-card3d ${
                prep ? "prep" : `tone-${toneOf(cell.subject)}`
            }`}
        >
            <button type="button" className="sctt-face" onClick={onClick}>
                <span className="sctt-subject">{cell.subject}</span>

                {cell.teacherId ? (
                    <span className="sctt-meta">
                        <FiUser /> {teacher}
                    </span>
                ) : (
                    <span className="sctt-meta missing">
                        <FiAlertCircle />
                        No teacher
                    </span>
                )}

                {cell.room && (
                    <span className="sctt-meta room">
                        <FiMapPin /> {cell.room}
                    </span>
                )}
            </button>
        </div>
    );
}