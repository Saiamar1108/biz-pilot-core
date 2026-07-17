import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CustomerSearchCombobox } from "@/components/billing/CustomerSearchCombobox";
import { PaymentStatusBadge } from "@/components/billing/PaymentStatusBadge";
import { ProductSearchCombobox } from "@/components/billing/ProductSearchCombobox";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuantityControl } from "@/components/dashboard/QuantityControl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  FileText,
  Download,
  Send,
  Zap,
  UserPlus,
  Mic,
  RotateCcw,
  Loader2,
  UserRound,
  Barcode,
  Check,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { InvoiceActions } from "@/components/billing/InvoiceActions";
import {
  downloadInvoicePDF,
  generateInvoiceWhatsAppMessage,
  openWhatsApp,
} from "@/lib/invoice";
import {
  createCustomer,
  createInvoice,
  getCustomers,
  getInvoices,
  getProducts,
  getSettings,
  updateInvoicePayment,
  getProductByBarcode,
  type BusinessProfile,
  type Customer,
  type CustomerPayload,
  type Invoice,
  type Product,
} from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import {
  formatVoiceParseSummary,
  isUnpaidInvoiceStatus,
  parseVoiceInvoice,
  type ParsedVoiceInvoice,
} from "@/lib/voice-invoice";
import { emitDataRefresh } from "@/lib/live-refresh";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "Billing — ShopPilot AI" }] }),
  component: BillingPage,
});

type Line = { id: number; productId: string; product: string; qty: number; price: number };

const emptyLine = (): Line => ({ id: Date.now(), productId: "", product: "", qty: 1, price: 0 });
const moneyAmount = (value: number) => (Number.isFinite(value) ? Number(value.toFixed(2)) : 0);

function stockTone(stock: number) {
  if (stock <= 2) return "text-destructive bg-destructive/10 border-destructive/20";
  if (stock <= 10) return "text-warning bg-warning/10 border-warning/20";
  return "text-accent-brand bg-accent-brand/10 border-accent-brand/20";
}

