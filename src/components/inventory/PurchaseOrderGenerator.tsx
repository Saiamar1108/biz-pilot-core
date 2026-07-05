import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Download, MessageCircle, ShoppingBag, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getPurchaseOrder } from "@/lib/api";
import { generatePurchaseOrderMessage, openWhatsAppWithPurchaseOrder } from "@/lib/purchaseOrder";
import { formatCurrency } from "@/lib/currency";

type PurchaseOrderGeneratorProps = {
  businessName: string;
};

export function PurchaseOrderGenerator({ businessName }: PurchaseOrderGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState<any>(null);
  const [supplierPhone, setSupplierPhone] = useState("");

  const loadPurchaseOrder = async () => {
    try {
      setLoading(true);
      const data = await getPurchaseOrder();
      setPurchaseOrder(data);
    } catch (err) {
      toast.error("Failed to generate purchase order");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    loadPurchaseOrder();
  };

  const handleWhatsApp = () => {
    if (!purchaseOrder || !supplierPhone) {
      toast.error("Please enter supplier phone number");
      return;
    }
    openWhatsAppWithPurchaseOrder(purchaseOrder, businessName, supplierPhone);
    toast.success("Opening WhatsApp with purchase order");
  };

  const handleDownload = () => {
    if (!purchaseOrder) return;
    
    const message = generatePurchaseOrderMessage(purchaseOrder, businessName);
    const blob = new Blob([message], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchase-order-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Purchase order downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={handleOpen}>
          <ShoppingBag className="h-4 w-4 mr-2" />
          Generate Purchase Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Purchase Order Generator</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Generating purchase order...</div>
        ) : purchaseOrder ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Total Items</div>
                <div className="text-2xl font-bold">{purchaseOrder.items.length}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Estimated Cost</div>
                <div className="text-2xl font-bold">{formatCurrency(purchaseOrder.totalEstimatedCost)}</div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Supplier Phone (for WhatsApp)</label>
              <Input
                placeholder="Enter supplier phone number"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Items to Order
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {purchaseOrder.items.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border bg-background/60 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-muted-foreground">
                          SKU: {item.sku} · Category: {item.category}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(item.estimatedCost)}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.recommendedQuantity} units
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground bg-secondary/30 p-2 rounded">
                      {item.explanation}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          Current Stock: {item.currentStock}
                        </span>
                        <span className="text-muted-foreground">
                          Confidence: {item.confidence}%
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full ${
                        item.urgency === "critical" ? "bg-red-100 text-red-700" :
                        item.urgency === "high" ? "bg-orange-100 text-orange-700" :
                        item.urgency === "medium" ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {item.urgency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleWhatsApp} disabled={!supplierPhone} className="flex-1">
                <MessageCircle className="h-4 w-4 mr-2" />
                Send via WhatsApp
              </Button>
              <Button onClick={handleDownload} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No items need reordering at this time.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}