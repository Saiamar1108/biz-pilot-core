import { cn } from "@/lib/utils";
import type { Invoice } from "@/lib/api";

const styles = {
  paid: "bg-emerald-500/15 text-emerald-700",
  pending: "bg-yellow-400/20 text-yellow-700",
  partial: "bg-blue-500/15 text-blue-700",
  overdue: "bg-red-500/15 text-red-700",
  sent: "bg-purple-500/15 text-purple-700",
};

export function PaymentStatusBadge({ status }: { status: Invoice["status"] }) {
  const label =
    status === "partial" ? "Partial" : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={cn("text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full", styles[status])}>
      {label}
    </span>
  );
}
