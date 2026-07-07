import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useResources, useList, useCreate, useUpdate, useDelete } from "@/api/hooks.js";
import { useAuth } from "@/hooks/useAuth.jsx";
import { Badge, Button, Card, Input, Select, Spinner } from "@/components/ui/index.jsx";
import Modal from "@/components/Modal.jsx";
import RecordForm from "@/components/RecordForm.jsx";
import { formatValue } from "@/lib/utils.js";
import { Plus, Pencil, Trash2, Search, Filter, X, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

export default function Browse() {
  const { resourceKey } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { data: resources } = useResources();

  const active = useMemo(() => {
    if (!resources) return undefined;
    return resources.find((r) => r.key === resourceKey) || resources[0];
  }, [resources, resourceKey]);

  if (!resources || !active) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Explorer</h1>
        <p className="text-muted-foreground mt-1">
          Browse, search and filter every table.{" "}
          {isAdmin ? "As an admin you can also add, edit and delete records." : "You have read-only access."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {resources.map((r) => (
          <button
            key={r.key}
            onClick={() => navigate(`/browse/${r.key}`)}
            className={
              "rounded-full px-3 py-1.5 text-sm font-medium transition " +
              (r.key === active.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:opacity-80")
            }
          >
            {r.label}
          </button>
        ))}
      </div>

      <ResourceTable key={active.key} resource={active} isAdmin={isAdmin} />
    </div>
  );
}

function ResourceTable({ resource, isAdmin }) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(resource.defaultSort);
  const [order, setOrder] = useState("asc");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formError, setFormError] = useState("");

  const { data, isLoading, isError, error } = useList(resource.key, { page, limit: 25, sort, order, search, filters });
  const createM = useCreate(resource);
  const updateM = useUpdate(resource);
  const deleteM = useDelete(resource);

  useEffect(() => setPage(1), [search, filters, sort, order]);

  const toggleSort = (field) => {
    if (sort === field) setOrder(order === "asc" ? "desc" : "asc");
    else {
      setSort(field);
      setOrder("asc");
    }
  };

  const submitForm = (body) => {
    setFormError("");
    const onError = (e) => setFormError(e instanceof Error ? e.message : "Failed");
    if (editing) {
      updateM.mutate({ record: editing, body }, { onSuccess: () => setFormOpen(false), onError });
    } else {
      createM.mutate(body, { onSuccess: () => setFormOpen(false), onError });
    }
  };

  const filterableFields = resource.fields.filter((f) => f.filterable);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={`Search ${resource.label.toLowerCase()}…`}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setSearch(searchInput)}>
          Search
        </Button>
        <Button variant={showFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters((s) => !s)}>
          <Filter className="h-4 w-4" /> Filters {filters.length > 0 && `(${filters.length})`}
        </Button>
        {isAdmin && (
          <Button size="sm" onClick={() => { setEditing(null); setFormError(""); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        )}
      </div>

      {showFilters && <FilterBuilder fields={filterableFields} filters={filters} setFilters={setFilters} />}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : isError ? (
        <p className="text-destructive py-8 text-center">{error?.message}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr>
                {resource.fields.map((f) => (
                  <th key={f.name} className="text-left px-3 py-2 font-medium whitespace-nowrap">
                    <button className="inline-flex items-center gap-1 hover:text-primary" onClick={() => toggleSort(f.name)}>
                      {f.label}
                      <ArrowUpDown className={"h-3 w-3 " + (sort === f.name ? "text-primary" : "text-muted-foreground/40")} />
                    </button>
                  </th>
                ))}
                {isAdmin && <th className="px-3 py-2 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data && data.data.length > 0 ? (
                data.data.map((row, i) => (
                  <tr key={i} className="border-t border-border hover:bg-secondary/40">
                    {resource.fields.map((f) => (
                      <td key={f.name} className="px-3 py-2 max-w-[220px] truncate" title={formatValue(row[f.name])}>
                        {formatValue(row[f.name])}
                      </td>
                    ))}
                    {isAdmin && (
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button className="text-muted-foreground hover:text-primary p-1" onClick={() => { setEditing(row); setFormError(""); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="text-muted-foreground hover:text-destructive p-1" onClick={() => setDeleteTarget(row)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={resource.fields.length + (isAdmin ? 1 : 0)} className="px-3 py-10 text-center text-muted-foreground">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted-foreground">
            {data.total} records · page {data.page} of {data.totalPages || 1}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? `Edit ${resource.label}` : `Add ${resource.label}`}>
        <RecordForm
          resource={resource}
          initial={editing || undefined}
          isEdit={Boolean(editing)}
          onSubmit={submitForm}
          onCancel={() => setFormOpen(false)}
          error={formError}
          busy={createM.isPending || updateM.isPending}
        />
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Confirm delete" className="max-w-md">
        <p className="text-sm text-muted-foreground mb-4">
          This will permanently delete the record. The change is recorded in history and can be reverted by an admin.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleteM.isPending}
            onClick={() => deleteTarget && deleteM.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })}
          >
            {deleteM.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

function FilterBuilder({ fields, filters, setFilters }) {
  const [field, setField] = useState(fields[0]?.name || "");
  const [op, setOp] = useState("contains");
  const [value, setValue] = useState("");

  const selected = fields.find((f) => f.name === field);
  const ops = selected?.type === "string" ? ["contains", "eq"] : ["eq", "gt", "gte", "lt", "lte"];

  const add = () => {
    if (!field || value === "") return;
    setFilters([...filters, { field, op, value }]);
    setValue("");
  };

  return (
    <div className="rounded-md border border-border bg-secondary/30 p-3 mb-4 space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[140px]">
          <label className="text-xs text-muted-foreground">Field</label>
          <Select value={field} onChange={(e) => { setField(e.target.value); setOp("contains"); }}>
            {fields.map((f) => (
              <option key={f.name} value={f.name}>{f.label}</option>
            ))}
          </Select>
        </div>
        <div className="w-28">
          <label className="text-xs text-muted-foreground">Operator</label>
          <Select value={op} onChange={(e) => setOp(e.target.value)}>
            {ops.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </Select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs text-muted-foreground">Value</label>
          <Input
            type={selected?.type === "number" ? "number" : selected?.type === "date" ? "date" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
        </div>
        <Button size="sm" onClick={add}>Add filter</Button>
      </div>
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((f, i) => (
            <Badge key={i} tone="blue" className="gap-1">
              {f.field} {f.op} "{f.value}"
              <button onClick={() => setFilters(filters.filter((_, j) => j !== i))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setFilters([])}>
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
