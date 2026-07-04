import { forwardRef, type ComponentProps } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthFormFieldProps = ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: string;
};

export const AuthFormField = forwardRef<HTMLInputElement, AuthFormFieldProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const fieldId = id || props.name;

    return (
      <div className="space-y-2">
        <Label htmlFor={fieldId} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error)}
          className={cn(
            "flex h-11 w-full rounded-lg border bg-background px-3.5 text-sm shadow-sm transition-all",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50",
            error
              ? "border-destructive/70 focus-visible:border-destructive focus-visible:ring-destructive/15"
              : "border-border/80 hover:border-border",
            className,
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    );
  },
);

AuthFormField.displayName = "AuthFormField";
