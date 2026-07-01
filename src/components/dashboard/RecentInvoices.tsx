import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/lib/mock-data";

const statusStyles = {
  paid: "bg-accent-brand/10 text-accent-brand",
  pending: "bg-warning/15 text-warning",
  overdue: "bg-destructive/10 text-destructive",
};

export function RecentInvoices({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="space-y-2">
      {invoices.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 transition"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium font-mono">{inv.id}</span>
              <span className={cn("text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full", statusStyles[inv.status])}>
                {inv.status}
              </span>
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {inv.customer} · {inv.items} items · {inv.date}
            </div>
          </div>
          <div className="font-semibold text-sm shrink-0">${inv.amount.toFixed(2)}</div>
        </div>
      ))}
      <Link to="/billing">
        <Button variant="ghost" size="sm" className="w-full mt-2 text-muted-foreground">
          View all invoices <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </Link>
    </div>
  );
}
