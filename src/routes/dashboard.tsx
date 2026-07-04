import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PageSection } from "@/components/dashboard/PageSection";
import { AIInsightsWidget } from "@/components/dashboard/AIInsightsWidget";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentInvoices } from "@/components/dashboard/RecentInvoices";
import { LowStockAlerts } from "@/components/dashboard/LowStockAlerts";
import { InventoryWidgets } from "@/components/inventory/InventoryWidgets";
import { DollarSign, ShoppingCart, AlertTriangle, Users, TrendingUp, Package, Receipt } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { getAnalytics, getInvoices, getProducts, getSettings, type AnalyticsSummary, type Invoice, type Product } from "@/lib/api";
import { formatGrowthRate } from "@/lib/analytics";
import { formatCurrency } from "@/lib/currency";
import { buildLast7DaysRevenue } from "@/lib/sales-chart";
import { DATA_REFRESH_EVENT } from "@/lib/live-refresh";
import { requireAuth, requirePin } from "@/lib/auth-guard";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    requireAuth();
    requirePin();
  },
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
          className="grid grid-cols-2 lg:grid-cols-4 gap-5"
        >
          <StatCard
            label="Revenue Collected"
            value={statValue(analytics?.revenueReceived, formatCurrency)}
            icon={DollarSign}
            accent="primary"
            change={analytics?.growthRate}
            comparisonLabel="from last month"
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

        {!loading && invoices.length === 0 && products.length === 0 && (
          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-8 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 mx-auto">
                <ShoppingCart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-display text-xl font-bold">Welcome to ShopPilot AI</h3>
              <p className="text-sm text-muted-foreground">
                Your store is ready. Start by adding your first product or creating an invoice to see your dashboard come to life.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Link to="/inventory">
                  <Button className="gradient-primary text-primary-foreground shadow-glow">
                    <Package className="h-4 w-4 mr-2" /> Add Products
                  </Button>
                </Link>
                <Link to="/billing">
                  <Button variant="outline">
                    <Receipt className="h-4 w-4 mr-2" /> Create Invoice
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <PageSection
            title="Sales Analytics"
            description="Weekly collection vs pending"
            action={<Button variant="outline" size="sm">Last 7 days</Button>}
            className="lg:col-span-2"
          >
            <div className="h-80">
              {loading ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Loading sales…
                </div>
              ) : salesData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground gap-3">
                  <TrendingUp className="h-10 w-10 opacity-30" />
                  <p>No sales data yet. Create your first invoice to see analytics.</p>
                  <Link to="/billing">
                    <Button variant="outline" size="sm">
                      <Receipt className="h-3.5 w-3.5 mr-1.5" /> Create Invoice
                    </Button>
                  </Link>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                    <defs>
                      <linearGradient id="collectedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.7 0.16 165)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="oklch(0.7 0.16 165)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.78 0.16 75)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="oklch(0.78 0.16 75)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="oklch(0.9 0.01 250)" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="m"
                      stroke="oklch(0.55 0.03 258)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={65}
                    />
                    <YAxis
                      stroke="oklch(0.55 0.03 258)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 16,
                        border: "1px solid oklch(0.85 0.01 250)",
                        boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                        backdropFilter: "blur(10px)",
                      }}
                      cursor={{ stroke: 'oklch(0.549 0.222 262)', strokeWidth: 1, strokeDasharray: '4 4' }}
                      formatter={(v: number, name: string) => [
                        formatCurrency(v),
                        name === "collected" ? "Collected" : "Pending",
                      ]}
                    />
                    <Legend
                      formatter={(value) => (value === "collected" ? "Collected" : "Pending")}
                      wrapperStyle={{ paddingTop: 10 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="collected"
                      stroke="oklch(0.7 0.16 165)"
                      strokeWidth={3.5}
                      fill="url(#collectedGradient)"
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="pending"
                      stroke="oklch(0.78 0.16 75)"
                      strokeWidth={3}
                      fill="url(#pendingGradient)"
                      activeDot={{ r: 5, strokeWidth: 0 }}
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
