import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PageSection } from "@/components/dashboard/PageSection";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Truck,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  Award,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ListPlus,
  UserPlus,
  ArrowRight,
  Sparkles,
  Copy,
} from "lucide-react";
import {
  getPurchaseOrders,
  createPurchaseOrders,
  updatePurchaseOrder,
  receiveGoods,
  getLowStockAssistant,
  getSuppliers,
  getProducts,
  getAnalytics,
  type PurchaseOrder,
  type Supplier,
  type Product,
  type LowStockRecommendation
} from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/purchase-orders")({
  head: () => ({ meta: [{ title: "Purchase Orders — ShopPilot AI" }] }),
  component: PurchaseOrdersPage,
});

function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchProduct, setSearchProduct] = useState("");

  // Assistant modal
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<LowStockRecommendation[]>([]);
  const [selectedRecs, setSelectedRecs] = useState<Record<string, boolean>>({});
  const [recQuantities, setRecQuantities] = useState<Record<string, number>>({});
  const [recSuppliers, setRecSuppliers] = useState<Record<string, string>>({});
  const [recPrices, setRecPrices] = useState<Record<string, number>>({});

  // Create Manual PO modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newPoSupplier, setNewPoSupplier] = useState("");
  const [newPoNotes, setNewPoNotes] = useState("");
  const [newPoDeliveryDate, setNewPoDeliveryDate] = useState("");
  const [newPoItems, setNewPoItems] = useState<Array<{ product: string; quantity: number; purchasePrice: number; remarks: string }>>([]);
  const [submittingPo, setSubmittingPo] = useState(false);

  // Detail & Receive modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receivingQuantities, setReceivingQuantities] = useState<Record<string, number>>({});
  const [receiveInvoiceNumber, setReceiveInvoiceNumber] = useState("");
  const [receiveBatchNumbers, setReceiveBatchNumbers] = useState<Record<string, string>>({});
  const [receiveExpiryDates, setReceiveExpiryDates] = useState<Record<string, string>>({});
  const [submittingReceive, setSubmittingReceive] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pos, sups, prods, stats] = await Promise.all([
        getPurchaseOrders(),
        getSuppliers(),
        getProducts(),
        getAnalytics()
      ]);
      setPurchaseOrders(pos);
      setSuppliers(sups.filter(s => s.isActive));
      setProducts(prods);
      setAnalytics(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Filter purchase orders
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchSup = !filterSupplier || String(po.supplier) === filterSupplier || po.supplierName.includes(filterSupplier);
      const matchStatus = !filterStatus || po.status === filterStatus;
      const matchProd = !searchProduct || po.items.some(
        (item) => item.productName.toLowerCase().includes(searchProduct.toLowerCase()) || (item.sku && item.sku.toLowerCase().includes(searchProduct.toLowerCase()))
      );
      return matchSup && matchStatus && matchProd;
    });
  }, [purchaseOrders, filterSupplier, filterStatus, searchProduct]);

  // Open Low Stock Assistant
  const handleOpenAssistant = async () => {
    setAssistantOpen(true);
    setAssistantLoading(true);
    try {
      const data = await getLowStockAssistant();
      setRecommendations(data);
      
      const selMap: Record<string, boolean> = {};
      const qtyMap: Record<string, number> = {};
      const supMap: Record<string, string> = {};
      const priceMap: Record<string, number> = {};

      data.forEach(r => {
        const key = r.product.id;
        selMap[key] = true;
        qtyMap[key] = r.recommendedQuantity;
        supMap[key] = r.suggestedSupplier?.id || "";
        priceMap[key] = r.purchasePrice;
      });

      setSelectedRecs(selMap);
      setRecQuantities(qtyMap);
      setRecSuppliers(supMap);
      setRecPrices(priceMap);
    } catch (err) {
      toast.error("Failed to load low stock recommendations.");
    } finally {
      setAssistantLoading(false);
    }
  };

  // Generate POs from Assistant
  const handleGenerateFromAssistant = async () => {
    const items = recommendations
      .filter(r => selectedRecs[r.product.id] && recSuppliers[r.product.id])
      .map(r => ({
        product: r.product.id,
        quantity: Math.max(1, recQuantities[r.product.id]),
        purchasePrice: Math.max(0.01, recPrices[r.product.id]),
        supplier: recSuppliers[r.product.id]
      }));

    if (items.length === 0) {
      toast.error("Please select at least one item and supplier to order.");
      return;
    }

    try {
      setAssistantLoading(true);
      const loadingToast = toast.loading("Generating purchase orders...");
      await createPurchaseOrders({ items });
      toast.success("Purchase orders successfully created & split by supplier.", { id: loadingToast });
      setAssistantOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate orders.");
    } finally {
      setAssistantLoading(false);
    }
  };

  // Add Item to manual PO builder
  const handleAddManualItem = () => {
    setNewPoItems(current => [
      ...current,
      { product: "", quantity: 1, purchasePrice: 0.01, remarks: "" }
    ]);
  };

  // Handle manual PO submit
  const handleSaveManualPo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (newPoItems.length === 0) {
      toast.error("Please add at least one line item.");
      return;
    }

    // Validate
    for (const item of newPoItems) {
      if (!item.product) {
        toast.error("Please select a product for all line items.");
        return;
      }
      if (item.quantity <= 0) {
        toast.error("Quantity must be greater than 0.");
        return;
      }
      if (item.purchasePrice <= 0) {
        toast.error("Purchase Price must be greater than 0.");
        return;
      }
    }

    try {
      setSubmittingPo(true);
      const loadingToast = toast.loading("Creating purchase order...");
      
      const payloadItems = newPoItems.map(item => ({
        ...item,
        supplier: newPoSupplier
      }));

      await createPurchaseOrders({
        items: payloadItems,
        notes: newPoNotes,
        expectedDeliveryDate: newPoDeliveryDate || undefined
      });

      toast.success("Purchase order created successfully.", { id: loadingToast });
      setCreateOpen(false);
      setNewPoItems([]);
      setNewPoSupplier("");
      setNewPoNotes("");
      setNewPoDeliveryDate("");
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setSubmittingPo(false);
    }
  };

  // Open detailed PO view
  const handleOpenDetail = async (id: string) => {
    setLoading(true);
    try {
      const data = await getPurchaseOrders();
      const match = data.find(o => o.id === id || o._id === id);
      if (match) {
        setSelectedPo(match);
        setDetailOpen(true);
      }
    } catch (err) {
      toast.error("Failed to fetch order details.");
    } finally {
      setLoading(false);
    }
  };

  // Open Receive Goods modal
  const handleOpenReceive = (po: PurchaseOrder) => {
    setSelectedPo(po);
    const qtyMap: Record<string, number> = {};
    const batchMap: Record<string, string> = {};
    const expiryMap: Record<string, string> = {};

    po.items.forEach(item => {
      const key = item.product;
      qtyMap[key] = item.quantity - item.receivedQuantity;
      batchMap[key] = item.batchNumber || "";
      expiryMap[key] = item.expiryDate ? item.expiryDate.split("T")[0] : "";
    });

    setReceivingQuantities(qtyMap);
    setReceiveBatchNumbers(batchMap);
    setReceiveExpiryDates(expiryMap);
    setReceiveInvoiceNumber("");
    setReceiveOpen(true);
  };

  // Submit Goods Receipt
  const handleReceiveGoods = async () => {
    if (!selectedPo) return;

    const rItems = selectedPo.items.map(item => {
      const key = item.product;
      return {
        product: key,
        receivedQuantity: Number(receivingQuantities[key] || 0),
        batchNumber: receiveBatchNumbers[key] || "",
        expiryDate: receiveExpiryDates[key] ? new Date(receiveExpiryDates[key]).toISOString() : undefined
      };
    });

    try {
      setSubmittingReceive(true);
      const loadingToast = toast.loading("Processing goods receipt...");
      await receiveGoods(selectedPo.id || selectedPo._id || "", {
        receivedItems: rItems,
        invoiceNumber: receiveInvoiceNumber || undefined
      });
      toast.success("Goods received. Stock levels and product cost prices updated successfully.", { id: loadingToast });
      setReceiveOpen(false);
      setDetailOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Goods receipt processing failed.");
    } finally {
      setSubmittingReceive(false);
    }
  };

  // Duplicate PO
  const handleDuplicatePo = async (po: PurchaseOrder) => {
    try {
      const loadingToast = toast.loading("Duplicating purchase order...");
      const items = po.items.map(item => ({
        product: item.product,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        supplier: typeof po.supplier === "string" ? po.supplier : (po.supplier?.id || po.supplier?._id)
      }));

      await createPurchaseOrders({
        items,
        notes: po.notes || `Duplicate of ${po.purchaseOrderNumber}`
      });

      toast.success("Purchase order duplicated successfully.", { id: loadingToast });
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Duplication failed");
    }
  };

  // Update Status directly
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updatePurchaseOrder(id, { status: newStatus as any });
      toast.success(`Order status updated to ${newStatus}.`);
      await loadData();
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  const dashboardStats = analytics?.purchaseDashboard || {
    pendingPurchaseOrders: 0,
    ordersAwaitingDelivery: 0,
    totalPurchaseValue: 0,
    thisMonthPurchases: 0,
    topSuppliers: []
  };

  return (
    <DashboardLayout title="Purchase Orders">
      <div className="space-y-6">
        {/* Dashboard Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Pending Orders"
            value={loading ? "…" : dashboardStats.pendingPurchaseOrders}
            icon={Clock}
            accent="warning"
          />
          <StatCard
            label="Awaiting Delivery"
            value={loading ? "…" : dashboardStats.ordersAwaitingDelivery}
            icon={Truck}
            accent="primary"
          />
          <StatCard
            label="This Month Purchase"
            value={loading ? "…" : formatCurrency(dashboardStats.thisMonthPurchases)}
            icon={TrendingUp}
            accent="emerald"
          />
          <StatCard
            label="Total Purchase Value"
            value={loading ? "…" : formatCurrency(dashboardStats.totalPurchaseValue)}
            icon={DollarSign}
            accent="primary"
          />
        </div>

        {/* Action triggers */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleOpenAssistant} className="gradient-primary text-primary-foreground">
            <Sparkles className="h-4 w-4 mr-1.5" /> Low Stock Assistant
          </Button>
          <Button variant="outline" onClick={() => {
            setNewPoItems([{ product: "", quantity: 1, purchasePrice: 0.01, remarks: "" }]);
            setCreateOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-1" /> Add Purchase Order
          </Button>
        </div>

        {/* Filter panel */}
        <PageSection title="Purchase Orders History" description="Manage, track, and filter current supply requests">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <Label className="mb-1 block text-xs">Filter by Supplier</Label>
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="w-full bg-background border border-border px-3 py-1.5 rounded text-sm outline-none"
              >
                <option value="">All Suppliers</option>
                {suppliers.map(s => (
                  <option key={s.id || s._id} value={s.id || s._id}>{s.supplierName}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Filter by Status</Label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-background border border-border px-3 py-1.5 rounded text-sm outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Partially Received">Partially Received</option>
                <option value="Received">Received</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Filter by Product Name/SKU</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Enter name or SKU..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Syncing records…</div>
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No Purchase Orders found"
              description="Create a manual PO or use the Low Stock Assistant."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold">PO Number</th>
                    <th className="text-left px-5 py-3 font-semibold">Supplier</th>
                    <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Date</th>
                    <th className="text-right px-5 py-3 font-semibold">Amount</th>
                    <th className="text-center px-5 py-3 font-semibold">Status</th>
                    <th className="text-right px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => {
                    const id = o.id || o._id || "";
                    return (
                      <tr key={id} className="border-t border-border hover:bg-secondary/40 transition">
                        <td className="px-5 py-4 font-mono font-medium">{o.purchaseOrderNumber}</td>
                        <td className="px-5 py-4">{o.supplierName}</td>
                        <td className="px-5 py-4 text-muted-foreground hidden md:table-cell">
                          {o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold">{formatCurrency(o.totalAmount)}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            o.status === "Received" ? "bg-emerald-500/10 text-emerald-500" :
                            o.status === "Partially Received" ? "bg-cyan-500/10 text-cyan-500" :
                            o.status === "Confirmed" ? "bg-blue-500/10 text-blue-500" :
                            o.status === "Sent" ? "bg-purple-500/10 text-purple-500" :
                            o.status === "Cancelled" ? "bg-destructive/10 text-destructive" :
                            "bg-secondary text-muted-foreground"
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleOpenDetail(id)}>
                              View
                            </Button>
                            <Button size="sm" variant="ghost" title="Duplicate Order" onClick={() => handleDuplicatePo(o)} className="h-8 w-8 p-0 text-muted-foreground">
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PageSection>

        {/* Low Stock Purchase Assistant Modal */}
        <Dialog open={assistantOpen} onOpenChange={setAssistantOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Low Stock Purchase Assistant
              </DialogTitle>
              <DialogDescription>
                Detects low stock products and suggests optimal ordering quantities. Split automatically by supplier.
              </DialogDescription>
            </DialogHeader>

            {assistantLoading ? (
              <div className="py-8 text-center text-muted-foreground">Running replenishment algorithms…</div>
            ) : recommendations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3 opacity-60" />
                <p className="font-semibold text-foreground">Stock healthy!</p>
                <p className="text-sm">No products are currently below their minimum stock threshold.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-x-auto max-h-96">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-secondary/40 text-muted-foreground uppercase font-semibold">
                      <tr>
                        <th className="p-3 w-8">✓</th>
                        <th className="p-3">Product (Stock/Min)</th>
                        <th className="p-3">Supplier Suggested</th>
                        <th className="p-3 w-28">Order Qty</th>
                        <th className="p-3 w-24">Unit Cost (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommendations.map(r => {
                        const key = r.product.id;
                        return (
                          <tr key={key} className="border-t hover:bg-secondary/20">
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={Boolean(selectedRecs[key])}
                                onChange={(e) => setSelectedRecs(curr => ({ ...curr, [key]: e.target.checked }))}
                              />
                            </td>
                            <td className="p-3">
                              <div className="font-semibold">{r.product.name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                SKU: {r.product.sku} · Stock: <span className="font-medium text-destructive">{r.product.stock}</span> / Min: {r.product.minStock}
                              </div>
                            </td>
                            <td className="p-3">
                              <select
                                value={recSuppliers[key] || ""}
                                onChange={(e) => setRecSuppliers(curr => ({ ...curr, [key]: e.target.value }))}
                                className="bg-background border border-border px-2 py-1 rounded text-xs outline-none"
                              >
                                <option value="">Select Supplier</option>
                                {suppliers.map(s => (
                                  <option key={s.id || s._id} value={s.id || s._id}>{s.supplierName}</option>
                                ))}
                              </select>
                              {r.suggestedSupplier && recSuppliers[key] === r.suggestedSupplier.id && (
                                <div className="text-[9px] text-emerald-500 mt-0.5">
                                  Suggested ({r.suggestionSource})
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                min={1}
                                value={recQuantities[key] || 1}
                                onChange={(e) => setRecQuantities(curr => ({ ...curr, [key]: Math.max(1, Number(e.target.value) || 1) }))}
                                className="h-7 text-xs px-2"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                step="any"
                                min={0.01}
                                value={recPrices[key] || 0.01}
                                onChange={(e) => setRecPrices(curr => ({ ...curr, [key]: Math.max(0.01, Number(e.target.value) || 0.01) }))}
                                className="h-7 text-xs px-2"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setAssistantOpen(false)}>Close</Button>
                  <Button onClick={handleGenerateFromAssistant} className="gradient-primary text-primary-foreground">
                    Generate Purchase Orders
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Manual PO Modal */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <DialogDescription>Draft a manual purchase order requests to a supplier.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveManualPo} className="space-y-4">
              <div>
                <Label className="mb-1 block">Supplier *</Label>
                <select
                  value={newPoSupplier}
                  onChange={(e) => setNewPoSupplier(e.target.value)}
                  className="w-full bg-background border border-border px-3 py-1.5 rounded text-sm outline-none"
                  required
                >
                  <option value="">Select Vendor Partner</option>
                  {suppliers.map(s => (
                    <option key={s.id || s._id} value={s.id || s._id}>{s.supplierName}</option>
                  ))}
                </select>
              </div>

              <div className="border rounded-lg p-3 space-y-2 bg-secondary/15">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Order Items</h4>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddManualItem}>
                    <Plus className="h-3 w-3 mr-1" /> Add Product
                  </Button>
                </div>

                {newPoItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No products added. Click Add Product to start.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {newPoItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 bg-background p-2 rounded border items-center">
                        <div className="col-span-4">
                          <Label className="text-[10px] text-muted-foreground block mb-0.5">Product</Label>
                          <select
                            value={item.product}
                            onChange={(e) => {
                              const prodId = e.target.value;
                              const match = products.find(p => p.id === prodId || p._id === prodId);
                              setNewPoItems(current => {
                                const copy = [...current];
                                copy[idx].product = prodId;
                                if (match) {
                                  copy[idx].purchasePrice = match.costPrice || parseFloat((match.price * 0.7).toFixed(2));
                                }
                                return copy;
                              });
                            }}
                            className="w-full bg-background border border-border px-2 py-1 rounded text-xs outline-none"
                            required
                          >
                            <option value="">Select Product</option>
                            {products.map(p => (
                              <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px] text-muted-foreground block mb-0.5">Qty</Label>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => setNewPoItems(current => {
                              const copy = [...current];
                              copy[idx].quantity = Math.max(1, Number(e.target.value) || 1);
                              return copy;
                            })}
                            className="h-7 text-xs px-2"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px] text-muted-foreground block mb-0.5">Price (₹)</Label>
                          <Input
                            type="number"
                            step="any"
                            min={0.01}
                            value={item.purchasePrice}
                            onChange={(e) => setNewPoItems(current => {
                              const copy = [...current];
                              copy[idx].purchasePrice = Math.max(0.01, Number(e.target.value) || 0.01);
                              return copy;
                            })}
                            className="h-7 text-xs px-2"
                          />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-[10px] text-muted-foreground block mb-0.5">Remarks</Label>
                          <Input
                            placeholder="Optional remark"
                            value={item.remarks}
                            onChange={(e) => setNewPoItems(current => {
                              const copy = [...current];
                              copy[idx].remarks = e.target.value;
                              return copy;
                            })}
                            className="h-7 text-xs px-2"
                          />
                        </div>
                        <div className="col-span-1 text-center mt-4">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setNewPoItems(current => current.filter((_, i) => i !== idx))}
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                          >
                            &times;
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">Expected Delivery Date</Label>
                  <Input
                    type="date"
                    value={newPoDeliveryDate}
                    onChange={(e) => setNewPoDeliveryDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Notes / Terms</Label>
                  <Textarea
                    placeholder="Enter notes about delivery conditions or payment details."
                    value={newPoNotes}
                    onChange={(e) => setNewPoNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" className="gradient-primary text-primary-foreground" disabled={submittingPo || !newPoSupplier}>
                  {submittingPo ? "Creating..." : "Save Purchase Order"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* PO Details Drawer */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            {selectedPo && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between mr-6">
                    <span className="font-mono">{selectedPo.purchaseOrderNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      selectedPo.status === "Received" ? "bg-emerald-500/10 text-emerald-500" :
                      selectedPo.status === "Partially Received" ? "bg-cyan-500/10 text-cyan-500" :
                      selectedPo.status === "Confirmed" ? "bg-blue-500/10 text-blue-500" :
                      selectedPo.status === "Sent" ? "bg-purple-500/10 text-purple-500" :
                      selectedPo.status === "Cancelled" ? "bg-destructive/10 text-destructive" :
                      "bg-secondary text-muted-foreground"
                    }`}>
                      {selectedPo.status}
                    </span>
                  </DialogTitle>
                  <DialogDescription>
                    Placed with {selectedPo.supplierName} on {selectedPo.createdAt ? new Date(selectedPo.createdAt).toLocaleDateString("en-IN") : "—"}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Status update controls & receive trigger */}
                  <div className="flex flex-wrap gap-2 items-center bg-secondary/20 p-3 rounded-lg">
                    <span className="text-xs font-medium text-muted-foreground">Update Status:</span>
                    <Button size="xs" variant="outline" onClick={() => handleUpdateStatus(selectedPo.id || selectedPo._id || "", "Sent")} disabled={selectedPo.status === "Received"}>
                      Mark Sent
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => handleUpdateStatus(selectedPo.id || selectedPo._id || "", "Confirmed")} disabled={selectedPo.status === "Received"}>
                      Confirm PO
                    </Button>
                    <Button size="xs" variant="destructive" onClick={() => handleUpdateStatus(selectedPo.id || selectedPo._id || "", "Cancelled")} disabled={selectedPo.status === "Received"}>
                      Cancel PO
                    </Button>

                    {!["Received", "Cancelled"].includes(selectedPo.status) && (
                      <Button size="xs" className="gradient-primary text-primary-foreground ml-auto" onClick={() => handleOpenReceive(selectedPo)}>
                        Receive Goods
                      </Button>
                    )}
                  </div>

                  {/* General details */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-muted-foreground font-medium uppercase tracking-wider mb-1">Expected Delivery Date</div>
                      <div className="font-semibold">
                        {selectedPo.expectedDeliveryDate ? new Date(selectedPo.expectedDeliveryDate).toLocaleDateString("en-IN") : "No delivery date requested"}
                      </div>
                    </div>
                    {selectedPo.invoiceNumber && (
                      <div>
                        <div className="text-muted-foreground font-medium uppercase tracking-wider mb-1">Supplier Invoice Ref</div>
                        <div className="font-mono font-semibold">{selectedPo.invoiceNumber}</div>
                      </div>
                    )}
                  </div>

                  {/* PO items table */}
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-secondary/40 text-muted-foreground uppercase font-semibold">
                        <tr>
                          <th className="p-3">Product</th>
                          <th className="p-3 text-right">Unit Price</th>
                          <th className="p-3 text-right">Ordered Qty</th>
                          <th className="p-3 text-right">Received Qty</th>
                          <th className="p-3 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPo.items.map((item, idx) => (
                          <tr key={idx} className="border-t hover:bg-secondary/20">
                            <td className="p-3">
                              <div className="font-medium">{item.productName}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                SKU: {item.sku} {item.remarks ? `· (${item.remarks})` : ""}
                              </div>
                            </td>
                            <td className="p-3 text-right">{formatCurrency(item.purchasePrice)}</td>
                            <td className="p-3 text-right">{item.quantity} {item.unit || "units"}</td>
                            <td className="p-3 text-right font-medium text-emerald-600">{item.receivedQuantity}</td>
                            <td className="p-3 text-right font-semibold">
                              {formatCurrency(item.quantity * item.purchasePrice)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t bg-secondary/15 font-semibold text-sm">
                          <td colSpan={4} className="p-3 text-right uppercase tracking-wider text-xs">Total Amount</td>
                          <td className="p-3 text-right">{formatCurrency(selectedPo.totalAmount)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {selectedPo.notes && (
                    <div className="bg-secondary/25 p-3 rounded-lg text-xs space-y-1">
                      <div className="font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Notes & Terms</div>
                      <p className="text-foreground">{selectedPo.notes}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Receive Goods modal */}
        <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Receive Goods Intake</DialogTitle>
              <DialogDescription>
                Record inventory delivery details. Receives items directly into stock ledger.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">Supplier Invoice Number</Label>
                  <Input
                    placeholder="E.g. INV-100234"
                    value={receiveInvoiceNumber}
                    onChange={(e) => setReceiveInvoiceNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="border rounded-lg overflow-x-auto max-h-80">
                <table className="w-full text-xs text-left">
                  <thead className="bg-secondary/40 text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3 w-28 text-right">Ordered / Rec'd</th>
                      <th className="p-3 w-28">Received Now</th>
                      <th className="p-3 w-28">Batch No.</th>
                      <th className="p-3 w-32">Expiry Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPo?.items.map(item => {
                      const key = item.product;
                      return (
                        <tr key={key} className="border-t hover:bg-secondary/20">
                          <td className="p-3">
                            <div className="font-semibold">{item.productName}</div>
                            <div className="text-[10px] text-muted-foreground">SKU: {item.sku}</div>
                          </td>
                          <td className="p-3 text-right font-medium">
                            {item.quantity} / {item.receivedQuantity}
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min={0}
                              max={item.quantity - item.receivedQuantity}
                              value={receivingQuantities[key] || 0}
                              onChange={(e) => setReceivingQuantities(curr => ({
                                ...curr,
                                [key]: Math.min(
                                  item.quantity - item.receivedQuantity,
                                  Math.max(0, Number(e.target.value) || 0)
                                )
                              }))}
                              className="h-7 text-xs px-2"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              placeholder="Batch"
                              value={receiveBatchNumbers[key] || ""}
                              onChange={(e) => setReceiveBatchNumbers(curr => ({ ...curr, [key]: e.target.value }))}
                              className="h-7 text-xs px-2"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="date"
                              value={receiveExpiryDates[key] || ""}
                              onChange={(e) => setReceiveExpiryDates(curr => ({ ...curr, [key]: e.target.value }))}
                              className="h-7 text-xs px-2"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setReceiveOpen(false)}>Cancel</Button>
                <Button onClick={handleReceiveGoods} className="gradient-primary text-primary-foreground" disabled={submittingReceive}>
                  {submittingReceive ? "Processing..." : "Complete Intake"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
