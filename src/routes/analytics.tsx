import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PageSection } from "@/components/dashboard/PageSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Award,
  ShoppingCart,
  Download,
  FileText,
  Sparkles,
  Users,
  Package,
  Clock,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EMPTY_ANALYTICS,
  getAnalytics,
  getInventoryInsights,
  type AnalyticsRangePreset,
  type AnalyticsSummary,
  type ProductAnalyticsRow,
} from "@/lib/api";
import { formatMonthLabel } from "@/lib/analytics";
import { exportAnalyticsCsv, exportAnalyticsPdf } from "@/lib/analytics-export";
import { formatCurrency } from "@/lib/currency";
import { DATA_REFRESH_EVENT } from "@/lib/live-refresh";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [{ title: "Analytics — ShopPilot AI" }],
  }),
  component: AnalyticsPage,
});

const chartColors = [
  "oklch(0.549 0.222 262)",
  "oklch(0.7 0.16 165)",
  "oklch(0.65 0.19 258)",
  "oklch(0.78 0.16 75)",
  "oklch(0.55 0.2 30)",
  "oklch(0.6 0.18 200)",
];

const RANGE_OPTIONS: { value: AnalyticsRangePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "thismonth", label: "This month" },
  { value: "custom", label: "Custom" },
];

function mergeMonthlySeries(
  monthlyRevenue: AnalyticsSummary["monthlyRevenue"],
  monthlyPendingRevenue: AnalyticsSummary["monthlyPendingRevenue"],
) {
  const monthKeys = Array.from(
    new Set([
      ...(monthlyRevenue?.filter(Boolean)?.map((entry) => entry?.month) ?? []),
      ...(monthlyPendingRevenue?.filter(Boolean)?.map((entry) => entry?.month) ?? []),
    ]),
  )
    .filter(Boolean)
    .sort();

  return monthKeys?.filter(Boolean)?.map((month) => {
    const collectedEntry = monthlyRevenue?.filter(Boolean)?.find((entry) => entry?.month === month);
    const pendingEntry = monthlyPendingRevenue
      ?.filter(Boolean)
      ?.find((entry) => entry?.month === month);

    return {
      m: formatMonthLabel(month),
      collected: collectedEntry?.revenue ?? 0,
      pending: pendingEntry?.revenue ?? 0,
    };
  });
}

function ProductTable({
  rows,
  valueKey,
}: {
  rows: ProductAnalyticsRow[];
  valueKey: "revenue" | "profit" | "units";
}) {
  const safeRows = rows?.filter(Boolean) ?? [];

  if (!safeRows.length) {
    return <p className="text-sm text-muted-foreground">No product data for this period.</p>;
  }

  return (
    <div className="space-y-2">
      {safeRows
        ?.filter(Boolean)
        ?.slice(0, 8)
        ?.map((row, index) => (
          <div
            key={`${row?.name ?? row?.category ?? "Unknown"}-${index}`}
            className="flex items-center justify-between rounded-lg border p-3 text-sm"
          >
            <div>
              <p className="font-medium">{row?.name || row?.category || "Unknown"}</p>
              <p className="text-muted-foreground">{row?.category ?? "Unknown"}</p>
            </div>
            <div className="text-right">
              <p>{row?.units ?? 0} units</p>
              <p className="font-semibold">
                {valueKey === "units"
                  ? `${row?.units ?? 0} sold`
                  : formatCurrency(row?.[valueKey] ?? 0)}
              </p>
            </div>
          </div>
        ))}
    </div>
  );
}

