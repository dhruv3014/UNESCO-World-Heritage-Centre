import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useResources, useRecords, useCreateRecord, useUpdateRecord, useDeleteRecord,
  useRestoreRecord, useImportRecords, useWatches, useToggleWatch,
} from "@/hooks/api.js";
import { downloadFile, buildQuery } from "@/lib/api-client.js";
import { useAuth } from "@/context/AuthContext.jsx";
import { Badge, Button, Card, Input, Select, PageSpinner, Spinner } from "@/components/ui/index.jsx";
import Modal from "@/components/Modal.jsx";
import RecordForm from "@/components/RecordForm.jsx";
import { formatValue, recordIdOf, parseImport } from "@/lib/utils.js";
import {
  Plus, Pencil, Trash2, Search, Filter, X, ArrowUpDown, ChevronLeft, ChevronRight, Download, Upload, Star, Undo2,
} from "lucide-react";

export default function ExplorerPage() {
  const { resourceKey } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { data: resources } = useResources();

  const activeResource = useMemo(() => {
    if (!resources) return undefined;
    return resources.find((resource) => resource.key === resourceKey) ?? resources[0];
  }, [resources, resourceKey]);

  if (!resources || !activeResource) return <PageSpinner />;

  return (
    <div className="max-w-6xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Explorer</h1>
        <p className="mt-1 text-muted-foreground">
          Browse, search, filter and export every table.{" "}
          {isAdmin ? "As an admin you can also add, edit, delete, import and restore records." : "You have read-only access."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {resources.map((resource) => (
          <button
            key={resource.key}
            onClick={() => navigate(`/explorer/${resource.key}`)}
            className={
              "rounded-full px-3 py-1.5 text-sm font-medium transition " +
              (resource.key === activeResource.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:opacity-80")
            }
          >
            {resource.label}
          </button>
        ))}
      </div>

      <ResourceTable key={activeResource.key} resource={activeResource} isAdmin={isAdmin} />
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
  const [view, setView] = useState("active"); // "active" | "deleted"

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const { data, isLoading, isError, error } = useRecords(resource.key, { page, limit: 25, sort, order, search, filters, view });
  const createMutation = useCreateRecord(resource);
  const updateMutation = useUpdateRecord(resource);
  const deleteMutation = useDeleteRecord(resource);
  const restoreMutation = useRestoreRecord(resource);
  const toggleWatch = useToggleWatch();
  const { data: watches } = useWatches();

  const watchedSet = useMemo(
    () => new Set((watches ?? []).map((watch) => `${watch.table_name}:${watch.record_id}`)),
    [watches],
  );

  useEffect(() => setPage(1), [search, filters, sort, order, view]);

  const toggleSort = (field) => {
    if (sort === field) setOrder(order === "asc" ? "desc" : "asc");
    else {
      setSort(field);
      setOrder("asc");
    }
  };

  const submitForm = (body) => {
    setFormError("");
    const onError = (submitError) => setFormError(submitError.message ?? "Failed");
    if (editing) updateMutation.mutate({ record: editing, body }, { onSuccess: () => setFormOpen(false), onError });
    else createMutation.mutate(body, { onSuccess: () => setFormOpen(false), onError });
  };

  const exportQuery = buildQuery({
    search,
    view: view === "deleted" ? "deleted" : undefined,
    filters: filters.length ? JSON.stringify(filters) : undefined,
  });
  const runExport = (format) => {
    const separator = exportQuery ? "&" : "";
    return downloadFile(`/api/${resource.key}/export?format=${format}${separator}${exportQuery.slice(1)}`, `${resource.key}.${format}`);
  };

  const filterableFields = resource.fields.filter((field) => field.filterable);

  return (
    <Card className="p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={`Search ${resource.label.toLowerCase()}…`}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && setSearch(searchInput)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setSearch(searchInput)}>Search</Button>
        <Button variant={showFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters((value) => !value)}>
          <Filter className="h-4 w-4" /> Filters {filters.length > 0 && `(${filters.length})`}
        </Button>
        <Button variant="outline" size="sm" onClick={() => runExport("csv")}>
          <Download className="h-4 w-4" /> CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => runExport("json")}>
          <Download className="h-4 w-4" /> JSON
        </Button>
        {isAdmin && (
          <>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setFormError(""); setFormOpen(true); }}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        {["active", "deleted"].map((option) => (
          <button
            key={option}
            onClick={() => setView(option)}
            className={"rounded-md px-3 py-1 text-sm " + (view === option ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary/60")}
          >
            {option === "active" ? "Active" : "Trash"}
          </button>
        ))}
      </div>

      {showFilters && <FilterBuilder fields={filterableFields} filters={filters} setFilters={setFilters} />}

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
      ) : isError ? (
        <p className="py-8 text-center text-destructive">{error?.message}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="w-8 px-2 py-2" />
                {resource.fields.map((field) => (
                  <th key={field.name} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                    <button className="inline-flex items-center gap-1 hover:text-primary" onClick={() => toggleSort(field.name)}>
                      {field.label}
                      <ArrowUpDown className={"h-3 w-3 " + (sort === field.name ? "text-primary" : "text-muted-foreground/40")} />
                    </button>
                  </th>
                ))}
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data && data.data.length > 0 ? (
                data.data.map((row, index) => {
                  const recordId = recordIdOf(resource, row);
                  const watching = watchedSet.has(`${resource.table}:${recordId}`);
                  return (
                    <tr key={index} className="border-t border-border hover:bg-secondary/40">
                      <td className="px-2 py-2">
                        <button
                          title={watching ? "Stop watching" : "Watch for changes"}
                          onClick={() => toggleWatch.mutate({ table: resource.table, recordId, watching })}
                          className={watching ? "text-amber-500" : "text-muted-foreground/40 hover:text-amber-500"}
                        >
                          <Star className="h-4 w-4" fill={watching ? "currentColor" : "none"} />
                        </button>
                      </td>
                      {resource.fields.map((field) => (
                        <td key={field.name} className="max-w-[220px] truncate px-3 py-2" title={formatValue(row[field.name])}>
                          {formatValue(row[field.name])}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        {view === "deleted"
                          ? isAdmin && (
                              <button
                                className="inline-flex items-center gap-1 p-1 text-xs text-muted-foreground hover:text-emerald-600"
                                onClick={() => restoreMutation.mutate(row)}
                              >
                                <Undo2 className="h-4 w-4" /> Restore
                              </button>
                            )
                          : isAdmin && (
                              <>
                                <button className="p-1 text-muted-foreground hover:text-primary" onClick={() => { setEditing(row); setFormError(""); setFormOpen(true); }}>
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button className="p-1 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(row)}>
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={resource.fields.length + 2} className="px-3 py-10 text-center text-muted-foreground">
                    {view === "deleted" ? "Trash is empty." : "No records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {data.total} records · page {data.page} of {data.totalPages || 1}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((value) => value + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? `Edit ${resource.label}` : `Add ${resource.label}`}>
        <RecordForm
          resource={resource}
          initialValues={editing ?? undefined}
          isEdit={Boolean(editing)}
          onSubmit={submitForm}
          onCancel={() => setFormOpen(false)}
          error={formError}
          busy={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Move to trash" className="max-w-md">
        <p className="mb-4 text-sm text-muted-foreground">
          This soft-deletes the record — it moves to Trash and can be restored anytime. The change is recorded in history.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} resource={resource} />
    </Card>
  );
}

function ImportModal({ open, onClose, resource }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const importMutation = useImportRecords(resource);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (file) setText(await file.text());
  };

  const run = () => {
    setError("");
    setResult(null);
    try {
      const rows = parseImport(text);
      if (!rows.length) throw new Error("No rows found");
      importMutation.mutate(rows, { onSuccess: setResult, onError: (mutationError) => setError(mutationError.message) });
    } catch (parseError) {
      setError(parseError.message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Import ${resource.label}`}>
      <p className="mb-3 text-sm text-muted-foreground">
        Paste JSON (array of objects) or CSV, or choose a file. Column names must match the table fields.
        Each row is validated; invalid rows are reported and skipped.
      </p>
      <input type="file" accept=".json,.csv,text/csv,application/json" onChange={handleFile} className="mb-2 text-sm" />
      <textarea
        className="h-40 w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
        placeholder='[{"donor_id": 99, "donor_name": "New Donor"}]'
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {result && (
        <div className="mt-2 text-sm">
          <p className="text-emerald-600">Inserted {result.inserted} · Failed {result.failed}</p>
          {result.errors?.slice(0, 5).map((rowError, index) => (
            <p key={index} className="text-xs text-destructive">Row {rowError.row}: {rowError.message}</p>
          ))}
        </div>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button onClick={run} disabled={importMutation.isPending || !text.trim()}>
          {importMutation.isPending ? "Importing…" : "Import"}
        </Button>
      </div>
    </Modal>
  );
}

function FilterBuilder({ fields, filters, setFilters }) {
  const [field, setField] = useState(fields[0]?.name ?? "");
  const [operator, setOperator] = useState("contains");
  const [value, setValue] = useState("");

  const selectedField = fields.find((item) => item.name === field);
  const operators = selectedField?.type === "string" ? ["contains", "eq"] : ["eq", "gt", "gte", "lt", "lte"];

  const addFilter = () => {
    if (!field || value === "") return;
    setFilters([...filters, { field, op: operator, value }]);
    setValue("");
  };

  return (
    <div className="mb-4 space-y-3 rounded-md border border-border bg-secondary/30 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[140px]">
          <label className="text-xs text-muted-foreground">Field</label>
          <Select value={field} onChange={(event) => { setField(event.target.value); setOperator("contains"); }}>
            {fields.map((item) => (
              <option key={item.name} value={item.name}>{item.label}</option>
            ))}
          </Select>
        </div>
        <div className="w-28">
          <label className="text-xs text-muted-foreground">Operator</label>
          <Select value={operator} onChange={(event) => setOperator(event.target.value)}>
            {operators.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </Select>
        </div>
        <div className="min-w-[140px] flex-1">
          <label className="text-xs text-muted-foreground">Value</label>
          <Input
            type={selectedField?.type === "number" ? "number" : selectedField?.type === "date" ? "date" : "text"}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && addFilter()}
          />
        </div>
        <Button size="sm" onClick={addFilter}>Add filter</Button>
      </div>
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((item, index) => (
            <Badge key={index} tone="blue" className="gap-1">
              {item.field} {item.op} "{item.value}"
              <button onClick={() => setFilters(filters.filter((_, i) => i !== index))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <button className="text-xs text-muted-foreground underline hover:text-foreground" onClick={() => setFilters([])}>
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
