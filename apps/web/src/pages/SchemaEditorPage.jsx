import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useResources, useAddColumn, useRenameColumn, useDropColumn } from "@/hooks/api.js";
import { useAuth } from "@/context/AuthContext.jsx";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select, PageSpinner } from "@/components/ui/index.jsx";
import { KeyRound, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";

const COLUMN_TYPES = ["string", "number", "integer", "boolean", "date"];

/**
 * Admin-only: add / rename / drop columns on a table. Core columns are locked;
 * only admin-added ("custom") columns can be renamed or dropped. Every change is
 * logged to the schema change log, visible to everyone on the History page.
 */
export default function SchemaEditorPage() {
  const { user } = useAuth();
  const { data: resources } = useResources();
  const [resourceKey, setResourceKey] = useState("sites");

  // All hooks run before any early return (Rules of Hooks).
  const resource = useMemo(() => resources?.find((item) => item.key === resourceKey), [resources, resourceKey]);

  if (user?.role !== "ADMIN") return <Navigate to="/" replace />;
  if (!resources) return <PageSpinner />;

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Schema Editor</h1>
        <p className="mt-1 text-muted-foreground">
          Add columns to any table. Custom columns can be renamed or dropped; core columns are protected.
        </p>
      </div>

      <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-900/20">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <span>Schema changes affect the live database immediately and are recorded in the change history.</span>
      </div>

      <div className="w-64">
        <label className="text-xs text-muted-foreground">Table</label>
        <Select value={resourceKey} onChange={(event) => setResourceKey(event.target.value)}>
          {resources.map((item) => (
            <option key={item.key} value={item.key}>{item.label}</option>
          ))}
        </Select>
      </div>

      {resource && <ColumnManager resource={resource} />}
    </div>
  );
}

function ColumnManager({ resource }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("string");
  const [error, setError] = useState("");
  const [renamingColumn, setRenamingColumn] = useState(null);
  const [newName, setNewName] = useState("");

  const addColumn = useAddColumn(resource.key);
  const renameColumn = useRenameColumn(resource.key);
  const dropColumn = useDropColumn(resource.key);

  const handleAdd = (event) => {
    event.preventDefault();
    setError("");
    addColumn.mutate({ name, type }, { onSuccess: () => setName(""), onError: (mutationError) => setError(mutationError.message) });
  };

  const handleRename = (column) => {
    setError("");
    renameColumn.mutate({ column, newName }, { onSuccess: () => setRenamingColumn(null), onError: (mutationError) => setError(mutationError.message) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Columns of <span className="font-mono">{resource.table}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="divide-y divide-border/60">
          {resource.fields.map((field) => (
            <div key={field.name} className="flex items-center gap-2 py-2 text-sm">
              {field.isId && <KeyRound className="h-3.5 w-3.5 text-amber-500" />}
              {renamingColumn === field.name ? (
                <>
                  <Input className="h-8 w-48" value={newName} onChange={(event) => setNewName(event.target.value)} autoFocus />
                  <Button size="sm" onClick={() => handleRename(field.name)} disabled={renameColumn.isPending}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setRenamingColumn(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <span className="font-mono">{field.name}</span>
                  <Badge>{field.type}</Badge>
                  {field.custom ? <Badge tone="blue">custom</Badge> : <Badge>core</Badge>}
                  {field.custom && (
                    <div className="ml-auto flex gap-1">
                      <button
                        className="p-1 text-muted-foreground hover:text-primary"
                        onClick={() => { setRenamingColumn(field.name); setNewName(field.name); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="p-1 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Drop column "${field.name}"? This deletes its data.`)) dropColumn.mutate(field.name);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <div className="min-w-[160px] flex-1">
            <label className="text-xs text-muted-foreground">New column name</label>
            <Input placeholder="e.g. unesco_ref" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="w-36">
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={type} onChange={(event) => setType(event.target.value)}>
              {COLUMN_TYPES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
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
