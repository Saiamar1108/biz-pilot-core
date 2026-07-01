import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuantityControl } from "@/components/dashboard/QuantityControl";
import { Plus, Trash2, FileText, Download, Send, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { customerNames, productOptions, products } from "@/lib/mock-data";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "Billing — ShopPilot AI" }] }),
  component: BillingPage,
});

type Line = { id: number; product: string; qty: number; price: number };

function BillingPage() {
  const [customer, setCustomer] = useState<string>("");
  const [lines, setLines] = useState<Line[]>([
    { id: 1, product: "Basmati Rice 5kg", qty: 2, price: 12.5 },
  ]);

  const invoiceNumber = useMemo(() => `INV-00${Math.floor(Math.random() * 900 + 100)}`, []);

  const addLine = () => setLines([...lines, { id: Date.now(), product: "", qty: 1, price: 0 }]);
  const update = (id: number, patch: Partial<Line>) =>
    setLines(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const remove = (id: number) => setLines(lines.filter((l) => l.id !== id));

  const selectProduct = (id: number, productName: string) => {
    const product = products.find((p) => p.name === productName);
    update(id, { product: productName, price: product?.price ?? 0 });
  };

  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

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
                  {customerNames.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

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
                            {productOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
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

            <Button className="w-full gradient-primary text-primary-foreground shadow-glow h-11">
              <Zap className="h-4 w-4 mr-2" /> Generate Invoice
            </Button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-2xl p-6 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Invoice Preview</div>
              <div className="text-xs font-mono text-primary">{invoiceNumber}</div>
            </div>
            <div className="flex items-center gap-2 mb-6">
              <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary">
                <Zap className="h-4 w-4 text-primary-foreground" fill="currentColor" />
              </div>
              <span className="font-display font-bold">ShopPilot</span>
            </div>
            <div className="text-sm text-muted-foreground mb-1">Billed to</div>
            <div className="font-semibold mb-6">{customer || "—"}</div>

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
              <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> PDF</Button>
              <Button size="sm" className="bg-accent-brand text-accent-brand-foreground"><Send className="h-4 w-4 mr-1" /> Send</Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
