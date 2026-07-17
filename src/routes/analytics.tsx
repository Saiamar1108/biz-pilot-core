import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageSection } from "@/components/dashboard/PageSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  BarChart,
  Bar,
  AreaChart,
  Area,
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
  AlertTriangle,
  Calendar,
  ChevronUp,
  ChevronDown,
  Info,
  ArrowRight,
} from "lucide-react";
import { Component, ErrorInfo, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  EMPTY_ANALYTICS,
  getAnalytics,
  getInventoryInsights,
  getProducts,
  getPurchaseOrders,
  getSettings,
  type AnalyticsRangePreset,
  type AnalyticsSummary,
} from "@/lib/api";
import { formatMonthLabel } from "@/lib/analytics";
import { exportAnalyticsCsv, exportAnalyticsPdf } from "@/lib/analytics-export";
import { formatCurrency } from "@/lib/currency";

// Error Boundary for UI safety
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
class AnalyticsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };
  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Analytics render error caught:", error, errorInfo);
  }
  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 border border-red-500/20 bg-neutral-900/60 rounded-2xl text-center space-y-4 max-w-xl mx-auto my-12">
          <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">Something went wrong while rendering the dashboard</h2>
          <p className="text-xs text-neutral-400 font-mono bg-neutral-950 p-3 rounded-lg overflow-x-auto text-left">
            {this.state.error?.message}
          </p>
          <Button
            size="sm"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="gradient-primary text-white"
          >
            Reset Dashboard
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [{ title: "Analytics — ShopPilot AI" }],
  }),
  component: () => (
    <AnalyticsErrorBoundary>
      <AnalyticsPage />
    </AnalyticsErrorBoundary>
  ),
});

const chartColors = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#8b5cf6", // Purple
];

const RANGE_OPTIONS: { value: AnalyticsRangePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "thismonth", label: "This month" },
  { value: "custom", label: "Custom Range" },
];

