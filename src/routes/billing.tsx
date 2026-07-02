import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuantityControl } from "@/components/dashboard/QuantityControl";
import { Plus, Trash2, FileText, Download, Send, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { createInvoice, getCustomers, getProducts, type Customer, type Product } from "@/lib/api";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "Billing — ShopPilot AI" }] }),
  component: BillingPage,
});

type Line = { id: number; product: string; qty: number; price: number };

function BillingPage() {
  const [customer, setCustomer] = useState<string>("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<Line[]>([
    { id: 1, product: "", qty: 1, price: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invoiceCreated, setInvoiceCreated] = useState(false);
  const [backendInvoiceNumber, setBackendInvoiceNumber] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [customerData, productData] = await Promise.all([getCustomers(), getProducts()]);
        if (!active) return;
        setCustomers(customerData);
        setProducts(productData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load billing data");
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const invoiceNumber = useMemo(() => `INV-00${Math.floor(Math.random() * 900 + 100)}`, []);
  const displayInvoiceNumber = backendInvoiceNumber ?? invoiceNumber;

  const addLine = () => {
    setLines([...lines, { id: Date.now(), product: "", qty: 1, price: 0 }]);
    setInvoiceCreated(false);
  };

  const update = (id: number, patch: Partial<Line>) => {
    setLines(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    setInvoiceCreated(false);
  };

  const remove = (id: number) => {
    setLines(lines.filter((l) => l.id !== id));
    setInvoiceCreated(false);
  };

  const selectProduct = (id: number, productName: string) => {
    const product = products.find((p) => p.name === productName);
    update(id, { product: productName, price: product?.price ?? 0 });
  };

  const handleGenerateInvoice = async () => {
    if (!customer || lines.every((line) => !line.product)) {
      setError("Select a customer and at least one product before creating an invoice.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setMessage(null);
      const created = await createInvoice({
        customer,
        lineItems: lines
          .filter((line) => line.product)
          .map((line) => ({
            product: products.find((product) => product.name === line.product)?.id ?? "",
            quantity: line.qty,
            unitPrice: line.price,
          })),
      });
      setBackendInvoiceNumber(created.id);
      setInvoiceCreated(true);
      setMessage("Invoice created successfully.");
      const customerData = await getCustomers();
      setCustomers(customerData);
    } catch (err) {
      setInvoiceCreated(false);
      setError(err instanceof Error ? err.message : "Unable to create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const selectedCustomer = customers.find((customerItem) => customerItem.id === customer);
  const normalizedPhone = selectedCustomer?.phone?.replace(/\D/g, "") ?? "";
  const hasPhone = normalizedPhone.length >= 10;
  const waPhone = hasPhone ? `91${normalizedPhone.slice(-10)}` : "";

  const formatCurrency = (value: number) => `₹${value.toFixed(2)}`;

  const generateInvoicePdf = (invoiceNumberOverride?: string) => {
    const invoiceNumberForPdf = invoiceNumberOverride ?? displayInvoiceNumber;
    const customerName = selectedCustomer?.name ?? "—";
    const dateString = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    let cursorY = 60;

    pdf.setFontSize(22);
    pdf.setFont(undefined, "bold");
    pdf.text("ShopPilot", margin, cursorY);

    pdf.setFontSize(11);
    pdf.setFont(undefined, "normal");
    pdf.text(`Invoice Number: ${invoiceNumberForPdf}`, margin, cursorY + 28);
    pdf.text(`Date: ${dateString}`, pageWidth - margin, cursorY + 28, { align: "right" });
    cursorY += 48;

    pdf.setFontSize(12);
    pdf.setFont(undefined, "bold");
    pdf.text("Bill To:", margin, cursorY);
    pdf.setFont(undefined, "normal");
    pdf.text(customerName, margin, cursorY + 18);
    cursorY += 40;

    pdf.setDrawColor(200);
    pdf.setLineWidth(0.5);
    pdf.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 18;

    pdf.setFont(undefined, "bold");
    pdf.text("Product", margin, cursorY);
    pdf.text("Qty", pageWidth - margin - 170, cursorY);
    pdf.text("Unit Price", pageWidth - margin - 86, cursorY, { align: "right" });
    pdf.text("Line Total", pageWidth - margin, cursorY, { align: "right" });
    cursorY += 12;
    pdf.setLineWidth(0.2);
    pdf.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 18;

    pdf.setFont(undefined, "normal");
    lines.filter((line) => line.product).forEach((line) => {
      const lineTotal = line.qty * line.price;
      if (cursorY > pageHeight - 100) {
        pdf.addPage();
        cursorY = margin;
      }

      pdf.text(line.product, margin, cursorY);
      pdf.text(String(line.qty), pageWidth - margin - 170, cursorY);
      pdf.text(formatCurrency(line.price), pageWidth - margin - 86, cursorY, { align: "right" });
      pdf.text(formatCurrency(lineTotal), pageWidth - margin, cursorY, { align: "right" });
      cursorY += 20;
    });

    if (lines.filter((line) => line.product).length === 0) {
      pdf.text("No line items added.", margin, cursorY);
      cursorY += 20;
    }

    if (cursorY > pageHeight - 120) {
      pdf.addPage();
      cursorY = margin;
    }

    pdf.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 26;

    pdf.setFont(undefined, "bold");
    pdf.text("Subtotal", pageWidth - margin - 86, cursorY, { align: "right" });
    pdf.text(formatCurrency(subtotal), pageWidth - margin, cursorY, { align: "right" });
    cursorY += 18;
    pdf.text("Tax (8%)", pageWidth - margin - 86, cursorY, { align: "right" });
    pdf.text(formatCurrency(tax), pageWidth - margin, cursorY, { align: "right" });
    cursorY += 18;

    pdf.setFont(undefined, "bold");
    pdf.text("Total", pageWidth - margin - 86, cursorY, { align: "right" });
    pdf.text(formatCurrency(total), pageWidth - margin, cursorY, { align: "right" });

    return pdf;
  };

  const handleDownloadPDF = () => {
    if (!invoiceCreated) return;
    const pdf = generateInvoicePdf();
    pdf.save(`invoice-${displayInvoiceNumber}.pdf`);
  };

  const handleSendInvoice = async () => {
    if (!selectedCustomer) {
      toast.error("Select a customer before sending the invoice.");
      return;
    }

    if (!hasPhone) {
      toast.error("Customer phone number is required to send via WhatsApp.");
      return;
    }

    if (lines.every((line) => !line.product)) {
      toast.error("Add at least one product before sending the invoice.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setMessage(null);

      const created = await createInvoice({
        customer,
        lineItems: lines
          .filter((line) => line.product)
          .map((line) => ({
            product: products.find((product) => product.name === line.product)?.id ?? "",
            quantity: line.qty,
            unitPrice: line.price,
          })),
        status: "sent",
      });

      setBackendInvoiceNumber(created.id);
      const pdf = generateInvoicePdf(created.id);
      pdf.save(`invoice-${created.id}.pdf`);

      setInvoiceCreated(true);
      setMessage("Invoice sent successfully.");
      toast.success("Invoice sent successfully");

      const customerData = await getCustomers();
      setCustomers(customerData);

      const cleanPhone = selectedCustomer.phone.replace(/\D/g, "");
      const phone10 = cleanPhone.slice(-10);
      const currentDateString = new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      const messageText = `Hello ${selectedCustomer.name} 👋

Your invoice from ShopPilot is ready.

Invoice No: ${created.id}
Date: ${currentDateString}

Items:
${lines
  .filter((line) => line.product)
  .map((line) => {
    const lineTotal = line.qty * line.price;
    return `${line.product} x ${line.qty} = ₹${lineTotal.toFixed(2)}`;
  })
  .join("\n")}

Subtotal: ₹${subtotal.toFixed(2)}
Tax (8%): ₹${tax.toFixed(2)}
Total: ₹${total.toFixed(2)}

Thank you for shopping with us.`;

      const encodedMessage = encodeURIComponent(messageText);
      const whatsappUrl = `https://wa.me/91${phone10}?text=${encodedMessage}`;
      window.open(whatsappUrl, "_blank");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to send invoice.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Billing & Invoices">
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-xl font-bold">Create Invoice</h2>
              <p className="text-sm text-muted-foreground">Add products and generate a bill</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <Label className="mb-2 block">Customer</Label>
              <Select value={customer} onValueChange={setCustomer}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((customerItem) => (
                    <SelectItem key={customerItem.id} value={customerItem.id}>{customerItem.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCustomer && (
              <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Customer Support Details</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4">
                  <div>
                    <span className="text-xs text-muted-foreground block">Phone</span>
                    <span className="font-medium text-foreground block">{selectedCustomer.phone || "—"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Email</span>
                    <span className="font-medium text-foreground block truncate">{selectedCustomer.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Pending Payments</span>
                    <span className="font-semibold text-destructive block">₹{(selectedCustomer.pendingPayments ?? 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Order History</span>
                    <span className="font-medium text-foreground block">{selectedCustomer.orderHistory?.length ?? 0} invoices</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Line Items</Label>
                <Button size="sm" variant="outline" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {lines.map((l) => (
                  <div key={l.id} className="p-4 rounded-xl bg-secondary/50 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Product</Label>
                        <Select value={l.product} onValueChange={(v) => selectProduct(l.id, v)}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Select product" /></SelectTrigger>
                          <SelectContent>
                            {products.map((productItem) => <SelectItem key={productItem.id} value={productItem.name}>{productItem.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <button onClick={() => remove(l.id)} className="mt-6 p-2 text-muted-foreground hover:text-destructive transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-end gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Quantity</Label>
                        <QuantityControl value={l.qty} onChange={(qty) => update(l.id, { qty })} />
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Unit Price</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={l.price}
                          onChange={(e) => update(l.id, { price: +e.target.value })}
                          className="bg-background"
                        />
                      </div>
                      <div className="text-right">
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Line Total</Label>
                        <div className="font-semibold font-display h-9 flex items-center">${(l.qty * l.price).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-linear-to-br from-primary/5 to-accent-brand/5 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax (8%)</span><span className="font-medium">${tax.toFixed(2)}</span></div>
              <div className="flex justify-between pt-2 border-t border-border text-base"><span className="font-semibold">Total</span><span className="font-bold font-display">${total.toFixed(2)}</span></div>
            </div>

            {error && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
            {message && <div className="rounded-xl border border-accent-brand/20 bg-accent-brand/5 p-3 text-sm text-accent-brand">{message}</div>}
            <Button className="w-full gradient-primary text-primary-foreground shadow-glow h-11" onClick={handleGenerateInvoice} disabled={submitting}>
              <Zap className="h-4 w-4 mr-2" /> {submitting ? "Creating..." : "Generate Invoice"}
            </Button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-2xl p-6 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Invoice Preview</div>
              <div className="text-xs font-mono text-primary">{displayInvoiceNumber}</div>
            </div>
            <div className="flex items-center gap-2 mb-6">
              <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary">
                <Zap className="h-4 w-4 text-primary-foreground" fill="currentColor" />
              </div>
              <span className="font-display font-bold">ShopPilot</span>
            </div>
            <div className="text-sm text-muted-foreground mb-1">Billed to</div>
            <div className="font-semibold mb-6">{customers.find((customerItem) => customerItem.id === customer)?.name || customer || "—"}</div>

            <div className="space-y-2 mb-6 max-h-56 overflow-y-auto">
              {lines.filter((l) => l.product).map((l) => (
                <div key={l.id} className="flex justify-between text-sm py-2 border-b border-border/60 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{l.product}</div>
                    <div className="text-xs text-muted-foreground">{l.qty} × ${l.price.toFixed(2)}</div>
                  </div>
                  <div className="font-semibold shrink-0 ml-3">${(l.qty * l.price).toFixed(2)}</div>
                </div>
              ))}
              {lines.filter((l) => l.product).length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">No items yet</div>
              )}
            </div>

            <div className="rounded-xl gradient-primary text-primary-foreground p-4 flex justify-between items-center">
              <span className="text-sm font-medium">Total Due</span>
              <span className="font-display text-xl font-bold">${total.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={!invoiceCreated}>
                <Download className="h-4 w-4 mr-1" /> PDF
              </Button>
              <Button
                size="sm"
                className="bg-accent-brand text-accent-brand-foreground"
                onClick={handleSendInvoice}
                disabled={!selectedCustomer || !hasPhone || lines.every((line) => !line.product) || submitting}
              >
                <Send className="h-4 w-4 mr-1" /> Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
