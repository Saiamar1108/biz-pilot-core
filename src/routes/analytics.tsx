import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PageSection } from "@/components/dashboard/PageSection";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { DollarSign, TrendingUp, Sparkles, Award, Package, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getAnalytics, type AnalyticsSummary } from "@/lib/api";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — ShopPilot AI" }] }),
  component: AnalyticsPage,
});

const fallbackRevenue = [
  { m: "Jan", v: 12000 }, { m: "Feb", v: 15800 }, { m: "Mar", v: 14200 },
  { m: "Apr", v: 19400 }, { m: "May", v: 22100 }, { m: "Jun", v: 25800 },
  { m: "Jul", v: 28900 }, { m: "Aug", v: 31200 }, { m: "Sep", v: 34500 },
];
const fallbackGrowth = [
  { m: "May", v: 8 }, { m: "Jun", v: 12 }, { m: "Jul", v: 15 },
  { m: "Aug", v: 18 }, { m: "Sep", v: 22 }, { m: "Oct", v: 28 },
];

function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAnalytics();
        if (!active) return;
        setAnalytics(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load analytics");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const revenue = useMemo(() => analytics?.monthlyRevenue?.map((entry) => ({ m: entry.month, v: entry.revenue })) ?? fallbackRevenue, [analytics]);
  const pieData = useMemo(() => {
    if (!analytics?.topProducts?.length) {
      return [
        { name: "No data", v: 100, color: "oklch(0.78 0.16 75)" },
      ];
    }
    return analytics.topProducts.slice(0, 4).map((product, index) => ({
      name: product.name,
      v: product.sold,
      color: ["oklch(0.549 0.222 262)", "oklch(0.7 0.16 165)", "oklch(0.65 0.19 258)", "oklch(0.78 0.16 75)"][index % 4],
    }));
  }, [analytics]);

  const topProducts = useMemo(() => analytics?.topProducts?.slice(0, 4).map((product) => ({ name: product.name, units: product.sold, revenue: product.revenue })) ?? [], [analytics]);
  const demandPredictions = useMemo(() => [
    { title: "Low Stock", forecast: `${analytics?.lowStockItems?.length ?? 0}`, confidence: "Live", icon: Package, detail: "Products below threshold" },
    { title: "Revenue", forecast: `${analytics?.monthlyRevenue?.at(-1)?.revenue ? `$${analytics.monthlyRevenue.at(-1)?.revenue.toLocaleString()}` : "—"}`, confidence: "Current", icon: TrendingUp, detail: "Latest month trend" },
    { title: "Top Products", forecast: `${analytics?.topProducts?.length ?? 0}`, confidence: "Updated", icon: Users, detail: "Top-selling items" },
  ], [analytics]);

  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-6">
        {error && <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Revenue" value={`$${(analytics?.totalSales ?? 203900).toLocaleString()}`} change={22.4} icon={DollarSign} accent="primary" />
          <StatCard label="Growth Rate" value="28%" change={6} icon={TrendingUp} accent="emerald" />
          <StatCard label="AI Predictions" value="94% acc" change={2.1} icon={Sparkles} accent="primary" />
          <StatCard label="Top Category" value="Grocery" icon={Award} accent="emerald" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <PageSection title="Revenue Trend" description="Monthly performance" className="lg:col-span-2">
            {loading ? (
              <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">Loading analytics…</div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenue}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.012 258)" />
                    <XAxis dataKey="m" stroke="oklch(0.5 0.03 258)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="oklch(0.5 0.03 258)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 258)" }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                    <Line type="monotone" dataKey="v" stroke="oklch(0.549 0.222 262)" strokeWidth={3} dot={{ r: 4, fill: "oklch(0.549 0.222 262)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </PageSection>

          <PageSection title="Product Performance" description="Best-selling items">
            {loading ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Loading performance…</div>
            ) : (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="v" innerRadius={50} outerRadius={80} paddingAngle={4}>
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 258)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {pieData.map((p) => (
                    <div key={p.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                        {p.name}
                      </div>
                      <span className="font-semibold">{p.v}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </PageSection>
        </div>

        <PageSection title="Demand Predictions" description="AI-powered insights from current data">
          <div className="grid sm:grid-cols-3 gap-4">
            {demandPredictions.map((d) => (
              <div key={d.title} className="rounded-xl border border-border p-4 hover:shadow-elegant transition">
                <div className="flex items-center gap-3 mb-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <d.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{d.title}</div>
                    <div className="text-xs text-muted-foreground">{d.confidence} confidence</div>
                  </div>
                </div>
                <div className="text-2xl font-display font-bold text-accent-brand">{d.forecast}</div>
                <div className="text-xs text-muted-foreground mt-1">{d.detail}</div>
              </div>
            ))}
          </div>
        </PageSection>

        <div className="grid lg:grid-cols-3 gap-6">
          <PageSection title="Top-Selling Products">
            {loading ? (
              <div className="py-8 text-sm text-muted-foreground">Loading top products…</div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/60">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary font-bold text-sm">{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.units} units</div>
                    </div>
                    <div className="font-semibold text-sm">${p.revenue}</div>
                  </div>
                ))}
              </div>
            )}
          </PageSection>

          <div className="rounded-2xl p-6 gradient-primary text-primary-foreground shadow-glow relative overflow-hidden">
            <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5" />
                <div className="text-sm font-semibold uppercase tracking-wider">AI Prediction</div>
              </div>
              <div className="text-3xl font-display font-bold mb-1">+34%</div>
              <div className="text-primary-foreground/80 text-sm mb-4">Expected Q4 revenue growth based on current trends</div>
              <div className="space-y-2 text-sm">
                <div className="bg-white/10 rounded-lg px-3 py-2">Holiday season boost expected</div>
                <div className="bg-white/10 rounded-lg px-3 py-2">Focus: Grocery + Drinks</div>
              </div>
            </div>
          </div>

          <PageSection title="Sales Trends" description="Monthly growth rate">
            {loading ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Loading trends…</div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fallbackGrowth}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.012 258)" />
                    <XAxis dataKey="m" stroke="oklch(0.5 0.03 258)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="oklch(0.5 0.03 258)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 258)" }} formatter={(v: number) => [`${v}%`, "Growth"]} />
                    <Bar dataKey="v" fill="oklch(0.7 0.16 165)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </PageSection>
        </div>
      </div>
    </DashboardLayout>
  );
}
