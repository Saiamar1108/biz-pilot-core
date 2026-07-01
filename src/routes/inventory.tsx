import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Package, Plus, Search, AlertTriangle, Boxes, TrendingUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory — ShopPilot AI" }] }),
  component: InventoryPage,
});

const initial = [
  { sku: "GRO-001", name: "Basmati Rice 5kg", category: "Grocery", stock: 3, price: 12.5, sold: 128 },
  { sku: "DAI-014", name: "Almond Milk 1L", category: "Dairy", stock: 42, price: 4.2, sold: 84 },
  { sku: "SNK-091", name: "Dark Chocolate 100g", category: "Snacks", stock: 8, price: 3.8, sold: 210 },
  { sku: "BEV-030", name: "Cold Brew Bottle", category: "Drinks", stock: 65, price: 5.5, sold: 320 },
  { sku: "GRO-018", name: "Organic Eggs (12)", category: "Grocery", stock: 2, price: 6.9, sold: 190 },
  { sku: "HH-224", name: "Dish Soap 500ml", category: "Household", stock: 27, price: 2.9, sold: 62 },
  { sku: "SNK-102", name: "Trail Mix 250g", category: "Snacks", stock: 0, price: 7.4, sold: 55 },
];

function InventoryPage() {
  const [q, setQ] = useState("");
  const [items] = useState(initial);
  const filtered = items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()) || i.sku.toLowerCase().includes(q.toLowerCase()));
  const low = items.filter((i) => i.stock < 10).length;

  return (
    <DashboardLayout title="Inventory">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Products" value={String(items.length)} icon={Boxes} accent="primary" />
          <StatCard label="Low Stock" value={String(low)} change={12} icon={AlertTriangle} accent="destructive" />
          <StatCard label="Out of Stock" value={String(items.filter(i => i.stock === 0).length)} icon={Package} accent="warning" />
          <StatCard label="Best Seller" value="Cold Brew" change={22} icon={TrendingUp} accent="emerald" />
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products or SKU" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Add Product</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add New Product</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label className="mb-2 block">Name</Label><Input placeholder="Product name" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="mb-2 block">SKU</Label><Input placeholder="AUTO-001" /></div>
                    <div><Label className="mb-2 block">Category</Label><Input placeholder="Grocery" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="mb-2 block">Stock</Label><Input type="number" placeholder="0" /></div>
                    <div><Label className="mb-2 block">Price</Label><Input type="number" placeholder="0.00" /></div>
                  </div>
                </div>
                <DialogFooter>
                  <Button className="gradient-primary text-primary-foreground">Add Product</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Product</th>
                  <th className="text-left px-5 py-3 font-semibold">SKU</th>
                  <th className="text-left px-5 py-3 font-semibold">Category</th>
                  <th className="text-right px-5 py-3 font-semibold">Stock</th>
                  <th className="text-right px-5 py-3 font-semibold">Price</th>
                  <th className="text-right px-5 py-3 font-semibold">Sold</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.sku} className="border-t border-border hover:bg-secondary/40 transition">
                    <td className="px-5 py-4 font-medium">{i.name}</td>
                    <td className="px-5 py-4 text-muted-foreground font-mono text-xs">{i.sku}</td>
                    <td className="px-5 py-4"><span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">{i.category}</span></td>
                    <td className={cn(
                      "px-5 py-4 text-right font-semibold",
                      i.stock === 0 && "text-destructive",
                      i.stock > 0 && i.stock < 10 && "text-destructive"
                    )}>
                      {i.stock === 0 ? "Out of stock" : i.stock < 10 ? `${i.stock} · Low` : i.stock}
                    </td>
                    <td className="px-5 py-4 text-right">${i.price.toFixed(2)}</td>
                    <td className="px-5 py-4 text-right text-muted-foreground">{i.sold}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-16 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    No products match your search
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
