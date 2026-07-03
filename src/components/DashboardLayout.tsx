import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Package,
  Bot,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  Zap,
  Bell,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { clearNotifications, getNotifications, markNotificationRead, type NotificationItem } from "@/lib/api";
import { DATA_REFRESH_EVENT } from "@/lib/live-refresh";
import {
  ONBOARDING_CLOSE_NAV_EVENT,
  ONBOARDING_OPEN_NAV_EVENT,
  onboardingTargetIds,
} from "@/lib/onboarding-tour";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/billing", label: "Billing", icon: Receipt },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/assistant", label: "AI Assistant", icon: Bot },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function DashboardLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, shop, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadLabel = useMemo(
    () => (unreadCount > 99 ? "99+" : String(unreadCount)),
    [unreadCount],
  );

  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      try {
        const data = await getNotifications();
        if (!active) return;
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      } catch {
        // keep header resilient even if notifications fail
      }
    };

    void loadNotifications();
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 30000);
    const refreshHandler = () => void loadNotifications();
    window.addEventListener(DATA_REFRESH_EVENT, refreshHandler);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener(DATA_REFRESH_EVENT, refreshHandler);
    };
  }, []);

  useEffect(() => {
    const openNav = () => setMobileOpen(true);
    const closeNav = () => setMobileOpen(false);

    window.addEventListener(ONBOARDING_OPEN_NAV_EVENT, openNav);
    window.addEventListener(ONBOARDING_CLOSE_NAV_EVENT, closeNav);

    return () => {
      window.removeEventListener(ONBOARDING_OPEN_NAV_EVENT, openNav);
      window.removeEventListener(ONBOARDING_CLOSE_NAV_EVENT, closeNav);
    };
  }, []);

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    const data = await getNotifications();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  };

  const markAllRead = async () => {
    await clearNotifications();
    const data = await getNotifications();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  };

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
              <span className="font-display text-lg font-bold tracking-tight">ShopPilot AI</span>
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
                  id={getNavTourTargetId(item.label)}
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

          <div className="p-3 border-t border-sidebar-border space-y-2">
            <div className="text-xs text-muted-foreground truncate">
              {shop?.name || "ShopPilot Store"}
            </div>
            <div className="text-xs font-medium truncate">{user?.name || "User"}</div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                void logout().then(() => navigate({ to: "/login" }));
              }}
            >
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
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
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Popover open={notifOpen} onOpenChange={setNotifOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="relative"
                    id={onboardingTargetIds.notifications}
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 rounded-full bg-destructive text-[10px] text-white min-w-4 h-4 px-1 flex items-center justify-center">
                        {unreadLabel}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <div className="text-sm font-semibold">Notifications</div>
                    <Button size="sm" variant="ghost" onClick={() => void markAllRead()}>
                      <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
                    </Button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground">No notifications yet.</div>
                    ) : (
                      notifications.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className={cn(
                            "w-full text-left px-3 py-2 border-b hover:bg-secondary/50",
                            !item.read && "bg-primary/5",
                          )}
                          onClick={() => void markRead(item.id)}
                        >
                          <div className="text-sm">{item.message}</div>
                          <div className="text-[11px] text-muted-foreground mt-1">
                            {new Date(item.createdAt).toLocaleString("en-IN")}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                <AvatarFallback className="gradient-primary text-primary-foreground font-semibold text-sm">
                  {(user?.name || "SP")
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
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

function getNavTourTargetId(label: string) {
  if (label === "Inventory") return onboardingTargetIds.productsNav;
  if (label === "Customers") return onboardingTargetIds.customersNav;
  if (label === "Invoices") return onboardingTargetIds.invoicesNav;
  if (label === "Analytics") return onboardingTargetIds.analyticsNav;
  if (label === "Settings") return onboardingTargetIds.settingsNav;
  return undefined;
}
