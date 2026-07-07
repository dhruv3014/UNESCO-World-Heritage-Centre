import { useStats } from "@/api/hooks.js";
import { Card, CardContent, CardHeader, CardTitle, Spinner } from "@/components/ui/index.jsx";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Landmark, Coins, HeartHandshake, AlertTriangle } from "lucide-react";

const COLORS = ["#0284c7", "#0891b2", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#ca8a04"];

export default function Dashboard() {
  const { data: stats, isLoading } = useStats();

  if (isLoading || !stats) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const money = (n) => "$" + Number(n).toLocaleString();

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={Landmark} label="Heritage Sites" value={String(stats.counts.sites ?? 0)} tone="text-sky-600" />
        <Metric icon={AlertTriangle} label="Sites in Danger" value={String(stats.dangerSites)} tone="text-amber-600" />
        <Metric icon={Coins} label="Total Funds" value={money(stats.funds.total)} tone="text-violet-600" />
        <Metric icon={HeartHandshake} label="Donations" value={money(stats.donations.total)} tone="text-emerald-600" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sites by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={stats.sitesByCategory} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={90} label>
                  {stats.sitesByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funds by Type (total amount)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.fundsByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => money(v)} />
                <Bar dataKey="total" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fund Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Used: {money(stats.funds.used)}</span>
            <span className="text-muted-foreground">Unused: {money(stats.funds.unused)}</span>
          </div>
          <div className="h-4 w-full rounded-full bg-secondary overflow-hidden">
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

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <Card>
      <CardContent className="pt-5 flex items-center gap-3">
        <Icon className={`h-8 w-8 ${tone}`} />
        <div>
          <div className="text-xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
