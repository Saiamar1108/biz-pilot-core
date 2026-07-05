import { cn } from "@/lib/utils";

const variants = {
  paid: "bg-accent-brand/10 text-accent-brand",
  pending: "bg-warning/15 text-warning",
  overdue: "bg-destructive/10 text-destructive",
  completed: "bg-accent-brand/10 text-accent-brand",
  processing: "bg-primary/10 text-primary",
  cancelled: "bg-muted text-muted-foreground",
  vip: "bg-accent-brand/10 text-accent-brand",
  new: "bg-primary/10 text-primary",
  regular: "bg-secondary text-muted-foreground",
};

export function StatusBadge({ status, label }: { status: keyof typeof variants; label?: string }) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full",
        variants[status],
      )}
    >
      {label ?? status}
    </span>
  );
}
