/**
 * Server-side PDF generation is handled in the frontend via jsPDF.
 * This module exposes shared invoice document metadata for API consumers.
 */
const {
  generateInvoiceWhatsAppMessage,
  STORE_POLICIES,
} = require("./generateInvoiceWhatsAppMessage");
const { generatePaymentQRCode } = require("./generatePaymentQRCode");

function getInvoiceDocumentMeta({ invoice, business, customer }) {
  const qr = generatePaymentQRCode({
    upiId: business?.upiId,
    payeeName: business?.storeName,
    amount: invoice.total,
    note: invoice.invoiceNumber,
  });

  return {
    whatsappMessage: generateInvoiceWhatsAppMessage({ invoice, business, customer }),
    storePolicies: STORE_POLICIES,
    paymentQr: qr,
  };
}

module.exports = {
  getInvoiceDocumentMeta,
};
