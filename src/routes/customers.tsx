import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PageSection } from "@/components/dashboard/PageSection";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
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
  Users,
  TrendingUp,
  AlertCircle,
  Star,
  Search,
  Mail,
  Phone,
  Package,
  Plus,
  Pencil,
  MapPin,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import SendSmsModal from "@/components/ui/send-sms-modal";
import {
  createCustomer,
  getCustomers,
  getInvoices,
  getSettings,
  updateInvoicePayment,
  updateCustomer,
  type BusinessProfile,
  type Customer,
  type CustomerPayload,
  type Invoice,
} from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { PaymentStatusBadge } from "@/components/billing/PaymentStatusBadge";
import { DATA_REFRESH_EVENT, emitDataRefresh } from "@/lib/live-refresh";
import { generateReminderMessage, getInvoiceOutstanding, openWhatsApp } from "@/lib/invoice";
import { toast } from "sonner";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/customers")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Customers — ShopPilot AI" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const [q, setQ] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(null);
  const [reminderCustomerId, setReminderCustomerId] = useState<string | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsTarget, setSmsTarget] = useState<{ name?: string; phone?: string } | null>(null);
  const [form, setForm] = useState<CustomerPayload>({
    name: "",
    phone: "",
    email: "",
    address: "",
    gstNumber: "",
    notes: "",
  });

  useEffect(() => {
    let active = true;

    const load = async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setError(null);
        const [customerData, invoiceData, settings] = await Promise.all([
          getCustomers(),
          getInvoices(),
          getSettings(),
        ]);
        if (!active) return;
        setCustomers(customerData);
        setInvoices(invoiceData);
        setBusiness(settings.business);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load customers");
      } finally {
        if (active && showLoading) setLoading(false);
      }
    };

    void load(true);

    return () => {
      active = false;
    };
  }, []);

  const pending = useMemo(() => {
    const grouped = new Map<string, { customer: Customer; pendingAmount: number }>();
    for (const invoice of invoices) {
      const outstanding = getInvoiceOutstanding(invoice);
      if (outstanding <= 0) continue;
      const customerRef = customers.find((item) => item.id === invoice.customerId);
      if (!customerRef) continue;
      const current = grouped.get(customerRef.id);
      if (current) current.pendingAmount += outstanding;
      else grouped.set(customerRef.id, { customer: customerRef, pendingAmount: outstanding });
    }
    return [...grouped.values()]
      .sort((a, b) => b.pendingAmount - a.pendingAmount)
      .map((entry) => ({ ...entry.customer, pendingAmount: entry.pendingAmount }));
  }, [customers, invoices]);

  const handleSendReminder = async (customer: Customer) => {
    if (!business) {
      toast.error("Business settings not loaded yet.");
      return;
    }
    if (!customer.phone) {
      toast.error("Customer phone number is missing.");
      return;
    }

    const customerInvoices = invoices
      .filter((invoice) => invoice.customerId === customer.id)
      .filter((invoice) => getInvoiceOutstanding(invoice) > 0)
      .sort(
        (a, b) =>
          getInvoiceOutstanding(b) - getInvoiceOutstanding(a) ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    const targetInvoice = customerInvoices[0];
    if (!targetInvoice) {
      toast.error("No pending invoice found for this customer.");
      return;
    }

    try {
      setReminderCustomerId(customer.id);
      const message = generateReminderMessage({
        invoice: targetInvoice,
        business,
        customer,
      });
      openWhatsApp(customer.phone, message);
      toast.success(`Payment reminder opened for ${customer.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to send reminder");
    } finally {
      setReminderCustomerId(null);
    }
  };
  const vipCustomers = useMemo(
    () => customers.filter((customer) => customer.customerType === "VIP"),
    [customers],
  );
  const totalOutstanding = useMemo(
    () => customers.reduce((sum, customer) => sum + customer.pendingAmount, 0),
    [customers],
  );
  const avgOrderValue = useMemo(() => {
    const purchases = customers.reduce((sum, customer) => sum + customer.totalPurchases, 0);
    const spent = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);
    return purchases ? spent / purchases : 0;
  }, [customers]);
  const recentOrders = useMemo(
    () =>
      [...invoices]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10),
    [invoices],
  );

  const filtered = useMemo(
    () =>
      customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.email.toLowerCase().includes(q.toLowerCase()),
      ),
    [customers, q],
  );

  const currency = formatCurrency;

  const openAddCustomer = () => {
    setEditingCustomer(null);
    setForm({ name: "", phone: "", email: "", address: "", gstNumber: "", notes: "" });
    setFormError(null);
    setIsCustomerDialogOpen(true);
  };

  const openEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      gstNumber: customer.gstNumber,
      notes: customer.notes,
    });
    setFormError(null);
    setIsCustomerDialogOpen(true);
  };

  const updateForm = (field: keyof CustomerPayload, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const phone = form.phone.trim();

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setFormError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);
      const payload = {
        name: form.name.trim(),
        phone,
        email: form.email.trim(),
        address: (form.address ?? "").trim(),
        gstNumber: form.gstNumber?.trim() ?? "",
        notes: form.notes?.trim() ?? "",
      };
      const saved = editingCustomer
        ? await updateCustomer(editingCustomer.id, payload)
        : await createCustomer(payload);

      setCustomers((current) =>
        editingCustomer
          ? current.map((customer) => (customer.id === saved.id ? saved : customer))
          : [saved, ...current],
      );
      setIsCustomerDialogOpen(false);
    } catch (err) {
      const apiMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setFormError(apiMessage || (err instanceof Error ? err.message : "Unable to save customer"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkInvoicePaid = async (invoiceId: string) => {
    try {
      setUpdatingInvoiceId(invoiceId);
      await updateInvoicePayment(invoiceId, { status: "paid" });
      const [customerData, invoiceData] = await Promise.all([getCustomers(), getInvoices()]);
      setCustomers(customerData);
      setInvoices(invoiceData);
      emitDataRefresh();
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  return (
    <DashboardLayout title="Customers">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Customers"
            value={customers.length.toString()}
            icon={Users}
            accent="primary"
          />
          <StatCard
            label="VIP Members"
            value={vipCustomers.length.toString()}
            icon={Star}
            accent="emerald"
          />
          <StatCard
            label="Outstanding"
            value={currency(totalOutstanding)}
            icon={AlertCircle}
            accent="destructive"
          />
          <StatCard
            label="Avg Order Value"
            value={currency(avgOrderValue)}
            icon={TrendingUp}
            accent="primary"
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <PageSection
          title="Customer Directory"
          description={`${filtered.length} customers`}
          action={
            <Button onClick={openAddCustomer} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          }
        >
          <div className="relative max-w-sm mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="py-8 text-sm text-muted-foreground">Loading customers…</div>
          ) : customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Add your first customer."
              description="Invite your first customer and start building recurring relationships from day one."
              actionLabel="Add Customer"
              onAction={openAddCustomer}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((customer) => (
                <div
                  key={customer.id}
                  className="rounded-lg border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-full gradient-primary grid place-items-center text-primary-foreground font-semibold text-sm shrink-0">
                      {customer.name
                        .split(" ")
                        .map((namePart) => namePart[0])
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{customer.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                        </div>
                        <StatusBadge status={customer.status as any} label={customer.customerType} />
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span className="truncate">{customer.phone || "No phone"}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate">{customer.address || "Address not added"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Total spent</div>
                      <div className="font-semibold">{currency(customer.totalSpent)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Pending due</div>
                      <div
                        className={
                          customer.pendingAmount > 0
                            ? "font-semibold text-destructive"
                            : "font-semibold text-accent-brand"
                        }
                      >
                        {currency(customer.pendingAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Total paid</div>
                      <div className="font-semibold">{currency(customer.totalSpent)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Total pending</div>
                      <div className="font-semibold text-warning">
                        {currency(customer.pendingAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Total billed</div>
                      <div className="font-semibold">{currency(customer.totalBilled)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Last payment</div>
                      <div className="font-medium">
                        {customer.lastPaymentDate || "No payment yet"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Purchases</div>
                      <div className="font-medium">{customer.totalPurchases}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 rounded-md bg-secondary/50 px-3 py-2">
                    <div className="min-w-0 flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {customer.favoriteProduct || "No favorite yet"}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditCustomer(customer)}
                        aria-label={`Edit ${customer.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageSection>

        <div className="grid lg:grid-cols-2 gap-6">
          <PageSection title="Order History" description="Recent transactions across all customers">
            <div className="space-y-2">
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No recent orders available.
                </div>
              ) : (
                recentOrders.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium font-mono">{invoice.customer}</span>
                        <PaymentStatusBadge status={invoice.status} />
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {invoice.id} · {invoice.items} item{invoice.items === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-sm">{currency(invoice.amount)}</div>
                      <div className="text-xs text-muted-foreground">{invoice.date}</div>
                      {invoice.status !== "paid" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-1 h-7 text-xs"
                          disabled={updatingInvoiceId === invoice.id}
                          onClick={() => void handleMarkInvoicePaid(invoice.id)}
                        >
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </PageSection>

          <PageSection
            title="Pending Payments"
            description={`${pending.length} customers with outstanding balances`}
          >
            {pending.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No pending payments
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-4 rounded-xl border border-destructive/10 bg-destructive/5"
                  >
                    <div className="h-10 w-10 rounded-full gradient-primary grid place-items-center text-primary-foreground font-semibold text-sm shrink-0">
                      {c.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-destructive">{currency(c.pendingAmount)}</div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1 h-7 text-xs"
                        disabled={reminderCustomerId === c.id}
                        onClick={() => void handleSendReminder(c)}
                      >
                        {reminderCustomerId === c.id ? "Sending…" : "Send Reminder"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageSection>
        </div>
      </div>
      <SendSmsModal
        open={smsOpen}
        onOpenChange={(v) => setSmsOpen(v)}
        customerName={smsTarget?.name}
        customerPhone={smsTarget?.phone}
      />
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
            <DialogDescription>
              Keep customer contact details ready for invoices, reminders, and follow-ups.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={saveCustomer}>
            <div className="space-y-2">
              <Label htmlFor="customer-name">Full Name</Label>
              <Input
                id="customer-name"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone Number</Label>
              <Input
                id="customer-phone"
                inputMode="numeric"
                maxLength={10}
                pattern="[6-9][0-9]{9}"
                placeholder="9876543210"
                value={form.phone}
                onChange={(event) => updateForm("phone", event.target.value.replace(/\D/g, ""))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                value={form.email}
                onChange={(event) => updateForm("email", event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-address">Address</Label>
              <Textarea
                id="customer-address"
                value={form.address}
                onChange={(event) => updateForm("address", event.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-gst">GST Number</Label>
              <Input
                id="customer-gst"
                value={form.gstNumber ?? ""}
                onChange={(event) => updateForm("gstNumber", event.target.value.toUpperCase())}
                placeholder="37ABCDE1234F1Z5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-notes">Notes</Label>
              <Textarea
                id="customer-notes"
                value={form.notes ?? ""}
                onChange={(event) => updateForm("notes", event.target.value)}
                rows={2}
                placeholder="Delivery preferences, credit terms, etc."
              />
            </div>
            {formError && <div className="text-sm text-destructive">{formError}</div>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCustomerDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingCustomer ? "Save Changes" : "Add Customer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
