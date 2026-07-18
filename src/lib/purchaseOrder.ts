import type { PurchaseOrder } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

export function sanitizeAndValidateWhatsAppNumber(phone: string): { isValid: boolean; error?: string; sanitized?: string } {
  if (!phone) {
    return { isValid: false, error: "Supplier phone number is missing." };
  }
  const sanitized = phone.replace(/[\+\s\-\(\)]/g, "");
  if (!sanitized) {
    return { isValid: false, error: "Supplier phone number is empty." };
  }
  if (!/^\d+$/.test(sanitized)) {
    return { isValid: false, error: "Supplier phone number contains invalid characters." };
  }
  if (sanitized.length <= 10) {
    return { isValid: false, error: "Country code is missing in supplier number (e.g., +91 for India)." };
  }
  return { isValid: true, sanitized };
}

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
  const validation = sanitizeAndValidateWhatsAppNumber(supplierPhone);
  if (validation.isValid) {
    window.open(`https://wa.me/${validation.sanitized}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  } else {
    toast.error(validation.error || "Invalid supplier number.");
  }
}