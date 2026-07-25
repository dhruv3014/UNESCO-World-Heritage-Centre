import { useState } from "react";
import { useHistory, useSchemaChanges, useRevert, useResources } from "@/hooks/api.js";
import { useAuth } from "@/context/AuthContext.jsx";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select, Spinner } from "@/components/ui/index.jsx";
import { formatValue } from "@/lib/utils.js";
import { Undo2, GitCommit, ChevronLeft, ChevronRight } from "lucide-react";

const ACTION_TONE = { CREATE: "green", UPDATE: "blue", DELETE: "red", RESTORE: "green", REVERT: "amber" };
const REVERTIBLE_ACTIONS = ["CREATE", "UPDATE", "DELETE"];

export default function HistoryPage() {
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
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Change History</h1>
        <p className="mt-1 text-muted-foreground">
          A complete, append-only log of every change made to the database.{" "}
          {isAdmin ? "You can revert any change." : "Read-only view."}
        </p>
      </div>

      {schemaChanges && schemaChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitCommit className="h-4 w-4" /> Schema changes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {schemaChanges.map((change) => (
              <div key={change.id} className="flex items-center justify-between border-b border-border/60 py-1 text-sm">
                <span>
                  <span className="font-mono">{change.migration}</span>
                  {change.summary && <span className="text-muted-foreground"> — {change.summary}</span>}
                </span>
                <span className="text-xs text-muted-foreground">{new Date(change.applied_at).toLocaleDateString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="w-52">
          <Select value={table} onChange={(event) => { setTable(event.target.value); setPage(1); }}>
            <option value="">All tables</option>
            {resources?.map((resource) => (
              <option key={resource.table} value={resource.table}>{resource.label}</option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }}>
            <option value="">All actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="RESTORE">Restore</option>
            <option value="REVERT">Revert</option>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
      ) : (
        <div className="space-y-3">
          {data?.data.length ? (
            data.data.map((log) => (
              <HistoryItem key={log.id} log={log} isAdmin={isAdmin} onRevert={() => revert.mutate(log.id)} reverting={revert.isPending} />
            ))
          ) : (
            <p className="py-10 text-center text-muted-foreground">No changes recorded yet.</p>
          )}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {data.page} of {data.totalPages}</span>
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
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={ACTION_TONE[log.action]}>{log.action}</Badge>
              <span className="font-mono text-sm">{log.table_name}</span>
              <span className="text-sm text-muted-foreground">#{log.record_id}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {log.actor_email || "system"} · {new Date(log.created_at).toLocaleString()}
            </div>
          </div>
          {isAdmin && REVERTIBLE_ACTIONS.includes(log.action) && (
            <Button variant="outline" size="sm" onClick={onRevert} disabled={reverting}>
              <Undo2 className="h-3.5 w-3.5" /> Revert
            </Button>
          )}
        </div>

        {log.action === "UPDATE" && diffEntries.length > 0 && (
          <div className="mt-3 space-y-1">
            {diffEntries.map(([field, change]) => (
              <div key={field} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-40 truncate font-mono text-xs text-muted-foreground">{field}</span>
                <span className="text-red-600 line-through dark:text-red-400">{formatValue(change.from)}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatValue(change.to)}</span>
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
