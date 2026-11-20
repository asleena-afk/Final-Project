const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const getToken = () => localStorage.getItem("token");
export const setToken = (t) => localStorage.setItem("token", t);
export const clearToken = () => localStorage.removeItem("token");

function message(data, status) {
  const d = data && data.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d.map((e) => `${(e.loc || []).slice(1).join(".") || "field"}: ${e.msg}`).join("; ");
  }
  return `Something went wrong (${status})`;
}

async function request(path, { method = "GET", body, form, blob } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  } catch {
    throw new Error("Cannot reach the server. Is the backend running?");
  }
  if (res.status === 401 && token) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Session expired, please log in again");
  }
  if (!res.ok) {
    let data = null;
    try { data = await res.json(); } catch { /* no body */ }
    throw new Error(message(data, res.status));
  }
  if (res.status === 204) return null;
  return blob ? res.blob() : res.json();
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: "POST", body }),
  put: (p, body) => request(p, { method: "PUT", body }),
  del: (p) => request(p, { method: "DELETE" }),
  upload: (p, form) => request(p, { method: "POST", form }),
  async download(p, filename) {
    const blob = await request(p, { blob: true });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  },
};

export const qs = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== "" && v !== null && v !== undefined && v !== false) p.set(k, v);
  });
  return p.toString();
};
