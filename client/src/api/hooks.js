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
    filters: params.filters && params.filters.length ? JSON.stringify(params.filters) : undefined,
  });
  return useQuery({
    queryKey: ["list", resourceKey, params],
    queryFn: () => api(`/api/${resourceKey}${query}`),
    enabled: Boolean(resourceKey),
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

function invalidateAll(qc) {
  qc.invalidateQueries({ queryKey: ["list"] });
  qc.invalidateQueries({ queryKey: ["history"] });
  qc.invalidateQueries({ queryKey: ["stats"] });
}
