const API_URL = "http://localhost:5000";

export async function apiGet(path) {
    const res = await fetch(`${API_URL}${path}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (res.status === 401) {
        // token expired or invalid, send him back to login
        localStorage.clear();
        window.location.href = "/login/class-teacher";
        return null;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
}