// Thin fetch wrapper: injects the in-memory access token and transparently
// refreshes it once on a 401 using the httpOnly refresh cookie.

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

async function rawRequest(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return fetch(path, {
    method: opts.method || "GET",
    headers,
    credentials: "include",
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

async function tryRefresh() {
  const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
  if (!res.ok) return false;
  const data = await res.json();
  setAccessToken(data.accessToken);
  return true;
}

export async function api(path, opts = {}) {
  let res = await rawRequest(path, opts);

  // If the access token expired, refresh once and retry.
  if (res.status === 401 && !path.includes("/auth/")) {
    if (await tryRefresh()) res = await rawRequest(path, opts);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      message = err.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined;
  return res.json();
}

// Download a file from an authenticated endpoint (export). Fetches with the
// access token, then triggers a browser download of the returned blob.
export async function apiDownload(path, filename) {
  let res = await rawRequest(path);
  if (res.status === 401) {
    if (await tryRefresh()) res = await rawRequest(path);
  }
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Build a query string from an object, skipping empty values.
export function buildQuery(params) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
