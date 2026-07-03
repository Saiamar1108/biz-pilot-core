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

function generateReminderMessage({ invoice, business = {}, customer = {} }) {
  const shopName = business.storeName || "Our Store";
  const phone = business.phone || "";
  const address = business.address || "";
  const customerName = customer.name || invoice.customerName || "Customer";
  const invoiceNumber = invoice.invoiceNumber || invoice.id || "—";
  const pending = getOutstandingAmount(invoice);
  const upiId = business.upiId || business.phone?.replace(/\D/g, "").slice(-10) + "@upi";

  const paymentLink = buildUpiPaymentUrl({
    upiId,
    payeeName: shopName,
    amount: pending,
    note: `Invoice ${invoiceNumber}`,
  });

  const lines = [
    `🏪 ${shopName}`,
    address ? `📍 ${address}` : "",
    phone ? `📞 ${phone}` : "",
    "",
    "━━━━━━━━━━━━━━━━━━",
    "💳 PAYMENT REMINDER",
    "━━━━━━━━━━━━━━━━━━",
    "",
    `Hello ${customerName},`,
    "",
    `This is a gentle reminder from ${shopName}.`,
    "",
    `Your invoice #${invoiceNumber} has ${money(pending)} pending.`,
    "",
    `Invoice Date: ${formatDate(invoice.createdAt)}`,
    `Time: ${formatTime(invoice.createdAt)}`,
    `Due Date: ${formatDate(invoice.dueDate)}`,
    "",
    "━━━━━━━━━━━━━━━━━━",
    "ITEMS",
    "━━━━━━━━━━━━━━━━━━",
    "",
  ];

  for (const item of invoice.lineItems || []) {
    const productName = item.productName || item.name || "Item";
    const quantity = numberOrZero(item.quantity);
    const unitPrice = numberOrZero(item.unitPrice || item.price);
    const lineTotal = numberOrZero(item.lineTotal || quantity * unitPrice);
    
    lines.push(
      `• ${productName}`,
      `  Qty: ${quantity} × ${money(unitPrice)} = ${money(lineTotal)}`,
      ""
    );
  }

  const total = numberOrZero(invoice.total || invoice.amount);
  const paidAmount = numberOrZero(invoice.paidAmount);

  lines.push(
    "━━━━━━━━━━━━━━━━━━",
    "",
    `Total: ${money(total)}`,
    `Paid: ${money(paidAmount)}`,
    `Pending: ${money(pending)}`,
    "",
    "━━━━━━━━━━━━━━━━━━",
    "📌 STORE POLICY",
    "━━━━━━━━━━━━━━━━━━",
    "No return. Exchange only within 7 days.",
    "",
    "Kindly clear the payment at your earliest convenience.",
  );

  if (paymentLink) {
    lines.push("", "💳 Payment Link:", paymentLink);
  }

  lines.push(
    "",
    "For any queries contact:",
    phone || "Store support",
    "",
    "Thank you.",
    "",
    "Powered by ShopPilot AI",
  );

  return lines.join("\n");
}

module.exports = {
  generateReminderMessage,
};
