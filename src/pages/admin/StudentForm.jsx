import { useState } from "react";
import Layout from "../../Layout";
import { colors } from "../../theme";

// ---- STEP 1: one piece of state per field the backend expects. ----
// These field names match data['student_name'], data['middle_name'], etc.
// in your colleague's create_student() function EXACTLY — that's what
// matters most, since a typo here means the backend gets `undefined`.
export default function StudentForm({ onCreated }) {
  const [form, setForm] = useState({
    // student fields
    student_id: "",
    student_name: "",
    middle_name: "",
    last_name: "",
    student_class: "",
    stream: "",
    date_of_birth: "",
    gender: "",       // shared with guardian right now (see note above)
    nationality: "",
    email: "",
    phone_number: "",
    address: "",       // shared with guardian right now (see note above)
    // guardian fields
    guardian_name: "",
    phone: "",
    relationship: "",
  });

  // Photo is kept separate from `form` because a File object can't be
  // JSON.stringify'd like the rest of the fields. When you connect the
  // real backend, sending a file means switching this request to
  // FormData instead of JSON.stringify(form) — flag this to your
  // colleague, since his current create_student() reads data['photo']
  // as a plain string (a URL/path), not a file upload.
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // ---- STEP 2: one generic handler for every input. ----
  // Instead of writing a separate onChange function per field, this uses
  // the input's `name` attribute to update the right key in `form`.
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file)); // temporary local preview, not uploaded anywhere yet
  }

  // ---- STEP 3: submit sends the exact same shape as the form state. ----
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // ---- Ready to enable once the backend is live. ----
      // Uncomment this block and delete the simulated line below it —
      // that's the entire "connect to backend" step for this form.
      //
      // NOTE: since photoFile is an actual file (not JSON-friendly),
      // sending it for real means switching from JSON.stringify(form)
      // to FormData, e.g.:
      //   const body = new FormData();
      //   Object.entries(form).forEach(([key, value]) => body.append(key, value));
      //   if (photoFile) body.append("photo", photoFile);
      //   fetch(url, { method: "POST", body }); // no Content-Type header — browser sets it
      // Your colleague's create_student() will also need to read the
      // uploaded file (e.g. via request.files['photo']) instead of
      // data['photo'] as a plain string.

      // const res = await fetch("http://localhost:5000/api/students", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(form),
      // });
      // if (!res.ok) {
      //   throw new Error(`Server responded with ${res.status}`);
      // }

      await new Promise((resolve) => setTimeout(resolve, 500)); // simulated delay, remove once fetch is enabled

      setSuccess(true);
      if (onCreated) onCreated(); // lets a parent page refresh its student list
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout role="admin">
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: 24,
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        fontFamily: "sans-serif",
      }}
    >
      <h2 style={{ color: colors.primary, marginTop: 0 }}>Add student</h2>

      <SectionLabel>Student details</SectionLabel>
      <Row>
        <Field label="Student ID" name="student_id" value={form.student_id} onChange={handleChange} />
        <Field label="First name" name="student_name" value={form.student_name} onChange={handleChange} />
      </Row>
      <Row>
        <Field label="Middle name" name="middle_name" value={form.middle_name} onChange={handleChange} />
        <Field label="Last name" name="last_name" value={form.last_name} onChange={handleChange} />
      </Row>
      <Row>
        <Field label="Class" name="student_class" value={form.student_class} onChange={handleChange} placeholder="e.g. S3" />
        <Field label="Stream" name="stream" value={form.stream} onChange={handleChange} placeholder="e.g. East" />
      </Row>
      <Row>
        <Field label="Date of birth" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} type="date" />
        <Field label="Gender" name="gender" value={form.gender} onChange={handleChange} as="select" options={["", "male", "female"]} />
      </Row>
      <Row>
        <Field label="Nationality" name="nationality" value={form.nationality} onChange={handleChange} />
        <div style={{ flex: 1 }}>
          <PhotoField preview={photoPreview} onChange={handlePhotoChange} />
        </div>
      </Row>
      <Row>
        <Field label="Email" name="email" value={form.email} onChange={handleChange} type="email" />
        <Field label="Phone number" name="phone_number" value={form.phone_number} onChange={handleChange} />
      </Row>
      <Field label="Address" name="address" value={form.address} onChange={handleChange} full />

      <SectionLabel>Guardian details</SectionLabel>
      <Row>
        <Field label="Guardian name" name="guardian_name" value={form.guardian_name} onChange={handleChange} />
        <Field label="Guardian phone" name="phone" value={form.phone} onChange={handleChange} />
      </Row>
      <Field
        label="Relationship to student"
        name="relationship"
        value={form.relationship}
        onChange={handleChange}
        as="select"
        options={["", "parent", "sibling", "relative", "guardian"]}
      />

      <button
        type="submit"
        disabled={submitting}
        style={{
          marginTop: 20,
          width: "100%",
          padding: "10px 16px",
          background: colors.accent,
          color: "white",
          border: "none",
          borderRadius: 6,
          fontSize: 15,
          cursor: submitting ? "not-allowed" : "pointer",
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? "Saving..." : "Save student"}
      </button>

      {error && (
        <p style={{ color: colors.warning, marginTop: 12 }}>Couldn't save: {error}</p>
      )}
      {success && (
        <p style={{ color: colors.accent, marginTop: 12 }}>
          Student saved successfully. <a href="/admin/students">View students</a>
        </p>
      )}
    </form>
    </Layout>
  );
}

// ---- Small reusable pieces, kept in the same file for now. ----
// Once your app grows, these would move to their own files in a
// src/components folder.

function SectionLabel({ children }) {
  return (
    <p
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: colors.textSecondary,
        marginTop: 24,
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      {children}
    </p>
  );
}

function Row({ children }) {
  return <div style={{ display: "flex", gap: 12 }}>{children}</div>;
}

function PhotoField({ preview, onChange }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>
        Photo
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: `1px solid ${colors.border}` }}
          />
        ) : (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: colors.background,
              border: `1px solid ${colors.border}`,
            }}
          />
        )}
        <input type="file" accept="image/*" onChange={onChange} style={{ fontSize: 13, flex: 1 }} />
      </div>
    </label>
  );
}

function Field({ label, name, value, onChange, type = "text", placeholder, as, options, full }) {
  return (
    <label style={{ flex: full ? "1 1 100%" : 1, display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>
        {label}
      </span>
      {as === "select" ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          style={inputStyle}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "" ? "Select..." : opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          value={value}
          onChange={onChange}
          type={type}
          placeholder={placeholder}
          style={inputStyle}
        />
      )}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
};
