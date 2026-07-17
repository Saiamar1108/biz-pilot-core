import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName?: string | null;
  customerPhone?: string | null;
};

export default function SendSmsModal({ open, onOpenChange, customerName, customerPhone }: Props) {
  const [message, setMessage] = useState("");

  const charCount = useMemo(() => message.length, [message]);

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
    // Use sms: URL scheme; ?body is widely supported
    const url = `sms:${phone}?body=${body}`;
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
            <div className="text-right text-xs text-muted-foreground">{charCount} characters</div>
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
