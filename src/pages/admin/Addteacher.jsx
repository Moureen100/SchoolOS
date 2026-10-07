import React, {
    useState,
    useMemo,
    useEffect,
    useRef,
} from "react";
import {
    FaSearch,
    FaEye,
    FaEyeSlash,
    FaEdit,
    FaTrash,
    FaChevronDown,
    FaUserPlus,
    FaTimes,
    FaSyncAlt,
} from "react-icons/fa";
import Layout from "../../Layout";
import "./Addteacher.css";

// =====================================================
// BACKEND URL
// =====================================================
const API_URL = "http://localhost:5000";

// =====================================================
// STATIC OPTIONS
// =====================================================
const CLASS_OPTIONS = [
    "Nursery", "Middle", "Top",
    "P.1", "P.2", "P.3", "P.4", "P.5", "P.6", "P.7",
];

const SUBJECT_OPTIONS = [
    "Mathematics",
    "English",
    "Science",
    "Social Studies",
];

const DESIGNATION_OPTIONS = [
    { value: "teacher", label: "Teacher" },
    { value: "senior-teacher", label: "Senior Teacher" },
    { value: "hod", label: "Head of Department" },
    { value: "bursar", label: "Bursar" },
];

const ROLE_OPTIONS = [
    "Class Teacher",
    "Subject Teacher",
    "HOD",
];

// =====================================================
// HELPERS
// =====================================================
const formatClass = ({ level, stream }) =>
    stream ? `${level} ${stream}` : level;

const designationLabel = (value) =>
    DESIGNATION_OPTIONS.find((d) => d.value === value)?.label || "";

// =====================================================
// EMPTY FORM
// =====================================================
const EMPTY_FORM = {
    firstName: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    designation: "",
    subjects: [],
    assignedClasses: [],
    role: "",
    username: "",
    password: "",
};

// =====================================================
// EMPTY CLASS DRAFT
// =====================================================
const EMPTY_CLASS_DRAFT = {
    level: "",
    stream: "",
};

