import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { generateInvoiceWhatsAppMessage } from "@/lib/invoice/messages";
import type { Invoice, BusinessProfile, Customer } from "@/lib/api";
import { Copy } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName?: string | null;
  customerPhone?: string | null;
  invoice?: Invoice;
  business?: BusinessProfile;
  customer?: Customer | null;
};

export default function SendSmsModal({ open, onOpenChange, customerName, customerPhone, invoice, business, customer }: Props) {
  const [message, setMessage] = useState("");

  // Generate invoice message when modal opens with invoice data
  useEffect(() => {
    if (open && invoice && business) {
      try {
        const generatedMessage = generateInvoiceWhatsAppMessage({
          invoice,
          business,
          customer: customer || undefined,
        });
        setMessage(generatedMessage);
      } catch (err) {
        // If generation fails, keep message empty
        setMessage("");
      }
    }
  }, [open, invoice, business, customer]);

  const charCount = useMemo(() => message.length, [message]);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message).then(() => {
      toast.success("Message copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy message");
    });
  };

  const handleSend = () => {
    if (!customerName && !customerPhone) {
      toast.error("Please select a customer.");
      return;
    }
    if (!customerPhone) {
      toast.error("Customer phone number is missing.");
      return;
    }

    const phone = customerPhone.replace(/[^0-9+]/g, "");
    const body = encodeURIComponent(message || "");
    // Use sms: URL scheme. iOS expects '&' between number and body, Android/others support '?'
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
    const sep = isIos ? "&" : "?";
    const url = `sms:${phone}${sep}body=${body}`;

    console.log("SMS debug:", {
      customer: { name: customerName, phone: customerPhone },
      phone,
      message,
      url,
    });

    // Close modal and open SMS app
    onOpenChange(false);
    try {
      window.location.href = url;
    } catch (err) {
      toast.error("Unable to open SMS application.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send SMS</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Customer</label>
            <Input value={customerName ?? ""} readOnly />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Phone</label>
            <Input value={customerPhone ?? ""} readOnly />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Message</label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} />
            <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
              <span>{charCount} characters</span>
              {message && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyMessage}
                  className="h-6 px-2"
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend}>Send SMS</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
