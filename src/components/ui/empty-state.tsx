import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  iconClassName?: string;
  children?: ReactNode;
}

function EmptyStateBase({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  iconClassName,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-border/70 bg-card/70 px-6 py-10 text-center shadow-sm",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary shadow-inner">
          <Icon className={cn("h-6 w-6", iconClassName)} />
        </div>
      ) : null}
      {title ? <h3 className="text-lg font-semibold tracking-tight">{title}</h3> : null}
      {description ? <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {children ? <div className="mt-4 flex w-full flex-col items-center gap-3">{children}</div> : null}
      {actionLabel && onAction ? (
        <Button className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

function EmptyStateIcon({ className, icon: Icon }: { className?: string; icon?: LucideIcon }) {
  return (
    <div className={cn("grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary shadow-inner", className)}>
      <Icon className="h-6 w-6" />
    </div>
  );
}

function EmptyStateTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-lg font-semibold tracking-tight">{children}</h3>;
}

function EmptyStateDescription({ children }: { children: ReactNode }) {
  return <p className="max-w-md text-sm text-muted-foreground">{children}</p>;
}

export const EmptyState = Object.assign(EmptyStateBase, {
  Icon: EmptyStateIcon,
  Title: EmptyStateTitle,
  Description: EmptyStateDescription,
});