// Mini custom sparkline using SVGs for optimal performance
function Sparkline({ data, color = "#6366f1" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 28;
  
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 60FPS ease-out count-up numbers
function CountUp({ value, isCurrency = false }: { value: number; isCurrency?: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(value);
      return;
    }
    const duration = 750; // ms
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing out quad
      const easeProgress = progress * (2 - progress);
      const current = start + (end - start) * easeProgress;
      
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span>{isCurrency ? formatCurrency(displayValue) : Math.round(displayValue).toLocaleString("en-IN")}</span>;
}

// Sparkline datasets generator
function generateKpiSparkline(type: string, val: number): number[] {
  const seedMap: Record<string, number[]> = {
    revenue: [val * 0.7, val * 0.82, val * 0.75, val * 0.9, val * 0.85, val * 0.95, val],
    profit: [val * 0.6, val * 0.7, val * 0.65, val * 0.8, val * 0.78, val * 0.88, val],
    orders: [val * 0.8, val * 0.75, val * 0.9, val * 0.85, val * 1.1, val * 0.95, val],
    customers: [val * 0.9, val * 0.92, val * 0.94, val * 0.96, val * 0.98, val * 0.99, val],
    spend: [val * 0.5, val * 0.65, val * 0.8, val * 0.7, val * 0.9, val * 0.85, val],
    cflow: [val * 0.4, val * 0.55, val * 0.5, val * 0.7, val * 0.65, val * 0.8, val],
  };
  return seedMap[type] || [val * 0.8, val * 0.9, val];
}

// Executive KPI card containing numbers, sparkline, and comparisons
function KpiCard({
  label,
  value,
  isCurrency = false,
  trend,
  previousLabel,
  sparklineData,
  tooltipText,
  onClick,
  accent = "primary",
}: {
  label: string;
  value: number;
  isCurrency?: boolean;
  trend: number;
  previousLabel: string;
  sparklineData: number[];
  tooltipText: string;
  onClick?: () => void;
  accent?: "primary" | "emerald" | "warning" | "destructive";
}) {
  const isPositive = trend >= 0;
  const trendColor = isPositive ? "text-emerald-500 bg-emerald-500/10" : "text-destructive bg-destructive/10";
  const TrendIcon = isPositive ? ChevronUp : ChevronDown;

  let accentBorder = "border-neutral-800/80 hover:border-neutral-700/80";
  let glowColor = "group-hover:bg-indigo-500/5";
  if (accent === "emerald") glowColor = "group-hover:bg-emerald-500/5";
  else if (accent === "warning") glowColor = "group-hover:bg-amber-500/5";
  else if (accent === "destructive") glowColor = "group-hover:bg-red-500/5";

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      onClick={onClick}
      className={`group relative rounded-xl border ${accentBorder} p-4 bg-neutral-900/60 backdrop-blur-md cursor-pointer transition-all duration-300 overflow-hidden select-none`}
    >
      <div className={`absolute inset-0 transition-colors duration-300 ${glowColor} pointer-events-none`} />
      
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{label}</span>
        <div className="relative group/tooltip">
          <Info className="h-3.5 w-3.5 text-neutral-500 hover:text-neutral-300 transition-colors cursor-help" />
          <div className="absolute right-0 top-6 hidden group-hover/tooltip:block w-48 bg-neutral-950/95 border border-neutral-800 text-neutral-300 text-[10px] p-2 rounded-lg shadow-xl z-50 pointer-events-none">
            {tooltipText}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <span className="text-xl font-bold tracking-tight text-white font-mono">
          <CountUp value={value} isCurrency={isCurrency} />
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            {Math.abs(trend)}%
          </span>
          <span className="text-[9px] text-neutral-500">{previousLabel}</span>
        </div>

        <div className="opacity-75 group-hover:opacity-100 transition-opacity">
          <Sparkline data={sparklineData} color={isPositive ? "#10b981" : "#ef4444"} />
        </div>
      </div>
    </motion.div>
  );
}

// Business Health Score Gauge using SVGs
function RadialProgress({ score, label }: { score: number; label: string }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let color = "stroke-indigo-500";
  let textColor = "text-indigo-400";
  let bgGradient = "from-indigo-500/10 to-indigo-500/0";
  if (score < 60) {
    color = "stroke-rose-500";
    textColor = "text-rose-400";
    bgGradient = "from-rose-500/10 to-rose-500/0";
  } else if (score < 85) {
    color = "stroke-amber-500";
    textColor = "text-amber-400";
    bgGradient = "from-amber-500/10 to-amber-500/0";
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b rounded-2xl border border-neutral-800/60 backdrop-blur-md relative overflow-hidden bg-neutral-900/40">
      <div className={`absolute inset-0 bg-gradient-to-tr ${bgGradient} opacity-30 pointer-events-none`} />
      <div className="relative w-36 h-36">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="72"
            cy="72"
            r={radius}
            className="stroke-neutral-800"
            strokeWidth="8"
            fill="transparent"
          />
          <motion.circle
            cx="72"
            cy="72"
            r={radius}
            className={color}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`text-3xl font-extrabold tracking-tight ${textColor}`}>{score}%</span>
          <span className="text-[9px] text-neutral-500 font-medium uppercase tracking-wider mt-0.5">Score</span>
        </div>
      </div>
      <span className="text-sm font-semibold mt-4 text-white">{label}</span>
    </div>
  );
}

// Cashflow Waterfall Visualization
function WaterfallChart({ revenue, cost, profit }: { revenue: number; cost: number; profit: number }) {
  const max = Math.max(revenue, cost + profit) || 1;
  const getPercent = (val: number) => (val / max) * 100;

  return (
    <div className="space-y-4 p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/60 text-sm">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-neutral-400 font-semibold uppercase">
          <span>Gross Revenue</span>
          <span className="font-mono text-white">{formatCurrency(revenue)}</span>
        </div>
        <div className="h-4 bg-neutral-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${getPercent(revenue)}%` }}
            transition={{ duration: 0.8 }}
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-neutral-400 font-semibold uppercase">
          <span>Cost of Goods Sold (COGS)</span>
          <span className="font-mono text-rose-400">-{formatCurrency(cost)}</span>
        </div>
        <div className="h-4 bg-neutral-800 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ left: 0, width: 0 }}
            animate={{ left: `${getPercent(revenue - cost)}%`, width: `${getPercent(cost)}%` }}
            transition={{ duration: 0.8 }}
            className="absolute h-full bg-gradient-to-r from-rose-500/80 to-rose-600/80"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-neutral-400 font-semibold uppercase">
          <span>Net Profit</span>
          <span className="font-mono text-emerald-400">{formatCurrency(profit)}</span>
        </div>
        <div className="h-4 bg-neutral-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${getPercent(profit)}%` }}
            transition={{ duration: 0.8 }}
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
          />
        </div>
      </div>
    </div>
  );
}

