import { cn } from "@/lib/utils";
import type { Invoice } from "@/lib/api";

const styles = {
  paid: "bg-accent-brand/15 text-accent-brand",
  pending: "bg-warning/20 text-warning",
  partial: "bg-primary/15 text-primary",
  overdue: "bg-destructive/15 text-destructive",
  sent: "bg-accent/30 text-accent-foreground",
};

export function PaymentStatusBadge({ status }: { status: Invoice["status"] }) {
  const label = status === "partial" ? "Partial" : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={cn("text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full", styles[status])}
    >
      {label}
    </span>
  );
}
