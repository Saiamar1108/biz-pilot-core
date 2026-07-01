import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PageSection } from "@/components/dashboard/PageSection";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, AlertCircle, Star, Search, Mail, Phone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCustomers, type Customer } from "@/lib/api";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — ShopPilot AI" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const [q, setQ] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const customerData = await getCustomers();
        if (!active) return;
        setCustomers(customerData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load customers");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const pending = useMemo(() => customers.filter((customer) => customer.due > 0), [customers]);

  const filtered = useMemo(
    () => customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.email.toLowerCase().includes(q.toLowerCase())),
    [customers, q]
  );

  return (
    <DashboardLayout title="Customers">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Customers" value="842" change={5.1} icon={Users} accent="primary" />
          <StatCard label="VIP Members" value="128" change={12} icon={Star} accent="emerald" />
          <StatCard label="Outstanding" value="$4,320" change={-8} icon={AlertCircle} accent="destructive" />
          <StatCard label="Avg Order Value" value="$68" change={4.2} icon={TrendingUp} accent="primary" />
        </div>

        {error && <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}

        <PageSection title="Customer Directory" description={`${filtered.length} customers`}>
          <div className="relative max-w-sm mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search customers" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>

          {loading ? <div className="py-8 text-sm text-muted-foreground">Loading customers…</div> : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Contact</th>
                  <th className="text-right px-4 py-3 font-semibold">Orders</th>
                  <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">Spent</th>
                  <th className="text-right px-4 py-3 font-semibold">Due</th>
                  <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Last Order</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-secondary/40 transition">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full gradient-primary grid place-items-center text-primary-foreground font-semibold text-xs shrink-0">
                          {c.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{c.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {c.status === "vip" && <StatusBadge status="vip" label="VIP" />}
                            {c.status === "new" && <StatusBadge status="new" label="New" />}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="text-muted-foreground text-xs">{c.email}</div>
                      <div className="text-muted-foreground text-xs">{c.phone}</div>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold">{c.orders}</td>
                    <td className="px-4 py-4 text-right hidden sm:table-cell">${c.spent.toLocaleString()}</td>
                    <td className={`px-4 py-4 text-right font-semibold ${c.due > 0 ? "text-destructive" : "text-accent-brand"}`}>
                      ${c.due}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground text-xs hidden lg:table-cell">{c.lastOrder}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Mail className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Phone className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </PageSection>

        <div className="grid lg:grid-cols-2 gap-6">
          <PageSection title="Order History" description="Recent transactions across all customers">
            <div className="space-y-2">
              {customers.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No recent orders available.</div>
              ) : customers.slice(0, 4).map((customer) => (
                <div key={customer.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 transition">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium font-mono">{customer.name}</span>
                      <StatusBadge status={customer.status} />
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {customer.orders} orders · {customer.email}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-sm">${customer.spent.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{customer.lastOrder || "No orders yet"}</div>
                  </div>
                </div>
              ))}
            </div>
          </PageSection>

          <PageSection title="Pending Payments" description={`${pending.length} customers with outstanding balances`}>
            {pending.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No pending payments</div>
            ) : (
              <div className="space-y-3">
                {pending.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-4 rounded-xl border border-destructive/10 bg-destructive/5">
                    <div className="h-10 w-10 rounded-full gradient-primary grid place-items-center text-primary-foreground font-semibold text-sm shrink-0">
                      {c.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-destructive">${c.due}</div>
                      <Button size="sm" variant="outline" className="mt-1 h-7 text-xs">Send Reminder</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageSection>
        </div>
      </div>
    </DashboardLayout>
  );
}
