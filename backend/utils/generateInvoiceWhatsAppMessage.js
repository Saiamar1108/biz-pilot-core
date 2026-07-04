const { getOutstandingAmount } = require("./invoiceAmounts");
const { buildUpiPaymentUrl } = require("./generatePaymentQRCode");

const numberOrZero = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value) =>
  `₹${numberOrZero(value).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const STORE_POLICIES = [
  "No return after 7 days",
  "Exchange only within 7 days",
  "Original bill required for exchange",
  "Opened/used products cannot be returned",
  "Damaged products must be reported within 24 hours",
];

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function statusLabel(status) {
  if (!status) return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function generateInvoiceWhatsAppMessage({ invoice, business = {}, customer = {} }) {
  const shopName = business.storeName || "ShopPilot Store";
  const address = business.address || "";
  const phone = business.phone || "";
  const gst = business.gstNumber || "";
  const upiId =
    business.upiId ||
    `${String(business.phone || "")
      .replace(/\D/g, "")
      .slice(-10)}@upi`;

  const customerName = customer.name || invoice.customerName || "Customer";
  const customerPhone = customer.phone || "";
  const customerEmail = customer.email || "";

  const invoiceNumber = invoice.invoiceNumber || invoice.id || "—";
  const createdAt = invoice.createdAt || new Date();
  const dueDate = invoice.dueDate || createdAt;
  const status = statusLabel(invoice.status);
  const subtotal = numberOrZero(invoice.subtotal);
  const taxRate = numberOrZero(invoice.taxRate);
  const tax = numberOrZero(invoice.tax);
  const discount = numberOrZero(invoice.discount);
  const grandTotal = numberOrZero(invoice.total ?? invoice.amount);
  const paidAmount = numberOrZero(invoice.paidAmount);
  const pendingAmount = getOutstandingAmount(invoice);

  const paymentLink = buildUpiPaymentUrl({
    upiId,
    payeeName: shopName,
    amount: pendingAmount > 0 ? pendingAmount : grandTotal,
    note: `Invoice ${invoiceNumber}`,
  });

  const lines = [`🏪 ${shopName}`];

  if (address) lines.push(`📍 ${address}`);
  if (phone) lines.push(`📞 ${phone}`);
  if (gst) lines.push(`GSTIN: ${gst}`);

  lines.push(
    "",
    "━━━━━━━━━━━━━━━━━━",
    "🧾 TAX INVOICE",
    "━━━━━━━━━━━━━━━━━━",
    "",
    `Invoice No: ${invoiceNumber}`,
    `Date: ${formatDate(createdAt)}`,
    `Time: ${formatTime(createdAt)}`,
    `Due Date: ${formatDate(dueDate)}`,
    `Status: ${status}`,
    "",
    `Customer: ${customerName}`,
  );

  if (customerPhone) lines.push(`Phone: ${customerPhone}`);
  if (customerEmail) lines.push(`Email: ${customerEmail}`);

  lines.push("", "━━━━━━━━━━━━━━━━━━", "ITEMS", "━━━━━━━━━━━━━━━━━━", "");

  for (const item of invoice.lineItems || []) {
    const name = item.productName || item.name || "Item";
    const qty = numberOrZero(item.quantity);
    const unit = numberOrZero(item.unitPrice ?? item.price);
    const lineTotal = numberOrZero(item.lineTotal ?? qty * unit);
    lines.push(`${name}`);
    lines.push(`Qty: ${qty} × ${money(unit)} = ${money(lineTotal)}`, "");
  }

  lines.push(
    "━━━━━━━━━━━━━━━━━━",
    "",
    `Subtotal: ${money(subtotal)}`,
    `Tax (${(taxRate * 100).toFixed(1)}%): ${money(tax)}`,
  );

  if (discount > 0) {
    lines.push(`Discount: -${money(discount)}`);
  }

  lines.push(
    `Grand Total: ${money(grandTotal)}`,
    `Paid: ${money(paidAmount)}`,
    `Pending: ${money(pendingAmount)}`,
    "",
    "━━━━━━━━━━━━━━━━━━",
    "📌 STORE POLICY",
    "━━━━━━━━━━━━━━━━━━",
  );

  for (const policy of STORE_POLICIES) {
    lines.push(`• ${policy}`);
  }

  lines.push("");

  if (paymentLink) {
    lines.push("💳 Payment Link:", paymentLink, "");
  }

  lines.push(
    "🙏 Thank you for shopping with us.",
    "",
    "For support:",
    phone || "Contact store",
    "",
    "Powered by ShopPilot AI",
  );

  return lines.join("\n");
}

module.exports = {
  generateInvoiceWhatsAppMessage,
  STORE_POLICIES,
};
