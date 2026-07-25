import { useState } from "react";
import { useFeed, useWatches } from "@/hooks/api.js";
import { Badge, Button, Card, CardContent, Spinner } from "@/components/ui/index.jsx";
import { formatValue } from "@/lib/utils.js";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

const ACTION_TONE = { CREATE: "green", UPDATE: "blue", DELETE: "red", RESTORE: "green", REVERT: "amber" };

/** Shows changes to records the user is watching (star icon in the Data Explorer). */
export default function FeedPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFeed(page);
  const { data: watches } = useWatches();

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Feed</h1>
        <p className="mt-1 text-muted-foreground">
          Changes to records you're watching. Add records by clicking the{" "}
          <Star className="inline h-4 w-4 text-amber-500" /> star in the Data Explorer.
        </p>
        {watches && <p className="mt-1 text-sm text-muted-foreground">Watching {watches.length} record(s).</p>}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
      ) : (
        <div className="space-y-3">
          {data?.data?.length ? (
            data.data.map((log) => <FeedItem key={log.id} log={log} />)
          ) : (
            <p className="py-10 text-center text-muted-foreground">No activity yet on your watched records.</p>
          )}
        </div>
      )}

      {data && data.total > 0 && (
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

function FeedItem({ log }) {
  const diffEntries = log.diff ? Object.entries(log.diff) : [];
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={ACTION_TONE[log.action]}>{log.action}</Badge>
          <span className="font-mono text-sm">{log.table_name}</span>
          <span className="text-sm text-muted-foreground">#{log.record_id}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {log.actor_email || "system"} · {new Date(log.created_at).toLocaleString()}
          </span>
        </div>
        {diffEntries.length > 0 && (
          <div className="mt-2 space-y-1">
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
      </CardContent>
    </Card>
  );
}