// =====================================================
// COMPONENT
// =====================================================
const AddTeacherPage = () => {
    // =================================================
    // FORM STATE
    // =================================================
    const [form, setForm] = useState(EMPTY_FORM);
    const [classDraft, setClassDraft] = useState(EMPTY_CLASS_DRAFT);
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [employeeId, setEmployeeId] = useState("");

    // NEW: null = adding a new teacher, a number = editing that teacher
    const [editingId, setEditingId] = useState(null);
    const formRef = useRef(null);

    const isBursar = form.designation === "bursar";
    const isEditing = editingId !== null;

    // =================================================
    // TEACHER LIST
    // =================================================
    const [teachers, setTeachers] = useState([]);
    const [loadingTeachers, setLoadingTeachers] = useState(false);
    const [visiblePasswordId, setVisiblePasswordId] = useState(null);

    // id of the teacher whose password is being reset right now
    const [resettingId, setResettingId] = useState(null);

    // =================================================
    // PASSWORD CACHE
    //
    // The database stores only the HASHED password.
    // A password Flask just generated (new teacher or
    // reset) is kept here in browser memory only, so the
    // admin can see it during this session.
    // It is NOT stored in localStorage.
    // =================================================
    const passwordCache = useRef({});

    // =================================================
    // FILTER STATE
    // =================================================
    const [searchTerm, setSearchTerm] = useState("");
    const [classFilter, setClassFilter] = useState("");
    const [streamFilter, setStreamFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState("All Roles");

    // =================================================
    // LOAD ALL TEACHERS
    //
    // GET /teachers
    // =================================================
    const loadTeachers = async () => {
        try {
            setLoadingTeachers(true);

            const response = await fetch(`${API_URL}/teachers`);
            const data = await response.json();

            if (!response.ok) {
                console.error("Failed to load teachers:", data);
                setMessage({
                    type: "error",
                    text: data.error || "Could not load teachers.",
                });
                return;
            }

            const databaseTeachers = Array.isArray(data.teachers)
                ? data.teachers
                : [];

            // merge database teachers with the password cache
            const teachersWithPasswords = databaseTeachers.map((teacher) => {
                let cachedPassword = passwordCache.current[teacher.id];

                if (!cachedPassword && teacher.employeeId) {
                    cachedPassword =
                        passwordCache.current[teacher.employeeId];
                }

                return {
                    ...teacher,
                    password: teacher.password || cachedPassword || "",
                };
            });

            setTeachers(teachersWithPasswords);
        } catch (error) {
            console.error("GET /teachers error:", error);
            setMessage({
                type: "error",
                text: "Cannot load teachers. Check that Flask is running.",
            });
        } finally {
            setLoadingTeachers(false);
        }
    };

    // =================================================
    // LOAD NEXT EMPLOYEE ID + PASSWORD
    // =================================================
    const loadCredentials = async () => {
        try {
            const response = await fetch(
                `${API_URL}/teachers/next-credentials`
            );
            const data = await response.json();

            if (!response.ok) {
                return;
            }

            setEmployeeId(data.employeeId);
            setForm((prev) => ({
                ...prev,
                password: data.password,
            }));
        } catch (error) {
            console.error("Could not load credentials:", error);
        }
    };

    // =================================================
    // PAGE LOAD
    // =================================================
    useEffect(() => {
        loadTeachers();
        loadCredentials();
    }, []);

    // =================================================
    // FORM HANDLER
    // =================================================
    const updateField = (field) => (e) => {
        setForm((prev) => ({
            ...prev,
            [field]: e.target.value,
        }));
    };

    // =================================================
    // CLASS DRAFT
    // =================================================
    const updateClassDraft = (field) => (e) => {
        setClassDraft((prev) => {
            const next = {
                ...prev,
                [field]: e.target.value,
            };

            if (field === "level" && !e.target.value) {
                next.stream = "";
            }

            return next;
        });
    };

    // =================================================
    // ADD CLASS
    // =================================================
    const handleAddClass = () => {
        if (!classDraft.level) {
            return;
        }

        const stream = classDraft.stream.trim();

        const alreadyAdded = form.assignedClasses.some(
            (c) =>
                c.level === classDraft.level &&
                (c.stream || "").toLowerCase() === stream.toLowerCase()
        );

        if (!alreadyAdded) {
            setForm((prev) => ({
                ...prev,
                assignedClasses: [
                    ...prev.assignedClasses,
                    { level: classDraft.level, stream },
                ],
            }));
        }

        setClassDraft(EMPTY_CLASS_DRAFT);
    };

    // =================================================
    // REMOVE CLASS
    // =================================================
    const handleRemoveClass = (index) => {
        setForm((prev) => ({
            ...prev,
            assignedClasses: prev.assignedClasses.filter(
                (_, i) => i !== index
            ),
        }));
    };

    // =================================================
    // SUBJECTS
    // =================================================
    const handleToggleSubject = (subject) => {
        setForm((prev) => ({
            ...prev,
            subjects: prev.subjects.includes(subject)
                ? prev.subjects.filter((s) => s !== subject)
                : [...prev.subjects, subject],
        }));
    };

    // =================================================
    // REGENERATE PASSWORD (for the Add Teacher form)
    // =================================================
    const handleGeneratePassword = () => {
        loadCredentials();
        setShowPassword(true);
    };

    // =================================================
    // CLEAR FORM
    // =================================================
    const handleClear = () => {
        setForm(EMPTY_FORM);
        setClassDraft(EMPTY_CLASS_DRAFT);
        setShowPassword(false);
        setMessage(null);
        loadCredentials();
    };

    // =================================================
    // NEW: EDIT A TEACHER
    //
    // Fills the form with the teacher's data so the
    // admin can change it. Saving sends a PUT request.
    // =================================================
    const handleEditTeacher = (teacher) => {
        setEditingId(teacher.id);
        setEmployeeId(teacher.employeeId || "");

        setForm({
            firstName: teacher.firstName || "",
            dateOfBirth: teacher.dateOfBirth || "",
            email: teacher.email || "",
            phone: teacher.phone || "",
            designation: teacher.designation || "",
            subjects: teacher.subjects || [],
            assignedClasses: (teacher.assignedClasses || []).map((c) => ({
                level: c.level,
                stream: c.stream || "",
            })),
            role: (teacher.roles || [])[0] || "",
            username: teacher.username || "",
            password: "",
        });

        setClassDraft(EMPTY_CLASS_DRAFT);
        setShowPassword(false);
        setMessage(null);

        formRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };

    // NEW: leave edit mode and go back to "Add New Teacher"
    const handleCancelEdit = () => {
        setEditingId(null);
        handleClear(); // also loads a fresh employee ID + password
    };

    // =================================================
    // SAVE TEACHER
    //
    // Adding  -> POST /teachers
    // Editing -> PUT  /teachers/<id>
    // =================================================
    const handleSaveAndAddTeacher = async (e) => {
        e.preventDefault();
        setMessage(null);

        // ---------- VALIDATION ----------
        if (
            !form.firstName.trim() ||
            !form.email.trim() ||
            !form.username.trim()
        ) {
            setMessage({
                type: "error",
                text: "Name, email and username are required.",
            });
            return;
        }

        // ---------- PASSWORD (only needed when ADDING) ----------
        const passwordToSave = form.password;

        if (!isEditing && !passwordToSave) {
            setMessage({
                type: "error",
                text:
                    "Password is not ready yet. Click Regenerate, and check that Flask is running.",
            });
            return;
        }

        // ---------- CLASSES ----------
        let classesToSave = [...form.assignedClasses];

        if (classDraft.level) {
            const stream = classDraft.stream.trim();

            const alreadyAdded = classesToSave.some(
                (c) =>
                    c.level === classDraft.level &&
                    (c.stream || "").toLowerCase() === stream.toLowerCase()
            );

            if (!alreadyAdded) {
                classesToSave.push({
                    level: classDraft.level,
                    stream,
                });
            }
        }

        // ---------- PAYLOAD ----------
        const payload = {
            firstName: form.firstName.trim(),
            dateOfBirth: form.dateOfBirth,
            email: form.email.trim(),
            phone: form.phone.trim(),
            designation: form.designation,
            assignedClasses: isBursar ? [] : classesToSave,
            subjects: isBursar ? [] : form.subjects,
            role: isBursar ? "" : form.role,
            username: form.username.trim(),
        };

        // the password is only sent when creating a new teacher
        if (!isEditing) {
            payload.password = passwordToSave;
        }

        // ---------- SEND ----------
        try {
            setSaving(true);

            const response = await fetch(
                isEditing
                    ? `${API_URL}/teachers/${editingId}`
                    : `${API_URL}/teachers`,
                {
                    method: isEditing ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                setMessage({
                    type: "error",
                    text: result.error || "Could not save the teacher.",
                });
                return;
            }

            const savedTeacher = result.teacher;

            // ---------- EDIT FINISHED ----------
            if (isEditing) {
                await loadTeachers();

                setEditingId(null);
                setForm(EMPTY_FORM);
                setClassDraft(EMPTY_CLASS_DRAFT);
                setShowPassword(false);

                await loadCredentials();

                setMessage({
                    type: "success",
                    text: `${savedTeacher.firstName} was updated.`,
                });
                return;
            }

            // ---------- NEW TEACHER SAVED ----------
            // keep the real password in memory (by id AND employee id)
            if (savedTeacher?.id) {
                passwordCache.current[savedTeacher.id] = passwordToSave;
            }

            if (savedTeacher?.employeeId) {
                passwordCache.current[savedTeacher.employeeId] =
                    passwordToSave;
            }

            await loadTeachers();

            setForm(EMPTY_FORM);
            setClassDraft(EMPTY_CLASS_DRAFT);
            setShowPassword(false);

            await loadCredentials();

            setMessage({
                type: "success",
                text: `${savedTeacher.firstName} was added. Employee ID: ${savedTeacher.employeeId}. Password: ${passwordToSave}`,
            });
        } catch (error) {
            console.error("Save teacher error:", error);
            setMessage({
                type: "error",
                text: "Cannot reach the server. Check that Flask is running.",
            });
        } finally {
            setSaving(false);
        }
    };

    // =================================================
    // PASSWORD VISIBILITY (eye button)
    // =================================================
    const togglePasswordVisibility = (id) => {
        setVisiblePasswordId((previousId) =>
            previousId === id ? null : id
        );
    };

    // =================================================
    // RESET A TEACHER'S PASSWORD
    //
    // POST /teachers/<id>/reset-password
    //
    // Flask makes a new password, saves only its hash,
    // and sends the plain password back ONE time.
    // We keep it in memory and show it right away.
    // =================================================
    const handleResetPassword = async (teacher) => {
        const ok = window.confirm(
            `Reset the password for ${teacher.firstName}?\n\nTheir current password will stop working immediately.`
        );

        if (!ok) {
            return;
        }

        try {
            setResettingId(teacher.id);
            setMessage(null);

            const response = await fetch(
                `${API_URL}/teachers/${teacher.id}/reset-password`,
                {
                    method: "POST",
                    // add your auth header here if your other
                    // admin routes need one
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setMessage({
                    type: "error",
                    text:
                        data.message ||
                        data.error ||
                        "Could not reset the password.",
                });
                return;
            }

            const newPassword = data.password;

            // remember it in memory (by id AND employee id)
            passwordCache.current[teacher.id] = newPassword;

            if (teacher.employeeId) {
                passwordCache.current[teacher.employeeId] = newPassword;
            }

            // update this teacher in the table
            setTeachers((prev) =>
                prev.map((t) =>
                    t.id === teacher.id
                        ? { ...t, password: newPassword }
                        : t
                )
            );

            // show the new password straight away
            setVisiblePasswordId(teacher.id);

            setMessage({
                type: "success",
                text: `New password for ${teacher.firstName} (${teacher.username}): ${newPassword}`,
            });
        } catch (error) {
            console.error("Reset password error:", error);
            setMessage({
                type: "error",
                text: "Cannot reach the server. Check that Flask is running.",
            });
        } finally {
            setResettingId(null);
        }
    };

    // =================================================
    // DELETE A TEACHER (REAL, SAVED IN THE DATABASE)
    //
    // DELETE /teachers/<id>
    // =================================================
    const handleDeleteTeacher = async (teacher) => {
        const ok = window.confirm(
            `Delete ${teacher.firstName}?\n\nThis cannot be undone.`
        );

        if (!ok) {
            return;
        }

        try {
            setMessage(null);

            const response = await fetch(
                `${API_URL}/teachers/${teacher.id}`,
                {
                    method: "DELETE",
                    // add your auth header here if your other
                    // admin routes need one
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setMessage({
                    type: "error",
                    text: data.error || "Could not delete the teacher.",
                });
                return;
            }

            // remove from the table
            setTeachers((prev) =>
                prev.filter((t) => t.id !== teacher.id)
            );

            // forget the remembered password
            delete passwordCache.current[teacher.id];

            if (teacher.employeeId) {
                delete passwordCache.current[teacher.employeeId];
            }

            if (visiblePasswordId === teacher.id) {
                setVisiblePasswordId(null);
            }

            // if this teacher was open in the form, close the form
            if (editingId === teacher.id) {
                handleCancelEdit();
            } else {
                loadCredentials(); // refresh the next employee ID
            }

            setMessage({
                type: "success",
                text: `${teacher.firstName} was deleted.`,
            });
        } catch (error) {
            console.error("DELETE /teachers error:", error);
            setMessage({
                type: "error",
                text: "Cannot reach the server. Check that Flask is running.",
            });
        }
    };

    // =================================================
    // ACTIVE / INACTIVE (REAL, SAVED IN THE DATABASE)
    //
    // PATCH /teachers/<id>/status
    // body: { "active": true | false }
    // =================================================
    const handleToggleActive = async (teacher) => {
        const newActive = !teacher.active;

        // change the badge right away so it feels fast
        setTeachers((prev) =>
            prev.map((t) =>
                t.id === teacher.id ? { ...t, active: newActive } : t
            )
        );

        try {
            const response = await fetch(
                `${API_URL}/teachers/${teacher.id}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ active: newActive }),
                }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(
                    data.error || "Could not change the status."
                );
            }
        } catch (error) {
            // the server said no, so put the old status back
            setTeachers((prev) =>
                prev.map((t) =>
                    t.id === teacher.id
                        ? { ...t, active: teacher.active }
                        : t
                )
            );

            setMessage({
                type: "error",
                text: error.message || "Could not change the status.",
            });
        }
    };

    // =================================================
    // FILTERED TEACHERS
    // =================================================
    const filteredTeachers = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();
        const streamQuery = streamFilter.trim().toLowerCase();

        return teachers.filter((teacher) => {
            const matchesSearch =
                search === "" ||
                (teacher.firstName || "").toLowerCase().includes(search) ||
                (teacher.email || "").toLowerCase().includes(search);

            const matchesClass =
                (classFilter === "" && streamQuery === "") ||
                (teacher.assignedClasses || []).some(
                    (c) =>
                        (classFilter === "" || c.level === classFilter) &&
                        (streamQuery === "" ||
                            (c.stream || "")
                                .toLowerCase()
                                .includes(streamQuery))
                );

            const matchesRole =
                roleFilter === "All Roles" ||
                (teacher.roles || []).some((r) =>
                    r.toLowerCase().includes(roleFilter.toLowerCase())
                );

            return matchesSearch && matchesClass && matchesRole;
        });
    }, [teachers, searchTerm, classFilter, streamFilter, roleFilter]);

    // =================================================
    // RENDER
    // =================================================
    return (
        <Layout role="admin">
            <div className="teacher-mgmt-content">
                {/* PAGE HEADER */}
                <header className="tm-page-header">
                    <h1 className="tm-page-title">Teacher Management</h1>
                    <h2 className="tm-section-title">
                        {isEditing ? "Edit Teacher" : "Add New Teacher"}
                    </h2>
                </header>

                {/* FORM */}
                <form
                    ref={formRef}
                    className="tm-form-card"
                    onSubmit={handleSaveAndAddTeacher}
                >
                    <div className="tm-form-grid">
                        {/* PERSONAL DETAILS */}
                        <fieldset className="tm-fieldset">
                            <legend>Personal Details</legend>

                            <label className="tm-field">
                                <span className="tm-field-label">Name</span>
                                <input
                                    type="text"
                                    placeholder="First Name"
                                    value={form.firstName}
                                    onChange={updateField("firstName")}
                                />
                            </label>

                            <label className="tm-field">
                                <span className="tm-field-label">
                                    Date of Birth
                                </span>
                                <div className="tm-field-with-icon">
                                    <input
                                        type="date"
                                        value={form.dateOfBirth}
                                        onChange={updateField("dateOfBirth")}
                                    />
                                </div>
                            </label>

                            <div className="tm-field-row">
                                <label className="tm-field">
                                    <span className="tm-field-label">
                                        Email
                                    </span>
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        value={form.email}
                                        onChange={updateField("email")}
                                    />
                                </label>

                                <label className="tm-field">
                                    <span className="tm-field-label">
                                        Phone
                                    </span>
                                    <input
                                        type="tel"
                                        placeholder="Phone"
                                        value={form.phone}
                                        onChange={updateField("phone")}
                                    />
                                </label>
                            </div>
                        </fieldset>

                        {/* PROFESSIONAL DETAILS */}
                        <fieldset className="tm-fieldset">
                            <legend>Professional Details</legend>

                            <label className="tm-field">
                                <span className="tm-field-label">
                                    Employee ID
                                </span>
                                <input
                                    type="text"
                                    placeholder="Generated automatically"
                                    value={employeeId}
                                    disabled
                                    readOnly
                                />
                            </label>

                            <label className="tm-field">
                                <span className="tm-field-label">
                                    Designation
                                </span>
                                <div className="tm-select-wrapper">
                                    <select
                                        value={form.designation}
                                        onChange={updateField("designation")}
                                    >
                                        <option value="">
                                            Select designation
                                        </option>
                                        {DESIGNATION_OPTIONS.map((d) => (
                                            <option
                                                key={d.value}
                                                value={d.value}
                                            >
                                                {d.label}
                                            </option>
                                        ))}
                                    </select>
                                    <FaChevronDown className="tm-select-caret" />
                                </div>
                            </label>

                            {!isBursar && (
                                <div className="tm-field">
                                    <span className="tm-field-label">
                                        Assigned Subjects
                                        <span className="tm-optional">
                                            {" "}
                                            (pick one or more)
                                        </span>
                                    </span>
                                    <div className="tm-check-group">
                                        {SUBJECT_OPTIONS.map((subject) => (
                                            <label
                                                key={subject}
                                                className={`tm-check-chip ${
                                                    form.subjects.includes(
                                                        subject
                                                    )
                                                        ? "is-selected"
                                                        : ""
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={form.subjects.includes(
                                                        subject
                                                    )}
                                                    onChange={() =>
                                                        handleToggleSubject(
                                                            subject
                                                        )
                                                    }
                                                />
                                                {subject}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </fieldset>

                        {/* ROLE & LOGIN SETTINGS */}
                        <fieldset className="tm-fieldset">
                            <legend>Role &amp; Login Settings</legend>

                            {!isBursar && (
                                <div className="tm-field">
                                    <span className="tm-field-label">
                                        Assigned Classes
                                        <span className="tm-optional">
                                            {" "}
                                            (add one or more)
                                        </span>
                                    </span>

                                    <div className="tm-class-adder">
                                        <div className="tm-select-wrapper">
                                            <select
                                                value={classDraft.level}
                                                onChange={updateClassDraft(
                                                    "level"
                                                )}
                                            >
                                                <option value="">
                                                    Select a class
                                                </option>
                                                {CLASS_OPTIONS.map((cls) => (
                                                    <option
                                                        key={cls}
                                                        value={cls}
                                                    >
                                                        {cls}
                                                    </option>
                                                ))}
                                            </select>
                                            <FaChevronDown className="tm-select-caret" />
                                        </div>

                                        <input
                                            type="text"
                                            placeholder="Stream (optional)"
                                            value={classDraft.stream}
                                            onChange={updateClassDraft(
                                                "stream"
                                            )}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleAddClass();
                                                }
                                            }}
                                            disabled={!classDraft.level}
                                            maxLength={20}
                                        />

                                        <button
                                            type="button"
                                            className="tm-generate-btn"
                                            onClick={handleAddClass}
                                            disabled={!classDraft.level}
                                        >
                                            Add
                                        </button>
                                    </div>

                                    {form.assignedClasses.length > 0 && (
                                        <div className="tm-chip-list">
                                            {form.assignedClasses.map(
                                                (c, index) => (
                                                    <span
                                                        className="tm-chip"
                                                        key={`${c.level}-${c.stream}-${index}`}
                                                    >
                                                        {formatClass(c)}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleRemoveClass(
                                                                    index
                                                                )
                                                            }
                                                            aria-label={`Remove ${formatClass(
                                                                c
                                                            )}`}
                                                        >
                                                            <FaTimes />
                                                        </button>
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="tm-field-row">
                                {!isBursar && (
                                    <label className="tm-field">
                                        <span className="tm-field-label">
                                            Role
                                        </span>
                                        <div className="tm-select-wrapper">
                                            <select
                                                value={form.role}
                                                onChange={updateField("role")}
                                            >
                                                <option value="">
                                                    Select role
                                                </option>
                                                {ROLE_OPTIONS.map((role) => (
                                                    <option
                                                        key={role}
                                                        value={role}
                                                    >
                                                        {role}
                                                    </option>
                                                ))}
                                            </select>
                                            <FaChevronDown className="tm-select-caret" />
                                        </div>
                                    </label>
                                )}

                                <label className="tm-field">
                                    <span className="tm-field-label">
                                        Username
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        value={form.username}
                                        onChange={updateField("username")}
                                    />
                                </label>
                            </div>

                            {/* LOGIN PASSWORD
                                - Adding: shows the generated password
                                - Editing: password is not changed here */}
                            {!isEditing ? (
                                <label className="tm-field">
                                    <span className="tm-field-label">
                                        Login Password
                                    </span>
                                    <div className="tm-password-row">
                                        <div className="tm-field-with-icon tm-password-input">
                                            <input
                                                type={
                                                    showPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                placeholder="Generated automatically"
                                                value={form.password}
                                                readOnly
                                            />
                                            <button
                                                type="button"
                                                className="tm-icon-btn"
                                                onClick={() =>
                                                    setShowPassword(
                                                        (v) => !v
                                                    )
                                                }
                                                aria-label={
                                                    showPassword
                                                        ? "Hide password"
                                                        : "Show password"
                                                }
                                            >
                                                {showPassword ? (
                                                    <FaEyeSlash />
                                                ) : (
                                                    <FaEye />
                                                )}
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            className="tm-generate-btn"
                                            onClick={handleGeneratePassword}
                                        >
                                            Regenerate
                                        </button>
                                    </div>
                                </label>
                            ) : (
                                <div className="tm-field">
                                    <span className="tm-field-label">
                                        Login Password
                                    </span>
                                    <span className="tm-teacher-email">
                                        Not changed here. Use the reset icon
                                        in the table.
                                    </span>
                                </div>
                            )}
                        </fieldset>
                    </div>

                    {/* MESSAGE */}
                    {message && (
                        <div
                            className={`tm-message tm-message--${message.type}`}
                            role={
                                message.type === "error"
                                    ? "alert"
                                    : "status"
                            }
                        >
                            {message.text}
                        </div>
                    )}

                    {/* FORM BUTTONS */}
                    <div className="tm-form-actions">
                        <button
                            type="submit"
                            className="tm-btn-primary"
                            disabled={saving}
                        >
                            <FaUserPlus />
                            {saving
                                ? "Saving..."
                                : isEditing
                                    ? "Save Changes"
                                    : "Save & Add Teacher"}
                        </button>

                        <button
                            type="button"
                            className="tm-btn-text"
                            onClick={
                                isEditing ? handleCancelEdit : handleClear
                            }
                            disabled={saving}
                        >
                            {isEditing ? "Cancel" : "Clear"}
                        </button>
                    </div>
                </form>

                {/* TEACHER TABLE */}
                <section className="tm-table-card">
                    <div className="tm-table-header">
                        <h3 className="tm-table-title">
                            Teachers Added to the System
                        </h3>

                        <div className="tm-table-controls">
                            {/* SEARCH */}
                            <label className="tm-control">
                                <span className="tm-control-label">
                                    Search
                                </span>
                                <div className="tm-search-input">
                                    <FaSearch className="tm-search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search"
                                        value={searchTerm}
                                        onChange={(e) =>
                                            setSearchTerm(e.target.value)
                                        }
                                    />
                                </div>
                            </label>

                            {/* CLASS */}
                            <label className="tm-control">
                                <span className="tm-control-label">
                                    Filter by Class
                                </span>
                                <div className="tm-chip-select">
                                    {classFilter ? (
                                        <span className="tm-chip">
                                            {classFilter}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setClassFilter("")
                                                }
                                                aria-label="Clear class filter"
                                            >
                                                <FaTimes />
                                            </button>
                                        </span>
                                    ) : (
                                        <div className="tm-select-wrapper tm-select-wrapper--compact">
                                            <select
                                                value={classFilter}
                                                onChange={(e) =>
                                                    setClassFilter(
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    All Classes
                                                </option>
                                                {CLASS_OPTIONS.map((cls) => (
                                                    <option
                                                        key={cls}
                                                        value={cls}
                                                    >
                                                        {cls}
                                                    </option>
                                                ))}
                                            </select>
                                            <FaChevronDown className="tm-select-caret" />
                                        </div>
                                    )}
                                </div>
                            </label>

                            {/* STREAM */}
                            <label className="tm-control">
                                <span className="tm-control-label">
                                    Filter by Stream
                                </span>
                                <div className="tm-search-input">
                                    <FaSearch className="tm-search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Any stream"
                                        value={streamFilter}
                                        onChange={(e) =>
                                            setStreamFilter(e.target.value)
                                        }
                                    />
                                </div>
                            </label>

                            {/* ROLE */}
                            <label className="tm-control">
                                <span className="tm-control-label">
                                    Filter by Role
                                </span>
                                <div className="tm-select-wrapper tm-select-wrapper--compact">
                                    <select
                                        value={roleFilter}
                                        onChange={(e) =>
                                            setRoleFilter(e.target.value)
                                        }
                                    >
                                        <option>All Roles</option>
                                        {ROLE_OPTIONS.map((role) => (
                                            <option key={role}>{role}</option>
                                        ))}
                                    </select>
                                    <FaChevronDown className="tm-select-caret" />
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="tm-table-scroll">
                        <table className="tm-table">
                            <thead>
                            <tr>
                                <th>Teacher</th>
                                <th>Assigned Classes</th>
                                <th>Subjects</th>
                                <th>Roles</th>
                                <th>Login Credentials</th>
                                <th>Status</th>
                                <th className="tm-actions-col">
                                    Actions
                                </th>
                            </tr>
                            </thead>

                            <tbody>
                            {/* LOADING */}
                            {loadingTeachers && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="tm-empty-row"
                                    >
                                        Loading teachers...
                                    </td>
                                </tr>
                            )}

                            {/* EMPTY */}
                            {!loadingTeachers &&
                                filteredTeachers.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="tm-empty-row"
                                        >
                                            No teachers match your search
                                            or filters.
                                        </td>
                                    </tr>
                                )}

                            {/* TEACHERS */}
                            {!loadingTeachers &&
                                filteredTeachers.map((teacher) => {
                                    // the real plain password, if we
                                    // know it in this browser session
                                    const realPassword =
                                        teacher.password ||
                                        passwordCache.current[
                                            teacher.id
                                            ] ||
                                        (teacher.employeeId
                                            ? passwordCache.current[
                                                teacher.employeeId
                                                ]
                                            : "") ||
                                        "";

                                    const isPasswordVisible =
                                        visiblePasswordId === teacher.id;

                                    const isResetting =
                                        resettingId === teacher.id;

                                    return (
                                        <tr key={teacher.id}>
                                            {/* TEACHER */}
                                            <td>
                                                <div className="tm-teacher-cell">
                                                    <div className="tm-avatar">
                                                        {(
                                                            teacher.firstName ||
                                                            "?"
                                                        )
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="tm-teacher-name">
                                                            {
                                                                teacher.firstName
                                                            }
                                                        </div>
                                                        <div className="tm-teacher-email">
                                                            {teacher.email}
                                                        </div>
                                                        {(teacher.employeeId ||
                                                            teacher.designation) && (
                                                            <div className="tm-teacher-email">
                                                                {[
                                                                    teacher.employeeId,
                                                                    designationLabel(
                                                                        teacher.designation
                                                                    ),
                                                                ]
                                                                    .filter(
                                                                        Boolean
                                                                    )
                                                                    .join(
                                                                        " - "
                                                                    )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* CLASSES */}
                                            <td>
                                                {(
                                                    teacher.assignedClasses ||
                                                    []
                                                )
                                                    .map(formatClass)
                                                    .join(", ") || "—"}
                                            </td>

                                            {/* SUBJECTS */}
                                            <td>
                                                {(
                                                    teacher.subjects || []
                                                ).join(", ") || "—"}
                                            </td>

                                            {/* ROLES */}
                                            <td>
                                                {(
                                                    teacher.roles || []
                                                ).join(", ") || "—"}
                                            </td>

                                            {/* LOGIN CREDENTIALS */}
                                            <td>
                                                <div className="tm-credentials-cell">
                                                        <span>
                                                            {teacher.username}
                                                        </span>

                                                    <span className="tm-credentials-sep">
                                                            /
                                                        </span>

                                                    <span className="tm-password-dots">
                                                            {isPasswordVisible
                                                                ? realPassword ||
                                                                "Password unavailable"
                                                                : "••••••••"}
                                                        </span>

                                                    <button
                                                        type="button"
                                                        className="tm-icon-btn tm-icon-btn--muted"
                                                        onClick={() =>
                                                            togglePasswordVisibility(
                                                                teacher.id
                                                            )
                                                        }
                                                        aria-label={
                                                            isPasswordVisible
                                                                ? "Hide password"
                                                                : "Show password"
                                                        }
                                                        title={
                                                            isPasswordVisible
                                                                ? "Hide password"
                                                                : "Show password"
                                                        }
                                                    >
                                                        {isPasswordVisible ? (
                                                            <FaEyeSlash />
                                                        ) : (
                                                            <FaEye />
                                                        )}
                                                    </button>

                                                    {/* RESET BUTTON */}
                                                    <button
                                                        type="button"
                                                        className="tm-icon-btn tm-icon-btn--muted"
                                                        onClick={() =>
                                                            handleResetPassword(
                                                                teacher
                                                            )
                                                        }
                                                        disabled={
                                                            isResetting
                                                        }
                                                        aria-label={`Reset password for ${teacher.firstName}`}
                                                        title={
                                                            isResetting
                                                                ? "Resetting..."
                                                                : "Reset password"
                                                        }
                                                    >
                                                        <FaSyncAlt />
                                                    </button>
                                                </div>

                                                {/* hint when the password is not known */}
                                                {isPasswordVisible &&
                                                    !realPassword && (
                                                        <div className="tm-teacher-email">
                                                            Click the
                                                            reset icon to
                                                            create a new
                                                            password.
                                                        </div>
                                                    )}
                                            </td>

                                            {/* STATUS (saved in the database) */}
                                            <td>
                                                <button
                                                    type="button"
                                                    className={`tm-status-badge ${
                                                        teacher.active
                                                            ? "is-active"
                                                            : "is-inactive"
                                                    }`}
                                                    onClick={() =>
                                                        handleToggleActive(
                                                            teacher
                                                        )
                                                    }
                                                >
                                                    {teacher.active
                                                        ? "Active"
                                                        : "Inactive"}
                                                </button>
                                            </td>

                                            {/* ACTIONS (edit + delete work with the database) */}
                                            <td>
                                                <div className="tm-row-actions">
                                                    <button
                                                        type="button"
                                                        className="tm-icon-btn tm-icon-btn--edit"
                                                        onClick={() =>
                                                            handleEditTeacher(
                                                                teacher
                                                            )
                                                        }
                                                        aria-label={`Edit ${teacher.firstName}`}
                                                        title="Edit"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="tm-icon-btn tm-icon-btn--delete"
                                                        onClick={() =>
                                                            handleDeleteTeacher(
                                                                teacher
                                                            )
                                                        }
                                                        aria-label={`Delete ${teacher.firstName}`}
                                                        title="Delete"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </Layout>
    );
};

export default AddTeacherPage;