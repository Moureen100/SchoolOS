import { useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../../Layout";
import { colors } from "../../theme";
import { AUTH_CONFIG } from "../auth/authConfig";

export default function Profile() {
  const { role } = useParams();
  const config = AUTH_CONFIG[role];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file)); // local preview only, not uploaded yet
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSaved(false);

    // ---- Ready to enable once the backend is live. ----
    // Sending a real photo means FormData, not JSON:
    //   const body = new FormData();
    //   body.append("name", name);
    //   body.append("email", email);
    //   body.append("phone", phone);
    //   if (photoFile) body.append("photo", photoFile);
    //   await fetch(`http://localhost:5000/api/profile/${role}`, { method: "PATCH", body });

    await new Promise((resolve) => setTimeout(resolve, 400)); // simulated
    setSavingProfile(false);
    setProfileSaved(true);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation don't match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password should be at least 6 characters.");
      return;
    }

    setSavingPassword(true);
    // ---- Ready to enable once the backend is live. ----
    // await fetch(`http://localhost:5000/api/profile/${role}/change-password`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ currentPassword, newPassword }),
    // });

    await new Promise((resolve) => setTimeout(resolve, 400)); // simulated
    setSavingPassword(false);
    setPasswordSaved(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <Layout role={role}>
      <div style={{ maxWidth: 900, fontFamily: "sans-serif" }}>
        {/* ---- Header banner: cover strip + overlapping avatar ---- */}
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
          <div style={{ height: 88, background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }} />
          <div style={{ padding: "0 28px 28px", marginTop: -36, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile"
                  style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: `4px solid ${colors.surface}`, display: "block" }}
                />
              ) : (
                <div
                  style={{
                    width: 96, height: 96, borderRadius: "50%", background: colors.accent, color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700,
                    border: `4px solid ${colors.surface}`,
                  }}
                >
                  {config?.label?.charAt(0) || "?"}
                </div>
              )}
              <label
                title="Change photo"
                style={{
                  position: "absolute", bottom: 2, right: 2, width: 28, height: 28, borderRadius: "50%",
                  background: colors.primary, color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, cursor: "pointer", border: `2px solid ${colors.surface}`,
                }}
              >
                ✎
                <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
              </label>
            </div>
            <div style={{ paddingTop: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary, lineHeight: 1.3 }}>{name || "Your name"}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 12, padding: "3px 11px", borderRadius: 999, background: colors.accentLight, color: colors.accent, fontWeight: 600 }}>
                  {config?.label}
                </span>
                <span style={{ fontSize: 13, color: colors.textSecondary }}>{email || "no email set"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Two-column: profile details + password ---- */}
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          <form
            onSubmit={handleSaveProfile}
            style={{ flex: 1, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24 }}
          >
            <SectionHeader title="Profile details" subtitle="Your basic account information." />

            <FieldRow>
              <Field label="Full name" value={name} onChange={setName} />
            </FieldRow>
            <FieldRow>
              <Field label="Email" type="email" value={email} onChange={setEmail} />
            </FieldRow>
            <FieldRow>
              <Field label="Phone number" value={phone} onChange={setPhone} />
            </FieldRow>

            <button
              type="submit"
              disabled={savingProfile}
              style={{ marginTop: 6, padding: "10px 20px", background: colors.accent, color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: savingProfile ? "not-allowed" : "pointer", opacity: savingProfile ? 0.7 : 1 }}
            >
              {savingProfile ? "Saving..." : "Save changes"}
            </button>
            {profileSaved && <p style={{ color: colors.accent, fontSize: 13, marginTop: 10 }}>Profile updated.</p>}
          </form>

          <form
            onSubmit={handleChangePassword}
            style={{ flex: 1, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24 }}
          >
            <SectionHeader title="Change password" subtitle="Choose a new password for your account." />

            <FieldRow>
              <Field label="Current password" type="password" value={currentPassword} onChange={setCurrentPassword} required />
            </FieldRow>
            <FieldRow>
              <Field label="New password" type="password" value={newPassword} onChange={setNewPassword} required />
            </FieldRow>
            <FieldRow>
              <Field label="Confirm new password" type="password" value={confirmPassword} onChange={setConfirmPassword} required />
            </FieldRow>

            <button
              type="submit"
              disabled={savingPassword}
              style={{ marginTop: 6, padding: "10px 20px", background: colors.primary, color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: savingPassword ? "not-allowed" : "pointer", opacity: savingPassword ? 0.7 : 1 }}
            >
              {savingPassword ? "Updating..." : "Update password"}
            </button>
            {passwordError && <p style={{ color: colors.warning, fontSize: 13, marginTop: 10 }}>{passwordError}</p>}
            {passwordSaved && <p style={{ color: colors.accent, fontSize: 13, marginTop: 10 }}>Password updated.</p>}
          </form>
        </div>
      </div>
    </Layout>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: colors.primary, margin: 0 }}>{title}</p>
      <p style={{ fontSize: 13, color: colors.textSecondary, margin: "2px 0 0" }}>{subtitle}</p>
    </div>
  );
}

function FieldRow({ children }) {
  return <div style={{ marginBottom: 16 }}>{children}</div>;
}

function Field({ label, value, onChange, type = "text", required }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 13, color: colors.textSecondary, marginBottom: 5 }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        style={{ width: "100%", padding: "9px 11px", border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
      />
    </label>
  );
}
