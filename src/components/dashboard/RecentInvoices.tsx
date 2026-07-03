import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Invoice } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { PaymentStatusBadge } from "@/components/billing/PaymentStatusBadge";

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
              <PaymentStatusBadge status={inv.status} />
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {inv.customer} · {inv.items} items · {inv.date}
            </div>
          </div>
          <div className="font-semibold text-sm shrink-0">{formatCurrency(inv.amount)}</div>
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
