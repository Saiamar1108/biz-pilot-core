import type { BusinessProfile, Customer, Invoice } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

export const STORE_POLICIES = [
  "No return after 7 days",
  "Damaged products must be reported within 24 hours",
];

export type InvoiceMessageContext = {
  invoice: Invoice;
  business: BusinessProfile;
  customer?: Pick<Customer, "name" | "phone" | "email"> | null;
};

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function statusLabel(status: Invoice["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getInvoiceOutstanding(invoice: Invoice) {
  if (invoice.status === "paid") return 0;
  if (invoice.status === "partial") {
    return invoice.pendingAmount > 0
      ? invoice.pendingAmount
      : Math.max(0, invoice.amount - invoice.paidAmount);
  }
  if (
    invoice.status === "pending" ||
    invoice.status === "sent" ||
    invoice.status === "overdue"
  ) {
    return invoice.amount;
  }
  return invoice.pendingAmount;
}

export function normalizePhoneForWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits.length >= 10 ? digits : "";
}

export function openWhatsApp(phone: string, message: string) {
  const normalized = normalizePhoneForWhatsApp(phone);
  if (!normalized) {
    throw new Error("Customer phone number is missing or invalid.");
  }
  window.open(
    `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

export function generateInvoiceWhatsAppMessage({
  invoice,
  business,
  customer,
}: InvoiceMessageContext) {
  const shopName = business.storeName || "ShopPilot Store";
  const pendingAmount = getInvoiceOutstanding(invoice);
  const paymentLink = buildUpiPaymentUrl({
    upiId: resolveUpiId(business),
    payeeName: shopName,
    amount: pendingAmount > 0 ? pendingAmount : invoice.amount,
    note: `Invoice ${invoice.id}`,
  });

  const lines = [
    `🏪 ${shopName}`,
    business.address ? `📍 ${business.address}` : "",
    business.phone ? `📞 ${business.phone}` : "",
    business.gstNumber ? `GSTIN: ${business.gstNumber}` : "",
    "",
    "━━━━━━━━━━━━━━━━━━",
    "🧾 TAX INVOICE",
    "━━━━━━━━━━━━━━━━━━",
    "",
    `Invoice No: ${invoice.id}`,
    `Date: ${formatDate(invoice.createdAt || invoice.date)}`,
    `Time: ${formatTime(invoice.createdAt)}`,
    `Due Date: ${formatDate(invoice.dueDate)}`,
    `Status: ${statusLabel(invoice.status)}`,
    "",
    `Customer: ${customer?.name || invoice.customer}`,
    customer?.phone ? `Phone: ${customer.phone}` : "",
    customer?.email ? `Email: ${customer.email}` : "",
    "",
    "━━━━━━━━━━━━━━━━━━",
    "ITEMS",
    "━━━━━━━━━━━━━━━━━━",
    "",
  ].filter((line, index, array) => !(line === "" && array[index - 1] === ""));

  for (const item of invoice.lineItems) {
    lines.push(
      `• ${item.productName}`,
      `  Qty: ${item.quantity} × ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.lineTotal)}`,
      "",
    );
  }

  lines.push(
    "━━━━━━━━━━━━━━━━━━",
    "",
    `Subtotal: ${formatCurrency(invoice.subtotal)}`,
    `Tax (${(invoice.taxRate * 100).toFixed(1)}%): ${formatCurrency(invoice.tax)}`,
  );

  if (invoice.discount > 0) {
    lines.push(`Discount: -${formatCurrency(invoice.discount)}`);
  }

  lines.push(
    `Grand Total: ${formatCurrency(invoice.amount)}`,
    `Paid: ${formatCurrency(invoice.paidAmount)}`,
    `Pending: ${formatCurrency(pendingAmount)}`,
    "",
    "━━━━━━━━━━━━━━━━━━",
    "📌 STORE POLICY",
    "━━━━━━━━━━━━━━━━━━",
    "No return. Exchange only within 7 days.",
  );

  if (paymentLink) {
    lines.push("", "💳 Payment Link:", paymentLink);
  }

  lines.push(
    "",
    "🙏 Thank you for shopping with us.",
    "",
    "For support:",
    business.phone || "Contact store",
    "",
    "Powered by ShopPilot AI",
  );

  return lines.join("\n");
}

export function generateReminderMessage({
  invoice,
  business,
  customer,
}: InvoiceMessageContext) {
  const shopName = business.storeName || "Our Store";
  const pending = getInvoiceOutstanding(invoice);
  const paymentLink = buildUpiPaymentUrl({
    upiId: resolveUpiId(business),
    payeeName: shopName,
    amount: pending,
    note: `Invoice ${invoice.id}`,
  });

  const lines = [
    `Hello ${customer?.name || invoice.customer},`,
    "",
    `This is a gentle reminder from ${shopName}.`,
    "",
    `Your invoice #${invoice.id} of ${formatCurrency(pending)} is still pending.`,
    "",
    `Invoice Date: ${formatDate(invoice.createdAt || invoice.date)}`,
    `Due Date: ${formatDate(invoice.dueDate)}`,
    "",
    "Kindly clear the payment at your earliest convenience.",
    "",
  ];

  if (paymentLink) {
    lines.push("Payment Link:", paymentLink, "");
  }

  lines.push(
    "For any queries contact:",
    business.phone || "Store support",
    "",
    "Thank you.",
    "",
    "Powered by ShopPilot AI",
  );

  return lines.join("\n");
}

export function resolveUpiId(business: BusinessProfile) {
  if (business.upiId?.trim()) return business.upiId.trim();
  const digits = business.phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    return `${digits.slice(-10)}@upi`;
  }
  return "";
}

export function buildUpiPaymentUrl({
  upiId,
  payeeName,
  amount,
  note,
}: {
  upiId: string;
  payeeName: string;
  amount: number;
  note?: string;
}) {
  const pa = upiId.trim();
  if (!pa) return "";

  const params = new URLSearchParams();
  params.set("pa", pa);
  if (payeeName) params.set("pn", payeeName.slice(0, 50));
  if (amount > 0) params.set("am", amount.toFixed(2));
  if (note) params.set("tn", note.slice(0, 80));
  return `upi://pay?${params.toString()}`;
}

export function buildQrImageUrl(paymentUrl: string, size = 200) {
  if (!paymentUrl) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(paymentUrl)}`;
}

export function generatePaymentQRCode({
  business,
  amount,
  note,
  size = 200,
}: {
  business: BusinessProfile;
  amount: number;
  note?: string;
  size?: number;
}) {
  const paymentUrl = buildUpiPaymentUrl({
    upiId: resolveUpiId(business),
    payeeName: business.storeName,
    amount,
    note,
  });

  return {
    paymentUrl,
    qrImageUrl: buildQrImageUrl(paymentUrl, size),
  };
}
