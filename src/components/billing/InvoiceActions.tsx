import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import type { BusinessProfile, Customer, Invoice } from "@/lib/api";
import {
  downloadInvoicePDF,
  generateInvoiceWhatsAppMessage,
  generatePaymentQRCode,
  generateReminderMessage,
  getInvoiceOutstanding,
  openWhatsApp,
  shareInvoicePDF,
} from "@/lib/invoice";

type InvoiceActionsProps = {
  invoice: Invoice;
  business: BusinessProfile;
  customer?: Pick<Customer, "name" | "phone" | "email"> | null;
  compact?: boolean;
  onSent?: () => void;
};

export function InvoiceActions({
  invoice,
  business,
  customer,
  compact = false,
  onSent,
}: InvoiceActionsProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const customerContext = {
    name: customer?.name || invoice.customer,
    phone: customer?.phone || invoice.customerPhone,
    email: customer?.email || invoice.customerEmail,
  };

  const phone = customerContext.phone;
  const outstanding = getInvoiceOutstanding(invoice);
  const isUnpaid = invoice.status !== "paid" && outstanding > 0;

  const runAction = async (key: string, action: () => Promise<void> | void) => {
    try {
      setLoadingAction(key);
      await action();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSendInvoice = () =>
    runAction("send", () => {
      if (!phone) throw new Error("Customer phone number is required.");
      const message = generateInvoiceWhatsAppMessage({
        invoice,
        business,
        customer: customerContext,
      });
      openWhatsApp(phone, message);
      toast.success("Opening WhatsApp with invoice details");
      onSent?.();
    });

  const handleSendReminder = () =>
    runAction("reminder", () => {
      if (!phone) throw new Error("Customer phone number is required.");
      const message = generateReminderMessage({
        invoice,
        business,
        customer: customerContext,
      });
      openWhatsApp(phone, message);
      toast.success("Payment reminder sent via WhatsApp");
      onSent?.();
    });

  const handleDownloadPdf = () =>
    runAction("download", async () => {
      await downloadInvoicePDF({
        invoice,
        business,
        customerName: customerContext.name,
      });
      toast.success("Invoice PDF downloaded");
    });

  const handleSharePdf = () =>
    runAction("share", async () => {
      await shareInvoicePDF({
        invoice,
        business,
        customerName: customerContext.name,
      });
      toast.success("Invoice PDF shared");
    });

  const handleWhatsAppWithPdf = () =>
    runAction("whatsapp-pdf", async () => {
      if (!phone) throw new Error("Customer phone number is required.");
      await downloadInvoicePDF({
        invoice,
        business,
        customerName: customerContext.name,
      });
      const message = generateInvoiceWhatsAppMessage({
        invoice,
        business,
        customer: customerContext,
      });
      openWhatsApp(phone, `${message}\n\n(PDF downloaded — please attach it before sending.)`);
      toast.success("PDF downloaded. Attach it in WhatsApp before sending.");
    });

  const qr = generatePaymentQRCode({
    business,
    amount: outstanding > 0 ? outstanding : invoice.amount,
    note: invoice.id,
    size: 160,
  });

  const buttonSize = compact ? "sm" : "sm";
  const buttonClass = compact ? "h-8 text-xs" : "";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size={buttonSize}
          variant="outline"
          className={buttonClass}
          disabled={!!loadingAction || !phone}
          onClick={() => void handleSendInvoice()}
        >
          <Send className="h-3.5 w-3.5 mr-1" />
          {loadingAction === "send" ? "Sending…" : "Send Invoice"}
        </Button>

        {isUnpaid && (
          <Button
            type="button"
            size={buttonSize}
            variant="outline"
            className={buttonClass}
            disabled={!!loadingAction || !phone}
            onClick={() => void handleSendReminder()}
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1" />
            {loadingAction === "reminder" ? "Sending…" : "Send Reminder"}
          </Button>
        )}

        <Button
          type="button"
          size={buttonSize}
          variant="outline"
          className={buttonClass}
          disabled={!!loadingAction}
          onClick={() => void handleDownloadPdf()}
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          {loadingAction === "download" ? "Preparing…" : "Download PDF"}
        </Button>

        <Button
          type="button"
          size={buttonSize}
          variant="outline"
          className={buttonClass}
          disabled={!!loadingAction}
          onClick={() => void handleSharePdf()}
        >
          <FileText className="h-3.5 w-3.5 mr-1" />
          {loadingAction === "share" ? "Sharing…" : "Share PDF"}
        </Button>

        <Button
          type="button"
          size={buttonSize}
          className={buttonClass}
          disabled={!!loadingAction || !phone}
          onClick={() => void handleWhatsAppWithPdf()}
        >
          <MessageCircle className="h-3.5 w-3.5 mr-1" />
          WhatsApp + PDF
        </Button>
      </div>

      {qr.qrImageUrl && isUnpaid && (
        <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
          <img
            src={qr.qrImageUrl}
            alt="UPI payment QR code"
            className="h-20 w-20 rounded-md border bg-white p-1"
          />
          <div className="min-w-0 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Scan to pay</p>
            <p className="truncate">{qr.paymentUrl}</p>
          </div>
        </div>
      )}
    </div>
  );
}
