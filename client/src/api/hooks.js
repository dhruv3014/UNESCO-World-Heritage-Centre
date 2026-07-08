import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildQuery } from "./client.js";

export function useResources() {
  return useQuery({
    queryKey: ["meta"],
    queryFn: () => api("/api/meta").then((r) => r.resources),
    staleTime: 5 * 60 * 1000,
  });
}

export function useList(resourceKey, params) {
  const query = buildQuery({
    page: params.page,
    limit: params.limit,
    sort: params.sort,
    order: params.order,
    search: params.search,
    view: params.view,
    filters: params.filters && params.filters.length ? JSON.stringify(params.filters) : undefined,
  });
  return useQuery({
    queryKey: ["list", resourceKey, params],
    queryFn: () => api(`/api/${resourceKey}${query}`),
    enabled: Boolean(resourceKey),
  });
}

// Full-text search (highlighted) for resources that support it (e.g. sites).
export function useSearch(resourceKey, q) {
  return useQuery({
    queryKey: ["search", resourceKey, q],
    queryFn: () => api(`/api/${resourceKey}/search${buildQuery({ q })}`),
    enabled: Boolean(resourceKey && q && q.trim().length > 1),
  });
}

export function useStats() {
  return useQuery({ queryKey: ["stats"], queryFn: () => api("/api/stats") });
}

export function useHistory(params) {
  const query = buildQuery({ page: params.page, limit: 30, table: params.table, action: params.action });
  return useQuery({ queryKey: ["history", params], queryFn: () => api(`/api/history${query}`) });
}

export function useSchemaChanges() {
  return useQuery({
    queryKey: ["schema-changes"],
    queryFn: () => api("/api/history/schema-changes").then((r) => r.data),
  });
}

// Build the detail path: single-key uses /:id, composite uses /detail?<keys>.
function detailPath(resource, record) {
  if (resource.pk.length === 1) return `/api/${resource.key}/${record[resource.pk[0]]}`;
  const q = buildQuery(Object.fromEntries(resource.pk.map((k) => [k, record[k]])));
  return `/api/${resource.key}/detail${q}`;
}

export function useCreate(resource) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api(`/api/${resource.key}`, { method: "POST", body }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdate(resource) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ record, body }) => api(detailPath(resource, record), { method: "PATCH", body }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDelete(resource) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record) => api(detailPath(resource, record), { method: "DELETE" }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useRevert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api(`/api/history/${id}/revert`, { method: "POST" }),
    onSuccess: () => invalidateAll(qc),
  });
}

// Restore path: single-key uses /:id/restore, composite uses /restore-detail?<keys>.
function restorePath(resource, record) {
  if (resource.pk.length === 1) return `/api/${resource.key}/${record[resource.pk[0]]}/restore`;
  const q = buildQuery(Object.fromEntries(resource.pk.map((k) => [k, record[k]])));
  return `/api/${resource.key}/restore-detail${q}`;
}

export function useRestore(resource) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record) => api(restorePath(resource, record), { method: "POST" }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useImport(resource) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows) => api(`/api/${resource.key}/import`, { method: "POST", body: { rows } }),
    onSuccess: () => invalidateAll(qc),
  });
}

// --- watchlist + in-app feed ---

export function useWatches() {
  return useQuery({ queryKey: ["watches"], queryFn: () => api("/api/watch").then((r) => r.data) });
}

export function useFeed(page = 1) {
  return useQuery({ queryKey: ["feed", page], queryFn: () => api(`/api/feed${buildQuery({ page })}`) });
}

export function useToggleWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ table, recordId, watching }) =>
      watching
        ? api(`/api/watch${buildQuery({ table, recordId })}`, { method: "DELETE" })
        : api("/api/watch", { method: "POST", body: { table, recordId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watches"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

// --- schema editor (admin) ---

export function useAddColumn(resourceKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api(`/api/schema/${resourceKey}/columns`, { method: "POST", body }),
    onSuccess: () => invalidateSchema(qc),
  });
}

export function useRenameColumn(resourceKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ column, newName }) => api(`/api/schema/${resourceKey}/columns/${column}`, { method: "PATCH", body: { newName } }),
    onSuccess: () => invalidateSchema(qc),
  });
}

export function useDropColumn(resourceKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (column) => api(`/api/schema/${resourceKey}/columns/${column}`, { method: "DELETE" }),
    onSuccess: () => invalidateSchema(qc),
  });
}

function invalidateSchema(qc) {
  qc.invalidateQueries({ queryKey: ["meta"] });
  qc.invalidateQueries({ queryKey: ["list"] });
  qc.invalidateQueries({ queryKey: ["schema-changes"] });
}

function invalidateAll(qc) {
  qc.invalidateQueries({ queryKey: ["list"] });
  qc.invalidateQueries({ queryKey: ["history"] });
  qc.invalidateQueries({ queryKey: ["stats"] });
  qc.invalidateQueries({ queryKey: ["feed"] });
}
