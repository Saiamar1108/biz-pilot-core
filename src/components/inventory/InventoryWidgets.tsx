import { Calendar, AlertTriangle, TrendingUp, Package, ShoppingBag } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { PageSection } from "@/components/dashboard/PageSection";
import { formatCurrency } from "@/lib/currency";
import { getInventoryInsights } from "@/lib/api";
import { useEffect, useState } from "react";

type InventoryWidgetsProps = {
  businessName: string;
};

export function InventoryWidgets({ businessName }: InventoryWidgetsProps) {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInsights = async () => {
      try {
        setLoading(true);
        const data = await getInventoryInsights();
        setInsights(data);
      } catch (err) {
        console.error("Failed to load inventory insights:", err);
      } finally {
        setLoading(false);
      }
    };

    loadInsights();
  }, []);

  if (loading) {
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        <PageSection title="Inventory Insights" description="Loading...">
          <div className="p-8 text-center text-muted-foreground">Loading inventory insights...</div>
        </PageSection>
      </div>
    );
  }

  const expiryCount = (insights?.expiryAlerts?.expired?.length || 0) + 
                     (insights?.expiryAlerts?.critical?.length || 0) + 
                     (insights?.expiryAlerts?.warning?.length || 0);

  const deadStockCount = insights?.movementAnalysis?.deadStock?.length || 0;
  const urgentRestockCount = insights?.restockPredictions?.filter((p: any) => p.urgency === "critical")?.length || 0;
  const topSellers = insights?.movementAnalysis?.bestSellers?.slice(0, 5) || [];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Expiry Alerts */}
      <PageSection title="Expiry Alerts" description="Products requiring attention">
        <div className="grid grid-cols-2 gap-4">
          <StatCard 
            label="Expired" 
            value={String(insights?.expiryAlerts?.expired?.length || 0)} 
            icon={AlertTriangle} 
            accent="destructive" 
          />
          <StatCard 
            label="Expiring Soon" 
            value={String((insights?.expiryAlerts?.critical?.length || 0) + (insights?.expiryAlerts?.warning?.length || 0))} 
            icon={Calendar} 
            accent="warning" 
          />
        </div>
        {expiryCount > 0 && (
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
            {insights?.expiryAlerts?.expired?.slice(0, 3).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.sku}</div>
                </div>
                <div className="text-destructive font-semibold text-xs">
                  Expired {Math.abs(item.daysUntilExpiry)}d ago
                </div>
              </div>
            ))}
            {insights?.expiryAlerts?.critical?.slice(0, 2).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-100 border border-orange-200">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.sku}</div>
                </div>
                <div className="text-orange-700 font-semibold text-xs">
                  {item.daysUntilExpiry}d left
                </div>
              </div>
            ))}
          </div>
        )}
      </PageSection>

      {/* Dead Stock */}
      <PageSection title="Dead Stock" description="Products not sold in 30+ days">
        <StatCard 
          label="Dead Stock Items" 
          value={String(deadStockCount)} 
          icon={Package} 
          accent="warning" 
        />
        {deadStockCount > 0 && (
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
            {insights?.movementAnalysis?.deadStock?.slice(0, 5).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border/40">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.sku} · {item.category}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">{item.stock} units</div>
                  <div className="text-xs text-muted-foreground">{item.daysSinceLastSale}d</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageSection>

      {/* Restock Suggestions */}
      <PageSection title="Restock Suggestions" description="Items needing reordering">
        <StatCard 
          label="Urgent Restocks" 
          value={String(urgentRestockCount)} 
          icon={ShoppingBag} 
          accent="destructive" 
        />
        {urgentRestockCount > 0 && (
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
            {insights?.restockPredictions?.slice(0, 5).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border/40">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.sku} · {item.category}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">{item.currentStock} units</div>
                  <div className="text-xs text-muted-foreground">
                    {item.daysUntilStockout === null ? "No sales data" : `${item.daysUntilStockout}d left`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageSection>

      {/* Fastest Selling Products */}
      <PageSection title="Fastest Selling Products" description="Top performers by sales volume">
        <div className="space-y-2">
          {topSellers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales data yet.</p>
          ) : (
            topSellers.map((item: any, index: number) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border/40">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.category}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">{item.salesCount} sold</div>
                  <div className="text-xs text-muted-foreground">{formatCurrency(item.revenue)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </PageSection>
    </div>
  );
}