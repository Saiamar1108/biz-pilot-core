import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

export function StatCard({
  label,
  value,
  change,
  icon: Icon,
  accent = "primary",
}: {
  label: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  accent?: "primary" | "emerald" | "warning" | "destructive";
}) {
  const accents = {
    primary: "from-primary/10 to-primary/5 text-primary",
    emerald: "from-accent-brand/10 to-accent-brand/5 text-accent-brand",
    warning: "from-warning/15 to-warning/5 text-warning",
    destructive: "from-destructive/10 to-destructive/5 text-destructive",
  };
  const up = (change ?? 0) >= 0;
  return (
    <div className="glass-card rounded-2xl p-5 hover:shadow-elegant transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("grid h-11 w-11 place-items-center rounded-xl bg-linear-to-br", accents[accent])}>
          <Icon className="h-5 w-5" />
        </div>
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
              up ? "text-accent-brand bg-accent-brand/10" : "text-destructive bg-destructive/10"
            )}
          >
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold font-display tracking-tight">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
