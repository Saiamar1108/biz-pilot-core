import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, AlertCircle, Star, Search, Mail, Phone } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — ShopPilot AI" }] }),
  component: CustomersPage,
});

const customers = [
  { name: "Priya Sharma", email: "priya@mail.com", orders: 24, spent: 1840, due: 0, status: "vip" },
  { name: "Marcus Chen", email: "marcus@brew.co", orders: 18, spent: 1210, due: 90, status: "regular" },
  { name: "Aisha Okoye", email: "aisha@lagos.co", orders: 32, spent: 2890, due: 0, status: "vip" },
  { name: "James Patel", email: "jamesp@mail.com", orders: 6, spent: 420, due: 65, status: "new" },
  { name: "Sofia Rossi", email: "sofia@rossi.it", orders: 14, spent: 940, due: 0, status: "regular" },
  { name: "Kenji Tanaka", email: "kenji@tk.jp", orders: 21, spent: 1560, due: 210, status: "regular" },
];

function CustomersPage() {
  const [q, setQ] = useState("");
  const filtered = customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <DashboardLayout title="Customers">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Customers" value="842" change={5.1} icon={Users} accent="primary" />
          <StatCard label="VIP Members" value="128" change={12} icon={Star} accent="emerald" />
          <StatCard label="Outstanding" value="$4,320" change={-8} icon={AlertCircle} accent="destructive" />
          <StatCard label="Avg Order Value" value="$68" change={4.2} icon={TrendingUp} accent="primary" />
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="relative max-w-sm mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search customers" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <div key={c.email} className="rounded-2xl border border-border p-5 hover:shadow-elegant hover:-translate-y-0.5 transition-all bg-background">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-full gradient-primary grid place-items-center text-primary-foreground font-semibold shrink-0">
                      {c.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.email}</div>
                    </div>
                  </div>
                  {c.status === "vip" && <span className="px-2 py-0.5 rounded-md bg-accent-brand/10 text-accent-brand text-xs font-semibold">VIP</span>}
                  {c.status === "new" && <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">NEW</span>}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Orders</div>
                    <div className="font-bold font-display">{c.orders}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Spent</div>
                    <div className="font-bold font-display">${c.spent}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Due</div>
                    <div className={`font-bold font-display ${c.due > 0 ? "text-destructive" : "text-accent-brand"}`}>${c.due}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1"><Mail className="h-3.5 w-3.5 mr-1" /> Email</Button>
                  <Button variant="outline" size="sm" className="flex-1"><Phone className="h-3.5 w-3.5 mr-1" /> Call</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
