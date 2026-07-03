import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PageSection } from "@/components/dashboard/PageSection";
import { AIInsightsWidget } from "@/components/dashboard/AIInsightsWidget";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentInvoices } from "@/components/dashboard/RecentInvoices";
import { LowStockAlerts } from "@/components/dashboard/LowStockAlerts";
import { InventoryWidgets } from "@/components/inventory/InventoryWidgets";
import { DollarSign, ShoppingCart, AlertTriangle, Users, TrendingUp } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { getAnalytics, getInvoices, getProducts, getSettings, type AnalyticsSummary, type Invoice, type Product } from "@/lib/api";
import { formatGrowthRate } from "@/lib/analytics";
import { formatCurrency } from "@/lib/currency";
import { buildLast7DaysRevenue } from "@/lib/sales-chart";
import { DATA_REFRESH_EVENT } from "@/lib/live-refresh";
import { requireAuth } from "@/lib/auth-guard";
import { onboardingTargetIds } from "@/lib/onboarding-tour";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Dashboard — ShopPilot AI" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [businessName, setBusinessName] = useState("ShopPilot AI");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setError(null);
        const [invoiceData, productData, analyticsData, settings] = await Promise.all([
          getInvoices(),
          getProducts(),
          getAnalytics(),
          getSettings(),
        ]);
        if (!active) return;
        setInvoices(invoiceData);
        setProducts(productData);
        setAnalytics(analyticsData);
        setBusinessName(settings.business?.storeName || "ShopPilot AI");
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load dashboard data");
      } finally {
        if (active && showLoading) setLoading(false);
      }
    };

    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") {
        void load(false);
      }
    };

    void load(true);
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);
    window.addEventListener(DATA_REFRESH_EVENT, refreshOnFocus);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
      window.removeEventListener(DATA_REFRESH_EVENT, refreshOnFocus);
    };
  }, []);

  const threshold = analytics?.lowStockThreshold ?? 10;
  const lowStock = useMemo(
    () => products.filter((product) => product.stock <= threshold),
    [products, threshold],
  );
  const salesData = useMemo(() => buildLast7DaysRevenue(invoices), [invoices]);
  const recentInvoices = useMemo(
    () =>
      [...invoices]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10),
    [invoices],
  );

  const statValue = (value: number | undefined, formatter: (n: number) => string = String) =>
    loading ? "…" : value != null ? formatter(value) : "—";

  return (
    <DashboardLayout title="Overview">
      <div className="space-y-6">
        <QuickActions />

        <div
          id={onboardingTargetIds.dashboardOverview}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            label="Revenue Collected"
            value={statValue(analytics?.revenueReceived, formatCurrency)}
            icon={DollarSign}
            accent="primary"
          />
          <StatCard
            label="Amount To Collect"
            value={statValue(analytics?.pendingRevenue, formatCurrency)}
            icon={AlertTriangle}
            accent="warning"
          />
          <StatCard
            label="Total Revenue"
            value={statValue(analytics?.totalBilled, formatCurrency)}
            icon={ShoppingCart}
            accent="emerald"
          />
          <StatCard
            label="Profit"
            value={statValue(analytics?.profit, formatCurrency)}
            icon={TrendingUp}
            accent="emerald"
          />
          <StatCard
            label="Total Orders"
            value={statValue(analytics?.totalOrders, (n) => n.toLocaleString("en-IN"))}
            icon={ShoppingCart}
            accent="emerald"
          />
          <StatCard
            label="Active Customers"
            value={statValue(analytics?.activeCustomers, (n) => n.toLocaleString("en-IN"))}
            icon={Users}
            accent="emerald"
          />
          <StatCard
            label="Low Stock Items"
            value={statValue(analytics?.lowStockItems.length ?? lowStock.length, String)}
            icon={AlertTriangle}
            accent="destructive"
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <PageSection
            title="Sales Analytics"
            description="Weekly collection vs pending"
            action={<Button variant="outline" size="sm">Last 7 days</Button>}
            className="lg:col-span-2"
          >
            <div className="h-72">
              {loading ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Loading sales…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.549 0.222 262)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="oklch(0.549 0.222 262)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.012 258)" />
                    <XAxis
                      dataKey="m"
                      stroke="oklch(0.5 0.03 258)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      stroke="oklch(0.5 0.03 258)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 258)" }}
                      formatter={(v: number, name: string) => [
                        formatCurrency(v),
                        name === "collected" ? "Collected" : "Pending",
                      ]}
                    />
                    <Legend
                      formatter={(value) => (value === "collected" ? "Collected" : "Pending")}
                    />
                    <Area
                      type="monotone"
                      dataKey="collected"
                      stroke="oklch(0.7 0.16 165)"
                      strokeWidth={2.5}
                      fill="url(#salesGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="pending"
                      stroke="oklch(0.78 0.16 75)"
                      strokeWidth={2.5}
                      fill="transparent"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </PageSection>

          <AIInsightsWidget
            headline={analytics?.recommendations[0]}
            insights={analytics?.recommendations.slice(1, 4)}
            loading={loading}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <PageSection title="Recent Invoices" description="Latest billing activity" className="lg:col-span-2">
            {loading ? (
              <div className="py-8 text-sm text-muted-foreground">Loading invoices…</div>
            ) : recentInvoices.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No invoices received yet.</div>
            ) : (
              <RecentInvoices invoices={recentInvoices} />
            )}
          </PageSection>

          <PageSection title="Low Stock Alerts" description={`${lowStock.length} items need attention`}>
            {loading ? (
              <div className="py-8 text-sm text-muted-foreground">Loading inventory…</div>
            ) : lowStock.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">All products are well stocked.</div>
            ) : (
              <LowStockAlerts products={lowStock.slice(0, 5)} />
            )}
          </PageSection>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Monthly Growth"
            value={loading ? "…" : formatGrowthRate(analytics?.growthRate)}
            icon={TrendingUp}
            accent="primary"
          />
          <StatCard
            label="Avg Order Value"
            value={statValue(analytics?.avgOrderValue, formatCurrency)}
            icon={DollarSign}
            accent="emerald"
          />
          <StatCard
            label="Pending Invoices"
            value={statValue(analytics?.pendingInvoicesCount, String)}
            icon={AlertTriangle}
            accent="warning"
          />
          <StatCard
            label="Repeat Customers"
            value={loading ? "…" : analytics ? `${analytics.repeatCustomerRate}%` : "—"}
            icon={Users}
            accent="primary"
          />
        </div>

        {/* Inventory Intelligence Widgets */}
        <InventoryWidgets businessName={businessName} />
      </div>
    </DashboardLayout>
  );
}