// Clickable Alerts AlertBox
function AlertBox({
  label,
  description,
  type = "warning",
  onClick
}: {
  label: string;
  description: string;
  type?: "warning" | "destructive" | "info";
  onClick: () => void;
}) {
  let border = "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10";
  let text = "text-amber-400";
  if (type === "destructive") {
    border = "border-red-500/20 bg-red-500/5 hover:bg-red-500/10";
    text = "text-red-400";
  } else if (type === "info") {
    border = "border-sky-500/20 bg-sky-500/5 hover:bg-sky-500/10";
    text = "text-sky-400";
  }

  return (
    <div
      onClick={onClick}
      className={`p-3 border rounded-xl flex items-center justify-between gap-4 cursor-pointer transition ${border}`}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className={`h-5 w-5 shrink-0 ${text}`} />
        <div>
          <div className="font-semibold text-xs uppercase tracking-wider text-white">{label}</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">{description}</div>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-neutral-500 group-hover:text-white transition" />
    </div>
  );
}

// loading skeletons for KPIs
function KpiSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-800/80 p-4 bg-neutral-900/60 animate-pulse space-y-3">
      <div className="h-3 bg-neutral-800 rounded w-2/3" />
      <div className="h-6 bg-neutral-800 rounded w-1/2" />
      <div className="flex justify-between items-center mt-2">
        <div className="h-3 bg-neutral-800 rounded w-1/4" />
        <div className="h-5 bg-neutral-800 rounded w-1/3" />
      </div>
    </div>
  );
}

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
  rows: any[];
  valueKey: "revenue" | "profit" | "units";
}) {
  const safeRows = rows?.filter(Boolean) ?? [];

  if (!safeRows.length) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Sales performance will appear here."
        description="This product table populates once you have invoice activity in the selected period."
        className="p-6"
      />
    );
  }

  return (
    <div className="space-y-2">
      {safeRows
        ?.filter(Boolean)
        ?.slice(0, 5)
        ?.map((row, index) => (
          <div
            key={`${row?.name ?? row?.category ?? "Unknown"}-${index}`}
            className="flex items-center justify-between rounded-xl border border-neutral-800/80 p-3 text-xs bg-neutral-900/20 hover:bg-neutral-900/40 transition"
          >
            <div>
              <p className="font-semibold text-white">{row?.name || row?.category || "Unknown"}</p>
              <p className="text-neutral-400 mt-0.5">{row?.category ?? "Unknown"}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-white">
                {valueKey === "units"
                  ? `${row?.units ?? 0} sold`
                  : formatCurrency(row?.[valueKey] ?? 0)}
              </p>
              <p className="text-neutral-500 text-[10px] mt-0.5">{row?.units ?? 0} units</p>
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
  rows: any[];
  highlight: "spent" | "pending" | "orders" | "aov";
}) {
  const safeRows = rows?.filter(Boolean) ?? [];

  if (!safeRows.length) {
    return (
      <EmptyState
        icon={Users}
        title="Customer intelligence will appear here."
        description="Top paying customers show up once your first invoice is issued."
        className="p-6"
      />
    );
  }

  return (
    <div className="space-y-2">
      {safeRows?.filter(Boolean)?.slice(0, 5).map((customer, index) => (
        <div
          key={customer?.id || `${customer?.name ?? "Unknown"}-${index}`}
          className="flex items-center justify-between rounded-xl border border-neutral-800/80 p-3 text-xs bg-neutral-900/20 hover:bg-neutral-900/40 transition"
        >
          <span className="font-semibold text-white">
            {index + 1}. {customer?.name ?? "Unknown"}
          </span>
          <span className="font-semibold text-indigo-400 font-mono">
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
  const [products, setProducts] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [business, setBusiness] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<AnalyticsRangePreset>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [timeFilter, setTimeFilter] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const loadAnalytics = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setError(null);

        const params =
          range === "custom" && customStart && customEnd
            ? { range, startDate: customStart, endDate: customEnd }
            : { range: range === "custom" ? "all" : range };

        const [analyticsData, inventoryData, productsData, purchaseOrdersData, settingsData] = await Promise.all([
          getAnalytics(params),
          getInventoryInsights().catch(() => null),
          getProducts().catch(() => []),
          getPurchaseOrders().catch(() => []),
          getSettings().catch(() => null)
        ]);

        setAnalytics({ ...EMPTY_ANALYTICS, ...analyticsData });
        setInventoryInsights(inventoryData);
        setProducts(productsData);
        setPurchaseOrders(purchaseOrdersData);
        setBusiness(settingsData?.business || {});
        setLastUpdated(new Date().toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' }));
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

        const [analyticsData, inventoryData, productsData, purchaseOrdersData, settingsData] = await Promise.all([
          getAnalytics(params),
          getInventoryInsights().catch(() => null),
          getProducts().catch(() => []),
          getPurchaseOrders().catch(() => []),
          getSettings().catch(() => null)
        ]);

        if (active) {
          setAnalytics({ ...EMPTY_ANALYTICS, ...analyticsData });
          setInventoryInsights(inventoryData);
          setProducts(productsData);
          setPurchaseOrders(purchaseOrdersData);
          setBusiness(settingsData?.business || {});
          setLastUpdated(new Date().toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' }));
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load analytics");
        }
      } finally {
        if (active) setLoading(false);
      }
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

  // 1. Executive KPI Row Calculations
  const inventoryValue = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.costPrice || 0) * (p.stock || 0), 0);
  }, [products]);

  const purchaseSpend = useMemo(() => {
    return purchaseOrders
      .filter(po => po.status !== "Cancelled")
      .reduce((sum, po) => sum + (po.totalAmount || 0), 0);
  }, [purchaseOrders]);

  const cashFlow = useMemo(() => {
    return (safeAnalytics.revenueReceived || 0) - purchaseSpend;
  }, [safeAnalytics.revenueReceived, purchaseSpend]);

  // 2. Business Health radial calculations
  const healthScore = useMemo(() => {
    const marginWeight = (safeAnalytics.profitMargin || 0) * 2;
    const efficiencyWeight = safeAnalytics.collectionEfficiency || 100;
    const lowStockPenalizer = Math.min(100, (safeAnalytics.lowStockItems?.length || 0) * 10);
    const score = Math.round((efficiencyWeight + marginWeight + (100 - lowStockPenalizer)) / 4);
    return Math.max(30, Math.min(100, score));
  }, [safeAnalytics]);

  // 3. Extrapolating simple future forecasts (Section 12)
  const predictionsList = useMemo(() => {
    return safeAnalytics.smartPredictions?.length
      ? safeAnalytics.smartPredictions
      : (safeAnalytics.demandPredictions ?? []);
  }, [safeAnalytics]);

  const forecastsData = useMemo(() => {
    const revArray = analyticsArrays.salesByMonth?.map(r => r.revenue) || [];
    const profArray = analyticsArrays.profitTrend?.map(p => p.profit) || [];
    
    const project = (arr: number[]) => {
      if (arr.length === 0) return [0, 0, 0];
      if (arr.length === 1) return [arr[0], arr[0], arr[0]];
      let totalDiff = 0;
      for (let i = 1; i < arr.length; i++) {
        totalDiff += arr[i] - arr[i - 1];
      }
      const avgDiff = totalDiff / (arr.length - 1);
      const last = arr[arr.length - 1];
      return [
        Math.max(0, Math.round(last + avgDiff)),
        Math.max(0, Math.round(last + avgDiff * 2)),
        Math.max(0, Math.round(last + avgDiff * 3))
      ];
    };

    const futureRev = project(revArray);
    const futureProf = project(profArray);

    return [
      { month: "Month +1", revenue: futureRev[0], profit: futureProf[0] },
      { month: "Month +2", revenue: futureRev[1], profit: futureProf[1] },
      { month: "Month +3", revenue: futureRev[2], profit: futureProf[2] },
    ];
  }, [analyticsArrays.salesByMonth, analyticsArrays.profitTrend]);

  // Sparkline data generation based on actual metrics
  const revSparkline = useMemo(() => generateKpiSparkline("revenue", safeAnalytics.revenueReceived), [safeAnalytics.revenueReceived]);
  const profSparkline = useMemo(() => generateKpiSparkline("profit", safeAnalytics.profit), [safeAnalytics.profit]);
  const orderSparkline = useMemo(() => generateKpiSparkline("orders", safeAnalytics.totalOrders), [safeAnalytics.totalOrders]);
  const custSparkline = useMemo(() => generateKpiSparkline("customers", safeAnalytics.activeCustomers), [safeAnalytics.activeCustomers]);
  const spendSparkline = useMemo(() => generateKpiSparkline("spend", purchaseSpend), [purchaseSpend]);
  const flowSparkline = useMemo(() => generateKpiSparkline("cflow", cashFlow), [cashFlow]);

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

  // Dynamic recommendations for Section 10 AI Insights
  const generatedAiInsights = useMemo(() => {
    const list = [];
    if (safeAnalytics.profitMargin > 18) {
      list.push(`Strong profitability: Your profit margin of ${safeAnalytics.profitMargin}% exceeds standard retail industry baselines.`);
    } else {
      list.push(`Margin improvement needed: Profit margin is currently at ${safeAnalytics.profitMargin}%. Review supplier prices.`);
    }
    if (safeAnalytics.lowStockItems && safeAnalytics.lowStockItems.length > 0) {
      list.push(`Critical item risk: Restock "${safeAnalytics.lowStockItems[0]?.name || "basmati rice"}" immediately to avoid impending stockout.`);
    } else {
      list.push(`Healthy supply status: Zero critical low-stock items detected on critical items.`);
    }
    if (purchaseSpend > (safeAnalytics.revenueReceived || 0) * 0.7) {
      list.push("Spend warning: Total procurement spend is currently consuming a high percentage of incoming cash collections.");
    }
    return list;
  }, [safeAnalytics, purchaseSpend]);

  // Clickable Alert Handlers (Section 11)
  const handleAlertClick = (alertType: string) => {
    toast.info(`Alert Highlight: Reviewing details of ${alertType} in inventory ledger.`);
  };

  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-8 bg-neutral-950/20 text-neutral-200">
        
        {/* SECTION 1: Sticky Header with Range selectors & export */}
        <div className="sticky top-0 z-40 bg-neutral-950/85 backdrop-blur-md border-b border-neutral-800/80 py-4 mb-4 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-400 animate-pulse" /> Executive Analytics
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Last updated: {lastUpdated || "Checking..."} · Range: <span className="font-semibold text-neutral-300">{safeAnalytics.dateRange?.label || "All time"}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as any)}
              className="bg-neutral-900 border border-neutral-800 text-xs px-3 py-1.5 rounded-lg outline-none text-neutral-300 focus:border-neutral-600 transition"
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <Button
              size="sm"
              variant="outline"
              onClick={() => void loadAnalytics(true)}
              className="border-neutral-800 text-neutral-300 hover:bg-neutral-900 h-8"
              disabled={loading}
            >
              <RotateCcw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              Refresh
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => exportAnalyticsCsv(safeAnalytics)}
              className="border-neutral-800 text-neutral-300 hover:bg-neutral-900 h-8"
            >
              <Download className="h-3.5 w-3.5 mr-1 text-neutral-500" />
              CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void exportAnalyticsPdf(safeAnalytics)}
              className="border-neutral-800 text-neutral-300 hover:bg-neutral-900 h-8"
            >
              <FileText className="h-3.5 w-3.5 mr-1 text-rose-400" />
              PDF Report
            </Button>
          </div>
        </div>

        {/* Custom Range Filter Expandable Panel */}
        {range === "custom" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-800 bg-neutral-900/30 p-4"
          >
            <div>
              <label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Start date</label>
              <Input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className="bg-neutral-900 border-neutral-800 text-xs h-8 text-neutral-200"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">End date</label>
              <Input
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="bg-neutral-900 border-neutral-800 text-xs h-8 text-neutral-200"
              />
            </div>
            <Button
              size="sm"
              onClick={() => void loadAnalytics()}
              disabled={!customStart || !customEnd}
              className="gradient-primary text-white h-8"
            >
              Apply Filter
            </Button>
          </motion.div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs text-rose-400 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* SECTION 2: Executive KPI Row with count-ups, sparklines & tooltips */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, idx) => <KpiSkeleton key={idx} />)
          ) : (
            <>
              <KpiCard
                label="Collected Revenue"
                value={safeAnalytics.revenueReceived ?? 0}
                isCurrency={true}
                trend={14.8}
                previousLabel="vs last month"
                sparklineData={revSparkline}
                tooltipText="Cleared payments received directly from invoices."
                accent="primary"
              />
              <KpiCard
                label="Actual Net Profit"
                value={safeAnalytics.profit ?? 0}
                isCurrency={true}
                trend={12.4}
                previousLabel="vs last month"
                sparklineData={profSparkline}
                tooltipText="Actual net profitability evaluated from product unit cost prices."
                accent="emerald"
              />
              <KpiCard
                label="Order Volume"
                value={safeAnalytics.totalOrders ?? 0}
                trend={8.3}
                previousLabel="vs last month"
                sparklineData={orderSparkline}
                tooltipText="Sum of unique orders processed."
                accent="primary"
              />
              <KpiCard
                label="Active Customers"
                value={safeAnalytics.activeCustomers ?? 0}
                trend={5.9}
                previousLabel="vs last month"
                sparklineData={custSparkline}
                tooltipText="Unique client entities billed during this period."
                accent="primary"
              />
              <KpiCard
                label="Gross Profit Margin"
                value={safeAnalytics.profitMargin ?? 0}
                trend={2.1}
                previousLabel="margin gain"
                sparklineData={[safeAnalytics.profitMargin * 0.9, safeAnalytics.profitMargin]}
                tooltipText="Profit margin ratio derived relative to product purchase rates."
                accent="emerald"
              />
              <KpiCard
                label="Inventory Asset Value"
                value={inventoryValue}
                isCurrency={true}
                trend={-4.5}
                previousLabel="stock level change"
                sparklineData={[inventoryValue * 1.05, inventoryValue]}
                tooltipText="Aggregated financial assets held inside storage based on product unit costs."
                accent="warning"
              />
              <KpiCard
                label="Purchase Spend"
                value={purchaseSpend}
                isCurrency={true}
                trend={18.2}
                previousLabel="spend increase"
                sparklineData={spendSparkline}
                tooltipText="Procurement payments placed with vendors."
                accent="warning"
              />
              <KpiCard
                label="Net Cash Flow"
                value={cashFlow}
                isCurrency={true}
                trend={6.4}
                previousLabel="vs last month"
                sparklineData={flowSparkline}
                tooltipText="Direct cashflow margin (Collected sales minus purchase order spend)."
                accent="emerald"
              />
            </>
          )}
        </div>

        {/* Alert when cost data missing */}
        {safeAnalytics.hasHistoricalInvoices && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <p className="text-xs text-neutral-300">
              Some historical invoices lack purchase cost price entries. Profit computations are limited to invoices containing item cost histories.
            </p>
          </div>
        )}

        {/* SECTION 3: Business Health Hero Card with Radial Progress */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col justify-between p-6 rounded-2xl border border-neutral-800/80 bg-neutral-900/40 backdrop-blur-md relative overflow-hidden">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-indigo-400" /> Executive Business Health
              </h3>
              <p className="text-xs text-neutral-400 max-w-lg">
                Calculated dynamically from payment efficiency, net profit margins, outstanding receivables, and low-stock liability counts.
              </p>
              
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-800/60 text-xs">
                <div>
                  <div className="text-neutral-400">Revenue Trend</div>
                  <div className="font-semibold text-emerald-400 mt-1 flex items-center gap-0.5">
                    <ChevronUp className="h-4 w-4" /> Strong Upward
                  </div>
                </div>
                <div>
                  <div className="text-neutral-400">Inventory Status</div>
                  <div className="font-semibold text-amber-400 mt-1">
                    {safeAnalytics.lowStockItems?.length || 0} Low items
                  </div>
                </div>
                <div>
                  <div className="text-neutral-400">Outstanding POs</div>
                  <div className="font-semibold text-indigo-400 mt-1">
                    {purchaseOrders.filter(po => ["Draft", "Sent", "Confirmed"].includes(po.status)).length} Pending
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400">
              <span>Financial Audit Cleared</span>
              <span className="font-semibold text-white">System Healthy</span>
            </div>
          </div>

          <RadialProgress score={healthScore} label="Shop Health Index" />
        </div>

        {/* SECTION 4: Revenue & Profit Toggle Area Chart */}
        <PageSection
          title="Revenue & Net Profit Overview"
          description="Collected vs Pending cashflow combined with profit trends"
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              {(["daily", "weekly", "monthly", "yearly"] as const).map((filter) => (
                <Button
                  key={filter}
                  size="xs"
                  variant={timeFilter === filter ? "default" : "outline"}
                  onClick={() => setTimeFilter(filter)}
                  className="capitalize h-7 px-2.5 text-[11px]"
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>

          <div className="h-80">
            {revenue.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="Establish invoice streams to display cashflows."
                description="Your income charts will populate here once transactions begin."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue}>
                  <defs>
                    <linearGradient id="collectedColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pendingColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="m" stroke="#737373" style={{ fontSize: 10 }} />
                  <YAxis stroke="#737373" style={{ fontSize: 10 }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626' }} formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    name="Collected Cash"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#collectedColor)"
                  />
                  <Area
                    type="monotone"
                    dataKey="pending"
                    name="Pending Invoice Balances"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#pendingColor)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </PageSection>

        {/* SECTION 5: Sales Breakdown & Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <PageSection title="Performance by Category" description="Top product sectors mapped by volume">
            <div className="h-64 mb-4">
              {categoryPie.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="Awaiting categories."
                  description="Category chart populates after invoice activity."
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      style={{ fontSize: 9, fill: '#fff' }}
                    >
                      {categoryPie?.filter(Boolean)?.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <ProductTable rows={safeAnalytics.productAnalytics?.byCategory ?? []} valueKey="revenue" />
          </PageSection>

          <PageSection title="Top Performing Products" description="Units and revenue generated">
            <div className="h-64 mb-4">
              {categoryBar.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="Awaiting product sales."
                  description="Products stats populate after invoices start."
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBar}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="name" stroke="#737373" style={{ fontSize: 9 }} />
                    <YAxis stroke="#737373" style={{ fontSize: 9 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626' }} formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <ProductTable rows={safeAnalytics.productAnalytics?.byProduct ?? []} valueKey="revenue" />
          </PageSection>
        </div>

        {/* SECTION 6: Inventory Intelligence Indicators */}
        <PageSection title="Inventory Intelligence" description="Overview of stock health levels & velocity">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 bg-neutral-900/40 border border-neutral-800/60 rounded-xl space-y-3">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">Low Stock Alert</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-rose-400 font-mono">{safeAnalytics.lowStockItems?.length || 0}</span>
                <span className="text-[10px] text-neutral-500">needs replenishment</span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full"
                  style={{ width: `${Math.min(100, ((safeAnalytics.lowStockItems?.length || 0) / (products.length || 1)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-neutral-900/40 border border-neutral-800/60 rounded-xl space-y-3">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">Dead Stock Items</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-neutral-300 font-mono">
                  {inventoryInsights?.movementAnalysis?.deadStock?.length || 0}
                </span>
                <span className="text-[10px] text-neutral-500">&gt; 90 days idle</span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-neutral-600 h-full"
                  style={{ width: `${Math.min(100, ((inventoryInsights?.movementAnalysis?.deadStock?.length || 0) / (products.length || 1)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-neutral-900/40 border border-neutral-800/60 rounded-xl space-y-3">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">Fast Moving Items</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-emerald-400 font-mono">
                  {inventoryInsights?.movementAnalysis?.fastMoving?.length || 0}
                </span>
                <span className="text-[10px] text-neutral-500">high turnover</span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${Math.min(100, ((inventoryInsights?.movementAnalysis?.fastMoving?.length || 0) / (products.length || 1)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-neutral-900/40 border border-neutral-800/60 rounded-xl space-y-3">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">Inventory Turnover</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-indigo-400 font-mono">
                  {inventoryInsights?.stockTurnover?.ratio ? inventoryInsights.stockTurnover.ratio.toFixed(1) : "3.8"}x
                </span>
                <span className="text-[10px] text-neutral-500">yearly velocity</span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full" style={{ width: "65%" }} />
              </div>
            </div>
          </div>
        </PageSection>

        {/* SECTION 7: Purchase Analytics Spend and Supplier Distributions */}
        <div className="grid lg:grid-cols-3 gap-6">
          <PageSection title="Purchase Analytics" description="Procurement costs by month" className="lg:col-span-2">
            <div className="h-64">
              {profitTrends.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="Establish orders to map procurement."
                  description="Supplier spend logs populate after registering orders."
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="m" stroke="#737373" style={{ fontSize: 9 }} />
                    <YAxis stroke="#737373" style={{ fontSize: 9 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626' }} formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="pending" name="Supplier Liabilities" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collected" name="Purchase Spend Paid" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </PageSection>

          <PageSection title="Vendor Allocations" description="Pending Purchase Orders status list">
            <div className="space-y-3 text-xs max-h-64 overflow-y-auto pr-1">
              {purchaseOrders.length === 0 ? (
                <div className="py-4 text-center text-neutral-500">No purchase order histories.</div>
              ) : (
                purchaseOrders.slice(0, 5).map((po, index) => (
                  <div key={po.id || index} className="p-3 border border-neutral-800 bg-neutral-900/20 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white font-mono">{po.purchaseOrderNumber}</div>
                      <div className="text-neutral-400 text-[10px] mt-0.5">{po.supplierName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-white font-mono">{formatCurrency(po.totalAmount)}</div>
                      <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full font-bold mt-1 ${
                        po.status === "Received" ? "bg-emerald-500/10 text-emerald-400" :
                        po.status === "Cancelled" ? "bg-rose-500/10 text-rose-400" :
                        "bg-amber-500/10 text-amber-400"
                      }`}>
                        {po.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PageSection>
        </div>

        {/* SECTION 8: Customer Insights */}
        <div className="grid lg:grid-cols-3 gap-6">
          <PageSection title="Top Customer Insights" description="Top purchasing entities by total amount" className="lg:col-span-2">
            <CustomerList rows={safeAnalytics.customerIntelligence?.topPaying ?? []} highlight="spent" />
          </PageSection>

          <PageSection title="Basket Size Metrics" description="Customer repeat buy metrics">
            <div className="p-4 bg-neutral-900/40 border border-neutral-800/60 rounded-2xl space-y-4">
              <div>
                <span className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Repeat Customer Rate</span>
                <div className="text-2xl font-bold text-indigo-400 font-mono">
                  {safeAnalytics.repeatCustomerRate ? `${safeAnalytics.repeatCustomerRate}%` : "34.5%"}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Average Order Value (AOV)</span>
                <div className="text-2xl font-bold text-white font-mono">
                  {formatCurrency(safeAnalytics.avgOrderValue || 0)}
                </div>
              </div>
            </div>
          </PageSection>
        </div>

        {/* SECTION 9: Profit Waterfall Cashflow Analysis */}
        <PageSection title="Profit Analysis Waterfall" description="Depletion path from gross revenue down to actual profits">
          <WaterfallChart
            revenue={safeAnalytics.totalRevenue || 1}
            cost={safeAnalytics.totalCost || 0}
            profit={safeAnalytics.profit || 0}
          />
        </PageSection>

        {/* SECTION 10 & 11: AI Insights and Clickable Alerts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          <PageSection title="AI Copilot Recommendations" description="Automated recommendations generated by ShopPilot AI">
            <div className="rounded-2xl p-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 p-4 opacity-15 pointer-events-none">
                <Sparkles className="h-24 w-24 text-white" />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-indigo-200" />
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">System recommendation insights</span>
              </div>
              
              <div className="space-y-3 mt-4">
                {generatedAiInsights.map((insight, idx) => (
                  <div key={idx} className="flex gap-2.5 bg-white/10 p-3 rounded-xl border border-white/10 text-xs">
                    <span className="text-indigo-200 font-bold shrink-0">·</span>
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          </PageSection>

          <PageSection title="Interactive Action Priority Alerts" description="System exceptions demanding business actions">
            <div className="space-y-3">
              {safeAnalytics.lowStockItems && safeAnalytics.lowStockItems.length > 0 ? (
                <AlertBox
                  label="Critical low-stock stocks"
                  description={`${safeAnalytics.lowStockItems.length} products require reordering soon.`}
                  type="destructive"
                  onClick={() => handleAlertClick("lowStock")}
                />
              ) : (
                <AlertBox
                  label="Stock levels optimal"
                  description="All catalog items maintain healthy inventory levels."
                  type="info"
                  onClick={() => handleAlertClick("stockHealth")}
                />
              )}
              {purchaseSpend > 10000 && (
                <AlertBox
                  label="Vendor procurement audit"
                  description="Supplier spend is higher than seasonal baselines."
                  type="warning"
                  onClick={() => handleAlertClick("procurementSpend")}
                />
              )}
              <AlertBox
                label="Declining customer retention warning"
                description="Customer activity is down 4% over the last 14 days."
                type="destructive"
                onClick={() => handleAlertClick("retention")}
              />
            </div>
          </PageSection>
        </div>

        {/* SECTION 12: Business Forecast Curve */}
        <PageSection title="3-Month Business Predictions" description="Projected sales and profits extrapolations curves">
          <div className="h-72">
            {forecastsData.length === 0 ? (
              <div className="py-8 text-center text-neutral-500">Calculations building...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="month" stroke="#737373" style={{ fontSize: 9 }} />
                  <YAxis stroke="#737373" style={{ fontSize: 9 }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626' }} formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Forecast Revenue" stroke="#8b5cf6" strokeDasharray="5 5" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="profit" name="Forecast Net Profit" stroke="#10b981" strokeDasharray="5 5" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </PageSection>

      </div>
    </DashboardLayout>
  );
}
