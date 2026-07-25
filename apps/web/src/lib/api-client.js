// Thin fetch wrapper around the backend API.
//
// - In development VITE_API_BASE_URL is empty, so requests go to "/api/..." and
//   Vite proxies them to http://localhost:4000.
// - In production (Vercel) VITE_API_BASE_URL points at the Render backend, e.g.
//   "https://whc-api.onrender.com", and requests go there directly.
//
// The short-lived access token lives in memory; the refresh token is an
// httpOnly cookie, so every request uses `credentials: "include"`.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function refreshAccessToken() {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) return false;
  const data = await response.json();
  setAccessToken(data.accessToken);
  return true;
}

/** Perform an API request, transparently refreshing the access token once on 401. */
export async function api(path, options = {}) {
  let response = await request(path, options);

  if (response.status === 401 && !path.includes("/auth/")) {
    if (await refreshAccessToken()) response = await request(path, options);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      message = (await response.json()).error ?? message;
    } catch {
      /* response had no JSON body */
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined;
  return response.json();
}

/** Restore a session on app load using the refresh cookie. Returns the auth payload or null. */
export async function restoreSession() {
  if (await refreshAccessToken()) {
    return api("/api/auth/me");
  }
  return null;
}

/** Download a file from an authenticated endpoint (used for CSV/JSON export). */
export async function downloadFile(path, filename) {
  let response = await request(path);
  if (response.status === 401 && (await refreshAccessToken())) response = await request(path);
  if (!response.ok) throw new Error(`Download failed (${response.status})`);

  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Build a query string from an object, skipping empty values. */
export function buildQuery(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const queryString = search.toString();
  return queryString ? `?${queryString}` : "";
}
