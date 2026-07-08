import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useResources, useAddColumn, useRenameColumn, useDropColumn } from "@/api/hooks.js";
import { useAuth } from "@/hooks/useAuth.jsx";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Spinner } from "@/components/ui/index.jsx";
import { KeyRound, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";

const COLUMN_TYPES = ["string", "number", "integer", "boolean", "date"];

// Admin-only: add / rename / drop columns on a table. Core columns are locked;
// only admin-added ("custom") columns can be renamed or dropped. Every change
// is logged to the schema change log, visible to everyone on the History page.
export default function SchemaEditor() {
  const { user } = useAuth();
  const { data: resources } = useResources();
  const [resourceKey, setResourceKey] = useState("sites");

  // All hooks must run before any early return (Rules of Hooks).
  const resource = useMemo(
    () => resources?.find((r) => r.key === resourceKey),
    [resources, resourceKey]
  );

  if (user?.role !== "ADMIN") return <Navigate to="/" replace />;
  if (!resources) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Schema Editor</h1>
        <p className="text-muted-foreground mt-1">
          Add columns to any table. Custom columns can be renamed or dropped; core columns are protected.
        </p>
      </div>

      <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm flex gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <span>Schema changes affect the live database immediately and are recorded in the change history.</span>
      </div>

      <div className="w-64">
        <label className="text-xs text-muted-foreground">Table</label>
        <Select value={resourceKey} onChange={(e) => setResourceKey(e.target.value)}>
          {resources.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </Select>
      </div>

      {resource && <TableColumns resource={resource} />}
    </div>
  );
}

function TableColumns({ resource }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("string");
  const [error, setError] = useState("");
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState("");

  const addColumn = useAddColumn(resource.key);
  const renameColumn = useRenameColumn(resource.key);
  const dropColumn = useDropColumn(resource.key);

  const add = (e) => {
    e.preventDefault();
    setError("");
    addColumn.mutate({ name, type }, {
      onSuccess: () => setName(""),
      onError: (err) => setError(err.message),
    });
  };

  const submitRename = (column) => {
    setError("");
    renameColumn.mutate({ column, newName }, {
      onSuccess: () => setRenaming(null),
      onError: (err) => setError(err.message),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Columns of <span className="font-mono">{resource.table}</span></CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="divide-y divide-border/60">
          {resource.fields.map((f) => (
            <div key={f.name} className="flex items-center gap-2 py-2 text-sm">
              {f.isId && <KeyRound className="h-3.5 w-3.5 text-amber-500" />}
              {renaming === f.name ? (
                <>
                  <Input className="h-8 w-48" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
                  <Button size="sm" onClick={() => submitRename(f.name)} disabled={renameColumn.isPending}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setRenaming(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <span className="font-mono">{f.name}</span>
                  <Badge>{f.type}</Badge>
                  {f.custom ? <Badge tone="blue">custom</Badge> : <Badge>core</Badge>}
                  {f.custom && (
                    <div className="ml-auto flex gap-1">
                      <button className="text-muted-foreground hover:text-primary p-1"
                        onClick={() => { setRenaming(f.name); setNewName(f.name); }}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="text-muted-foreground hover:text-destructive p-1"
                        onClick={() => { if (confirm(`Drop column "${f.name}"? This deletes its data.`)) dropColumn.mutate(f.name); }}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={add} className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-muted-foreground">New column name</label>
            <Input placeholder="e.g. unesco_ref" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="w-36">
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {COLUMN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <Button type="submit" disabled={addColumn.isPending || !name.trim()}>
            <Plus className="h-4 w-4" /> Add column
          </Button>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
