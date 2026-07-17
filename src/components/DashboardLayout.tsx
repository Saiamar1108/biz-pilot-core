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
  Sun,
  Moon,
  Plus,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  clearNotifications,
  getNotifications,
  markNotificationRead,
  type NotificationItem,
  getInvoices,
  getProducts,
  getSettings,
  type AnalyticsSummary,
  type Invoice,
  type Product,
} from "@/lib/api";
import { DATA_REFRESH_EVENT } from "@/lib/live-refresh";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/billing", label: "Billing", icon: Receipt },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/assistant", label: "AI Assistant", icon: Bot },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function DashboardLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, shop, logout } = useAuth();
  const { toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [todaySummary, setTodaySummary] = useState({
    sales: 0,
    invoices: 0,
    pending: 0,
    lowStock: 0,
  });

  const unreadLabel = useMemo(
    () => (unreadCount > 99 ? "99+" : String(unreadCount)),
    [unreadCount],
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [notifData, invoiceData, productData, settings] = await Promise.all([
          getNotifications(),
          getInvoices(),
          getProducts(),
          getSettings(),
        ]);

        if (!active) return;

        setNotifications(notifData.notifications);
        setUnreadCount(notifData.unreadCount);

        // Calculate today's summary
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayInvoices = invoiceData.filter((inv) => {
          const invDate = new Date(inv.createdAt);
          return invDate >= today && invDate < tomorrow;
        });

        const sales = todayInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
        const pendingInvoices = invoiceData.filter(
          (inv) => inv.status === "pending" || inv.status === "partial",
        ).length;
        const threshold = settings.lowStockThreshold ?? 10;
        const lowStock = productData.filter((p) => p.stock <= threshold).length;

        setTodaySummary({
          sales,
          invoices: todayInvoices.length,
          pending: pendingInvoices,
          lowStock,
        });
      } catch {
        // keep resilient even if data fails
      } finally {
        if (active) setLoadingSummary(false);
      }
    };

    void load();
    const refreshHandler = () => void load();
    window.addEventListener(DATA_REFRESH_EVENT, refreshHandler);
    return () => {
      active = false;
      window.removeEventListener(DATA_REFRESH_EVENT, refreshHandler);
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
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-68 shrink-0 border-r border-border bg-gradient-to-br from-sidebar to-sidebar/80 backdrop-blur-md transition-transform duration-500 ease-out shadow-lg",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-6 h-18 border-b border-border/50">
            <Link to="/" className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl gradient-primary shadow-glow transition-transform duration-300 hover:scale-105">
                <Zap className="h-5.5 w-5.5 text-primary-foreground" fill="currentColor" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight">ShopPilot AI</span>
            </Link>
            <button className="lg:hidden" onClick={() => setMobileOpen(false)}>
              <X className="h-5.5 w-5.5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-2">
            {navItems.map((item) => {
              const active =
                pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  id={`tour-nav-${item.to.replace("/", "")}`}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden",
                    active
                      ? "text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {active && <div className="absolute inset-0 gradient-primary opacity-100" />}
                  {!active && (
                    <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/50 transition-colors duration-300" />
                  )}
                  <item.icon className="h-5 w-5 shrink-0 relative z-10" />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-5 border-t border-border/50 bg-sidebar/90 space-y-3">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground truncate">
                {shop?.name || "ShopPilot Store"}
              </div>
              <div className="text-sm font-medium truncate">{user?.name || "User"}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full transition-all duration-200 hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => {
                void logout().then(() => navigate({ to: "/login" }));
              }}
            >
              <LogOut className="h-4.5 w-4.5 mr-2" /> Logout
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
        {/* Daily Summary Bar */}
        <div className="bg-gradient-to-r from-primary/5 to-accent-brand/5 px-4 md:px-8 py-4 border-b border-border/50">
          <div className="flex flex-wrap gap-4 md:gap-6 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="font-display text-lg font-bold text-foreground">Today's Summary</div>
              <div className="flex gap-4 md:gap-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5 text-accent-brand" />
                  <span className="font-semibold text-accent-brand">
                    {loadingSummary ? "..." : formatCurrency(todaySummary.sales)}
                  </span>
                  <span className="text-muted-foreground text-sm">Sales</span>
                </div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-4.5 w-4.5 text-primary" />
                  <span className="font-semibold text-primary">
                    {loadingSummary ? "..." : todaySummary.invoices}
                  </span>
                  <span className="text-muted-foreground text-sm">Invoices</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-warning" />
                  <span className="font-semibold text-warning">
                    {loadingSummary ? "..." : todaySummary.pending}
                  </span>
                  <span className="text-muted-foreground text-sm">Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4.5 w-4.5 text-destructive" />
                  <span className="font-semibold text-destructive">
                    {loadingSummary ? "..." : todaySummary.lowStock}
                  </span>
                  <span className="text-muted-foreground text-sm">Low Stock</span>
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gradient-primary text-primary-foreground">
                  <Plus className="h-4.5 w-4.5 mr-2" /> Quick Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate({ to: "/billing" })}>
                  <Receipt className="h-4.5 w-4.5 mr-2" /> New Invoice
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/inventory" })}>
                  <ShoppingCart className="h-4.5 w-4.5 mr-2" /> Add Product
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/customers" })}>
                  <Users className="h-4.5 w-4.5 mr-2" /> Add Customer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
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
              <Button variant="outline" size="icon" onClick={toggleTheme} className="relative">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
              <Popover open={notifOpen} onOpenChange={setNotifOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
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
                      <div className="p-4 text-sm text-muted-foreground">
                        <div className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-background/60 px-4 py-6 text-center">
                          <Bell className="mb-3 h-6 w-6 text-muted-foreground" />
                          <div className="font-medium">You&apos;re all caught up.</div>
                          <div className="mt-1 text-xs text-muted-foreground">Notifications will appear here once activity starts.</div>
                        </div>
                      </div>
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
        className="fixed bottom-8 right-8 z-30 h-16 w-16 rounded-2xl gradient-primary shadow-glow grid place-items-center hover:scale-110 transition-all duration-300 group"
      >
        <Bot className="h-7 w-7 text-primary-foreground group-hover:animate-pulse" />
      </Link>
    </div>
  );
}
