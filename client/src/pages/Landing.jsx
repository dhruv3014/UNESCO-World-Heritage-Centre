import { useState } from "react";
import { Link } from "react-router-dom";
import { useResources, useStats } from "@/api/hooks.js";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner } from "@/components/ui/index.jsx";
import { Database, KeyRound, Link2, ArrowRight, Table2 } from "lucide-react";

// Relationships used to highlight connections in the entity map.
const RELATIONS = {
  sites: ["countries", "institutes", "managers", "danger-sites"],
  managers: ["sites", "status-reports", "other-funds"],
  "status-reports": ["managers"],
  "danger-sites": ["sites", "institutes", "danger-site-funds"],
  funds: ["other-funds", "danger-site-funds"],
  "other-funds": ["funds", "managers"],
  "danger-site-funds": ["funds", "sites"],
  countries: ["donors", "sites", "committee", "awards"],
  donations: ["donors"],
  donors: ["donations", "countries"],
  committee: ["countries"],
  awards: ["countries"],
  institutes: ["sites", "danger-sites"],
};

const EXAMPLE = [
  { table: "donors", text: "A donor (Global Heritage Trust) is registered in donor_detail." },
  { table: "countries", text: "India is stored in member_country, linked to its donor." },
  { table: "institutes", text: "The Archaeological Survey of India is added to local_institute_agency." },
  { table: "sites", text: "Taj Mahal is inserted into site_detail with FKs to its country and institute." },
  { table: "managers", text: "Its manager goes into site_manager, referencing the site." },
  { table: "funds", text: "A conservation fund is created in fund and linked via other_fund." },
];

export default function Landing() {
  const { data: resources, isLoading } = useResources();
  const { data: stats } = useStats();
  const [active, setActive] = useState("sites");

  if (isLoading || !resources) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const byKey = Object.fromEntries(resources.map((r) => [r.key, r]));
  const activeResource = active ? byKey[active] : null;
  const related = active ? RELATIONS[active] || [] : [];

  return (
    <div className="space-y-8 max-w-6xl">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">How the data is stored</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          The portal is built on a normalized (3NF/BCNF) PostgreSQL schema of {resources.length} related tables.
          Click any table below to see its columns and how it connects to the rest of the database.
        </p>
        <div className="flex gap-3 mt-4">
          <Link to="/browse">
            <Button>
              <Database className="h-4 w-4" /> Explore the data
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline">View dashboard</Button>
          </Link>
        </div>
      </section>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Heritage sites" value={stats.counts.sites} />
          <Stat label="Member countries" value={stats.counts.countries} />
          <Stat label="Funds" value={stats.counts.funds} />
          <Stat label="Donations" value={stats.counts.donations} />
        </div>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">Entity map</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {resources.map((r) => {
              const isActive = r.key === active;
              const isRelated = related.includes(r.key);
              return (
                <button
                  key={r.key}
                  onClick={() => setActive(r.key)}
                  className={
                    "text-left rounded-lg border p-3 transition " +
                    (isActive
                      ? "border-primary bg-accent ring-2 ring-ring"
                      : isRelated
                      ? "border-primary/50 bg-accent/40"
                      : "border-border bg-card hover:bg-secondary")
                  }
                >
                  <div className="flex items-center gap-2">
                    <Table2 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{r.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">{r.table}</div>
                </button>
              );
            })}
          </div>

          <Card className="md:sticky md:top-4 h-fit">
            <CardHeader>
              <CardTitle className="text-base">{activeResource?.label || "Select a table"}</CardTitle>
            </CardHeader>
            <CardContent>
              {activeResource && (
                <TableSchema resource={activeResource} related={related.map((k) => byKey[k]?.label).filter(Boolean)} />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-1">Example: storing the Taj Mahal</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          A single real-world record spreads across several tables. Foreign keys keep everything consistent.
        </p>
        <div className="space-y-2">
          {EXAMPLE.map((step, i) => (
            <button
              key={i}
              onClick={() => setActive(step.table)}
              className="w-full flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:bg-secondary transition"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                {i + 1}
              </span>
              <span className="text-sm">{step.text}</span>
              <Badge tone="blue" className="ml-auto font-mono">{byKey[step.table]?.table}</Badge>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-2xl font-bold">{value ?? 0}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function TableSchema({ resource, related }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{resource.description}</p>
      <div className="space-y-1">
        {resource.fields.map((f) => (
          <div key={f.name} className="flex items-center justify-between text-sm border-b border-border/60 py-1">
            <span className="flex items-center gap-1.5 font-mono text-xs">
              {f.isId && <KeyRound className="h-3 w-3 text-amber-500" />}
              {f.name}
            </span>
            <span className="text-xs text-muted-foreground">{f.type}</span>
          </div>
        ))}
      </div>
      {related.length > 0 && (
        <div className="pt-1">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
            <Link2 className="h-3 w-3" /> Connects to
          </div>
          <div className="flex flex-wrap gap-1">
            {related.map((r) => (
              <Badge key={r}>{r}</Badge>
            ))}
          </div>
        </div>
      )}
      <Link to={`/browse/${resource.key}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline pt-1">
        Browse this table <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
