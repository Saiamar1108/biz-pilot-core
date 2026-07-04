import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

export function StatCard({
  label,
  value,
  change,
  icon: Icon,
  accent = "primary",
  comparisonLabel,
}: {
  label: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  accent?: "primary" | "emerald" | "warning" | "destructive";
  comparisonLabel?: string;
}) {
  const accents = {
    primary: "from-primary/15 to-primary/5 text-primary shadow-primary/20",
    emerald: "from-accent-brand/15 to-accent-brand/5 text-accent-brand shadow-accent-brand/20",
    warning: "from-warning/20 to-warning/5 text-warning shadow-warning/20",
    destructive: "from-destructive/15 to-destructive/5 text-destructive shadow-destructive/20",
  };
  const up = (change ?? 0) >= 0;
  return (
    <div className="glass-card card-hover rounded-2xl p-6">
      <div className="flex items-start justify-between mb-5">
        <div className={cn("grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br shadow-lg", accents[accent])}>
          <Icon className="h-7 w-7" />
        </div>
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full",
              up ? "text-accent-brand bg-accent-brand/10" : "text-destructive bg-destructive/10"
            )}
          >
            {up ? <TrendingUp className="h-4.5 w-4.5" /> : <TrendingDown className="h-4.5 w-4.5" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="text-3xl font-bold font-display tracking-tight">{value}</div>
      <div className="flex items-baseline gap-2 mt-2">
        <div className="text-base text-muted-foreground">{label}</div>
        {comparisonLabel && (
          <div className="text-xs text-muted-foreground/80">
            {comparisonLabel}
          </div>
        )}
      </div>
    </div>
  );
}
