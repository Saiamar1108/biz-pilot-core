import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { DollarSign, ShoppingCart, AlertTriangle, Users, TrendingUp, Sparkles, ArrowUpRight } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ShopPilot AI" }] }),
  component: DashboardPage,
});

const salesData = [
  { m: "Mon", v: 3200 }, { m: "Tue", v: 4100 }, { m: "Wed", v: 3800 },
  { m: "Thu", v: 5200 }, { m: "Fri", v: 6100 }, { m: "Sat", v: 7400 }, { m: "Sun", v: 5900 },
];
const catData = [
  { c: "Grocery", v: 4200 }, { c: "Dairy", v: 2100 }, { c: "Snacks", v: 3400 },
  { c: "Drinks", v: 2900 }, { c: "Household", v: 1800 },
];
const activity = [
  { t: "New order #10238", desc: "Priya Sharma · $124.50", time: "2m ago", tag: "order" },
  { t: "Low stock alert", desc: "Basmati Rice 5kg — 3 left", time: "18m ago", tag: "alert" },
  { t: "Invoice paid", desc: "INV-00284 · $890.00", time: "1h ago", tag: "success" },
  { t: "New customer", desc: "Marcus Chen joined", time: "3h ago", tag: "info" },
];

function DashboardPage() {
  return (
    <DashboardLayout title="Overview">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Sales" value="$48,290" change={12.4} icon={DollarSign} accent="primary" />
          <StatCard label="Total Orders" value="1,284" change={8.2} icon={ShoppingCart} accent="emerald" />
          <StatCard label="Low Stock" value="12" change={-3} icon={AlertTriangle} accent="destructive" />
          <StatCard label="Revenue" value="$32,190" change={18.6} icon={TrendingUp} accent="primary" />
          <StatCard label="Active Customers" value="842" change={5.1} icon={Users} accent="emerald" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-lg font-bold">Sales Analytics</h3>
                <p className="text-xs text-muted-foreground">Weekly revenue trend</p>
              </div>
              <Button variant="outline" size="sm">Last 7 days</Button>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.549 0.222 262)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.549 0.222 262)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.012 258)" />
                  <XAxis dataKey="m" stroke="oklch(0.5 0.03 258)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.5 0.03 258)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 258)" }} />
                  <Area type="monotone" dataKey="v" stroke="oklch(0.549 0.222 262)" strokeWidth={2.5} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl p-6 bg-linear-to-br from-primary via-primary to-primary-glow text-primary-foreground shadow-glow relative overflow-hidden">
            <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 backdrop-blur">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="text-sm font-semibold">AI Insights</div>
              </div>
              <p className="text-lg font-display font-bold leading-snug">
                Your weekend sales spiked 34% — restock Basmati Rice and Cola before Friday.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "Restock 8 low-stock items",
                  "Send reminder to 24 customers",
                  "Peak hour: 6PM–8PM Fri–Sun",
                ].map((s) => (
                  <div key={s} className="flex items-center gap-2 text-sm bg-white/10 backdrop-blur rounded-lg px-3 py-2">
                    <ArrowUpRight className="h-4 w-4" /> {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 lg:col-span-2">
            <h3 className="font-display text-lg font-bold mb-6">Sales by Category</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.012 258)" />
                  <XAxis dataKey="c" stroke="oklch(0.5 0.03 258)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.5 0.03 258)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 258)" }} />
                  <Bar dataKey="v" fill="oklch(0.7 0.16 165)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-display text-lg font-bold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {activity.map((a) => (
                <div key={a.t} className="flex items-start gap-3 p-3 rounded-xl hover:bg-secondary/60 transition">
                  <div className={`h-2 w-2 mt-2 rounded-full shrink-0 ${
                    a.tag === "alert" ? "bg-destructive" :
                    a.tag === "success" ? "bg-accent-brand" :
                    a.tag === "order" ? "bg-primary" : "bg-warning"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{a.t}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.desc}</div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">{a.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
