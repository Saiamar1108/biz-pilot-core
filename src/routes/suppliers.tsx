import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PageSection } from "@/components/dashboard/PageSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Truck,
  Users,
  Search,
  Mail,
  Phone,
  Plus,
  Pencil,
  MapPin,
  FileText,
  Star,
  ChevronRight,
  TrendingUp,
  Clock,
  MessageSquare,
} from "lucide-react";
import { FormEvent, useEffect, useState, useMemo } from "react";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierHistory,
  type Supplier,
  type PurchaseOrder
} from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — ShopPilot AI" }] }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [form, setForm] = useState({
    supplierName: "",
    contactPerson: "",
    mobileNumber: "",
    whatsAppNumber: "",
    alternateNumber: "",
    email: "",
    gstNumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    notes: "",
    isActive: true,
    preferredSupplier: false
  });

  // Supplier History states
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierStats, setSupplierStats] = useState<any>(null);
  const [supplierOrders, setSupplierOrders] = useState<PurchaseOrder[]>([]);

  const loadSuppliers = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load suppliers");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void loadSuppliers(true);
    const unsubSuppliers = subscribeToCache("suppliers", () => void loadSuppliers(false));
    return () => {
      unsubSuppliers();
    };
  }, []);

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      const text = q.toLowerCase();
      return (
        s.supplierName.toLowerCase().includes(text) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(text)) ||
        s.mobileNumber.includes(text) ||
        (s.email && s.email.toLowerCase().includes(text))
      );
    });
  }, [suppliers, q]);

  const activeCount = suppliers.filter(s => s.isActive).length;
  const preferredCount = suppliers.filter(s => s.preferredSupplier).length;

  const resetForm = () => {
    setForm({
      supplierName: "",
      contactPerson: "",
      mobileNumber: "",
      whatsAppNumber: "",
      alternateNumber: "",
      email: "",
      gstNumber: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      notes: "",
      isActive: true,
      preferredSupplier: false
    });
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingId(s.id || s._id || null);
    setForm({
      supplierName: s.supplierName,
      contactPerson: s.contactPerson || "",
      mobileNumber: s.mobileNumber,
      whatsAppNumber: s.whatsAppNumber || "",
      alternateNumber: s.alternateNumber || "",
      email: s.email || "",
      gstNumber: s.gstNumber || "",
      address: s.address || "",
      city: s.city || "",
      state: s.state || "",
      pincode: s.pincode || "",
      notes: s.notes || "",
      isActive: s.isActive,
      preferredSupplier: s.preferredSupplier
    });
    setDialogOpen(true);
  };

  const handleSaveSupplier = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.supplierName.trim()) {
      toast.error("Supplier Name is required.");
      return;
    }
    if (!form.mobileNumber.trim()) {
      toast.error("Mobile Number is required.");
      return;
    }

    const mobileRegex = /^\+?[0-9\s\-]{7,15}$/;
    if (!mobileRegex.test(form.mobileNumber)) {
      toast.error("Invalid mobile number format.");
      return;
    }

    if (form.whatsAppNumber.trim() && !mobileRegex.test(form.whatsAppNumber)) {
      toast.error("Invalid WhatsApp number format.");
      return;
    }

    try {
      setSubmitting(true);
      const loadingToast = toast.loading(editingId ? "Updating supplier..." : "Creating supplier...");

      if (editingId) {
        await updateSupplier(editingId, form);
        toast.success("Supplier updated successfully.", { id: loadingToast });
      } else {
        await createSupplier(form);
        toast.success("Supplier created successfully.", { id: loadingToast });
      }

      await loadSuppliers();
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier? This will clear default supplier links on products.")) return;
    try {
      const loadingToast = toast.loading("Deleting supplier...");
      await deleteSupplier(id);
      toast.success("Supplier deleted successfully.", { id: loadingToast });
      await loadSuppliers();
      if (selectedSupplier && (selectedSupplier.id === id || selectedSupplier._id === id)) {
        setHistoryOpen(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleOpenHistory = async (s: Supplier) => {
    setSelectedSupplier(s);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await getSupplierHistory(s.id || s._id || "");
      setSupplierStats(data.stats);
      setSupplierOrders(data.orders);
    } catch (err) {
      toast.error("Failed to load supplier statistics");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <DashboardLayout title="Suppliers">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
            <StatCard
              label="Total Suppliers"
              value={loading ? "…" : suppliers.length}
              icon={Truck}
              accent="primary"
            />
            <StatCard
              label="Active Suppliers"
              value={loading ? "…" : activeCount}
              icon={Users}
              accent="emerald"
            />
            <StatCard
              label="Preferred Partners"
              value={loading ? "…" : preferredCount}
              icon={Star}
              accent="warning"
              className="col-span-2 lg:col-span-1"
            />
          </div>
          <Button onClick={handleOpenCreate} className="gradient-primary text-primary-foreground self-start sm:self-center shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Add Supplier
          </Button>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm">
            {error}
          </div>
        )}

        <PageSection
          title="Supplier Directory"
          description="Manage supplier database and transaction performance metrics"
        >
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, contact person, mobile number or email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading supplier records…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No suppliers found"
              description={q ? "Try adjusting your search keywords." : "Begin by registering your first supplier partner."}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold">Supplier</th>
                    <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Contact Person</th>
                    <th className="text-left px-5 py-3 font-semibold">Mobile</th>
                    <th className="text-left px-5 py-3 font-semibold hidden lg:table-cell">GSTIN</th>
                    <th className="text-center px-5 py-3 font-semibold">Status</th>
                    <th className="text-right px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const id = s.id || s._id || "";
                    return (
                      <tr key={id} className="border-t border-border hover:bg-secondary/40 transition">
                        <td className="px-5 py-4 font-medium">
                          <div className="flex items-center gap-2">
                            <span>{s.supplierName}</span>
                            {s.preferredSupplier && (
                              <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground hidden md:table-cell">{s.contactPerson || "—"}</td>
                        <td className="px-5 py-4 font-mono text-xs">{s.mobileNumber}</td>
                        <td className="px-5 py-4 text-muted-foreground font-mono text-xs hidden lg:table-cell">{s.gstNumber || "—"}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
                            {s.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleOpenHistory(s)}>
                              Stats <ChevronRight className="h-3 w-3 ml-0.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(s)} className="h-8 w-8 text-muted-foreground">
                              <Pencil className="h-4 w-4" />
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

        {/* Create/Edit Supplier Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Supplier Partner" : "Register New Supplier"}</DialogTitle>
              <DialogDescription>Input business and contact details for the vendor.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="mb-2 block">Supplier Name *</Label>
                  <Input
                    placeholder="E.g. Laxmi Rice Traders"
                    value={form.supplierName}
                    onChange={(e) => setForm(c => ({ ...c, supplierName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Contact Person</Label>
                  <Input
                    placeholder="E.g. Rajesh Kumar"
                    value={form.contactPerson}
                    onChange={(e) => setForm(c => ({ ...c, contactPerson: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">GST Number</Label>
                  <Input
                    placeholder="E.g. 22AAAAA0000A1Z5"
                    value={form.gstNumber}
                    onChange={(e) => setForm(c => ({ ...c, gstNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Mobile Number *</Label>
                  <Input
                    placeholder="E.g. 9876543210"
                    value={form.mobileNumber}
                    onChange={(e) => setForm(c => ({ ...c, mobileNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">WhatsApp Number</Label>
                  <Input
                    placeholder="E.g. 9876543210"
                    value={form.whatsAppNumber}
                    onChange={(e) => setForm(c => ({ ...c, whatsAppNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Alternate Number</Label>
                  <Input
                    placeholder="E.g. 0674-123456"
                    value={form.alternateNumber}
                    onChange={(e) => setForm(c => ({ ...c, alternateNumber: e.target.value }))}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="mb-2 block">Email Address</Label>
                  <Input
                    type="email"
                    placeholder="E.g. orders@laxmirice.com"
                    value={form.email}
                    onChange={(e) => setForm(c => ({ ...c, email: e.target.value }))}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="mb-2 block">Address</Label>
                  <Input
                    placeholder="Plot 45, Industrial Estate"
                    value={form.address}
                    onChange={(e) => setForm(c => ({ ...c, address: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">City</Label>
                  <Input
                    placeholder="Bhubaneswar"
                    value={form.city}
                    onChange={(e) => setForm(c => ({ ...c, city: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">State</Label>
                  <Input
                    placeholder="Odisha"
                    value={form.state}
                    onChange={(e) => setForm(c => ({ ...c, state: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Pincode</Label>
                  <Input
                    placeholder="751010"
                    value={form.pincode}
                    onChange={(e) => setForm(c => ({ ...c, pincode: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-6 mt-6 col-span-2 border-t pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm(c => ({ ...c, isActive: e.target.checked }))}
                    />
                    <span className="text-sm font-medium">Active Supplier</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.preferredSupplier}
                      onChange={(e) => setForm(c => ({ ...c, preferredSupplier: e.target.checked }))}
                    />
                    <span className="text-sm font-medium flex items-center gap-1 text-warning">
                      <Star className="h-4 w-4 fill-warning" /> Preferred Supplier
                    </span>
                  </label>
                </div>
                <div className="col-span-2">
                  <Label className="mb-2 block">Internal Notes</Label>
                  <Textarea
                    placeholder="Add notes about payment terms, delivery timelines, etc."
                    value={form.notes}
                    onChange={(e) => setForm(c => ({ ...c, notes: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                {editingId ? (
                  <Button type="button" variant="destructive" onClick={() => handleDeleteSupplier(editingId)}>
                    Delete Supplier
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="gradient-primary text-primary-foreground" disabled={submitting}>
                    {submitting ? "Saving..." : editingId ? "Save Changes" : "Register"}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Supplier Profile / History Drawer */}
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Supplier Profile & Analytics</DialogTitle>
              <DialogDescription>
                {selectedSupplier?.supplierName}
              </DialogDescription>
            </DialogHeader>

            {historyLoading ? (
              <div className="py-8 text-center text-muted-foreground">Retrieving vendor metrics…</div>
            ) : (
              <div className="space-y-6">
                {/* Stats cards grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label="Total POs Placed"
                    value={supplierStats?.totalOrders ?? 0}
                    icon={FileText}
                    accent="primary"
                  />
                  <StatCard
                    label="Total Purchased"
                    value={formatCurrency(supplierStats?.totalAmountPurchased ?? 0)}
                    icon={TrendingUp}
                    accent="emerald"
                  />
                  <StatCard
                    label="Outstanding Orders"
                    value={supplierStats?.outstandingOrders ?? 0}
                    icon={Clock}
                    accent="warning"
                  />
                  <StatCard
                    label="Avg. Delivery (Days)"
                    value={supplierStats?.averageDeliveryTime != null ? `${supplierStats.averageDeliveryTime} d` : "—"}
                    icon={Truck}
                    accent="primary"
                  />
                </div>

                {/* Communication Stats cards grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label="WhatsApp Sent"
                    value={supplierStats?.whatsAppSent ?? 0}
                    icon={MessageSquare}
                    accent="emerald"
                  />
                  <StatCard
                    label="Emails Sent"
                    value={supplierStats?.emailSent ?? 0}
                    icon={Mail}
                    accent="primary"
                  />
                  <StatCard
                    label="Last Contact"
                    value={supplierStats?.lastContact ? new Date(supplierStats.lastContact).toLocaleDateString("en-IN") : "—"}
                    icon={Clock}
                    accent="warning"
                  />
                  <StatCard
                    label="Avg Response Time"
                    value={supplierStats?.averageResponseTime || "—"}
                    icon={TrendingUp}
                    accent="primary"
                  />
                </div>

                {/* Info and Address */}
                <div className="grid md:grid-cols-2 gap-6 bg-secondary/20 p-4 rounded-xl text-sm">
                  <div className="space-y-2">
                    <div className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Contact details</div>
                    <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> <span>{selectedSupplier?.contactPerson || "No contact person"}</span></div>
                    <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> <span className="font-mono">{selectedSupplier?.mobileNumber}</span></div>
                    {selectedSupplier?.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> <span className="font-mono">{selectedSupplier.email}</span></div>}
                  </div>
                  <div className="space-y-2">
                    <div className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Business registration & Address</div>
                    {selectedSupplier?.gstNumber && <div>GSTIN: <span className="font-mono font-medium">{selectedSupplier.gstNumber}</span></div>}
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>
                        {selectedSupplier?.address && `${selectedSupplier.address}, `}
                        {selectedSupplier?.city && `${selectedSupplier.city}, `}
                        {selectedSupplier?.state && `${selectedSupplier.state} `}
                        {selectedSupplier?.pincode && `- ${selectedSupplier.pincode}`}
                        {!selectedSupplier?.address && "No address recorded."}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Supplied Products */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Supplied Products Catalog</h4>
                  {supplierStats?.productsSupplied?.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No products are recorded as supplied by this vendor.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {supplierStats?.productsSupplied?.map((p: any) => (
                        <div key={p.productId} className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-xs rounded-full flex items-center gap-1.5 font-medium">
                          <span>{p.productName}</span>
                          <span className="text-muted-foreground">|</span>
                          <span className="font-mono">Last Price: {formatCurrency(p.lastPurchasePrice)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Order History list */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Purchase Orders Ledger</h4>
                  {supplierOrders.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No purchase orders found for this vendor.</p>
                  ) : (
                    <div className="border rounded-lg overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-secondary/40 text-muted-foreground uppercase font-semibold">
                          <tr>
                            <th className="px-4 py-2">PO Number</th>
                            <th className="px-4 py-2">Date</th>
                            <th className="px-4 py-2">Items</th>
                            <th className="px-4 py-2">Amount</th>
                            <th className="px-4 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {supplierOrders.map(o => (
                            <tr key={o.id || o._id} className="border-t hover:bg-secondary/20">
                              <td className="px-4 py-2 font-mono font-medium">{o.purchaseOrderNumber}</td>
                              <td className="px-4 py-2">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                              <td className="px-4 py-2">{o.items?.length || 0} items</td>
                              <td className="px-4 py-2 font-semibold">{formatCurrency(o.totalAmount)}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
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
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
