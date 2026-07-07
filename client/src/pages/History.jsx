import { useState } from "react";
import { useHistory, useSchemaChanges, useRevert, useResources } from "@/api/hooks.js";
import { useAuth } from "@/hooks/useAuth.jsx";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select, Spinner } from "@/components/ui/index.jsx";
import { formatValue } from "@/lib/utils.js";
import { Undo2, GitCommit, ChevronLeft, ChevronRight } from "lucide-react";

const actionTone = { CREATE: "green", UPDATE: "blue", DELETE: "red", REVERT: "amber" };

export default function History() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { data: resources } = useResources();
  const [page, setPage] = useState(1);
  const [table, setTable] = useState("");
  const [action, setAction] = useState("");

  const { data, isLoading } = useHistory({ page, table: table || undefined, action: action || undefined });
  const { data: schemaChanges } = useSchemaChanges();
  const revert = useRevert();

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Change History</h1>
        <p className="text-muted-foreground mt-1">
          A complete, append-only log of every change made to the database.{" "}
          {isAdmin ? "You can revert any change." : "Read-only view."}
        </p>
      </div>

      {schemaChanges && schemaChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GitCommit className="h-4 w-4" /> Schema changes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {schemaChanges.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm border-b border-border/60 py-1">
                <span>
                  <span className="font-mono">{s.migration}</span>
                  {s.summary && <span className="text-muted-foreground"> — {s.summary}</span>}
                </span>
                <span className="text-xs text-muted-foreground">{new Date(s.applied_at).toLocaleDateString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="w-52">
          <Select value={table} onChange={(e) => { setTable(e.target.value); setPage(1); }}>
            <option value="">All tables</option>
            {resources?.map((r) => (
              <option key={r.table} value={r.table}>{r.label}</option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            <option value="">All actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="REVERT">Revert</option>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="space-y-3">
          {data?.data.length ? (
            data.data.map((log) => (
              <HistoryItem key={log.id} log={log} isAdmin={isAdmin} onRevert={() => revert.mutate(log.id)} reverting={revert.isPending} />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-10">No changes recorded yet.</p>
          )}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {data.page} of {data.totalPages}</span>
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
    </div>
  );
}

function HistoryItem({ log, isAdmin, onRevert, reverting }) {
  const diffEntries = log.diff ? Object.entries(log.diff) : [];
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={actionTone[log.action]}>{log.action}</Badge>
              <span className="font-mono text-sm">{log.table_name}</span>
              <span className="text-sm text-muted-foreground">#{log.record_id}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {log.actor_email || "system"} · {new Date(log.created_at).toLocaleString()}
            </div>
          </div>
          {isAdmin && log.action !== "REVERT" && (
            <Button variant="outline" size="sm" onClick={onRevert} disabled={reverting}>
              <Undo2 className="h-3.5 w-3.5" /> Revert
            </Button>
          )}
        </div>

        {log.action === "UPDATE" && diffEntries.length > 0 && (
          <div className="mt-3 space-y-1">
            {diffEntries.map(([field, d]) => (
              <div key={field} className="text-sm flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground w-40 truncate">{field}</span>
                <span className="line-through text-red-600 dark:text-red-400">{formatValue(d.from)}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatValue(d.to)}</span>
              </div>
            ))}
          </div>
        )}
        {log.action === "CREATE" && log.after_data && (
          <div className="mt-2 text-xs text-muted-foreground">Created with {Object.keys(log.after_data).length} fields.</div>
        )}
        {log.action === "DELETE" && log.before_data && (
          <div className="mt-2 text-xs text-muted-foreground">Deleted record snapshot preserved for revert.</div>
        )}
      </CardContent>
    </Card>
  );
}
