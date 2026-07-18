import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PageSection } from "@/components/dashboard/PageSection";
import { AIInsightsWidget } from "@/components/dashboard/AIInsightsWidget";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentInvoices } from "@/components/dashboard/RecentInvoices";
import { LowStockAlerts } from "@/components/dashboard/LowStockAlerts";
import { InventoryWidgets } from "@/components/inventory/InventoryWidgets";
import { DollarSign, ShoppingCart, AlertTriangle, Users, TrendingUp, FileText, Award, Package, Clock } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useMemo, useState } from "react";
import { getAnalytics, getInvoices, getProducts, getSettings, type AnalyticsSummary, type Invoice, type Product } from "@/lib/api";
import { formatGrowthRate } from "@/lib/analytics";
import { formatCurrency } from "@/lib/currency";
import { buildLast7DaysRevenue } from "@/lib/sales-chart";
import { DATA_REFRESH_EVENT } from "@/lib/live-refresh";
import { subscribeToCache } from "@/lib/apiCache";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ShopPilot AI" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
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

    void load(true);

    const unsubInvoices = subscribeToCache("invoices", () => void load(false));
    const unsubProducts = subscribeToCache("products", () => void load(false));
    const unsubAnalytics = subscribeToCache("analytics", () => void load(false));
    const unsubSettings = subscribeToCache("settings", () => void load(false));

    return () => {
      active = false;
      unsubInvoices();
      unsubProducts();
      unsubAnalytics();
      unsubSettings();
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            id="tour-revenue-card"
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

        <PageSection title="Profit Intelligence" description="Actual profit analysis based on Cost Price">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Today's Profit"
              value={statValue(analytics?.todayProfit, formatCurrency)}
              icon={TrendingUp}
              accent="emerald"
            />
            <StatCard
              label="Monthly Profit"
              value={statValue(analytics?.monthlyProfit, formatCurrency)}
              icon={Award}
              accent="emerald"
            />
            <StatCard
              label="Highest Profit Product"
              value={loading ? "…" : analytics?.highestProfitProduct || "—"}
              icon={Package}
              accent="primary"
            />
            <StatCard
              label="Top Profitable Product"
              value={loading ? "…" : analytics?.topProfitableProduct || "—"}
              icon={Award}
              accent="primary"
            />
          </div>
        </PageSection>

        {error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <PageSection
            title="Business Analytics"
            description="Track sales revenue and actual profit trends"
            className="lg:col-span-2"
          >
            <Tabs defaultValue="sales" className="w-full space-y-4">
              <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                <TabsTrigger value="sales">Sales (Weekly)</TabsTrigger>
                <TabsTrigger value="profit">Profit Trend (Monthly)</TabsTrigger>
              </TabsList>
              <TabsContent value="sales" className="h-72 mt-2">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Loading sales…
                  </div>
                ) : salesData.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No sales data yet"
                    description="Once you have sales, they will appear here."
                    className="h-full"
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesData}>
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="oklch(0.549 0.222 262)" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="oklch(0.549 0.222 262)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                      <XAxis
                        dataKey="m"
                        stroke="var(--color-muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        stroke="var(--color-muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)", color: "var(--color-card-foreground)" }}
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
              </TabsContent>
              <TabsContent value="profit" className="h-72 mt-2">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Loading profit trend…
                  </div>
                ) : !analytics?.monthlyProfitTrends || analytics.monthlyProfitTrends.length === 0 ? (
                  <EmptyState
                    icon={TrendingUp}
                    title="No profit trends yet"
                    description="Profit trends will appear once you have recorded sales with Cost Prices."
                    className="h-full"
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.monthlyProfitTrends}>
                      <defs>
                        <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="oklch(0.7 0.16 165)" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="oklch(0.7 0.16 165)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                      <XAxis
                        dataKey="month"
                        stroke="var(--color-muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--color-muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)", color: "var(--color-card-foreground)" }}
                        formatter={(v: number) => [formatCurrency(v), "Profit"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stroke="oklch(0.7 0.16 165)"
                        strokeWidth={2.5}
                        fill="url(#profitGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </TabsContent>
            </Tabs>
          </PageSection>

          <div id="tour-ai-insights">
            <AIInsightsWidget
              headline={analytics?.recommendations[0]}
              insights={analytics?.recommendations.slice(1, 4)}
              loading={loading}
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <PageSection title="Recent Invoices" description="Latest billing activity" className="lg:col-span-2">
            {loading ? (
              <div className="py-8 text-sm text-muted-foreground">Loading invoices…</div>
            ) : recentInvoices.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Start your first sale."
                description="Create your first invoice and your dashboard will begin telling the story of your business."
                actionLabel="Create First Invoice"
                onAction={() => navigate({ to: "/billing" })}
              />
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
      </div>
    </DashboardLayout>
  );
}
