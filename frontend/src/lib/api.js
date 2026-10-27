const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");

function getToken() {
  return localStorage.getItem("access_token");
}

function setToken(token) {
  if (token) localStorage.setItem("access_token", token);
  else localStorage.removeItem("access_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    if (path !== "/auth/login") {
      setToken(null);
      window.location.href = "/login";
      throw new Error("Session expired");
    }
  }

  if (!res.ok) {
    let detail = "Request failed";
    try {
      const data = await res.json();
      if (Array.isArray(data.detail)) {
        detail = data.detail.map((d) => d.msg || "Invalid input").join(", ");
      } else if (typeof data.detail === "string") {
        detail = data.detail;
      }
    } catch (_) {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getToken,
  setToken,
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  verifyOTP: (payload) => request("/auth/verify-otp", { method: "POST", body: JSON.stringify(payload) }),
  resendOTP: (payload) => request("/auth/resend-otp", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  startGuest: () => request("/auth/guest", { method: "POST" }),
  logout: async () => {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch (_) {}
    setToken(null);
  },
  cleanupGuest: () => request("/auth/guest-cleanup", { method: "POST" }),
  cleanupSessionFiles: () => request("/documents/cleanup-session", { method: "POST" }),
  me: () => request("/auth/me"),
  deleteAccount: () => request("/auth/me", { method: "DELETE" }),
  getUserDashboard: () => request("/auth/dashboard"),
  getAdminUsers: () => request("/admin/users"),
  getAdminStats: () => request("/admin/stats"),

  uploadDocument: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/documents/upload", { method: "POST", body: form });
  },
  listDocuments: () => request("/documents"),
  getDocument: (id) => request(`/documents/${id}`),
  deleteDocument: (id) => request(`/documents/${id}`, { method: "DELETE" }),

  createSession: () => request("/chat/sessions", { method: "POST" }),
  listSessions: () => request("/chat/sessions"),
  getMessages: (sessionId) => request(`/chat/sessions/${sessionId}/messages`),
  deleteSession: (sessionId) => request(`/chat/sessions/${sessionId}`, { method: "DELETE" }),
  ask: (payload) => request("/chat/ask", { method: "POST", body: JSON.stringify(payload) }),
  getModels: () => request("/chat/models"),
};

export { API_BASE };