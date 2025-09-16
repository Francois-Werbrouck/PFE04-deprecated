// src/lib/api.js
export function getApiBase() {
  const stored =
    localStorage.getItem("apiUrl") ||
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000";
  return (stored || "").replace(/\/+$/, "");
}

function authHeader() {
  const t = localStorage.getItem("access_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/**
 * Appelle l'API et renvoie du JSON si dispo.
 * - Ne fait JAMAIS de navigation/redirect côté navigateur.
 * - Supporte path absolu (http...) ou relatif (/route).
 */
export async function apiJson(path, { method = "GET", body, signal, headers } = {}) {
  const isAbsolute = /^https?:\/\//i.test(path);
  const url = isAbsolute ? path : `${getApiBase()}${path}`;
  const init = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...(headers || {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
    signal,
    credentials: "include", // optionnel, utile si cookies
  };

  const res = await fetch(url, init);

  // Essaie de lire du JSON si dispo, sans jeter
  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    // Réponses non-JSON : on tente du texte (pas d'ouverture de fenêtre)
    try {
      const text = await res.text();
      data = text ? { raw: text } : null;
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const msg =
      (data && (data.detail || data.error || data.message)) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data ?? {};
}
