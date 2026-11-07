
import React, {
    useState,
    useMemo,
    useEffect,
    useRef,
    useCallback,
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
const API_BASE = (
    import.meta.env.VITE_API_URL || ""
).replace(/\/+$/, "");

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

const getToken = () => localStorage.getItem("token") || "";

const getAuthHeaders = (extraHeaders = {}) => {
    const token = getToken();

    return {
        ...extraHeaders,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const readResponse = async (response) => {
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
        throw new Error(
            "Your login session may have expired. Please log in again."
        );
    }

    if (response.status === 403) {
        throw new Error(
            data.error || data.message ||
            "You are not authorized to perform this action."
        );
    }

    if (!response.ok) {
        throw new Error(
            data.error || data.message || "The request failed."
        );
    }

    return data;
};

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

const EMPTY_CLASS_DRAFT = {
    level: "",
    stream: "",
};

// =====================================================
// COMPONENT
// =====================================================
const AddTeacherPage = () => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [classDraft, setClassDraft] = useState(EMPTY_CLASS_DRAFT);
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [employeeId, setEmployeeId] = useState("");

    const [editingId, setEditingId] = useState(null);
    const formRef = useRef(null);

    const isBursar = form.designation === "bursar";
    const isEditing = editingId !== null;

    const [teachers, setTeachers] = useState([]);
    const [loadingTeachers, setLoadingTeachers] = useState(false);
    const [visiblePasswordId, setVisiblePasswordId] = useState(null);
    const [resettingId, setResettingId] = useState(null);

    // Plain passwords are kept in memory only.
    const passwordCache = useRef({});

    const [searchTerm, setSearchTerm] = useState("");
    const [classFilter, setClassFilter] = useState("");
    const [streamFilter, setStreamFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState("All Roles");

    // =================================================
    // LOAD TEACHERS
    // GET /teachers
    // =================================================
    const loadTeachers = useCallback(async () => {
        try {
            setLoadingTeachers(true);

            const response = await fetch(`${API_BASE}/teachers`, {
                method: "GET",
                headers: getAuthHeaders(),
            });

            const data = await readResponse(response);

            const databaseTeachers = Array.isArray(data.teachers)
                ? data.teachers
                : [];

            const teachersWithPasswords = databaseTeachers.map((teacher) => {
                const cachedPassword =
                    passwordCache.current[teacher.id] ||
                    passwordCache.current[teacher.employeeId] ||
                    "";

                return {
                    ...teacher,
                    password: cachedPassword,
                };
            });

            setTeachers(teachersWithPasswords);
        } catch (error) {
            console.error("Load teachers error:", error);

            setMessage({
                type: "error",
                text: error.message || "Could not load teachers.",
            });
        } finally {
            setLoadingTeachers(false);
        }
    }, []);

    // =================================================
    // LOAD NEXT EMPLOYEE ID + PASSWORD
    // GET /teachers/next-credentials
    // =================================================
    const loadCredentials = useCallback(async () => {
        try {
            const response = await fetch(
                `${API_BASE}/teachers/next-credentials`,
                {
                    method: "GET",
                    headers: getAuthHeaders(),
                }
            );

            const data = await readResponse(response);

            if (data.employeeId) {
                setEmployeeId(data.employeeId);
            }

            if (data.password) {
                setForm((prev) => ({
                    ...prev,
                    password: data.password,
                }));
            }
        } catch (error) {
            console.error("Load credentials error:", error);
        }
    }, []);

    // =================================================
    // PAGE LOAD
    // =================================================
    useEffect(() => {
        loadTeachers();
        loadCredentials();
    }, [loadTeachers, loadCredentials]);

    // =================================================
    // FORM HANDLER
    // =================================================
    const updateField = (field) => (e) => {
        setForm((prev) => ({
            ...prev,
            [field]: e.target.value,
        }));
    };

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
    // ADD / REMOVE CLASS
    // =================================================
    const handleAddClass = () => {
        if (!classDraft.level) return;

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
    // PASSWORD / CLEAR FORM
    // =================================================
    const handleGeneratePassword = async () => {
        await loadCredentials();
        setShowPassword(true);
    };

    const handleClear = () => {
        setForm(EMPTY_FORM);
        setClassDraft(EMPTY_CLASS_DRAFT);
        setShowPassword(false);
        setMessage(null);
        loadCredentials();
    };

    // =================================================
    // EDIT TEACHER
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

    const handleCancelEdit = () => {
        setEditingId(null);
        handleClear();
    };

    // =================================================
    // SAVE TEACHER
    // POST /teachers OR PUT /teachers/:id
    // =================================================
    const handleSaveAndAddTeacher = async (e) => {
        e.preventDefault();
        setMessage(null);

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

        const passwordToSave = form.password;

        if (!isEditing && !passwordToSave) {
            setMessage({
                type: "error",
                text: "Password is not ready yet. Click Regenerate.",
            });
            return;
        }

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

        if (!isEditing) {
            payload.password = passwordToSave;
        }

        try {
            setSaving(true);

            const response = await fetch(
                isEditing
                    ? `${API_BASE}/teachers/${editingId}`
                    : `${API_BASE}/teachers`,
                {
                    method: isEditing ? "PUT" : "POST",
                    headers: getAuthHeaders({
                        "Content-Type": "application/json",
                    }),
                    body: JSON.stringify(payload),
                }
            );

            const result = await readResponse(response);
            const savedTeacher = result.teacher;

            if (!savedTeacher) {
                throw new Error(
                    "The server saved the request but did not return teacher details."
                );
            }

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

            if (savedTeacher.id) {
                passwordCache.current[savedTeacher.id] = passwordToSave;
            }

            if (savedTeacher.employeeId) {
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
                text: `${savedTeacher.firstName} was added. Employee ID: ${savedTeacher.employeeId || employeeId}. Password: ${passwordToSave}`,
            });
        } catch (error) {
            console.error("Save teacher error:", error);

            setMessage({
                type: "error",
                text: error.message || "Could not save the teacher.",
            });
        } finally {
            setSaving(false);
        }
    };

    // =================================================
    // PASSWORD VISIBILITY
    // =================================================
    const togglePasswordVisibility = (id) => {
        setVisiblePasswordId((previousId) =>
            previousId === id ? null : id
        );
    };

    // =================================================
    // RESET PASSWORD
    // POST /teachers/:id/reset-password
    // =================================================
    const handleResetPassword = async (teacher) => {
        const ok = window.confirm(
            `Reset the password for ${teacher.firstName}?\n\nTheir current password will stop working immediately.`
        );

        if (!ok) return;

        try {
            setResettingId(teacher.id);
            setMessage(null);

            const response = await fetch(
                `${API_BASE}/teachers/${teacher.id}/reset-password`,
                {
                    method: "POST",
                    headers: getAuthHeaders(),
                }
            );

            const data = await readResponse(response);
            const newPassword = data.password;

            if (!newPassword) {
                throw new Error(
                    "The server did not return the new password."
                );
            }

            passwordCache.current[teacher.id] = newPassword;

            if (teacher.employeeId) {
                passwordCache.current[teacher.employeeId] = newPassword;
            }

            setTeachers((prev) =>
                prev.map((t) =>
                    t.id === teacher.id
                        ? { ...t, password: newPassword }
                        : t
                )
            );

            setVisiblePasswordId(teacher.id);

            setMessage({
                type: "success",
                text: `New password for ${teacher.firstName} (${teacher.username}): ${newPassword}`,
            });
        } catch (error) {
            console.error("Reset password error:", error);

            setMessage({
                type: "error",
                text: error.message || "Could not reset the password.",
            });
        } finally {
            setResettingId(null);
        }
    };

    // =================================================
    // DELETE TEACHER
    // DELETE /teachers/:id
    // =================================================
    const handleDeleteTeacher = async (teacher) => {
        const ok = window.confirm(
            `Delete ${teacher.firstName}?\n\nThis cannot be undone.`
        );

        if (!ok) return;

        try {
            setMessage(null);

            const response = await fetch(
                `${API_BASE}/teachers/${teacher.id}`,
                {
                    method: "DELETE",
                    headers: getAuthHeaders(),
                }
            );

            await readResponse(response);

            setTeachers((prev) =>
                prev.filter((t) => t.id !== teacher.id)
            );

            delete passwordCache.current[teacher.id];

            if (teacher.employeeId) {
                delete passwordCache.current[teacher.employeeId];
            }

            if (visiblePasswordId === teacher.id) {
                setVisiblePasswordId(null);
            }

            if (editingId === teacher.id) {
                setEditingId(null);
                setForm(EMPTY_FORM);
                setClassDraft(EMPTY_CLASS_DRAFT);
            }

            await loadCredentials();

            setMessage({
                type: "success",
                text: `${teacher.firstName} was deleted.`,
            });
        } catch (error) {
            console.error("Delete teacher error:", error);

            setMessage({
                type: "error",
                text: error.message || "Could not delete the teacher.",
            });
        }
    };

    // =================================================
    // ACTIVE / INACTIVE STATUS
    // PATCH /teachers/:id/status
    // =================================================
    const handleToggleActive = async (teacher) => {
        const newActive = !teacher.active;

        setTeachers((prev) =>
            prev.map((t) =>
                t.id === teacher.id ? { ...t, active: newActive } : t
            )
        );

        try {
            const response = await fetch(
                `${API_BASE}/teachers/${teacher.id}/status`,
                {
                    method: "PATCH",
                    headers: getAuthHeaders({
                        "Content-Type": "application/json",
                    }),
                    body: JSON.stringify({ active: newActive }),
                }
            );

            await readResponse(response);
        } catch (error) {
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
    // FILTER TEACHERS
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
                <header className="tm-page-header">
                    <h1 className="tm-page-title">Teacher Management</h1>
                    <h2 className="tm-section-title">
                        {isEditing ? "Edit Teacher" : "Add New Teacher"}
                    </h2>
                </header>

                <form
                    ref={formRef}
                    className="tm-form-card"
                    onSubmit={handleSaveAndAddTeacher}
                >
                    <div className="tm-form-grid">
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
                                <span className="tm-field-label">Date of Birth</span>
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
                                    <span className="tm-field-label">Email</span>
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        value={form.email}
                                        onChange={updateField("email")}
                                    />
                                </label>

                                <label className="tm-field">
                                    <span className="tm-field-label">Phone</span>
                                    <input
                                        type="tel"
                                        placeholder="Phone"
                                        value={form.phone}
                                        onChange={updateField("phone")}
                                    />
                                </label>
                            </div>
                        </fieldset>

                        <fieldset className="tm-fieldset">
                            <legend>Professional Details</legend>

                            <label className="tm-field">
                                <span className="tm-field-label">Employee ID</span>
                                <input
                                    type="text"
                                    placeholder="Generated automatically"
                                    value={employeeId}
                                    disabled
                                    readOnly
                                />
                            </label>

                            <label className="tm-field">
                                <span className="tm-field-label">Designation</span>
                                <div className="tm-select-wrapper">
                                    <select
                                        value={form.designation}
                                        onChange={updateField("designation")}
                                    >
                                        <option value="">Select designation</option>
                                        {DESIGNATION_OPTIONS.map((d) => (
                                            <option key={d.value} value={d.value}>
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
                                        <span className="tm-optional"> (pick one or more)</span>
                                    </span>

                                    <div className="tm-check-group">
                                        {SUBJECT_OPTIONS.map((subject) => (
                                            <label
                                                key={subject}
                                                className={`tm-check-chip ${
                                                    form.subjects.includes(subject)
                                                        ? "is-selected"
                                                        : ""
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={form.subjects.includes(subject)}
                                                    onChange={() => handleToggleSubject(subject)}
                                                />
                                                {subject}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </fieldset>

                        <fieldset className="tm-fieldset">
                            <legend>Role &amp; Login Settings</legend>

                            {!isBursar && (
                                <div className="tm-field">
                                    <span className="tm-field-label">
                                        Assigned Classes
                                        <span className="tm-optional"> (add one or more)</span>
                                    </span>

                                    <div className="tm-class-adder">
                                        <div className="tm-select-wrapper">
                                            <select
                                                value={classDraft.level}
                                                onChange={updateClassDraft("level")}
                                            >
                                                <option value="">Select a class</option>
                                                {CLASS_OPTIONS.map((cls) => (
                                                    <option key={cls} value={cls}>
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
                                            onChange={updateClassDraft("stream")}
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
                                            {form.assignedClasses.map((c, index) => (
                                                <span
                                                    className="tm-chip"
                                                    key={`${c.level}-${c.stream}-${index}`}
                                                >
                                                    {formatClass(c)}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveClass(index)}
                                                        aria-label={`Remove ${formatClass(c)}`}
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="tm-field-row">
                                {!isBursar && (
                                    <label className="tm-field">
                                        <span className="tm-field-label">Role</span>
                                        <div className="tm-select-wrapper">
                                            <select
                                                value={form.role}
                                                onChange={updateField("role")}
                                            >
                                                <option value="">Select role</option>
                                                {ROLE_OPTIONS.map((role) => (
                                                    <option key={role} value={role}>
                                                        {role}
                                                    </option>
                                                ))}
                                            </select>
                                            <FaChevronDown className="tm-select-caret" />
                                        </div>
                                    </label>
                                )}

                                <label className="tm-field">
                                    <span className="tm-field-label">Username</span>
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        value={form.username}
                                        onChange={updateField("username")}
                                    />
                                </label>
                            </div>

                            {!isEditing ? (
                                <label className="tm-field">
                                    <span className="tm-field-label">Login Password</span>
                                    <div className="tm-password-row">
                                        <div className="tm-field-with-icon tm-password-input">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Generated automatically"
                                                value={form.password}
                                                readOnly
                                            />
                                            <button
                                                type="button"
                                                className="tm-icon-btn"
                                                onClick={() => setShowPassword((v) => !v)}
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? <FaEyeSlash /> : <FaEye />}
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
                                    <span className="tm-field-label">Login Password</span>
                                    <span className="tm-teacher-email">
                                        Not changed here. Use the reset icon in the table.
                                    </span>
                                </div>
                            )}
                        </fieldset>
                    </div>

                    {message && (
                        <div
                            className={`tm-message tm-message--${message.type}`}
                            role={message.type === "error" ? "alert" : "status"}
                        >
                            {message.text}
                        </div>
                    )}

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
                            onClick={isEditing ? handleCancelEdit : handleClear}
                            disabled={saving}
                        >
                            {isEditing ? "Cancel" : "Clear"}
                        </button>
                    </div>
                </form>

                <section className="tm-table-card">
                    <div className="tm-table-header">
                        <h3 className="tm-table-title">
                            Teachers Added to the System
                        </h3>

                        <div className="tm-table-controls">
                            <label className="tm-control">
                                <span className="tm-control-label">Search</span>
                                <div className="tm-search-input">
                                    <FaSearch className="tm-search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </label>

                            <label className="tm-control">
                                <span className="tm-control-label">Filter by Class</span>
                                <div className="tm-chip-select">
                                    {classFilter ? (
                                        <span className="tm-chip">
                                            {classFilter}
                                            <button
                                                type="button"
                                                onClick={() => setClassFilter("")}
                                                aria-label="Clear class filter"
                                            >
                                                <FaTimes />
                                            </button>
                                        </span>
                                    ) : (
                                        <div className="tm-select-wrapper tm-select-wrapper--compact">
                                            <select
                                                value={classFilter}
                                                onChange={(e) => setClassFilter(e.target.value)}
                                            >
                                                <option value="">All Classes</option>
                                                {CLASS_OPTIONS.map((cls) => (
                                                    <option key={cls} value={cls}>
                                                        {cls}
                                                    </option>
                                                ))}
                                            </select>
                                            <FaChevronDown className="tm-select-caret" />
                                        </div>
                                    )}
                                </div>
                            </label>

                            <label className="tm-control">
                                <span className="tm-control-label">Filter by Stream</span>
                                <div className="tm-search-input">
                                    <FaSearch className="tm-search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Any stream"
                                        value={streamFilter}
                                        onChange={(e) => setStreamFilter(e.target.value)}
                                    />
                                </div>
                            </label>

                            <label className="tm-control">
                                <span className="tm-control-label">Filter by Role</span>
                                <div className="tm-select-wrapper tm-select-wrapper--compact">
                                    <select
                                        value={roleFilter}
                                        onChange={(e) => setRoleFilter(e.target.value)}
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
                                <th className="tm-actions-col">Actions</th>
                            </tr>
                            </thead>

                            <tbody>
                            {loadingTeachers && (
                                <tr>
                                    <td colSpan={7} className="tm-empty-row">
                                        Loading teachers...
                                    </td>
                                </tr>
                            )}

                            {!loadingTeachers && filteredTeachers.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="tm-empty-row">
                                        No teachers match your search or filters.
                                    </td>
                                </tr>
                            )}

                            {!loadingTeachers && filteredTeachers.map((teacher) => {
                                const realPassword =
                                    teacher.password ||
                                    passwordCache.current[teacher.id] ||
                                    passwordCache.current[teacher.employeeId] ||
                                    "";

                                const isPasswordVisible =
                                    visiblePasswordId === teacher.id;

                                const isResetting =
                                    resettingId === teacher.id;

                                return (
                                    <tr key={teacher.id}>
                                        <td>
                                            <div className="tm-teacher-cell">
                                                <div className="tm-avatar">
                                                    {(teacher.firstName || "?")
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="tm-teacher-name">
                                                        {teacher.firstName}
                                                    </div>
                                                    <div className="tm-teacher-email">
                                                        {teacher.email}
                                                    </div>
                                                    {(teacher.employeeId || teacher.designation) && (
                                                        <div className="tm-teacher-email">
                                                            {[
                                                                teacher.employeeId,
                                                                designationLabel(teacher.designation),
                                                            ].filter(Boolean).join(" - ")}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            {(teacher.assignedClasses || [])
                                                .map(formatClass)
                                                .join(", ") || "—"}
                                        </td>

                                        <td>
                                            {(teacher.subjects || []).join(", ") || "—"}
                                        </td>

                                        <td>
                                            {(teacher.roles || []).join(", ") || "—"}
                                        </td>

                                        <td>
                                            <div className="tm-credentials-cell">
                                                <span>{teacher.username}</span>
                                                <span className="tm-credentials-sep">/</span>
                                                <span className="tm-password-dots">
                                                        {isPasswordVisible
                                                            ? realPassword || "Password unavailable"
                                                            : "••••••••"}
                                                    </span>

                                                <button
                                                    type="button"
                                                    className="tm-icon-btn tm-icon-btn--muted"
                                                    onClick={() => togglePasswordVisibility(teacher.id)}
                                                    aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                                                    title={isPasswordVisible ? "Hide password" : "Show password"}
                                                >
                                                    {isPasswordVisible ? <FaEyeSlash /> : <FaEye />}
                                                </button>

                                                <button
                                                    type="button"
                                                    className="tm-icon-btn tm-icon-btn--muted"
                                                    onClick={() => handleResetPassword(teacher)}
                                                    disabled={isResetting}
                                                    aria-label={`Reset password for ${teacher.firstName}`}
                                                    title={isResetting ? "Resetting..." : "Reset password"}
                                                >
                                                    <FaSyncAlt />
                                                </button>
                                            </div>

                                            {isPasswordVisible && !realPassword && (
                                                <div className="tm-teacher-email">
                                                    Click the reset icon to create a new password.
                                                </div>
                                            )}
                                        </td>

                                        <td>
                                            <button
                                                type="button"
                                                className={`tm-status-badge ${
                                                    teacher.active ? "is-active" : "is-inactive"
                                                }`}
                                                onClick={() => handleToggleActive(teacher)}
                                            >
                                                {teacher.active ? "Active" : "Inactive"}
                                            </button>
                                        </td>

                                        <td>
                                            <div className="tm-row-actions">
                                                <button
                                                    type="button"
                                                    className="tm-icon-btn tm-icon-btn--edit"
                                                    onClick={() => handleEditTeacher(teacher)}
                                                    aria-label={`Edit ${teacher.firstName}`}
                                                    title="Edit"
                                                >
                                                    <FaEdit />
                                                </button>

                                                <button
                                                    type="button"
                                                    className="tm-icon-btn tm-icon-btn--delete"
                                                    onClick={() => handleDeleteTeacher(teacher)}
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
