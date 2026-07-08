import { useState } from "react";
import { Link } from "react-router-dom";
import { useSearch } from "@/api/hooks.js";
import { Badge, Card, CardContent, Input, Spinner } from "@/components/ui/index.jsx";
import { Search as SearchIcon } from "lucide-react";

// Global full-text search across heritage sites, with highlighted snippets.
export default function Search() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const { data, isFetching } = useSearch("sites", query);

  const submit = (e) => {
    e.preventDefault();
    setQuery(input);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search Sites</h1>
        <p className="text-muted-foreground mt-1">
          Full-text search across site names, addresses, categories, ownership and history — ranked by relevance.
        </p>
      </div>

      <form onSubmit={submit} className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="e.g. marble mausoleum, Inca citadel, national park…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
        />
      </form>

      {isFetching && <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div>}

      {data && (
        <div className="space-y-3">
          {data.data.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No matches. Try different keywords.</p>
          ) : (
            data.data.map((site) => (
              <Card key={site.s_id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <Link to={`/browse/sites`} className="font-semibold hover:text-primary">{site.site_name}</Link>
                    <Badge tone="blue">{site.category || "—"}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{site.address}</div>
                  {site.highlight && (
                    <p
                      className="text-sm mt-2 [&_mark]:bg-amber-200 [&_mark]:dark:bg-amber-500/40 [&_mark]:rounded [&_mark]:px-0.5"
                      dangerouslySetInnerHTML={{ __html: site.highlight }}
                    />
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
