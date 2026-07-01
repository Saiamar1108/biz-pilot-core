import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Receipt,
  Package,
  Bot,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  Search,
  Bell,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/billing", label: "Billing", icon: Receipt },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/assistant", label: "AI Assistant", icon: Bot },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function DashboardLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-6 h-16 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary shadow-glow">
                <Zap className="h-5 w-5 text-primary-foreground" fill="currentColor" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight">ShopPilot</span>
            </Link>
            <button className="lg:hidden" onClick={() => setMobileOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    active
                      ? "gradient-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-sidebar-border">
            <div className="glass-card rounded-xl p-4 bg-linear-to-br from-primary/10 to-accent-brand/10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold">Pro Plan</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Unlock advanced AI features</p>
              <Button size="sm" className="w-full gradient-primary text-primary-foreground">
                Upgrade
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between h-full px-4 md:px-8 gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 md:hidden">
                <h1 className="font-display text-lg font-bold truncate">{title ?? "Dashboard"}</h1>
              </div>
              <div className="hidden md:block min-w-0">
                <h1 className="font-display text-xl font-bold truncate">{title ?? "Dashboard"}</h1>
              </div>
              <div className="hidden lg:flex items-center relative ml-6 max-w-md flex-1">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search anything..." className="pl-9 bg-secondary/60 border-transparent" />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 grid place-items-center text-[10px] bg-destructive text-destructive-foreground">3</Badge>
              </Button>
              <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                <AvatarFallback className="gradient-primary text-primary-foreground font-semibold text-sm">SA</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>

      {/* Floating AI button */}
      <Link
        to="/assistant"
        className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-2xl gradient-primary shadow-glow grid place-items-center hover:scale-110 transition-transform group"
      >
        <Bot className="h-6 w-6 text-primary-foreground group-hover:animate-pulse" />
        <span className="absolute inset-0 rounded-2xl bg-primary/30 animate-ping opacity-30" />
      </Link>
    </div>
  );
}
