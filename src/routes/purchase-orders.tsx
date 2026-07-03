import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PageSection } from "@/components/dashboard/PageSection";
import { AlertTriangle, ClipboardList, PackageCheck, ShoppingCart, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  EMPTY_ANALYTICS,
  getAnalytics,
  type AnalyticsSummary,
  type PurchaseOrderItem,
  type PurchaseOrderUrgency,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { DATA_REFRESH_EVENT } from "@/lib/live-refresh";

export const Route = createFileRoute("/purchase-orders")({
  head: () => ({ meta: [{ title: "Purchase Orders — ShopPilot AI" }] }),
  component: PurchaseOrdersPage,
});

const URGENCY_STYLES: Record<PurchaseOrderUrgency, string> = {
  Critical: "bg-destructive/10 text-destructive border-destructive/20",
  High: "bg-warning/15 text-warning border-warning/20",
  Medium: "bg-primary/10 text-primary border-primary/20",
  Low: "bg-secondary text-muted-foreground border-border",
};

const CONFIDENCE_STYLES: Record<PurchaseOrderItem["confidenceLabel"], string> = {
  High: "text-accent-brand",
  Medium: "text-warning",
  Low: "text-muted-foreground",
};

function formatDaysOfStock(days: number | null): string {
  if (days === null) return "No recent sales";
  if (days < 1) return "< 1 day left";
  const rounded = Math.round(days);
  return `${rounded} ${rounded === 1 ? "day" : "days"} left`;
}

function PurchaseOrderCard({ item }: { item: PurchaseOrderItem }) {
  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{item.name}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {item.sku || "—"} · {item.category}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            URGENCY_STYLES[item.urgency],
          )}
        >
          {item.urgency}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Order</p>
          <p className="font-bold text-lg text-primary">{item.recommendedQty}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">In stock</p>
          <p className="font-medium">{item.currentStock}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg / day</p>
          <p className="font-medium">{item.avgDailySales}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Coverage</p>
          <p className="font-medium">{formatDaysOfStock(item.daysOfStock)}</p>
        </div>
      </div>

      <div className="rounded-lg bg-secondary/50 p-3 text-sm">
        <p className="text-xs font-semibold text-muted-foreground mb-1">Why this recommendation?</p>
        <p>{item.reason}</p>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Sold last 30 days: {item.totalSoldLast30Days}</span>
        <span className={cn("font-semibold", CONFIDENCE_STYLES[item.confidenceLabel])}>
          Confidence: {item.confidence}% ({item.confidenceLabel})
        </span>
      </div>
    </div>
  );
}

function PurchaseOrdersPage() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAnalytics();
        if (active) setAnalytics(data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load purchase orders");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") void run();
    };

    void run();
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

  const items = analytics.purchaseOrder;

  const stats = useMemo(() => {
    const totalUnits = items.reduce((sum, item) => sum + item.recommendedQty, 0);
    const critical = items.filter((item) => item.urgency === "Critical").length;
    const high = items.filter((item) => item.urgency === "High").length;
    return { totalUnits, critical, high };
  }, [items]);

  return (
    <DashboardLayout title="Purchase Orders">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Items to Reorder"
            value={String(items.length)}
            icon={ClipboardList}
            accent="primary"
          />
          <StatCard
            label="Total Units"
            value={String(stats.totalUnits)}
            icon={ShoppingCart}
            accent="emerald"
          />
          <StatCard
            label="Critical"
            value={String(stats.critical)}
            icon={AlertTriangle}
            accent="destructive"
          />
          <StatCard
            label="High Priority"
            value={String(stats.high)}
            icon={TrendingUp}
            accent="warning"
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <PageSection
          title="Recommended Purchase Order"
          description="Practical reorder quantities based on the last 30 days of sales — targeting ~10 days of stock (7 base + 3 buffer)."
        >
          {loading ? (
            <p className="text-sm text-muted-foreground">Calculating recommendations…</p>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <PackageCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
              Stock levels look healthy. Nothing needs reordering right now.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <PurchaseOrderCard key={item.id || item.sku} item={item} />
              ))}
            </div>
          )}
        </PageSection>
      </div>
    </DashboardLayout>
  );
}
