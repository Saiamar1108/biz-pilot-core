import type { PurchaseOrder } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

export function generatePurchaseOrderMessage(purchaseOrder: PurchaseOrder, businessName: string): string {
  const lines = [
    `🏪 ${businessName}`,
    "",
    "━━━━━━━━━━━━━━━━━━",
    "📋 PURCHASE ORDER",
    "━━━━━━━━━━━━━━━━━━",
    "",
    `Generated: ${new Date(purchaseOrder.generatedAt).toLocaleDateString("en-IN")}`,
    "",
    "━━━━━━━━━━━━━━━━━━",
    "ITEMS TO ORDER",
    "━━━━━━━━━━━━━━━━━━",
    "",
  ];

  for (const item of purchaseOrder.items) {
    const urgencyEmoji = item.urgency === "critical" ? "🔴" : item.urgency === "high" ? "🟠" : item.urgency === "medium" ? "🟡" : "🟢";
    lines.push(
      `${urgencyEmoji} ${item.productName}`,
      `  SKU: ${item.sku}`,
      `  Category: ${item.category}`,
      `  Current Stock: ${item.currentStock}`,
      `  Order Qty: ${item.recommendedQuantity}`,
      `  Est. Cost: ${formatCurrency(item.estimatedCost)}`,
      `  Confidence: ${item.confidence}%`,
      `  Reason: ${item.explanation}`,
      ""
    );
  }

  lines.push(
    "━━━━━━━━━━━━━━━━━━",
    "",
    `Total Estimated Cost: ${formatCurrency(purchaseOrder.totalEstimatedCost)}`,
    "",
    "━━━━━━━━━━━━━━━━━━",
    "📌 NOTES",
    "━━━━━━━━━━━━━━━━━━",
    "• Please review quantities before ordering",
    "• Urgent items marked with 🔴",
    "• Contact supplier for bulk discounts",
    "",
    "━━━━━━━━━━━━━━━━━━",
    "",
    "Thank you for your business.",
    "",
    "Powered by ShopPilot AI"
  );

  return lines.join("\n");
}

export function openWhatsAppWithPurchaseOrder(purchaseOrder: PurchaseOrder, businessName: string, supplierPhone: string) {
  const message = generatePurchaseOrderMessage(purchaseOrder, businessName);
  const normalizedPhone = supplierPhone.replace(/\D/g, "");
  if (normalizedPhone.length >= 10) {
    const whatsappNumber = normalizedPhone.length === 10 ? `91${normalizedPhone}` : normalizedPhone;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
  }
}