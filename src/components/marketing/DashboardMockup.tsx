import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  Package,
  Receipt,
  TrendingUp,
} from "lucide-react";

const stats = [
  { label: "Today's sales", value: "₹48,250", change: "+12.4%", icon: TrendingUp },
  { label: "Pending dues", value: "₹9,800", change: "3 invoices", icon: Receipt },
  { label: "Low stock items", value: "7", change: "Restock soon", icon: Package },
];

export function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-5xl"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-2xl border border-border/80 bg-card p-2 shadow-[0_24px_64px_-24px_rgba(15,23,42,0.18)] dark:shadow-[0_24px_64px_-24px_rgba(0,0,0,0.55)]"
      >
        <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
          <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
            </div>
            <div className="mx-auto rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">
              app.shoppilot.ai/dashboard
            </div>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-[1fr_1.1fr] md:p-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Overview
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
                  SaiMart Retail
                </h3>
              </div>
              <div className="grid gap-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-border/70 bg-card px-4 py-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <p className="mt-1 font-display text-xl font-semibold">{stat.value}</p>
                        <p className="mt-0.5 text-xs text-primary">{stat.change}</p>
                      </div>
                      <div className="rounded-md bg-primary/8 p-2 text-primary">
                        <stat.icon className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Revenue trend</p>
                  <p className="font-display text-sm font-semibold">Last 7 days</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  View analytics
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="flex h-36 items-end gap-2">
                {[38, 52, 44, 61, 55, 72, 68].map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-sm bg-primary/15"
                    style={{ height: `${height}%` }}
                  >
                    <div
                      className="w-full rounded-sm bg-primary/75"
                      style={{ height: `${Math.max(height - 12, 28)}%`, marginTop: "auto" }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                Inventory, billing, and analytics stay in sync automatically.
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
