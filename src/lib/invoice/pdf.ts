import type { BusinessProfile, Invoice } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import {
  STORE_POLICIES,
  buildQrImageUrl,
  buildUpiPaymentUrl,
  getInvoiceOutstanding,
  resolveUpiId,
} from "@/lib/invoice/messages";

export type InvoicePdfOptions = {
  invoice: Invoice;
  business: BusinessProfile;
  customerName?: string;
};

async function loadImageDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function formatPdfDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function generateInvoicePDF({ invoice, business, customerName }: InvoicePdfOptions) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 40;
  let cursorY = 50;

  if (business.logoDataUrl) {
    try {
      pdf.addImage(business.logoDataUrl, "PNG", margin, cursorY - 10, 48, 48);
    } catch {
      // ignore invalid logo
    }
  }

  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text(
    business.storeName || "ShopPilot Store",
    margin + (business.logoDataUrl ? 58 : 0),
    cursorY + 10,
  );
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");

  const headerX = margin + (business.logoDataUrl ? 58 : 0);
  if (business.address) pdf.text(business.address, headerX, cursorY + 28);
  if (business.gstNumber) pdf.text(`GSTIN: ${business.gstNumber}`, headerX, cursorY + 42);
  if (business.phone) pdf.text(business.phone, headerX, cursorY + 56);

  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("TAX INVOICE", pageWidth - margin, cursorY + 10, { align: "right" });
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Invoice: ${invoice.id}`, pageWidth - margin, cursorY + 28, { align: "right" });
  pdf.text(
    `Date: ${formatPdfDate(invoice.createdAt || invoice.date)}`,
    pageWidth - margin,
    cursorY + 42,
    {
      align: "right",
    },
  );
  pdf.text(`Due: ${formatPdfDate(invoice.dueDate)}`, pageWidth - margin, cursorY + 56, {
    align: "right",
  });
  pdf.text(`Status: ${invoice.status}`, pageWidth - margin, cursorY + 70, { align: "right" });

  cursorY += business.logoDataUrl ? 90 : 78;
  pdf.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 20;

  pdf.setFont("helvetica", "bold");
  pdf.text("Bill To", margin, cursorY);
  pdf.setFont("helvetica", "normal");
  pdf.text(customerName || invoice.customer, margin, cursorY + 16);
  if (invoice.customerPhone) pdf.text(invoice.customerPhone, margin, cursorY + 30);
  if (invoice.customerEmail) pdf.text(invoice.customerEmail, margin, cursorY + 44);
  cursorY += 64;

  pdf.setFont("helvetica", "bold");
  pdf.text("Product", margin, cursorY);
  pdf.text("Qty", pageWidth - margin - 180, cursorY);
  pdf.text("Unit", pageWidth - margin - 110, cursorY, { align: "right" });
  pdf.text("Total", pageWidth - margin, cursorY, { align: "right" });
  cursorY += 14;
  pdf.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 16;
  pdf.setFont("helvetica", "normal");

  for (const line of invoice.lineItems) {
    if (cursorY > pageHeight - 180) {
      pdf.addPage();
      cursorY = margin;
    }
    pdf.text(line.productName, margin, cursorY);
    pdf.text(String(line.quantity), pageWidth - margin - 180, cursorY);
    pdf.text(formatCurrency(line.unitPrice), pageWidth - margin - 110, cursorY, { align: "right" });
    pdf.text(formatCurrency(line.lineTotal), pageWidth - margin, cursorY, { align: "right" });
    cursorY += 18;
  }

  cursorY += 10;
  pdf.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 22;

  // Calculate total discount
  let totalItemDiscount = 0;
  let afterItemDiscounts = invoice.subtotal;
  for (const line of invoice.lineItems) {
    const itemSubtotal = line.quantity * line.unitPrice;
    let itemDiscountAmount = 0;
    if (line.discountType === "percentage") {
      itemDiscountAmount = itemSubtotal * (line.discount / 100);
    } else {
      itemDiscountAmount = line.discount;
    }
    totalItemDiscount += itemDiscountAmount;
  }
  afterItemDiscounts = invoice.subtotal - totalItemDiscount;

  let invoiceDiscountAmount = 0;
  if (invoice.discountType === "percentage") {
    invoiceDiscountAmount = afterItemDiscounts * (invoice.discount / 100);
  } else {
    invoiceDiscountAmount = invoice.discount;
  }
  const totalDiscount = totalItemDiscount + invoiceDiscountAmount;

  const summary = [["Subtotal", formatCurrency(invoice.subtotal)]];

  if (totalItemDiscount > 0) {
    summary.push(["Item Discounts", `-${formatCurrency(totalItemDiscount)}`]);
  }

  if (invoiceDiscountAmount > 0) {
    summary.push(["Invoice Discount", `-${formatCurrency(invoiceDiscountAmount)}`]);
  }

  if (invoice.taxMode !== "none" && invoice.taxEnabled) {
    if (invoice.taxMode === "cgst-sgst") {
      summary.push(
        [`CGST (${((invoice.taxRate / 2) * 100).toFixed(1)}%)`, formatCurrency(invoice.cgst)],
        [`SGST (${((invoice.taxRate / 2) * 100).toFixed(1)}%)`, formatCurrency(invoice.sgst)],
      );
    } else if (invoice.taxMode === "igst") {
      summary.push([`IGST (${(invoice.taxRate * 100).toFixed(1)}%)`, formatCurrency(invoice.igst)]);
    } else {
      summary.push([`Tax (${(invoice.taxRate * 100).toFixed(1)}%)`, formatCurrency(invoice.tax)]);
    }
  }

  summary.push(
    ["Grand Total", formatCurrency(invoice.amount)],
    ["Paid", formatCurrency(invoice.paidAmount)],
    ["Pending", formatCurrency(getInvoiceOutstanding(invoice))],
  );

  pdf.setFont("helvetica", "bold");
  for (const [label, value] of summary) {
    pdf.text(label, pageWidth - margin - 110, cursorY, { align: "right" });
    pdf.text(value, pageWidth - margin, cursorY, { align: "right" });
    cursorY += 16;
  }

  const paymentUrl = buildUpiPaymentUrl({
    upiId: resolveUpiId(business),
    payeeName: business.storeName,
    amount: invoice.amount,
    note: invoice.id,
  });

  if (paymentUrl) {
    const qrUrl = buildQrImageUrl(paymentUrl, 140);
    const qrData = await loadImageDataUrl(qrUrl);
    if (qrData && cursorY < pageHeight - 160) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Scan to Pay", margin, cursorY);
      pdf.addImage(qrData, "PNG", margin, cursorY + 8, 100, 100);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(paymentUrl, margin, cursorY + 118, { maxWidth: 220 });
      pdf.setFontSize(10);
    }
  }

  cursorY = Math.max(cursorY + 20, pageHeight - 140);
  pdf.setFont("helvetica", "bold");
  pdf.text("Terms & Conditions", margin, cursorY);
  cursorY += 14;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  for (const policy of STORE_POLICIES) {
    pdf.text(`• ${policy}`, margin, cursorY);
    cursorY += 12;
  }

  cursorY += 10;
  pdf.setFontSize(10);
  pdf.text("Authorized Signature", margin, cursorY + 30);
  pdf.line(margin, cursorY + 20, margin + 140, cursorY + 20);
  pdf.text("Powered by ShopPilot AI", pageWidth - margin, pageHeight - 30, { align: "right" });

  return pdf;
}

export async function downloadInvoicePDF(options: InvoicePdfOptions) {
  const pdf = await generateInvoicePDF(options);
  pdf.save(`invoice-${options.invoice.id}.pdf`);
}

export async function shareInvoicePDF(options: InvoicePdfOptions) {
  const pdf = await generateInvoicePDF(options);
  const blob = pdf.output("blob");
  const file = new File([blob], `invoice-${options.invoice.id}.pdf`, {
    type: "application/pdf",
  });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: `Invoice ${options.invoice.id}`,
      text: `Invoice from ${options.business.storeName}`,
      files: [file],
    });
    return;
  }

  pdf.save(`invoice-${options.invoice.id}.pdf`);
}
