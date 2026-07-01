import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { DollarSign, TrendingUp, Sparkles, Award } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — ShopPilot AI" }] }),
  component: AnalyticsPage,
});

const revenue = [
  { m: "Jan", v: 12000 }, { m: "Feb", v: 15800 }, { m: "Mar", v: 14200 },
  { m: "Apr", v: 19400 }, { m: "May", v: 22100 }, { m: "Jun", v: 25800 },
  { m: "Jul", v: 28900 }, { m: "Aug", v: 31200 }, { m: "Sep", v: 34500 },
];
const pieData = [
  { name: "Grocery", v: 42, color: "oklch(0.549 0.222 262)" },
  { name: "Snacks", v: 24, color: "oklch(0.7 0.16 165)" },
  { name: "Drinks", v: 18, color: "oklch(0.65 0.19 258)" },
  { name: "Other", v: 16, color: "oklch(0.78 0.16 75)" },
];
const growth = [
  { m: "May", v: 8 }, { m: "Jun", v: 12 }, { m: "Jul", v: 15 },
  { m: "Aug", v: 18 }, { m: "Sep", v: 22 }, { m: "Oct", v: 28 },
];
const topProducts = [
  { name: "Cold Brew Bottle", units: 320, revenue: 1760 },
  { name: "Dark Chocolate", units: 210, revenue: 798 },
  { name: "Organic Eggs", units: 190, revenue: 1311 },
  { name: "Basmati Rice", units: 128, revenue: 1600 },
];

function AnalyticsPage() {
  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Revenue" value="$203,900" change={22.4} icon={DollarSign} accent="primary" />
          <StatCard label="Growth Rate" value="28%" change={6} icon={TrendingUp} accent="emerald" />
          <StatCard label="AI Predictions" value="94% acc" change={2.1} icon={Sparkles} accent="primary" />
          <StatCard label="Top Category" value="Grocery" icon={Award} accent="emerald" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 lg:col-span-2">
            <h3 className="font-display text-lg font-bold mb-6">Revenue Trend (9 months)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.012 258)" />
                  <XAxis dataKey="m" stroke="oklch(0.5 0.03 258)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.5 0.03 258)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 258)" }} />
                  <Line type="monotone" dataKey="v" stroke="oklch(0.549 0.222 262)" strokeWidth={3} dot={{ r: 4, fill: "oklch(0.549 0.222 262)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-display text-lg font-bold mb-6">Product Performance</h3>
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
                  <span className="font-semibold">{p.v}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-display text-lg font-bold mb-4">Top-Selling Products</h3>
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
          </div>

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
                <div className="bg-white/10 rounded-lg px-3 py-2">📈 Holiday season boost expected</div>
                <div className="bg-white/10 rounded-lg px-3 py-2">🎯 Focus: Grocery + Drinks</div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-display text-lg font-bold mb-4">Monthly Growth</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.012 258)" />
                  <XAxis dataKey="m" stroke="oklch(0.5 0.03 258)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.5 0.03 258)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 258)" }} />
                  <Bar dataKey="v" fill="oklch(0.7 0.16 165)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
