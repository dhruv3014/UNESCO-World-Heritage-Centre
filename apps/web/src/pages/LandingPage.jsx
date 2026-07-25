import { useState } from "react";
import { Link } from "react-router-dom";
import { useResources, useStats } from "@/hooks/api.js";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageSpinner } from "@/components/ui/index.jsx";
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

const STORAGE_EXAMPLE = [
  { table: "donors", text: "A donor (Global Heritage Trust) is registered in donor_detail." },
  { table: "countries", text: "India is stored in member_country, linked to its donor." },
  { table: "institutes", text: "The Archaeological Survey of India is added to local_institute_agency." },
  { table: "sites", text: "Taj Mahal is inserted into site_detail with FKs to its country and institute." },
  { table: "managers", text: "Its manager goes into site_manager, referencing the site." },
  { table: "funds", text: "A conservation fund is created in fund and linked via other_fund." },
];

export default function LandingPage() {
  const { data: resources, isLoading } = useResources();
  const { data: stats } = useStats();
  const [activeKey, setActiveKey] = useState("sites");

  if (isLoading || !resources) return <PageSpinner />;

  const resourcesByKey = Object.fromEntries(resources.map((resource) => [resource.key, resource]));
  const activeResource = resourcesByKey[activeKey];
  const relatedKeys = RELATIONS[activeKey] ?? [];

  return (
    <div className="max-w-6xl space-y-8">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">How the data is stored</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          The portal is built on a normalized (3NF/BCNF) PostgreSQL schema of {resources.length} related tables.
          Click any table below to see its columns and how it connects to the rest of the database.
        </p>
        <div className="mt-4 flex gap-3">
          <Link to="/explorer">
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Heritage sites" value={stats.counts.sites} />
          <StatCard label="Member countries" value={stats.counts.countries} />
          <StatCard label="Funds" value={stats.counts.funds} />
          <StatCard label="Donations" value={stats.counts.donations} />
        </div>
      )}

      <section>
        <h2 className="mb-3 text-xl font-semibold">Entity map</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:col-span-2">
            {resources.map((resource) => {
              const isActive = resource.key === activeKey;
              const isRelated = relatedKeys.includes(resource.key);
              return (
                <button
                  key={resource.key}
                  onClick={() => setActiveKey(resource.key)}
                  className={
                    "rounded-lg border p-3 text-left transition " +
                    (isActive
                      ? "border-primary bg-accent ring-2 ring-ring"
                      : isRelated
                        ? "border-primary/50 bg-accent/40"
                        : "border-border bg-card hover:bg-secondary")
                  }
                >
                  <div className="flex items-center gap-2">
                    <Table2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{resource.label}</span>
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{resource.table}</div>
                </button>
              );
            })}
          </div>

          <Card className="h-fit md:sticky md:top-4">
            <CardHeader>
              <CardTitle className="text-base">{activeResource?.label ?? "Select a table"}</CardTitle>
            </CardHeader>
            <CardContent>
              {activeResource && (
                <TableSchema
                  resource={activeResource}
                  related={relatedKeys.map((key) => resourcesByKey[key]?.label).filter(Boolean)}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-xl font-semibold">Example: storing the Taj Mahal</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          A single real-world record spreads across several tables. Foreign keys keep everything consistent.
        </p>
        <div className="space-y-2">
          {STORAGE_EXAMPLE.map((step, index) => (
            <button
              key={step.table}
              onClick={() => setActiveKey(step.table)}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition hover:bg-secondary"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <span className="text-sm">{step.text}</span>
              <Badge tone="blue" className="ml-auto font-mono">
                {resourcesByKey[step.table]?.table}
              </Badge>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
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
        {resource.fields.map((field) => (
          <div key={field.name} className="flex items-center justify-between border-b border-border/60 py-1 text-sm">
            <span className="flex items-center gap-1.5 font-mono text-xs">
              {field.isId && <KeyRound className="h-3 w-3 text-amber-500" />}
              {field.name}
            </span>
            <span className="text-xs text-muted-foreground">{field.type}</span>
          </div>
        ))}
      </div>
      {related.length > 0 && (
        <div className="pt-1">
          <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Link2 className="h-3 w-3" /> Connects to
          </div>
          <div className="flex flex-wrap gap-1">
            {related.map((label) => (
              <Badge key={label}>{label}</Badge>
            ))}
          </div>
        </div>
      )}
      <Link to={`/explorer/${resource.key}`} className="inline-flex items-center gap-1 pt-1 text-sm text-primary hover:underline">
        Browse this table <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
