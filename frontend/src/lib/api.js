export function getApiBase() {
  const stored = (typeof window !== "undefined" && localStorage.getItem("apiUrl")) || "";
  const env = import.meta?.env?.VITE_API_URL || "";
  const base = (stored || env || "http://127.0.0.1:8000").trim().replace(/\/+$/, "");
  return base;
}

export async function apiJson(path, { method = "GET", body, signal } = {}) {
  const res = await fetch(`${getApiBase()}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal
  });
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    const detail = data?.detail || `HTTP ${res.status}`;
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  return data;
}
