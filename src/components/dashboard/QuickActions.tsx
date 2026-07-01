import { Link } from "@tanstack/react-router";
import { Bot, Package, Receipt, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  { label: "New Invoice", icon: Receipt, to: "/billing", variant: "primary" as const },
  { label: "Add Product", icon: Package, to: "/inventory", variant: "outline" as const },
  { label: "Ask AI", icon: Bot, to: "/assistant", variant: "outline" as const },
  { label: "View Customers", icon: Users, to: "/customers", variant: "outline" as const },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((a) => (
        <Link key={a.label} to={a.to}>
          <Button
            variant={a.variant === "primary" ? "default" : "outline"}
            className={a.variant === "primary" ? "gradient-primary text-primary-foreground shadow-glow" : ""}
          >
            <a.icon className="h-4 w-4 mr-2" />
            {a.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}
