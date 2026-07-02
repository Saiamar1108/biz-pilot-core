import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PageSection } from "@/components/dashboard/PageSection";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, AlertCircle, Star, Search, Mail, Phone, Package } from "lucide-react";
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

  const pending = useMemo(
    () => customers.filter((customer) => customer.pendingAmount > 0),
    [customers],
  );
  const vipCustomers = useMemo(
    () => customers.filter((customer) => customer.customerType === "VIP"),
    [customers],
  );
  const totalOutstanding = useMemo(
    () => customers.reduce((sum, customer) => sum + customer.pendingAmount, 0),
    [customers],
  );
  const avgOrderValue = useMemo(() => {
    const purchases = customers.reduce((sum, customer) => sum + customer.totalPurchases, 0);
    const spent = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);
    return purchases ? spent / purchases : 0;
  }, [customers]);

  const filtered = useMemo(
    () =>
      customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.email.toLowerCase().includes(q.toLowerCase()),
      ),
    [customers, q],
  );

  return (
    <DashboardLayout title="Customers">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Customers"
            value={customers.length.toString()}
            icon={Users}
            accent="primary"
          />
          <StatCard
            label="VIP Members"
            value={vipCustomers.length.toString()}
            icon={Star}
            accent="emerald"
          />
          <StatCard
            label="Outstanding"
            value={`$${totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            icon={AlertCircle}
            accent="destructive"
          />
          <StatCard
            label="Avg Order Value"
            value={`$${avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            icon={TrendingUp}
            accent="primary"
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <PageSection title="Customer Directory" description={`${filtered.length} customers`}>
          <div className="relative max-w-sm mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="py-8 text-sm text-muted-foreground">Loading customers…</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((customer) => (
                <div
                  key={customer.id}
                  className="rounded-lg border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-full gradient-primary grid place-items-center text-primary-foreground font-semibold text-sm shrink-0">
                      {customer.name
                        .split(" ")
                        .map((namePart) => namePart[0])
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{customer.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                        </div>
                        <StatusBadge status={customer.status} label={customer.customerType} />
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span className="truncate">{customer.phone || "No phone"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Total spent</div>
                      <div className="font-semibold">
                        $
                        {customer.totalSpent.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Pending due</div>
                      <div
                        className={
                          customer.pendingAmount > 0
                            ? "font-semibold text-destructive"
                            : "font-semibold text-accent-brand"
                        }
                      >
                        $
                        {customer.pendingAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Last purchase</div>
                      <div className="font-medium">
                        {customer.lastPurchaseDate || "No purchases"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Purchases</div>
                      <div className="font-medium">{customer.totalPurchases}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 rounded-md bg-secondary/50 px-3 py-2">
                    <div className="min-w-0 flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {customer.favoriteProduct || "No favorite yet"}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageSection>

        <div className="grid lg:grid-cols-2 gap-6">
          <PageSection title="Order History" description="Recent transactions across all customers">
            <div className="space-y-2">
              {customers.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No recent orders available.
                </div>
              ) : (
                customers.slice(0, 4).map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium font-mono">{customer.name}</span>
                        <StatusBadge status={customer.status} />
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {customer.totalPurchases} orders · {customer.email}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-sm">${customer.totalSpent.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        {customer.lastPurchaseDate || "No orders yet"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PageSection>

          <PageSection
            title="Pending Payments"
            description={`${pending.length} customers with outstanding balances`}
          >
            {pending.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No pending payments
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-4 rounded-xl border border-destructive/10 bg-destructive/5"
                  >
                    <div className="h-10 w-10 rounded-full gradient-primary grid place-items-center text-primary-foreground font-semibold text-sm shrink-0">
                      {c.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-destructive">
                        ${c.pendingAmount.toFixed(2)}
                      </div>
                      <Button size="sm" variant="outline" className="mt-1 h-7 text-xs">
                        Send Reminder
                      </Button>
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
