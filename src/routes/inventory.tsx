import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Search, AlertTriangle, Boxes, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { createProduct, getProducts, type Product, updateProduct } from "@/lib/api";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory — ShopPilot AI" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", sku: "", category: "", stock: "", price: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProducts();
        if (!active) return;
        setItems(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load inventory");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => ["All", ...Array.from(new Set(items.map((item) => item.category)))], [items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchesSearch =
        i.name.toLowerCase().includes(q.toLowerCase()) ||
        i.sku.toLowerCase().includes(q.toLowerCase());
      const matchesCategory = category === "All" || i.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [items, q, category]);

  const low = items.filter((i) => i.stock < 10).length;

  const handleAddProduct = async () => {
    if (!form.name || !form.sku || !form.category || form.stock === "" || form.price === "") {
      setError("Please complete all product fields.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const created = await createProduct({
        name: form.name,
        sku: form.sku,
        category: form.category,
        stock: Number(form.stock),
        price: Number(form.price),
        sold: 0,
      });
      setItems((current) => [created, ...current]);
      setForm({ name: "", sku: "", category: "", stock: "", price: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create product");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Inventory">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Products" value={String(items.length)} icon={Boxes} accent="primary" />
          <StatCard label="Low Stock" value={String(low)} change={12} icon={AlertTriangle} accent="destructive" />
          <StatCard label="Out of Stock" value={String(items.filter((i) => i.stock === 0).length)} icon={Package} accent="warning" />
          <StatCard label="Best Seller" value="Cold Brew" change={22} icon={TrendingUp} accent="emerald" />
        </div>

        {low > 0 && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm">
              <span className="font-semibold">{low} products</span> are running low on stock. Review and reorder soon.
            </p>
          </div>
        )}

        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search products or SKU" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground shrink-0">
                  <Plus className="h-4 w-4 mr-1" /> Add Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add New Product</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label className="mb-2 block">Name</Label><Input placeholder="Product name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="mb-2 block">SKU</Label><Input placeholder="AUTO-001" value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} /></div>
                    <div><Label className="mb-2 block">Category</Label><Input placeholder="Grocery" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="mb-2 block">Stock</Label><Input type="number" placeholder="0" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} /></div>
                    <div><Label className="mb-2 block">Price</Label><Input type="number" placeholder="0.00" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} /></div>
                  </div>
                </div>
                <DialogFooter>
                  <Button className="gradient-primary text-primary-foreground" onClick={handleAddProduct} disabled={submitting}>{submitting ? "Adding..." : "Add Product"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? <div className="p-6 text-sm text-muted-foreground">Loading inventory…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Product</th>
                  <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">SKU</th>
                  <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Category</th>
                  <th className="text-right px-5 py-3 font-semibold">Stock</th>
                  <th className="text-right px-5 py-3 font-semibold">Price</th>
                  <th className="text-right px-5 py-3 font-semibold hidden lg:table-cell">Sold</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.sku} className="border-t border-border hover:bg-secondary/40 transition">
                    <td className="px-5 py-4 font-medium">{i.name}</td>
                    <td className="px-5 py-4 text-muted-foreground font-mono text-xs hidden sm:table-cell">{i.sku}</td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">{i.category}</span>
                    </td>
                    <td className={cn(
                      "px-5 py-4 text-right font-semibold",
                      i.stock === 0 && "text-destructive",
                      i.stock > 0 && i.stock < 10 && "text-destructive"
                    )}>
                      {i.stock === 0 ? (
                        <StatusBadge status="overdue" label="Out of stock" />
                      ) : i.stock < 10 ? (
                        <span>{i.stock} · <StatusBadge status="pending" label="Low" /></span>
                      ) : (
                        i.stock
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">${i.price.toFixed(2)}</td>
                    <td className="px-5 py-4 text-right text-muted-foreground hidden lg:table-cell">{i.sold}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      No products match your search
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
