import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Download, MessageCircle, ShoppingBag, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getPurchaseOrder, type PurchaseOrder } from "@/lib/api";
import { generatePurchaseOrderMessage, openWhatsAppWithPurchaseOrder } from "@/lib/purchaseOrder";
import { formatCurrency } from "@/lib/currency";

type PurchaseOrderGeneratorProps = {
  businessName: string;
  embedded?: boolean;
};

type PurchaseOrderItem = PurchaseOrder["items"][number];

export function PurchaseOrderGenerator({ businessName, embedded = false }: PurchaseOrderGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const loadPurchaseOrder = async () => {
    try {
      setLoading(true);
      const data = await getPurchaseOrder();
      setPurchaseOrder(data);
      setSelected(
        Object.fromEntries((data.items || []).map((item) => [item.sku || item.productName, true])),
      );
      setQuantities(
        Object.fromEntries(
          (data.items || []).map((item) => [
            item.sku || item.productName,
            item.recommendedQuantity,
          ]),
        ),
      );
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

  useEffect(() => {
    if (embedded) void loadPurchaseOrder();
  }, [embedded]);

  const selectedPurchaseOrder = useMemo(() => {
    if (!purchaseOrder) return null;
    const items = purchaseOrder.items
      .filter((item) => selected[item.sku || item.productName])
      .map((item) => {
        const key = item.sku || item.productName;
        const qty = Math.max(1, Number(quantities[key] || item.recommendedQuantity || 1));
        const unitCost = Number(item.estimatedCost || 0) / Math.max(1, Number(item.recommendedQuantity || 1));
        return {
          ...item,
          recommendedQuantity: qty,
          estimatedCost: Number((unitCost * qty).toFixed(2)),
        };
      });
    return {
      ...purchaseOrder,
      supplierName,
      items,
      totalEstimatedCost: items.reduce((sum, item) => sum + item.estimatedCost, 0),
    };
  }, [purchaseOrder, quantities, selected, supplierName]);

  const handleWhatsApp = () => {
    if (!selectedPurchaseOrder || !supplierPhone) {
      toast.error("Please enter supplier phone number");
      return;
    }
    openWhatsAppWithPurchaseOrder(selectedPurchaseOrder, businessName, supplierPhone);
    toast.success("Opening WhatsApp with purchase order");
  };

  const handleDownload = () => {
    if (!selectedPurchaseOrder) return;
    
    const message = generatePurchaseOrderMessage(selectedPurchaseOrder, businessName);
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

  const content = (
    <div className={embedded ? "rounded-lg border bg-card p-6" : ""}>
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Generating purchase order...</div>
      ) : selectedPurchaseOrder ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">Selected Items</div>
              <div className="text-2xl font-bold">{selectedPurchaseOrder.items.length}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Estimated Cost</div>
              <div className="text-2xl font-bold">{formatCurrency(selectedPurchaseOrder.totalEstimatedCost)}</div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Supplier</label>
              <Input
                placeholder="Supplier name"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Supplier Phone</label>
              <Input
                placeholder="Enter supplier phone number"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Items to Order
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {purchaseOrder.items.map((item: PurchaseOrderItem, index: number) => {
                const key = item.sku || item.productName;
                return (
                  <div key={index} className="p-3 rounded-lg border bg-background/60 space-y-2">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(selected[key])}
                        onChange={(e) => setSelected((current) => ({ ...current, [key]: e.target.checked }))}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-muted-foreground">
                          SKU: {item.sku} · Category: {item.category}
                        </div>
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          min={1}
                          value={quantities[key] || item.recommendedQuantity}
                          onChange={(e) =>
                            setQuantities((current) => ({ ...current, [key]: Number(e.target.value) || 1 }))
                          }
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground bg-secondary/30 p-2 rounded">
                      {item.explanation}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleWhatsApp} disabled={!supplierPhone || selectedPurchaseOrder.items.length === 0} className="flex-1">
              <MessageCircle className="h-4 w-4 mr-2" />
              Send via WhatsApp
            </Button>
            <Button onClick={handleDownload} variant="outline" disabled={selectedPurchaseOrder.items.length === 0} className="flex-1">
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
    </div>
  );

  if (embedded) return content;

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
        {content}
      </DialogContent>
    </Dialog>
  );
}
