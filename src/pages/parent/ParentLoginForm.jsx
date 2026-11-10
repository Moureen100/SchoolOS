import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;
// CHANGE THIS: press Ctrl+Shift+F in the backend and search "parent_login(" to find the real path.
const PARENT_LOGIN_PATH = "/api/auth/parent/login";



export default function ParentLoginForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ student_name: "", student_id: "", guardian_phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  async function submit(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}${PARENT_LOGIN_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_name: form.student_name.trim(),
          student_id: form.student_id.trim(),
          guardian_phone: form.guardian_phone.trim(),
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || result.message || "Login failed.");
        return;
      }

      // Separate keys so this never overwrites the admin's "access_token".
      localStorage.setItem("parent_token", result.access_token);
      localStorage.setItem("parent_students", JSON.stringify(result.students));
      navigate("/parent");
    } catch {
      setError("Unable to connect to the SchoolOS server.");
    } finally {
      setLoading(false);
    }
  }

  const input = { width: "100%", padding: "12px 16px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(8,12,40,0.45)", color: "#fff", fontSize: 16, boxSizing: "border-box", marginBottom: 12 };

  return (
    <form onSubmit={submit}>
      <input style={input} name="student_name" placeholder="Child's name" value={form.student_name} onChange={change} required />
      <input style={input} name="student_id" placeholder="Student ID (e.g. ST001)" value={form.student_id} onChange={change} required />
      <input style={input} name="guardian_phone" type="tel" placeholder="Your phone number (as the school has it)" value={form.guardian_phone} onChange={change} required />
      {error && <p style={{ color: "#ffb4a8", fontSize: 14 }}>{error}</p>}
      <button type="submit" disabled={loading} style={{ width: "100%", padding: 13, borderRadius: 999, border: "none", background: "#fbc94a", color: "#0f1538", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
        {loading ? "Checking..." : "View my child's dashboard"}
      </button>
    </form>
  );
}