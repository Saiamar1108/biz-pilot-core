import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageSection } from "@/components/dashboard/PageSection";
import { PaymentStatusBadge } from "@/components/billing/PaymentStatusBadge";
import { InvoiceActions } from "@/components/billing/InvoiceActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import {
  Receipt,
  CircleCheckBig,
  Clock3,
  Wallet,
  Download,
  Copy,
  Star,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getCustomers,
  getInvoices,
  getInvoiceSummary,
  getSettings,
  updateInvoicePayment,
  type BusinessProfile,
  type Customer,
  type FinancialSummary,
  type Invoice,
} from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { emitDataRefresh } from "@/lib/live-refresh";
import {
  calculateInvoiceProfit,
  detectDuplicateInvoices,
  exportInvoicesCsv,
  getInvoiceOutstanding,
  getMostPurchasedProducts,
  getTopUnpaidCustomers,
  isBestCustomer,
  downloadInvoicePDF,
} from "@/lib/invoice";
import { toast } from "sonner";

export const Route = createFileRoute("/invoices")({
  head: () => ({ meta: [{ title: "Invoices — ShopPilot AI" }] }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(null);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [data, summaryData, customerData, settings] = await Promise.all([
          getInvoices(status === "all" ? undefined : { status }),
          getInvoiceSummary(status === "all" ? undefined : { status }),
          getCustomers(),
          getSettings(),
        ]);
        if (!active) return;
        setInvoices(data);
        setSummary(summaryData);
        setCustomers(customerData);
        setBusiness(settings.business);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load invoices");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [status]);

  const customerMap = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  const duplicateIds = useMemo(() => detectDuplicateInvoices(invoices), [invoices]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesQuery =
        !normalized ||
        invoice.id.toLowerCase().includes(normalized) ||
        invoice.customer.toLowerCase().includes(normalized) ||
        invoice.lineItems.some((item) => item.productName.toLowerCase().includes(normalized));

      if (!matchesQuery) return false;

      if (dateFrom) {
        const from = new Date(dateFrom);
        if (new Date(invoice.createdAt) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(invoice.createdAt) > to) return false;
      }

      return true;
    });
  }, [invoices, query, dateFrom, dateTo]);

  const topUnpaid = useMemo(
    () => getTopUnpaidCustomers(invoices, customers, 5),
    [invoices, customers],
  );

  const topProducts = useMemo(
    () => getMostPurchasedProducts(filtered, 5),
    [filtered],
  );

  const totals = useMemo(
    () => ({
      totalBilled: summary?.totalBilled ?? 0,
      totalCollected: summary?.collectedRevenue ?? 0,
      totalPending: summary?.pendingRevenue ?? 0,
    }),
    [summary],
  );

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      setError(null);
      setUpdatingInvoiceId(invoiceId);
      const updated = await updateInvoicePayment(invoiceId, { status: "paid" });
      setInvoices((current) =>
        current.map((invoice) => (invoice.id === invoiceId ? updated : invoice)),
      );
      const latestSummary = await getInvoiceSummary(status === "all" ? undefined : { status });
      setSummary(latestSummary);
      emitDataRefresh();
      toast.success("Invoice marked as paid");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to mark invoice as paid");
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  const handleRepeatInvoice = (invoice: Invoice) => {
    navigate({
      to: "/billing",
      search: { repeatCustomer: invoice.customerId },
    });
    toast.message("Opening billing for repeat order");
  };

  const handleExportCsv = () => {
    exportInvoicesCsv(filtered);
    toast.success("Invoice report exported as CSV");
  };

  const handleExportPdf = async () => {
    if (!business || filtered.length === 0) return;
    try {
      await downloadInvoicePDF({
        invoice: filtered[0],
        business,
        customerName: filtered[0].customer,
      });
      toast.success("Sample invoice PDF downloaded. Export full report from each invoice.");
    } catch {
      toast.error("Unable to export PDF");
    }
  };

  return (
    <DashboardLayout title="Invoices">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Invoices" value={loading ? "…" : filtered.length.toLocaleString("en-IN")} icon={Receipt} accent="primary" />
          <StatCard label="Total Billed" value={loading ? "…" : formatCurrency(totals.totalBilled)} icon={Wallet} accent="emerald" />
          <StatCard label="Collected" value={loading ? "…" : formatCurrency(totals.totalCollected)} icon={CircleCheckBig} accent="primary" />
          <StatCard label="Pending" value={loading ? "…" : formatCurrency(totals.totalPending)} icon={Clock3} accent="warning" />
        </div>

        {error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <PageSection title="Top Unpaid Customers" description="Highest outstanding balances">
            {topUnpaid.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unpaid balances.</p>
            ) : (
              <div className="space-y-2">
                {topUnpaid.map((row) => (
                  <div key={row.id} className="flex justify-between rounded-lg border p-3 text-sm">
                    <span className="font-medium">{row.name}</span>
                    <span className="text-destructive font-semibold">
                      {formatCurrency(row.pendingAmount)} · {row.invoiceCount} inv.
                    </span>
                  </div>
                ))}
              </div>
            )}
          </PageSection>

          <PageSection title="Most Purchased Products" description="From filtered invoices">
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No product sales yet.</p>
            ) : (
              <div className="space-y-2">
                {topProducts.map((product) => (
                  <div key={product.name} className="flex justify-between rounded-lg border p-3 text-sm">
                    <span>{product.name}</span>
                    <span className="font-medium">{product.units} units · {formatCurrency(product.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </PageSection>
        </div>

        <PageSection title="Invoice History" description={`${filtered.length} invoices`}>
          <div className="grid md:grid-cols-4 gap-3 mb-5">
            <div className="md:col-span-2">
              <Label htmlFor="invoice-search" className="mb-2 block">Search</Label>
              <Input
                id="invoice-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Invoice, customer, or product"
              />
            </div>
            <div>
              <Label className="mb-2 block">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 items-end">
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => void handleExportPdf()}>
                <Download className="h-4 w-4 mr-1" /> PDF
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-5">
            <div>
              <Label className="mb-2 block">From date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">To date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-sm text-muted-foreground">Loading invoices…</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-sm text-muted-foreground text-center">No invoices found.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((invoice) => {
                const customer = customerMap.get(invoice.customerId);
                const outstanding = getInvoiceOutstanding(invoice);
                const profit = calculateInvoiceProfit(invoice);
                const isExpanded = expandedId === invoice.id;
                const isUnpaid = invoice.status !== "paid";

                return (
                  <div key={invoice.id} className="rounded-xl border border-border/60 bg-card overflow-hidden">
                    <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm">{invoice.id}</span>
                          <PaymentStatusBadge status={invoice.status} />
                          {duplicateIds.has(invoice.id) && (
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-700 inline-flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Possible duplicate
                            </span>
                          )}
                          {customer && isBestCustomer(customer) && (
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 inline-flex items-center gap-1">
                              <Star className="h-3 w-3" /> VIP
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium mt-1">{invoice.customer}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Created: {invoice.date} · Due: {invoice.dueDate} · {invoice.items} item{invoice.items === 1 ? "" : "s"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Profit: {formatCurrency(profit)} · Paid: {invoice.paidAt || "—"}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold">{formatCurrency(invoice.amount)}</div>
                        <div className="text-xs text-muted-foreground">Collected: {formatCurrency(invoice.paidAmount)}</div>
                        <div className="text-xs text-muted-foreground">Pending: {formatCurrency(outstanding)}</div>
                      </div>

                      <div className="flex flex-wrap gap-2 shrink-0">
                        <Button type="button" size="sm" variant="outline" onClick={() => setExpandedId(isExpanded ? null : invoice.id)}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => handleRepeatInvoice(invoice)}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Repeat
                        </Button>
                        {isUnpaid && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={updatingInvoiceId === invoice.id}
                            onClick={() => void handleMarkPaid(invoice.id)}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpanded && business && (
                      <div className="border-t p-4 space-y-4 bg-muted/20">
                        <InvoiceActions
                          invoice={invoice}
                          business={business}
                          customer={customer}
                          compact
                        />

                        {invoice.paymentHistory.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Payment History</h4>
                            <div className="space-y-2">
                              {invoice.paymentHistory.map((entry, index) => (
                                <div key={`${entry.date}-${index}`} className="flex justify-between text-sm rounded-lg border p-2 bg-background">
                                  <span>{entry.date} · {entry.method}</span>
                                  <span className="font-medium">{formatCurrency(entry.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="text-sm font-semibold mb-2">Line Items</h4>
                          <div className="space-y-1 text-sm">
                            {invoice.lineItems.map((item, index) => (
                              <div key={`${item.productId}-${index}`} className="flex justify-between">
                                <span>{item.productName} × {item.quantity}</span>
                                <span>{formatCurrency(item.lineTotal)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </PageSection>
      </div>
    </DashboardLayout>
  );
}