function CustomerList({
  rows,
  highlight,
}: {
  rows: AnalyticsSummary["customerIntelligence"]["topPaying"];
  highlight: "spent" | "pending" | "orders" | "aov";
}) {
  const safeRows = rows?.filter(Boolean) ?? [];

  if (!safeRows.length) {
    return <p className="text-sm text-muted-foreground">No customer data yet.</p>;
  }

  return (
    <div className="space-y-2">
      {safeRows?.filter(Boolean)?.map((customer, index) => (
        <div
          key={customer?.id || `${customer?.name ?? "Unknown"}-${index}`}
          className="flex items-center justify-between rounded-lg border p-3 text-sm"
        >
          <span className="font-medium">
            {index + 1}. {customer?.name ?? "Unknown"}
          </span>
          <span className="font-semibold">
            {highlight === "spent" && formatCurrency(customer?.totalSpent ?? 0)}
            {highlight === "pending" && formatCurrency(customer?.pendingAmount ?? 0)}
            {highlight === "orders" && `${customer?.orders ?? 0} orders`}
            {highlight === "aov" && formatCurrency(customer?.avgOrderValue ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary>(EMPTY_ANALYTICS);
  const [inventoryInsights, setInventoryInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<AnalyticsRangePreset>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const loadAnalytics = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setError(null);

        const params =
          range === "custom" && customStart && customEnd
            ? { range, startDate: customStart, endDate: customEnd }
            : { range: range === "custom" ? "all" : range };

        const analytics = (await getAnalytics(params)) || {};
        setAnalytics({ ...EMPTY_ANALYTICS, ...analytics });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load analytics");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [range, customStart, customEnd],
  );

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const params =
          range === "custom" && customStart && customEnd
            ? { range, startDate: customStart, endDate: customEnd }
            : { range: range === "custom" ? "all" : range };
        const analytics = (await getAnalytics(params)) || {};
        if (active) setAnalytics({ ...EMPTY_ANALYTICS, ...analytics });
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load analytics");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") void run();
    };

    void run();

    return () => {
      active = false;
    };
  }, [range, customStart, customEnd]);

  const safeAnalytics = useMemo<AnalyticsSummary>(
    () => ({
      ...EMPTY_ANALYTICS,
      ...analytics,
      dateRange: analytics?.dateRange ?? EMPTY_ANALYTICS.dateRange,
      monthlyRevenue: analytics?.monthlyRevenue ?? [],
      monthlyPendingRevenue: analytics?.monthlyPendingRevenue ?? [],
      monthlyTotalBilled: analytics?.monthlyTotalBilled ?? [],
      monthlyGrowth: analytics?.monthlyGrowth ?? [],
      monthlyProfitTrends: analytics?.monthlyProfitTrends ?? [],
      demandPredictions: analytics?.demandPredictions ?? [],
      smartPredictions: analytics?.smartPredictions ?? [],
      topProducts: analytics?.topProducts ?? [],
      lowStockItems: analytics?.lowStockItems ?? [],
      topCustomers: analytics?.topCustomers ?? [],
      productAnalytics: {
        ...EMPTY_ANALYTICS.productAnalytics,
        ...(analytics?.productAnalytics ?? {}),
        byCategory: analytics?.productAnalytics?.byCategory ?? [],
        byProduct: analytics?.productAnalytics?.byProduct ?? [],
        mostProfitable: analytics?.productAnalytics?.mostProfitable ?? [],
        lowPerforming: analytics?.productAnalytics?.lowPerforming ?? [],
      },
      customerIntelligence: {
        ...EMPTY_ANALYTICS.customerIntelligence,
        ...(analytics?.customerIntelligence ?? {}),
        topPaying: analytics?.customerIntelligence?.topPaying ?? [],
        mostPending: analytics?.customerIntelligence?.mostPending ?? [],
        mostFrequent: analytics?.customerIntelligence?.mostFrequent ?? [],
        avgOrderValueByCustomer: analytics?.customerIntelligence?.avgOrderValueByCustomer ?? [],
      },
      invoiceAging: analytics?.invoiceAging ?? [],
      activityFeed: analytics?.activityFeed ?? [],
      recommendations: analytics?.recommendations ?? [],
    }),
    [analytics],
  );

  const analyticsWithFallbackArrays = safeAnalytics as AnalyticsSummary & {
    salesByMonth?: AnalyticsSummary["monthlyRevenue"];
    customerGrowth?: AnalyticsSummary["monthlyGrowth"];
    categoryBreakdown?: AnalyticsSummary["productAnalytics"]["byCategory"];
    profitTrend?: AnalyticsSummary["monthlyProfitTrends"];
  };

  const analyticsArrays = {
    salesByMonth: analyticsWithFallbackArrays.salesByMonth ?? safeAnalytics.monthlyRevenue ?? [],
    topProducts: safeAnalytics.topProducts ?? [],
    customerGrowth: analyticsWithFallbackArrays.customerGrowth ?? safeAnalytics.monthlyGrowth ?? [],
    categoryBreakdown:
      analyticsWithFallbackArrays.categoryBreakdown ??
      safeAnalytics.productAnalytics?.byCategory ??
      [],
    profitTrend: analyticsWithFallbackArrays.profitTrend ?? safeAnalytics.monthlyProfitTrends ?? [],
  };

  const revenue = useMemo(
    () =>
      mergeMonthlySeries(analyticsArrays.salesByMonth, safeAnalytics.monthlyPendingRevenue ?? []),
    [analyticsArrays.salesByMonth, safeAnalytics.monthlyPendingRevenue],
  );

  const receivables = useMemo(
    () =>
      safeAnalytics.monthlyPendingRevenue?.filter(Boolean)?.map((entry) => ({
        m: formatMonthLabel(entry?.month),
        v: entry?.revenue || 0,
      })),
    [safeAnalytics.monthlyPendingRevenue],
  );

  const profitTrends = useMemo(
    () =>
      analyticsArrays.profitTrend?.filter(Boolean)?.map((entry) => ({
        m: formatMonthLabel(entry?.month),
        collected: entry?.collected ?? 0,
        pending: entry?.pending ?? 0,
        profit: entry?.profit ?? 0,
      })),
    [analyticsArrays.profitTrend],
  );

  const categoryPie = useMemo(
    () =>
      analyticsArrays.categoryBreakdown?.filter(Boolean)?.map((row, index) => ({
        name: row?.category ?? "Unknown",
        value: row?.revenue ?? 0,
        color: chartColors[index % chartColors.length],
      })),
    [analyticsArrays.categoryBreakdown],
  );

  const categoryBar = useMemo(
    () =>
      analyticsArrays.categoryBreakdown?.filter(Boolean)?.map((row) => ({
        name: row?.category ?? "Unknown",
        revenue: row?.revenue ?? 0,
        profit: row?.profit ?? 0,
      })),
    [analyticsArrays.categoryBreakdown],
  );

  const predictions = safeAnalytics.smartPredictions?.length
    ? safeAnalytics.smartPredictions
    : (safeAnalytics.demandPredictions ?? []);

  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS?.filter(Boolean)?.map((option) => (
              <Button
                key={option?.value ?? "unknown"}
                size="sm"
                variant={range === option?.value ? "default" : "outline"}
                onClick={() => option?.value && setRange(option.value)}
              >
                {option?.label ?? "Unknown"}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => exportAnalyticsCsv(safeAnalytics)}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void exportAnalyticsPdf(safeAnalytics)}
            >
              <FileText className="h-4 w-4 mr-1" />
              Export PDF
            </Button>
          </div>
        </div>

        {range === "custom" && (
          <div className="flex flex-wrap items-end gap-3 rounded-xl border p-4">
            <div>
              <label className="text-xs text-muted-foreground">Start date</label>
              <Input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">End date</label>
              <Input
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
              />
            </div>
            <Button
              size="sm"
              onClick={() => void loadAnalytics()}
              disabled={!customStart || !customEnd}
            >
              Apply
            </Button>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Showing:{" "}
          <span className="font-medium text-foreground">
            {safeAnalytics.dateRange?.label ?? "Unknown"}
          </span>
        </p>

        {error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Collected Revenue"
            value={loading ? "…" : formatCurrency(safeAnalytics.revenueReceived ?? 0)}
            icon={DollarSign}
            accent="primary"
          />
          <StatCard
            label="Pending Revenue"
            value={loading ? "…" : formatCurrency(safeAnalytics.pendingRevenue ?? 0)}
            icon={TrendingUp}
            accent="warning"
          />
          <StatCard
            label="Total Billed"
            value={loading ? "…" : formatCurrency(safeAnalytics.totalBilled ?? 0)}
            icon={ShoppingCart}
            accent="emerald"
          />
          <StatCard
            label="Profit"
            value={loading ? "…" : formatCurrency(safeAnalytics.profit ?? 0)}
            icon={Award}
            accent="emerald"
          />
          <StatCard
            label="Orders"
            value={loading ? "…" : (safeAnalytics.totalOrders ?? 0).toLocaleString("en-IN")}
            icon={ShoppingCart}
            accent="primary"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <PageSection
            title="Cashflow Chart"
            description="Collected vs Pending by month"
            className="lg:col-span-2"
          >
            <div className="h-80">
              {revenue.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No monthly revenue data yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="m" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="collected"
                      name="Collected"
                      stroke="oklch(0.7 0.16 165)"
                      strokeWidth={3}
                    />
                    <Line
                      type="monotone"
                      dataKey="pending"
                      name="Pending"
                      stroke="oklch(0.78 0.16 75)"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </PageSection>

          <PageSection title="Outstanding Receivables" description="Pending by invoice month">
            <div className="h-80">
              {receivables.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No outstanding receivables yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={receivables}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="m" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar
                      dataKey="v"
                      name="Pending"
                      fill="oklch(0.78 0.16 75)"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </PageSection>
        </div>

        <PageSection title="Profit Trends" description="Revenue vs Profit vs Pending (monthly)">
          <div className="h-80">
            {profitTrends.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No profit trend data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="m" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="collected" name="Collected" fill="oklch(0.549 0.222 262)" />
                  <Bar dataKey="profit" name="Profit" fill="oklch(0.7 0.16 165)" />
                  <Bar dataKey="pending" name="Pending" fill="oklch(0.78 0.16 75)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </PageSection>

        <PageSection title="Product Analytics" description="Category and product performance">
          <Tabs defaultValue="category">
            <TabsList className="mb-4 flex flex-wrap h-auto">
              <TabsTrigger value="category">Category-wise</TabsTrigger>
              <TabsTrigger value="product">Product-wise</TabsTrigger>
              <TabsTrigger value="profitable">Most profitable</TabsTrigger>
              <TabsTrigger value="low">Low performing</TabsTrigger>
            </TabsList>

            <div className="grid lg:grid-cols-2 gap-6">
              <TabsContent value="category" className="mt-0 space-y-4">
                <div className="h-64">
                  {categoryPie.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No category sales yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryPie}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label
                        >
                          {categoryPie?.filter(Boolean)?.map((entry, index) => (
                            <Cell
                              key={entry?.name ?? "Unknown"}
                              fill={entry?.color || chartColors[index % chartColors.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <ProductTable
                  rows={safeAnalytics.productAnalytics?.byCategory ?? []}
                  valueKey="revenue"
                />
              </TabsContent>

              <TabsContent value="product" className="mt-0 space-y-4">
                <div className="h-64">
                  {categoryBar.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No product sales yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryBar}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar
                          dataKey="revenue"
                          fill="oklch(0.549 0.222 262)"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <ProductTable
                  rows={safeAnalytics.productAnalytics?.byProduct ?? []}
                  valueKey="revenue"
                />
              </TabsContent>

              <TabsContent value="profitable" className="mt-0 lg:col-span-2">
                <ProductTable
                  rows={safeAnalytics.productAnalytics?.mostProfitable ?? []}
                  valueKey="profit"
                />
              </TabsContent>

              <TabsContent value="low" className="mt-0 lg:col-span-2">
                <ProductTable
                  rows={safeAnalytics.productAnalytics?.lowPerforming ?? []}
                  valueKey="units"
                />
              </TabsContent>
            </div>
          </Tabs>
        </PageSection>

        <div className="grid lg:grid-cols-2 gap-6">
          <PageSection
            title="Customer Intelligence"
            description="Who pays, who owes, who buys often"
          >
            <Tabs defaultValue="paying">
              <TabsList className="mb-4 flex flex-wrap h-auto">
                <TabsTrigger value="paying">Top paying</TabsTrigger>
                <TabsTrigger value="pending">Most pending</TabsTrigger>
                <TabsTrigger value="frequent">Most frequent</TabsTrigger>
                <TabsTrigger value="aov">Avg order value</TabsTrigger>
              </TabsList>
              <TabsContent value="paying">
                <CustomerList
                  rows={safeAnalytics.customerIntelligence?.topPaying ?? []}
                  highlight="spent"
                />
              </TabsContent>
              <TabsContent value="pending">
                <CustomerList
                  rows={safeAnalytics.customerIntelligence?.mostPending ?? []}
                  highlight="pending"
                />
              </TabsContent>
              <TabsContent value="frequent">
                <CustomerList
                  rows={safeAnalytics.customerIntelligence?.mostFrequent ?? []}
                  highlight="orders"
                />
              </TabsContent>
              <TabsContent value="aov">
                <CustomerList
                  rows={safeAnalytics.customerIntelligence?.avgOrderValueByCustomer ?? []}
                  highlight="aov"
                />
              </TabsContent>
            </Tabs>
          </PageSection>

          <PageSection title="Invoice Aging" description="Pending amounts by age bucket">
            <div className="h-64 mb-4">
              {(safeAnalytics.invoiceAging ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending invoices to age.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={safeAnalytics.invoiceAging ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="amount" fill="oklch(0.55 0.2 30)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {safeAnalytics.invoiceAging?.filter(Boolean)?.map((bucket, index) => (
                <div
                  key={`${bucket?.label ?? "Unknown"}-${index}`}
                  className="rounded-lg border p-3 text-sm"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {bucket?.label ?? "Unknown"}
                  </div>
                  <p className="mt-1 font-semibold">{formatCurrency(bucket?.amount ?? 0)}</p>
                  <p className="text-xs text-muted-foreground">{bucket?.count ?? 0} invoices</p>
                </div>
              ))}
            </div>
          </PageSection>
        </div>

        <PageSection title="Smart Predictions" description="AI-powered business forecasts">
          <div className="grid md:grid-cols-3 gap-4">
            {predictions.length === 0 ? (
              <p className="text-sm text-muted-foreground md:col-span-3">
                Predictions will appear as your store accumulates data.
              </p>
            ) : (
              predictions?.filter(Boolean)?.map((prediction, index) => {
                const icons = [Package, TrendingUp, Users];
                const Icon = icons[index % icons.length];
                return (
                  <div
                    key={`${prediction?.title ?? "Unknown"}-${index}`}
                    className="rounded-xl border p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {prediction?.confidence ?? "Unknown"}
                      </span>
                    </div>
                    <h4 className="font-semibold">{prediction?.title ?? "Unknown"}</h4>
                    <p className="text-sm mt-1">{prediction?.forecast ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground mt-2">{prediction?.detail ?? ""}</p>
                  </div>
                );
              })
            )}
          </div>
        </PageSection>

        <PageSection title="Top Products">
          <div className="space-y-3">
            {analyticsArrays.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No product sales data yet.</p>
            ) : (
              analyticsArrays.topProducts
                ?.filter(Boolean)
                ?.slice(0, 5)
                ?.map((product, index) => (
                  <div
                    key={`${product?.id ?? "Unknown"}-${index}`}
                    className="flex justify-between items-center p-3 border rounded-lg"
                  >
                    <span>
                      {index + 1}. {product?.name ?? "Unknown"}
                    </span>
                    <span>{product?.sold ?? 0} sold</span>
                    <span>{formatCurrency(product?.revenue ?? 0)}</span>
                  </div>
                ))
            )}
          </div>
        </PageSection>

        <PageSection title="AI Insights">
          <div className="rounded-xl p-5 bg-primary text-white">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm opacity-80">Live recommendations</span>
            </div>
            <h3 className="font-bold text-lg mb-2">
              {safeAnalytics.recommendations?.[0] ??
                "Insights will appear as your store accumulates sales data."}
            </h3>
            <p className="text-sm opacity-80">
              {safeAnalytics.recommendations?.[1] ??
                "Track inventory and invoices to unlock forecasts."}
            </p>
            <div className="mt-4 space-y-2">
              {safeAnalytics.recommendations
                ?.filter(Boolean)
                ?.slice(2)
                ?.map((item, index) => (
                  <div key={`${item}-${index}`} className="bg-white/10 p-2 rounded-lg text-sm">
                    {item}
                  </div>
                ))}
            </div>
          </div>
        </PageSection>
      </div>
    </DashboardLayout>
  );
}
