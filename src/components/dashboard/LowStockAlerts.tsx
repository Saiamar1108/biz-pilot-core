import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/api";

export function LowStockAlerts({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        All products are well stocked
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {products.map((p) => (
        <div
          key={p.sku}
          className="flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/10"
        >
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-destructive/10 text-destructive shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{p.name}</div>
            <div className="text-xs text-muted-foreground">
              {p.sku} · {p.category}
            </div>
          </div>
          <div
            className={cn(
              "text-sm font-bold shrink-0",
              p.stock === 0 ? "text-destructive" : "text-warning",
            )}
          >
            {p.stock === 0 ? "Out" : `${p.stock} left`}
          </div>
        </div>
      ))}
      <Link to="/inventory">
        <Button variant="ghost" size="sm" className="w-full mt-2 text-muted-foreground">
          Manage inventory <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </Link>
    </div>
  );
}
