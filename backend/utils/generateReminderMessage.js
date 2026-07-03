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

function generateReminderMessage({ invoice, business = {}, customer = {} }) {
  const shopName = business.storeName || "Our Store";
  const phone = business.phone || "";
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
    `Hello ${customerName},`,
    "",
    `This is a gentle reminder from ${shopName}.`,
    "",
    `Your invoice #${invoiceNumber} of ${money(pending)} is still pending.`,
    "",
    `Invoice Date: ${formatDate(invoice.createdAt)}`,
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