function BillingPage() {
  const [customer, setCustomer] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invoiceCreated, setInvoiceCreated] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [completedInvoice, setCompletedInvoice] = useState<Invoice | null>(null);
  const [showNextCustomer, setShowNextCustomer] = useState(false);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [taxRate, setTaxRate] = useState(0.08);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerPayload>({
    name: "",
    phone: "",
    email: "",
    address: "",
    gstNumber: "",
    notes: "",
  });
  const [customerFormError, setCustomerFormError] = useState<string | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [voiceParseResult, setVoiceParseResult] = useState<ParsedVoiceInvoice | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const customersRef = useRef(customers);
  const productsRef = useRef(products);
  const voiceHandlersRef = useRef({
    applyVoice: (_transcript: string) => {},
    downloadPdf: () => {},
    sendInvoice: () => {},
    generateInvoice: () => {},
    markPaid: () => {},
    nextCustomer: () => {},
    clearInvoice: () => {},
  });

  useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setCustomersLoading(true);
        setProductsLoading(true);
        const [customerData, productData, settings] = await Promise.all([
          getCustomers(),
          getProducts(),
          getSettings(),
        ]);
        if (!active) return;
        setCustomers(customerData);
        setProducts(productData);
        setTaxRate(Number.isFinite(Number(settings.taxRate)) ? Number(settings.taxRate) : 0);
        setBusiness(settings.business);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load billing data");
      } finally {
        if (active) {
          setCustomersLoading(false);
          setProductsLoading(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    type SpeechRecognitionCtor = new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onstart: (() => void) | null;
      onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    };
    const win = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SpeechRecognitionCtor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setListening(true);
      setVoiceStatus("Listening…");
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
      voiceHandlersRef.current.applyVoice(transcript);
      setListening(false);
    };
    recognition.onerror = () => {
      setListening(false);
      setVoiceStatus("Voice recognition failed. Enter details manually.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setVoiceSupported(true);
    return () => recognition.stop();
  }, []);

  useEffect(() => {
    if (!customer) {
      setCustomerInvoices([]);
      return;
    }
    let active = true;
    getInvoices({ customer })
      .then((data) => {
        if (active) setCustomerInvoices(data);
      })
      .catch(() => {
        if (active) setCustomerInvoices([]);
      });
    return () => {
      active = false;
    };
  }, [customer, completedInvoice?.id]);

  const displayInvoiceNumber = completedInvoice?.id ?? "Pending";
  const effectiveTaxRate = Number.isFinite(taxRate) ? taxRate : 0;
  const taxPercentLabel = `${Math.round(effectiveTaxRate * 100)}%`;
  const subtotal = useMemo(
    () => moneyAmount(lines.reduce((sum, line) => sum + line.qty * line.price, 0)),
    [lines],
  );
  const tax = useMemo(() => moneyAmount(subtotal * effectiveTaxRate), [subtotal, effectiveTaxRate]);
  const total = useMemo(() => moneyAmount(subtotal + tax), [subtotal, tax]);

  const selectedCustomer = useMemo(
    () => customers.find((item) => item.id === customer),
    [customers, customer],
  );
  const normalizedPhone = selectedCustomer?.phone?.replace(/\D/g, "") ?? "";
  const hasPhone = normalizedPhone.length >= 10;

  const storeName = business?.storeName ?? "ShopPilot AI";
  const storeAddress = business?.address ?? "";
  const storeGst = business?.gstNumber ?? "";
  const storePhone = business?.phone ?? "";

  const customerStats = useMemo(() => {
    if (!selectedCustomer) return null;
    const purchases = selectedCustomer.totalPurchases || customerInvoices.length;
    const billed = selectedCustomer.totalBilled;
    const spent = selectedCustomer.totalSpent;
    const pending = selectedCustomer.pendingAmount;
    const avg = purchases > 0 ? spent / purchases : 0;
    return { purchases, billed, spent, pending, avg };
  }, [selectedCustomer, customerInvoices.length]);

  const recentCustomerInvoices = useMemo(
    () => customerInvoices.slice(0, 5),
    [customerInvoices],
  );
  const stockIssues = useMemo(
    () =>
      lines
        .filter((line) => line.productId)
        .map((line) => {
          const product = products.find((item) => item.id === line.productId);
          if (!product) return null;
          const available = Math.max(0, product.stock);
          return line.qty > available
            ? { lineId: line.id, productName: product.name, requested: line.qty, available }
            : null;
        })
        .filter((issue): issue is { lineId: number; productName: string; requested: number; available: number } => Boolean(issue)),
    [lines, products],
  );
  const hasInvalidStock = stockIssues.length > 0;
  const payloadLines = useMemo(
    () =>
      lines
        .filter((line) => line.productId)
        .map((line) => ({
          product: line.productId,
          quantity: line.qty,
          unitPrice: moneyAmount(line.price),
        })),
    [lines],
  );

  const paidAmount = completedInvoice?.paidAmount ?? 0;
  const remainingAmount = completedInvoice
    ? Math.max(0, completedInvoice.total - paidAmount)
    : total;
  const showBillingEmptyState = !invoiceCreated && payloadLines.length === 0;

  const refreshCatalog = async () => {
    setCustomersLoading(true);
    setProductsLoading(true);
    try {
      const [customerData, productData] = await Promise.all([getCustomers(), getProducts()]);
      setCustomers(customerData);
      setProducts(productData);
    } finally {
      setCustomersLoading(false);
      setProductsLoading(false);
    }
  };

  const resetForNextCustomer = () => {
    setCustomer("");
    setLines([emptyLine()]);
    setInvoiceCreated(false);
    setCompletedInvoice(null);
    setShowNextCustomer(false);
    setMessage(null);
    setError(null);
    setVoiceParseResult(null);
    setCustomerInvoices([]);
  };

  const clearInvoice = () => {
    setLines([emptyLine()]);
    setInvoiceCreated(false);
    setCompletedInvoice(null);
    setShowNextCustomer(false);
    setMessage(null);
    setError(null);
    setVoiceParseResult(null);
  };

  const finalizeInvoice = (created: Invoice) => {
    setCompletedInvoice(created);
    setInvoiceCreated(true);
    setShowNextCustomer(true);
    // Auto reset cart after invoice creation to prevent duplicate detection
    setLines([emptyLine()]);
  };

  const addLine = () => {
    setLines((current) => [...current, emptyLine()]);
    setInvoiceCreated(false);
  };

  const updateLine = (id: number, patch: Partial<Line>) => {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
    setInvoiceCreated(false);
  };

  const removeLine = (id: number) => {
    setLines((current) => (current.length === 1 ? [emptyLine()] : current.filter((line) => line.id !== id)));
    setInvoiceCreated(false);
  };

  const selectProduct = (lineId: number, product: Product) => {
    updateLine(lineId, {
      productId: product.id,
      product: product.name,
      qty: Math.min(product.stock || 1, 1),
      price: product.price,
    });
  };

  const toggleVoice = () => {
    if (!voiceSupported || !recognitionRef.current) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      return;
    }
    setVoiceStatus(null);
    recognitionRef.current.start();
  };

  const openCreateCustomer = (prefillName = "") => {
    setCustomerForm((current) => ({ ...current, name: prefillName || current.name }));
    setCustomerDialogOpen(true);
  };

  const saveInlineCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const phone = customerForm.phone.trim();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setCustomerFormError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    try {
      setSavingCustomer(true);
      setCustomerFormError(null);
      const saved = await createCustomer({
        name: customerForm.name.trim(),
        phone,
        email: customerForm.email.trim(),
        address: customerForm.address.trim(),
        gstNumber: customerForm.gstNumber?.trim() ?? "",
        notes: customerForm.notes?.trim() ?? "",
      });
      setCustomers((current) => [saved, ...current]);
      setCustomer(saved.id);
      setCustomerDialogOpen(false);
      setCustomerForm({ name: "", phone: "", email: "", address: "", gstNumber: "", notes: "" });
      toast.success("Customer added.");
    } catch (err) {
      setCustomerFormError(err instanceof Error ? err.message : "Unable to create customer");
    } finally {
      setSavingCustomer(false);
    }
  };

  const repeatOrder = (invoice: Invoice) => {
    if (!invoice.lineItems.length) {
      toast.error("This invoice has no line items to repeat.");
      return;
    }
    setLines(
      invoice.lineItems.map((item) => {
        const product = products.find((p) => p.id === item.productId || p.name === item.productName);
        return {
          id: Date.now() + Math.random(),
          productId: product?.id ?? item.productId,
          product: item.productName,
          qty: item.quantity,
          price: product?.price ?? item.unitPrice,
        };
      }),
    );
    setInvoiceCreated(false);
    setCompletedInvoice(null);
    setShowNextCustomer(false);
    toast.success("Previous order loaded into cart.");
  };

  const handleBarcodeSearch = async () => {
    if (!barcodeInput.trim()) return;
    
    try {
      setScanningBarcode(true);
      const response = await getProductByBarcode(barcodeInput.trim());
      
      if (response.found && response.data) {
        const product = response.data;
        // Check if product already in cart
        const existingLine = lines.find(line => line.productId === product.id);
        
        if (existingLine) {
          // Update quantity
          updateLine(existingLine.id, { qty: existingLine.qty + 1 });
          toast.success(`Added another ${product.name} to cart`);
        } else {
          // Add new line
          const newLine = emptyLine();
          newLine.productId = product.id;
          newLine.product = product.name;
          newLine.qty = 1;
          newLine.price = product.price;
          setLines([...lines, newLine]);
          toast.success(`Added ${product.name} to cart`);
        }
        
        setBarcodeInput("");
      } else {
        toast.error("Product not found with this barcode. Add it manually.");
      }
    } catch (err) {
      toast.error("Failed to search for product by barcode");
    } finally {
      setScanningBarcode(false);
    }
  };

  const handleBarcodeKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBarcodeSearch();
    }
  };

  const getBusinessProfile = () =>
    business ?? {
      storeName: "ShopPilot AI",
      ownerName: "",
      gstNumber: "",
      phone: "",
      email: "",
      address: "",
      category: "",
      logoDataUrl: "",
      upiId: "",
    };

  const downloadInvoicePdfFor = async (invoice: Invoice) => {
    await downloadInvoicePDF({
      invoice,
      business: getBusinessProfile(),
      customerName: invoice.customer,
    });
  };

  const handleGenerateInvoice = async () => {
    if (!customer || payloadLines.length === 0) {
      setError("Select a customer and at least one product before creating an invoice.");
      return;
    }
    if (hasInvalidStock) {
      toast.error("Invoice has quantity above stock. Please adjust quantities.");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      setMessage(null);
          const created = await createInvoice({
            customer,
            taxRate: effectiveTaxRate,
            lineItems: payloadLines,
          });
          finalizeInvoice(created);
          setMessage("✓ Invoice created successfully.");
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 1200);
          await refreshCatalog();
          emitDataRefresh();
    } catch (err) {
      setInvoiceCreated(false);
      const responseError =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { code?: string; available?: number; message?: string } } }).response?.data
          : undefined;
      if (responseError?.code === "INSUFFICIENT_STOCK") {
        const available = Number(responseError.available ?? 0);
        const text = `Only ${available} units available`;
        setError(text);
        toast.error(text);
      } else {
        setError(err instanceof Error ? err.message : "Unable to create invoice");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!invoiceCreated || !completedInvoice) return;
    void downloadInvoicePdfFor(completedInvoice).then(() => {
      setShowNextCustomer(true);
      toast.success("Invoice PDF downloaded");
    });
  };

  const handleSendInvoice = async () => {
    if (!selectedCustomer || !hasPhone || payloadLines.length === 0) {
      toast.error("Select a customer with phone and add products.");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const created = await createInvoice({
        customer,
        taxRate: effectiveTaxRate,
        lineItems: payloadLines,
        status: "sent",
      });
      finalizeInvoice(created);
      await downloadInvoicePdfFor(created);
      setMessage("✓ Invoice sent successfully.");
      toast.success("Invoice sent successfully");
      await refreshCatalog();
      emitDataRefresh();

      const messageText = generateInvoiceWhatsAppMessage({
        invoice: created,
        business: getBusinessProfile(),
        customer: selectedCustomer,
      });
      openWhatsApp(selectedCustomer.phone, messageText);
    } catch (err) {
      const responseError =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { code?: string; available?: number; message?: string } } }).response?.data
          : undefined;
      if (responseError?.code === "INSUFFICIENT_STOCK") {
        toast.error(`Only ${Number(responseError.available ?? 0)} units available`);
      } else {
        setError(err instanceof Error ? err.message : "Unable to send invoice.");
        toast.error(err instanceof Error ? err.message : "Unable to send invoice.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (invoiceId?: string) => {
    const targetId = invoiceId ?? completedInvoice?.id;
    if (!targetId) return;
    try {
      setSubmitting(true);
      const updated = await updateInvoicePayment(targetId, {
        status: "paid",
        paymentMethod,
      });
      if (completedInvoice?.id === targetId) setCompletedInvoice(updated);
      setCustomerInvoices((current) =>
        current.map((invoice) => (invoice.id === targetId ? updated : invoice)),
      );
      setMessage("Invoice marked as paid.");
      toast.success("Payment recorded.");
      await refreshCatalog();
      if (customer) {
        const invoices = await getInvoices({ customer });
        setCustomerInvoices(invoices);
      }
      emitDataRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const applyVoiceTranscript = (transcript: string) => {
    const parsed = parseVoiceInvoice(transcript, customersRef.current, productsRef.current);
    setVoiceParseResult(parsed);
    setVoiceStatus(`Heard: "${parsed.heard}"`);

    if (parsed.action) {
      switch (parsed.action) {
        case "download":
          if (!invoiceCreated) {
            toast.error("Create an invoice before downloading.");
            return;
          }
          handleDownloadPDF();
          toast.success("Downloading invoice PDF.");
          return;
        case "send":
          void handleSendInvoice();
          return;
        case "generate_invoice":
          if (!customer || payloadLines.length === 0) {
            toast.error("Select a customer and add products before generating.");
            return;
          }
          void handleGenerateInvoice();
          return;
        case "mark_paid":
          if (!completedInvoice) {
            toast.error("No invoice to mark as paid.");
            return;
          }
          void handleMarkAsPaid();
          return;
        case "next_customer":
          resetForNextCustomer();
          toast.success("Ready for next customer.");
          return;
        case "clear":
          clearInvoice();
          toast.success("Invoice cleared.");
          return;
      }
    }

    if (parsed.customerId) setCustomer(parsed.customerId);

    if (parsed.lines.length) {
      const adjustments: string[] = [];
      setLines((current) => {
        const next = current.filter((line) => line.productId);
        for (const line of parsed.lines) {
          const product = productsRef.current.find((item) => item.id === line.productId);
          const available = Math.max(0, product?.stock ?? 0);
          const safeQty = Math.max(1, Math.min(line.qty, available || 1));
          if (line.qty > safeQty) {
            adjustments.push(
              `${line.productName}: Requested ${line.qty}, only ${available} available. Adjusted automatically.`,
            );
          }
          const existing = next.find((item) => item.productId === line.productId);
          if (existing) {
            existing.qty = Math.min(existing.qty + safeQty, available || existing.qty + safeQty);
          } else {
            next.push({
              id: Date.now() + Math.random(),
              productId: line.productId,
              product: line.productName,
              qty: safeQty,
              price: line.price,
            });
          }
        }
        return next.length ? next : [emptyLine()];
      });
      setInvoiceCreated(false);
      setCompletedInvoice(null);
      toast.success(`Added ${parsed.lines.length} item(s) from voice.`);
      if (adjustments.length) {
        toast.warning(adjustments.join(" "));
      }
      return;
    }

    if (parsed.customerId) {
      toast.success(`Selected customer ${parsed.customerName ?? "match"}.`);
      return;
    }

    toast.error("Could not match voice input. Try again or add manually.");
  };

  voiceHandlersRef.current = {
    applyVoice: applyVoiceTranscript,
    downloadPdf: handleDownloadPDF,
    sendInvoice: () => void handleSendInvoice(),
    generateInvoice: () => void handleGenerateInvoice(),
    markPaid: () => void handleMarkAsPaid(),
    nextCustomer: resetForNextCustomer,
    clearInvoice: clearInvoice,
  };

  const voiceSummary = voiceParseResult ? formatVoiceParseSummary(voiceParseResult) : null;

  return (
    <DashboardLayout title="Billing & Invoices">
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-xl font-bold">Create Invoice</h2>
              <p className="text-sm text-muted-foreground">Add products and generate a bill</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={listening ? "destructive" : "outline"}
                size="icon"
                onClick={toggleVoice}
                disabled={!voiceSupported}
                title={voiceSupported ? "Voice to invoice" : "Voice not supported"}
              >
                <Mic className="h-4 w-4" />
              </Button>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
            </div>
          </div>

          {voiceStatus && (
            <div className="text-xs text-muted-foreground mb-4 p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-1">
              <div>{voiceStatus}</div>
              {voiceSummary && (
                <>
                  <div>Customer: {voiceSummary.customer}</div>
                  <div>Items: {voiceSummary.items}</div>
                  <div>Action: {voiceSummary.action}</div>
                </>
              )}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Customer</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => openCreateCustomer()}>
                  <UserPlus className="h-4 w-4 mr-1" /> Add Customer
                </Button>
              </div>
              <CustomerSearchCombobox
                customers={customers}
                value={customer}
                onSelect={setCustomer}
                onCreateNew={openCreateCustomer}
                loading={customersLoading}
              />
            </div>

            {selectedCustomer && customerStats && (
              <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-4 text-sm">
                <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  Customer History
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Total billed</div>
                    <div className="font-semibold">{formatCurrency(customerStats.billed)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total spent</div>
                    <div className="font-semibold">{formatCurrency(customerStats.spent)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Pending balance</div>
                    <div className="font-semibold text-destructive">{formatCurrency(customerStats.pending)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Avg order value</div>
                    <div className="font-semibold">{formatCurrency(customerStats.avg)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total orders</div>
                    <div className="font-semibold">{customerStats.purchases}</div>
                  </div>
                </div>
                {recentCustomerInvoices.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">Last 5 invoices</div>
                    {recentCustomerInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/40"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-xs">{invoice.id}</div>
                          <div className="text-xs text-muted-foreground">{invoice.date} · {invoice.items} items</div>
                        </div>
                        <PaymentStatusBadge status={invoice.status} />
                        <div className="font-semibold text-sm">{formatCurrency(invoice.amount)}</div>
                        <Button type="button" size="sm" variant="ghost" onClick={() => repeatOrder(invoice)}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Repeat
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void downloadInvoicePdfFor(invoice)}
                        >
                          <Download className="h-3.5 w-3.5 mr-1" /> PDF
                        </Button>
                        {isUnpaidInvoiceStatus(invoice.status) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={submitting}
                            onClick={() => void handleMarkAsPaid(invoice.id)}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {showBillingEmptyState && (
              <div className="mb-6">
                <EmptyState
                  icon={FileText}
                  title="Create your first invoice."
                  description="Start from a blank slate and turn your first cart into a polished bill."
                  actionLabel="Create First Invoice"
                  onAction={() => {
                    addLine();
                    if (customers.length === 1) {
                      setCustomer(customers[0].id);
                    }
                  }}
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Line Items</Label>
                <div className="flex gap-2">
                  <div className="relative">
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Scan barcode..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyPress={handleBarcodeKeyPress}
                      disabled={scanningBarcode}
                      className="pl-9 w-48"
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={addLine}>
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {lines.map((line) => (
                  <div key={line.id} className="p-4 rounded-xl bg-secondary/50 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Product</Label>
                        <ProductSearchCombobox
                          products={products}
                          value={line.productId || line.product}
                          onSelect={(product) => selectProduct(line.id, product)}
                          loading={productsLoading}
                        />
                        {line.productId && (() => {
                          const product = products.find((item) => item.id === line.productId);
                          if (!product) return null;
                          return (
                            <div className={`mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${stockTone(product.stock)}`}>
                              Stock: {product.stock}
                            </div>
                          );
                        })()}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="mt-6 p-2 text-muted-foreground hover:text-destructive transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-end gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Quantity</Label>
                        <QuantityControl
                          value={line.qty}
                          max={Math.max(1, products.find((item) => item.id === line.productId)?.stock ?? Number.MAX_SAFE_INTEGER)}
                          onChange={(qty) => updateLine(line.id, { qty })}
                        />
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Unit Price</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={line.price}
                          onChange={(e) =>
                            updateLine(line.id, { price: Number(e.target.value) || 0 })
                          }
                          className="bg-background"
                        />
                      </div>
                      <div className="text-right">
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Line Total</Label>
                        <div className="font-semibold font-display h-9 flex items-center">
                          {formatCurrency(line.qty * line.price)}
                        </div>
                      </div>
                    </div>
                    {line.productId && (() => {
                      const product = products.find((item) => item.id === line.productId);
                      if (!product) return null;
                      const available = Math.max(0, product.stock);
                      const atMax = line.qty >= available && available > 0;
                      return (
                        <div className="text-xs space-y-1">
                          <div className="text-muted-foreground">Only {available} units left</div>
                          {atMax && (
                            <div className="text-warning font-medium">Maximum stock reached</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>

            {hasInvalidStock && (
              <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                Quantity exceeds stock for one or more items. Reduce quantity to continue.
              </div>
            )}

            <div className="rounded-xl bg-linear-to-br from-primary/5 to-accent-brand/5 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST ({taxPercentLabel})</span>
                <span className="font-medium">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold font-display">{formatCurrency(total)}</span>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-xl border border-accent-brand/20 bg-accent-brand/5 p-3 text-sm text-accent-brand">
                {message}
              </div>
            )}

            <div className="relative">
              <Button
                className="w-full btn-generate h-14"
                onClick={handleGenerateInvoice}
                disabled={submitting || hasInvalidStock || !customer || payloadLines.length === 0}
              >
                {showSuccess ? (
                  <>
                    <Check className="h-[18px] w-[18px] mr-2 animate-in fade-in zoom-in" />
                    Invoice Generated Successfully
                  </>
                ) : submitting ? (
                  <>
                    <Loader2 className="h-[18px] w-[18px] mr-2 animate-spin shrink-0" />
                    <span>Generating Invoice...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-[18px] w-[18px] mr-2 shrink-0" fill="currentColor" />
                    <span>Generate Invoice</span>
                  </>
                )}
              </Button>
              {showSuccess && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent-brand animate-in fade-in zoom-in" />
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-2xl p-6 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Invoice Preview
              </div>
              <div className="flex items-center gap-2">
                {completedInvoice && <PaymentStatusBadge status={completedInvoice.status} />}
                <div className="text-xs font-mono text-primary">{displayInvoiceNumber}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-6">
              <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary">
                <Zap className="h-4 w-4 text-primary-foreground" fill="currentColor" />
              </div>
              <span className="font-display font-bold">{storeName}</span>
            </div>
            <div className="text-sm text-muted-foreground mb-1">Billed to</div>
            <div className="font-semibold mb-6">{selectedCustomer?.name ?? "—"}</div>

            <div className="space-y-2 mb-6 max-h-56 overflow-y-auto">
              {lines
                .filter((line) => line.product)
                .map((line) => (
                  <div
                    key={line.id}
                    className="flex justify-between text-sm py-2 border-b border-border/60 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{line.product}</div>
                      <div className="text-xs text-muted-foreground">
                        {line.qty} × {formatCurrency(line.price)}
                      </div>
                    </div>
                    <div className="font-semibold shrink-0 ml-3">{formatCurrency(line.qty * line.price)}</div>
                  </div>
                ))}
            </div>

            <div className="rounded-xl gradient-primary text-primary-foreground p-4 flex justify-between items-center">
              <span className="text-sm font-medium">Total Due</span>
              <span className="font-display text-xl font-bold">{formatCurrency(remainingAmount)}</span>
            </div>

            {completedInvoice && (
              <div className="mt-4 rounded-xl border border-border p-4 space-y-2 text-sm">
                <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  Payment Summary
                </div>
                <div className="flex justify-between">
                  <span>Total billed</span>
                  <span className="font-medium">{formatCurrency(completedInvoice.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid amount</span>
                  <span className="font-medium text-accent-brand">{formatCurrency(paidAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining</span>
                  <span className="font-medium text-warning">{formatCurrency(remainingAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST</span>
                  <span className="font-medium">{formatCurrency(completedInvoice.tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment method</span>
                  <span className="font-medium">{completedInvoice.paymentMethod || paymentMethod || "—"}</span>
                </div>
                {isUnpaidInvoiceStatus(completedInvoice.status) && (
                  <div className="pt-2 space-y-2">
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      className="w-full bg-accent-brand text-accent-brand-foreground"
                      onClick={() => void handleMarkAsPaid()}
                      disabled={submitting}
                    >
                      Mark as Paid
                    </Button>
                  </div>
                )}
              </div>
            )}

            {completedInvoice && business && (
              <div className="mt-4">
                <InvoiceActions
                  invoice={completedInvoice}
                  business={business}
                  customer={selectedCustomer}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={!invoiceCreated}>
                <Download className="h-4 w-4 mr-1" /> PDF
              </Button>
              <Button
                size="sm"
                className="bg-accent-brand text-accent-brand-foreground"
                onClick={handleSendInvoice}
                disabled={!selectedCustomer || !hasPhone || payloadLines.length === 0 || submitting}
              >
                <Send className="h-4 w-4 mr-1" /> Send
              </Button>
            </div>

            {showNextCustomer && (
              <Button className="w-full mt-3" variant="secondary" onClick={resetForNextCustomer}>
                <UserRound className="h-4 w-4 mr-2" /> Next Customer
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={saveInlineCustomer}>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={customerForm.name}
                onChange={(e) => setCustomerForm((c) => ({ ...c, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={customerForm.phone}
                onChange={(e) =>
                  setCustomerForm((c) => ({ ...c, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm((c) => ({ ...c, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={customerForm.address ?? ""}
                onChange={(e) => setCustomerForm((c) => ({ ...c, address: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Textarea
                value={customerForm.gstNumber ?? ""}
                onChange={(e) => setCustomerForm((c) => ({ ...c, gstNumber: e.target.value.toUpperCase() }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={customerForm.notes ?? ""}
                onChange={(e) => setCustomerForm((c) => ({ ...c, notes: e.target.value }))}
                rows={2}
              />
            </div>
            {customerFormError && <div className="text-sm text-destructive">{customerFormError}</div>}
            <Button type="submit" className="w-full" disabled={savingCustomer}>
              {savingCustomer ? "Saving..." : "Save Customer"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
