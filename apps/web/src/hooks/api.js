import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildQuery } from "@/lib/api-client.js";

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function useResources() {
  return useQuery({
    queryKey: ["meta"],
    queryFn: () => api("/api/meta").then((response) => response.resources),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecords(resourceKey, params) {
  const query = buildQuery({
    page: params.page,
    limit: params.limit,
    sort: params.sort,
    order: params.order,
    search: params.search,
    view: params.view,
    filters: params.filters?.length ? JSON.stringify(params.filters) : undefined,
  });
  return useQuery({
    queryKey: ["records", resourceKey, params],
    queryFn: () => api(`/api/${resourceKey}${query}`),
    enabled: Boolean(resourceKey),
  });
}

export function useSearch(resourceKey, term) {
  return useQuery({
    queryKey: ["search", resourceKey, term],
    queryFn: () => api(`/api/${resourceKey}/search${buildQuery({ q: term })}`),
    enabled: Boolean(resourceKey && term && term.trim().length > 1),
  });
}

export function useStats() {
  return useQuery({ queryKey: ["stats"], queryFn: () => api("/api/stats") });
}

export function useHistory(params) {
  const query = buildQuery({ page: params.page, table: params.table, action: params.action });
  return useQuery({ queryKey: ["history", params], queryFn: () => api(`/api/history${query}`) });
}

export function useSchemaChanges() {
  return useQuery({
    queryKey: ["schema-changes"],
    queryFn: () => api("/api/history/schema-changes").then((response) => response.data),
  });
}

export function useWatches() {
  return useQuery({ queryKey: ["watches"], queryFn: () => api("/api/watch").then((response) => response.data) });
}

export function useFeed(page = 1) {
  return useQuery({ queryKey: ["feed", page], queryFn: () => api(`/api/feed${buildQuery({ page })}`) });
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

// Detail/restore paths: single-key resources use /:id, composite use /...-detail?<keys>.
function detailPath(resource, record, suffix = "detail") {
  if (resource.primaryKey.length === 1) {
    const id = record[resource.primaryKey[0]];
    return suffix === "detail" ? `/api/${resource.key}/${id}` : `/api/${resource.key}/${id}/restore`;
  }
  const query = buildQuery(Object.fromEntries(resource.primaryKey.map((key) => [key, record[key]])));
  return suffix === "detail" ? `/api/${resource.key}/detail${query}` : `/api/${resource.key}/restore-detail${query}`;
}

export function useCreateRecord(resource) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => api(`/api/${resource.key}`, { method: "POST", body }),
    onSuccess: () => invalidateData(queryClient),
  });
}

export function useUpdateRecord(resource) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ record, body }) => api(detailPath(resource, record), { method: "PATCH", body }),
    onSuccess: () => invalidateData(queryClient),
  });
}

export function useDeleteRecord(resource) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (record) => api(detailPath(resource, record), { method: "DELETE" }),
    onSuccess: () => invalidateData(queryClient),
  });
}

export function useRestoreRecord(resource) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (record) => api(detailPath(resource, record, "restore"), { method: "POST" }),
    onSuccess: () => invalidateData(queryClient),
  });
}

export function useImportRecords(resource) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows) => api(`/api/${resource.key}/import`, { method: "POST", body: { rows } }),
    onSuccess: () => invalidateData(queryClient),
  });
}

export function useRevert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api(`/api/history/${id}/revert`, { method: "POST" }),
    onSuccess: () => invalidateData(queryClient),
  });
}

export function useToggleWatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ table, recordId, watching }) =>
      watching
        ? api(`/api/watch${buildQuery({ table, recordId })}`, { method: "DELETE" })
        : api("/api/watch", { method: "POST", body: { table, recordId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watches"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useAddColumn(resourceKey) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => api(`/api/schema/${resourceKey}/columns`, { method: "POST", body }),
    onSuccess: () => invalidateSchema(queryClient),
  });
}

export function useRenameColumn(resourceKey) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ column, newName }) =>
      api(`/api/schema/${resourceKey}/columns/${column}`, { method: "PATCH", body: { newName } }),
    onSuccess: () => invalidateSchema(queryClient),
  });
}

export function useDropColumn(resourceKey) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (column) => api(`/api/schema/${resourceKey}/columns/${column}`, { method: "DELETE" }),
    onSuccess: () => invalidateSchema(queryClient),
  });
}

function invalidateData(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["records"] });
  queryClient.invalidateQueries({ queryKey: ["history"] });
  queryClient.invalidateQueries({ queryKey: ["stats"] });
  queryClient.invalidateQueries({ queryKey: ["feed"] });
}

function invalidateSchema(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["meta"] });
  queryClient.invalidateQueries({ queryKey: ["records"] });
  queryClient.invalidateQueries({ queryKey: ["schema-changes"] });
}
