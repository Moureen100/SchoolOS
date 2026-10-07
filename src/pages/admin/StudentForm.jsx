import { useState, useEffect } from "react";
import Layout from "../../Layout";
import "./StudentForm.css";

// =========================================================
// BACKEND URL
// =========================================================

const API_URL = import.meta.env.VITE_API_URL;

// =========================================================
// EMPTY FORM
// =========================================================

const EMPTY_FORM = {
    // Student details
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

    // Guardian details
    guardian_name: "",
    phone: "",
    relationship: "",
};

// =========================================================
// REQUIRED FIELDS
// Student ID is NOT here because Flask generates it.
// Middle name is OPTIONAL.
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
    // GET NEXT STUDENT ID  (GET /students/next-id)
    // =========================================================

    async function loadNextStudentId() {
        setLoadingStudentId(true);
        setError(null);

        try {
            const res = await fetch(`${API_URL}/students/next-id`);

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

    // PHOTO PREVIEW
    useEffect(() => {
        if (!photoFile) {
            setPhotoPreviewUrl(null);
            return;
        }

        const url = URL.createObjectURL(photoFile);

        setPhotoPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [photoFile]);

    // HANDLE INPUT CHANGES
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

    // HANDLE PHOTO SELECTION
    function handlePhotoChange(e) {
        const file = e.target.files[0];

        if (!file) {
            setPhotoFile(null);
            return;
        }

        if (!file.type.startsWith("image/")) {
            setError("Please select a valid image file.");
            setPhotoFile(null);
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

        if (!nextStudentId) {
            setError("Student ID is not ready yet. Please wait a moment and try again.");
            setSubmitting(false);
            return;
        }

        for (const [name, label] of REQUIRED_FIELDS) {
            if (!form[name].trim()) {
                setError(`Please enter ${label}.`);
                setInvalidField(name);
                setSubmitting(false);
                return;
            }
        }

        // first + middle + last  ->  "Kevin Aaron Rose"
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
            // student_id is intentionally NOT sent - Flask generates it
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
            console.log("Student data being sent:", studentData);

            const res = await fetch(`${API_URL}/students`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(studentData),
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

            // e.g. ST005 -> ST006
            await loadNextStudentId();

        } catch (err) {
            console.error("Error creating student:", err);
            setError(err.message);
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

                {/* ---------- HEADER BANNER ---------- */}
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
                            {loadingStudentId ? "Generating..." : nextStudentId}
                        </div>
                    </div>
                </header>

                <form onSubmit={handleSubmit} noValidate>

                    <div className="sf-form-grid">

                        {/* ---------- STUDENT DETAILS (blue) ---------- */}
                        <section className="sf-card">
                            <h2 className="sf-legend">Student details</h2>
                            <p className="sf-hint">Name, class and background</p>

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
                                />
                            </div>
                        </section>

                        {/* ---------- PHOTO + CONTACT (green) ---------- */}
                        <section className="sf-card sf-card--green">
                            <h2 className="sf-legend">Photo and contact</h2>
                            <p className="sf-hint">How to recognise and reach the student</p>

                            <div className="sf-photo-row">
                                <div className="sf-photo-slot">
                                    {photoPreviewUrl ? (
                                        <img src={photoPreviewUrl} alt="Selected student" />
                                    ) : (
                                        "Photo"
                                    )}
                                </div>

                                <div className="sf-photo-controls">
                                    <span className="sf-field-label">Student photo</span>

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
                                        Photo upload is selected for now.
                                        It will be connected to the backend later.
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

                        {/* ---------- GUARDIAN (yellow, full width) ---------- */}
                        <section className="sf-card sf-card--yellow sf-card--wide">
                            <h2 className="sf-legend">Guardian details</h2>
                            <p className="sf-hint">Who we contact about this student</p>

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
                                    options={["", "parent", "sibling", "relative", "guardian"]}
                                    invalid={invalidField === "relationship"}
                                />
                            </div>

                            <button
                                type="submit"
                                className="sf-submit"
                                disabled={submitting || loadingStudentId || !nextStudentId}
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
                        <p className="sf-message sf-message--success" role="status">
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
// FIELD
// =========================================================

function Field({
                   label,
                   name,
                   value,
                   onChange,
                   type = "text",
                   placeholder,
                   as,
                   options,
                   invalid,
               }) {
    const fieldClass = ["sf-field", invalid ? "sf-field--invalid" : ""]
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