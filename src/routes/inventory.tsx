import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Pencil, Plus, Trash2, Search, AlertTriangle, Boxes, TrendingUp, Calendar, Barcode, Filter } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createProduct, deleteProduct, getProducts, getSettings, type Product, updateProduct } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { Toaster } from "@/components/ui/sonner";
import { getExpiryStatus, formatExpiryDate } from "@/lib/inventory";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory — ShopPilot AI" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [expiryFilter, setExpiryFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", sku: "", category: "", stock: "", price: "", barcode: "", expiryDate: "" });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, settings] = await Promise.all([getProducts(), getSettings()]);
      setItems(data);
      setLowStockThreshold(settings.lowStockThreshold);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!active) return;
      await loadProducts();
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => ["All", ...Array.from(new Set(items.map((item) => item.category)))], [items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchesSearch =
        i.name.toLowerCase().includes(q.toLowerCase()) ||
        i.sku.toLowerCase().includes(q.toLowerCase()) ||
        (i.barcode && i.barcode.toLowerCase().includes(q.toLowerCase()));
      const matchesCategory = category === "All" || i.category === category;
      
      // Expiry filter
      const expiryStatus = getExpiryStatus(i.expiryDate);
      let matchesExpiry = true;
      if (expiryFilter === "expired") matchesExpiry = expiryStatus === "expired";
      else if (expiryFilter === "critical") matchesExpiry = expiryStatus === "critical";
      else if (expiryFilter === "warning") matchesExpiry = expiryStatus === "warning";
      
      // Stock filter
      let matchesStock = true;
      if (stockFilter === "low") matchesStock = i.stock <= lowStockThreshold;
      else if (stockFilter === "out") matchesStock = i.stock === 0;
      else if (stockFilter === "high") matchesStock = i.stock > lowStockThreshold * 5;
      
      return matchesSearch && matchesCategory && matchesExpiry && matchesStock;
    });
  }, [items, q, category, expiryFilter, stockFilter, lowStockThreshold]);

  const low = items.filter((i) => i.stock <= lowStockThreshold).length;

  const bestSeller = useMemo(
    () => [...items].sort((a, b) => b.sold - a.sold)[0],
    [items],
  );

  const resetForm = () => {
    setForm({ name: "", sku: "", category: "", stock: "", price: "" });
    setEditingProductId(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProductId(product.id);
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      stock: String(product.stock),
      price: String(product.price),
      barcode: product.barcode || "",
      expiryDate: product.expiryDate ? product.expiryDate.split('T')[0] : "",
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      setDeleting(true);
      setError(null);
      const loadingToast = toast.loading("Deleting product...");
      await deleteProduct(productToDelete.id);
      await loadProducts();
      toast.success("Product deleted successfully.", { id: loadingToast });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete product";
      setError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name || !form.sku || !form.category || form.stock === "" || form.price === "") {
      setError("Please complete all required product fields.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const loadingToast = toast.loading(editingProductId ? "Updating product..." : "Creating product...");
      
      const productData: any = {
        name: form.name,
        sku: form.sku,
        category: form.category,
        stock: Number(form.stock),
        price: Number(form.price),
      };
      
      if (form.barcode) productData.barcode = form.barcode;
      if (form.expiryDate) productData.expiryDate = new Date(form.expiryDate).toISOString();
      
      if (editingProductId) {
        await updateProduct(editingProductId, productData);
        await loadProducts();
        toast.success("Product updated successfully.", { id: loadingToast });
      } else {
        await createProduct({
          ...productData,
          sold: 0,
        });
        await loadProducts();
        toast.success("Product created successfully.", { id: loadingToast });
      }
      resetForm();
      setDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : editingProductId ? "Unable to update product" : "Unable to create product";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Inventory">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Products" value={String(items.length)} icon={Boxes} accent="primary" />
          <StatCard label="Low Stock" value={String(low)} icon={AlertTriangle} accent="destructive" />
          <StatCard label="Out of Stock" value={String(items.filter((i) => i.stock === 0).length)} icon={Package} accent="warning" />
          <StatCard label="Expiring Soon" value={String(items.filter((i) => {
            const status = getExpiryStatus(i.expiryDate);
            return status === "critical" || status === "expired";
          }).length)} icon={Calendar} accent="destructive" />
          <StatCard label="Best Seller" value={bestSeller?.sold ? bestSeller.name : "No sales"} icon={TrendingUp} accent="emerald" />
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
                <Input placeholder="Search products, SKU, or barcode" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
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
              <Select value={expiryFilter} onValueChange={setExpiryFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Expiry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Expiry</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="critical">Expiring Soon (7d)</SelectItem>
                  <SelectItem value="warning">Expiring (30d)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                  <SelectItem value="high">High Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                if (!open) {
                  resetForm();
                }
                setDialogOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary text-primary-foreground shrink-0">
                    <Plus className="h-4 w-4 mr-1" /> Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingProductId ? "Edit Product" : "Add New Product"}</DialogTitle></DialogHeader>
                  <form className="space-y-4" onSubmit={handleSaveProduct}>
                    <div><Label className="mb-2 block">Name</Label><Input placeholder="Product name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="mb-2 block">SKU</Label><Input placeholder="AUTO-001" value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} /></div>
                      <div><Label className="mb-2 block">Category</Label><Input placeholder="Grocery" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="mb-2 block">Stock</Label><Input type="number" placeholder="0" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} /></div>
                      <div><Label className="mb-2 block">Price</Label><Input type="number" placeholder="0.00" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="mb-2 block">Barcode (Optional)</Label><Input placeholder="1234567890123" value={form.barcode} onChange={(event) => setForm((current) => ({ ...current, barcode: event.target.value }))} /></div>
                      <div><Label className="mb-2 block">Expiry Date (Optional)</Label><Input type="date" value={form.expiryDate} onChange={(event) => setForm((current) => ({ ...current, expiryDate: event.target.value }))} /></div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="gradient-primary text-primary-foreground" disabled={submitting}>{submitting ? (editingProductId ? "Saving..." : "Adding...") : editingProductId ? "Save Changes" : "Add Product"}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {loading ? <div className="p-6 text-sm text-muted-foreground">Loading inventory…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Product</th>
                  <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">SKU</th>
                  <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Category</th>
                  <th className="text-left px-5 py-3 font-semibold hidden lg:table-cell">Barcode</th>
                  <th className="text-left px-5 py-3 font-semibold hidden lg:table-cell">Expiry</th>
                  <th className="text-right px-5 py-3 font-semibold">Stock</th>
                  <th className="text-right px-5 py-3 font-semibold">Price</th>
                  <th className="text-right px-5 py-3 font-semibold hidden lg:table-cell">Sold</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => {
                  const expiryStatus = getExpiryStatus(i.expiryDate);
                  return (
                    <tr key={i.sku} className="border-t border-border hover:bg-secondary/40 transition">
                      <td className="px-5 py-4 font-medium">{i.name}</td>
                      <td className="px-5 py-4 text-muted-foreground font-mono text-xs hidden sm:table-cell">{i.sku}</td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">{i.category}</span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground font-mono text-xs hidden lg:table-cell">
                        {i.barcode || "—"}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        {i.expiryDate ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs">{formatExpiryDate(i.expiryDate)}</span>
                            {expiryStatus === "expired" && (
                              <span className="w-fit px-2 py-0.5 rounded-md text-xs font-medium border bg-red-100 text-red-700 border-red-200">
                                Expired
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className={cn(
                        "px-5 py-4 text-right font-semibold",
                        i.stock === 0 && "text-destructive",
                        i.stock > 0 && i.stock <= lowStockThreshold && "text-destructive"
                      )}>
                        {i.stock === 0 ? (
                          <StatusBadge status="overdue" label="Out of stock" />
                        ) : i.stock <= lowStockThreshold ? (
                          <span>{i.stock} · <StatusBadge status="pending" label="Low" /></span>
                        ) : (
                          i.stock
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">{formatCurrency(i.price)}</td>
                      <td className="px-5 py-4 text-right text-muted-foreground hidden lg:table-cell">{i.sold}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(i)} className="h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(i)} className="h-8 px-3">
                            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-muted-foreground">
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
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete {productToDelete?.name ?? "this product"}? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster position="top-right" />
    </DashboardLayout>
  );
}
