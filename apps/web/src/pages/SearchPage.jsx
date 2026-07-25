import { useState } from "react";
import { Link } from "react-router-dom";
import { useSearch } from "@/hooks/api.js";
import { Badge, Card, CardContent, Input, Spinner } from "@/components/ui/index.jsx";
import { Search as SearchIcon } from "lucide-react";

/** Global full-text search across heritage sites, with highlighted snippets. */
export default function SearchPage() {
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const { data, isFetching } = useSearch("sites", term);

  const handleSubmit = (event) => {
    event.preventDefault();
    setTerm(input);
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search Sites</h1>
        <p className="mt-1 text-muted-foreground">
          Full-text search across site names, addresses, categories, ownership and history — ranked by relevance.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="e.g. marble mausoleum, Inca citadel, national park…"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          autoFocus
        />
      </form>

      {isFetching && <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div>}

      {data && (
        <div className="space-y-3">
          {data.data.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No matches. Try different keywords.</p>
          ) : (
            data.data.map((site) => (
              <Card key={site.s_id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <Link to="/explorer/sites" className="font-semibold hover:text-primary">{site.site_name}</Link>
                    <Badge tone="blue">{site.category || "—"}</Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{site.address}</div>
                  {site.highlight && (
                    <p
                      className="mt-2 text-sm [&_mark]:rounded [&_mark]:bg-amber-200 [&_mark]:px-0.5 [&_mark]:dark:bg-amber-500/40"
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
