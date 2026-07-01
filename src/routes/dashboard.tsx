import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PageSection } from "@/components/dashboard/PageSection";
import { AIInsightsWidget } from "@/components/dashboard/AIInsightsWidget";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentInvoices } from "@/components/dashboard/RecentInvoices";
import { LowStockAlerts } from "@/components/dashboard/LowStockAlerts";
import { DollarSign, ShoppingCart, AlertTriangle, Users, TrendingUp } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { invoices, salesData, getLowStockProducts } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ShopPilot AI" }] }),
  component: DashboardPage,
});

const lowStock = getLowStockProducts();

function DashboardPage() {
  return (
    <DashboardLayout title="Overview">
      <div className="space-y-6">
        <QuickActions />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Revenue" value="$48,290" change={12.4} icon={DollarSign} accent="primary" />
          <StatCard label="Total Orders" value="1,284" change={8.2} icon={ShoppingCart} accent="emerald" />
          <StatCard label="Low Stock Items" value={String(lowStock.length)} change={-3} icon={AlertTriangle} accent="destructive" />
          <StatCard label="Active Customers" value="842" change={5.1} icon={Users} accent="emerald" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <PageSection
            title="Sales Analytics"
            description="Weekly revenue trend"
            action={<Button variant="outline" size="sm">Last 7 days</Button>}
            className="lg:col-span-2"
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.549 0.222 262)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.549 0.222 262)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.012 258)" />
                  <XAxis dataKey="m" stroke="oklch(0.5 0.03 258)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.5 0.03 258)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 258)" }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                  <Area type="monotone" dataKey="v" stroke="oklch(0.549 0.222 262)" strokeWidth={2.5} fill="url(#salesGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </PageSection>

          <AIInsightsWidget />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <PageSection title="Recent Invoices" description="Latest billing activity" className="lg:col-span-2">
            <RecentInvoices invoices={invoices.slice(0, 5)} />
          </PageSection>

          <PageSection title="Low Stock Alerts" description={`${lowStock.length} items need attention`}>
            <LowStockAlerts products={lowStock.slice(0, 5)} />
          </PageSection>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Monthly Growth" value="+18.6%" change={18.6} icon={TrendingUp} accent="primary" />
          <StatCard label="Avg Order Value" value="$68.40" change={4.2} icon={DollarSign} accent="emerald" />
          <StatCard label="Pending Invoices" value="3" icon={AlertTriangle} accent="warning" />
          <StatCard label="Repeat Customers" value="64%" change={2.8} icon={Users} accent="primary" />
        </div>
      </div>
    </DashboardLayout>
  );
}
