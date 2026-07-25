import { useStats } from "@/hooks/api.js";
import { Card, CardContent, CardHeader, CardTitle, PageSpinner } from "@/components/ui/index.jsx";
import { formatMoney } from "@/lib/utils.js";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Landmark, Coins, HeartHandshake, AlertTriangle } from "lucide-react";

const CHART_COLORS = ["#0284c7", "#0891b2", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#ca8a04"];

export default function DashboardPage() {
  const { data: stats, isLoading } = useStats();
  if (isLoading || !stats) return <PageSpinner />;

  return (
    <div className="max-w-6xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric icon={Landmark} label="Heritage Sites" value={String(stats.counts.sites ?? 0)} tone="text-sky-600" />
        <Metric icon={AlertTriangle} label="Sites in Danger" value={String(stats.dangerSites)} tone="text-amber-600" />
        <Metric icon={Coins} label="Total Funds" value={formatMoney(stats.funds.total)} tone="text-violet-600" />
        <Metric icon={HeartHandshake} label="Donations" value={formatMoney(stats.donations.total)} tone="text-emerald-600" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard title="Sites by Category">
          <PieChart>
            <Pie data={stats.sitesByCategory} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={90} label>
              {stats.sitesByCategory.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ChartCard>

        <ChartCard title="Funds by Type (total amount)">
          <BarChart data={stats.fundsByType}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="type" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => formatMoney(value)} />
            <Bar dataKey="total" fill="#0284c7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Donations Over Time">
          <LineChart data={stats.donationsOverTime}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => formatMoney(value)} />
            <Line type="monotone" dataKey="total" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Sites by Region">
          <BarChart data={stats.sitesByRegion} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="region" width={110} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#7c3aed" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fund Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>Used: {formatMoney(stats.funds.used)}</span>
            <span className="text-muted-foreground">Unused: {formatMoney(stats.funds.unused)}</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary"
              style={{ width: `${stats.funds.total ? (stats.funds.used / stats.funds.total) * 100 : 0}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          {children}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-5">
        <Icon className={`h-8 w-8 ${tone}`} />
        <div>
          <div className="text-xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
