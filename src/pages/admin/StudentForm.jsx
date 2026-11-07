
import { useState, useEffect } from "react";
import Layout from "../../Layout";
import "./StudentForm.css";

// =========================================================
// BACKEND URL
// =========================================================
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// =========================================================
// GET SCHOOL ACCOUNT AUTH TOKEN
// =========================================================
function getAuthToken() {
    return (
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("school_access_token") ||
        sessionStorage.getItem("school_token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("school_access_token") ||
        localStorage.getItem("school_token")
    );
}

// =========================================================
// EMPTY FORM
// =========================================================
const EMPTY_FORM = {
    student_name: "",
    middle_name: "",
    last_name: "",
    student_class: "",
    stream: "",
    date_of_birth: "",
    gender: "",
    nationality: "",
    photo: "",
    email: "",
    phone_number: "",
    address: "",

    guardian_name: "",
    phone: "",
    relationship: "",
};

// =========================================================
// REQUIRED FIELDS
// =========================================================
const REQUIRED_FIELDS = [
    ["student_name", "the student's first name"],
    ["last_name", "the student's last name"],
    ["student_class", "the student's class"],
    ["stream", "the student's stream"],
    ["nationality", "the student's nationality"],
    ["email", "the student's email"],
    ["phone_number", "the student's phone number"],
    ["address", "the student's address"],
    ["guardian_name", "the guardian's name"],
    ["phone", "the guardian's phone number"],
    ["relationship", "the guardian's relationship"],
];

export default function StudentForm({ onCreated }) {
    const [form, setForm] = useState(EMPTY_FORM);

    // AUTOMATIC STUDENT ID
    const [nextStudentId, setNextStudentId] = useState("");
    const [loadingStudentId, setLoadingStudentId] = useState(true);

    // PHOTO
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);

    // FORM STATE
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [invalidField, setInvalidField] = useState(null);
    const [success, setSuccess] = useState(false);

    // =========================================================
    // GET NEXT STUDENT ID
    // =========================================================
    async function loadNextStudentId() {
        setLoadingStudentId(true);
        setError(null);

        try {
            const token = getAuthToken();

            if (!token) {
                throw new Error("School login token not found. Please log in again.");
            }

            const res = await fetch(`${API_URL}/students/next-id`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            let data = {};

            try {
                data = await res.json();
            } catch {
                data = {};
            }

            if (!res.ok) {
                throw new Error(
                    data.message ||
                    data.error ||
                    `Could not get the next Student ID. Server responded with ${res.status}`
                );
            }

            if (!data.student_id) {
                throw new Error("The server did not return a Student ID.");
            }

            setNextStudentId(data.student_id);
        } catch (err) {
            console.error("Error getting next Student ID:", err);
            setError(err.message);
        } finally {
            setLoadingStudentId(false);
        }
    }

    useEffect(() => {
        loadNextStudentId();
    }, []);

    // =========================================================
    // PHOTO PREVIEW
    // =========================================================
    useEffect(() => {
        if (!photoFile) {
            setPhotoPreviewUrl(null);
            return;
        }

        const url = URL.createObjectURL(photoFile);
        setPhotoPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [photoFile]);

    // =========================================================
    // HANDLE INPUT CHANGES
    // =========================================================
    function handleChange(e) {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (invalidField === name) {
            setInvalidField(null);
            setError(null);
        }
    }

    // =========================================================
    // HANDLE PHOTO SELECTION
    // =========================================================
    function handlePhotoChange(e) {
        const file = e.target.files?.[0];

        if (!file) {
            setPhotoFile(null);
            return;
        }

        if (!file.type.startsWith("image/")) {
            setError("Please select a valid image file.");
            setPhotoFile(null);
            e.target.value = "";
            return;
        }

        setError(null);
        setPhotoFile(file);
    }

    // =========================================================
    // SUBMIT STUDENT
    // =========================================================
    async function handleSubmit(e) {
        e.preventDefault();

        setSubmitting(true);
        setError(null);
        setInvalidField(null);
        setSuccess(false);

        if (!API_URL) {
            setError("Backend URL is not configured. Check your VITE_API_URL.");
            setSubmitting(false);
            return;
        }

        if (!nextStudentId) {
            setError(
                "Student ID is not ready yet. Please wait a moment and try again."
            );
            setSubmitting(false);
            return;
        }

        for (const [name, label] of REQUIRED_FIELDS) {
            if (!String(form[name] || "").trim()) {
                setError(`Please enter ${label}.`);
                setInvalidField(name);
                setSubmitting(false);
                return;
            }
        }

        if (!form.gender) {
            setError("Please select the student's gender.");
            setInvalidField("gender");
            setSubmitting(false);
            return;
        }

        const studentName = [
            form.student_name.trim(),
            form.middle_name.trim(),
            form.last_name.trim(),
        ]
            .filter(Boolean)
            .join(" ");

        if (!photoFile) {
            setError("Please select a student photo before saving.");
            setSubmitting(false);
            return;
        }

        try {
            // Retrieve the token saved by the school login.
            const token = getAuthToken();

            if (!token) {
                throw new Error(
                    "Your school login token was not found. Please log out and log in again. If the problem continues, check which storage key your login uses for access_token."
                );
            }

            // Flask generates student_id automatically.
            // The school_id is obtained from the verified JWT on the backend.
            const studentData = {
                student_name: studentName,
                student_class: form.student_class,
                stream: form.stream,
                date_of_birth: form.date_of_birth || null,
                gender: form.gender,
                nationality: form.nationality,
                photo: "",

                email: form.email,
                phone_number: form.phone_number,
                address: form.address,

                guardian_name: form.guardian_name,
                phone: form.phone,
                relationship: form.relationship,
            };

            console.log("Student ID currently displayed:", nextStudentId);

            const res = await fetch(`${API_URL}/students`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(studentData),
            });

            let data = {};

            try {
                data = await res.json();
            } catch {
                data = {};
            }

            if (!res.ok) {
                if (res.status === 401) {
                    throw new Error(
                        data.message ||
                        "Authentication failed. Your school token may be expired, invalid, or stored under a different key. Log in again and retry."
                    );
                }

                throw new Error(
                    data.message ||
                    data.error ||
                    `Server responded with ${res.status}`
                );
            }

            setSuccess(true);

            if (onCreated) {
                onCreated(data);
            }

            setForm(EMPTY_FORM);
            setPhotoFile(null);

            const photoInput = document.getElementById("student-photo");

            if (photoInput) {
                photoInput.value = "";
            }

            // Refresh the displayed student ID.
            await loadNextStudentId();
        } catch (err) {
            console.error("Error creating student:", err);
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setSubmitting(false);
        }
    }

    // =========================================================
    // UI
    // =========================================================
    return (
        <Layout role="admin">
            <div className="sf-page">
                <header className="sf-page-header">
                    <div className="sf-header-text">
                        <h1 className="sf-title">Add Student</h1>
                        <p className="sf-subtitle">
                            Create a new enrollment record
                        </p>
                    </div>

                    <div className="sf-id-box">
                        <span className="sf-id-label">Student ID</span>
                        <div className="sf-id-value">
                            {loadingStudentId
                                ? "Generating..."
                                : nextStudentId || "Unavailable"}
                        </div>
                    </div>
                </header>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="sf-form-grid">
                        {/* STUDENT DETAILS */}
                        <section className="sf-card">
                            <h2 className="sf-legend">Student details</h2>
                            <p className="sf-hint">
                                Name, class and background
                            </p>

                            <div className="sf-field-row">
                                <Field
                                    label="First name"
                                    name="student_name"
                                    value={form.student_name}
                                    onChange={handleChange}
                                    placeholder="e.g. Kevin"
                                    invalid={invalidField === "student_name"}
                                />
                                <Field
                                    label="Middle name (optional)"
                                    name="middle_name"
                                    value={form.middle_name}
                                    onChange={handleChange}
                                    placeholder="Optional"
                                />
                            </div>

                            <div className="sf-field-row">
                                <Field
                                    label="Last name"
                                    name="last_name"
                                    value={form.last_name}
                                    onChange={handleChange}
                                    placeholder="e.g. Rose"
                                    invalid={invalidField === "last_name"}
                                />
                                <Field
                                    label="Nationality"
                                    name="nationality"
                                    value={form.nationality}
                                    onChange={handleChange}
                                    placeholder="e.g. Ugandan"
                                    invalid={invalidField === "nationality"}
                                />
                            </div>

                            <div className="sf-field-row">
                                <Field
                                    label="Class"
                                    name="student_class"
                                    value={form.student_class}
                                    onChange={handleChange}
                                    placeholder="e.g. P2"
                                    invalid={invalidField === "student_class"}
                                />
                                <Field
                                    label="Stream"
                                    name="stream"
                                    value={form.stream}
                                    onChange={handleChange}
                                    placeholder="e.g. A"
                                    invalid={invalidField === "stream"}
                                />
                            </div>

                            <div className="sf-field-row">
                                <Field
                                    label="Date of birth"
                                    name="date_of_birth"
                                    value={form.date_of_birth}
                                    onChange={handleChange}
                                    type="date"
                                />
                                <Field
                                    label="Gender"
                                    name="gender"
                                    value={form.gender}
                                    onChange={handleChange}
                                    as="select"
                                    options={["", "male", "female"]}
                                    invalid={invalidField === "gender"}
                                />
                            </div>
                        </section>

                        {/* PHOTO AND CONTACT */}
                        <section className="sf-card sf-card--green">
                            <h2 className="sf-legend">Photo and contact</h2>
                            <p className="sf-hint">
                                How to recognise and reach the student
                            </p>

                            <div className="sf-photo-row">
                                <div className="sf-photo-slot">
                                    {photoPreviewUrl ? (
                                        <img
                                            src={photoPreviewUrl}
                                            alt="Selected student"
                                        />
                                    ) : (
                                        "Photo"
                                    )}
                                </div>

                                <div className="sf-photo-controls">
                                    <span className="sf-field-label">
                                        Student photo
                                    </span>

                                    <input
                                        id="student-photo"
                                        className="sf-file-input"
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                    />

                                    {photoFile && (
                                        <span className="sf-photo-selected">
                                            Selected: {photoFile.name}
                                        </span>
                                    )}

                                    <span className="sf-photo-hint">
                                        Photo preview is available. Uploading
                                        the actual image to the backend is not
                                        implemented yet.
                                    </span>
                                </div>
                            </div>

                            <div className="sf-field-row">
                                <Field
                                    label="Email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    type="email"
                                    placeholder="name@example.com"
                                    invalid={invalidField === "email"}
                                />
                                <Field
                                    label="Phone number"
                                    name="phone_number"
                                    value={form.phone_number}
                                    onChange={handleChange}
                                    placeholder="e.g. 0700 000000"
                                    invalid={invalidField === "phone_number"}
                                />
                            </div>

                            <Field
                                label="Address"
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                placeholder="Home address"
                                invalid={invalidField === "address"}
                            />
                        </section>

                        {/* GUARDIAN DETAILS */}
                        <section className="sf-card sf-card--yellow sf-card--wide">
                            <h2 className="sf-legend">Guardian details</h2>
                            <p className="sf-hint">
                                Who we contact about this student
                            </p>

                            <div className="sf-field-row sf-field-row--three">
                                <Field
                                    label="Guardian name"
                                    name="guardian_name"
                                    value={form.guardian_name}
                                    onChange={handleChange}
                                    invalid={invalidField === "guardian_name"}
                                />
                                <Field
                                    label="Guardian phone"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    invalid={invalidField === "phone"}
                                />
                                <Field
                                    label="Relationship to student"
                                    name="relationship"
                                    value={form.relationship}
                                    onChange={handleChange}
                                    as="select"
                                    options={[
                                        "",
                                        "parent",
                                        "sibling",
                                        "relative",
                                        "guardian",
                                    ]}
                                    invalid={invalidField === "relationship"}
                                />
                            </div>

                            <button
                                type="submit"
                                className="sf-submit"
                                disabled={
                                    submitting ||
                                    loadingStudentId ||
                                    !nextStudentId
                                }
                            >
                                {submitting ? "Saving..." : "Save student"}
                            </button>
                        </section>
                    </div>

                    {error && (
                        <p
                            className="sf-message sf-message--error"
                            role="alert"
                            aria-live="assertive"
                        >
                            {error}
                        </p>
                    )}

                    {success && (
                        <p
                            className="sf-message sf-message--success"
                            role="status"
                        >
                            Student saved successfully.{" "}
                            <a href="/admin/students">View students</a>
                        </p>
                    )}
                </form>
            </div>
        </Layout>
    );
}

// =========================================================
// REUSABLE FIELD
// =========================================================
function Field({
                   label,
                   name,
                   value,
                   onChange,
                   type = "text",
                   placeholder,
                   as,
                   options = [],
                   invalid,
               }) {
    const fieldClass = [
        "sf-field",
        invalid ? "sf-field--invalid" : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <label className={fieldClass} htmlFor={name}>
            <span className="sf-field-label">{label}</span>

            {as === "select" ? (
                <select
                    id={name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="sf-select"
                    aria-invalid={invalid || undefined}
                >
                    {options.map((opt) => (
                        <option key={opt} value={opt}>
                            {opt === "" ? "Select..." : opt}
                        </option>
                    ))}
                </select>
            ) : (
                <input
                    id={name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    type={type}
                    placeholder={placeholder}
                    className="sf-input"
                    aria-invalid={invalid || undefined}
                />
            )}
        </label>
    );
}
