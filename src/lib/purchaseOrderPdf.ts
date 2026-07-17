import { jsPDF } from "jspdf";
import type { BusinessProfile, PurchaseOrder, Supplier } from "@/lib/api";

export type PurchaseOrderPdfOptions = {
  purchaseOrder: PurchaseOrder;
  business: BusinessProfile;
};

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

export async function generatePurchaseOrderPDF({ purchaseOrder, business }: PurchaseOrderPdfOptions) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 40;
  let cursorY = 50;

  // Render business logo if exists
  if (business.logoDataUrl) {
    try {
      pdf.addImage(business.logoDataUrl, "PNG", margin, cursorY - 10, 48, 48);
    } catch {
      // ignore invalid logo
    }
  }

  // Header Title
  pdf.setFontSize(18);
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
  if (business.phone) pdf.text(`Phone: ${business.phone}`, headerX, cursorY + 56);

  // PO Title & Details right-aligned
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("PURCHASE ORDER", pageWidth - margin, cursorY + 10, { align: "right" });
  
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(`PO Number: ${purchaseOrder.purchaseOrderNumber}`, pageWidth - margin, cursorY + 26, { align: "right" });
  pdf.text(`Date: ${formatPdfDate(purchaseOrder.createdAt)}`, pageWidth - margin, cursorY + 38, { align: "right" });
  pdf.text(`Status: ${purchaseOrder.status}`, pageWidth - margin, cursorY + 50, { align: "right" });
  if (purchaseOrder.expectedDeliveryDate) {
    pdf.text(`Expected Delivery: ${formatPdfDate(purchaseOrder.expectedDeliveryDate)}`, pageWidth - margin, cursorY + 62, { align: "right" });
  }

  cursorY += 80;
  pdf.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 20;

  // Supplier info block
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Supplier / Vendor Details:", margin, cursorY);
  pdf.setFont("helvetica", "normal");
  
  const supplier = purchaseOrder.supplier as Supplier;
  const supplierName = typeof purchaseOrder.supplier === "string" ? purchaseOrder.supplierName : (supplier?.supplierName || purchaseOrder.supplierName);
  const supplierPerson = typeof purchaseOrder.supplier === "object" && supplier?.contactPerson ? supplier.contactPerson : "";
  const supplierMobile = typeof purchaseOrder.supplier === "object" && supplier?.mobileNumber ? supplier.mobileNumber : "";
  const supplierGst = typeof purchaseOrder.supplier === "object" && supplier?.gstNumber ? supplier.gstNumber : "";
  const supplierAddr = typeof purchaseOrder.supplier === "object" && supplier?.address ? supplier.address : "";

  pdf.text(supplierName, margin, cursorY + 16);
  let supCursorY = cursorY + 30;
  if (supplierPerson) {
    pdf.text(`Contact: ${supplierPerson}`, margin, supCursorY);
    supCursorY += 14;
  }
  if (supplierMobile) {
    pdf.text(`Mobile: ${supplierMobile}`, margin, supCursorY);
    supCursorY += 14;
  }
  if (supplierGst) {
    pdf.text(`GSTIN: ${supplierGst}`, margin, supCursorY);
    supCursorY += 14;
  }
  if (supplierAddr) {
    pdf.text(supplierAddr, margin, supCursorY, { maxWidth: 200 });
  }

  cursorY += 100;

  // Items table header
  pdf.setFont("helvetica", "bold");
  pdf.text("Description", margin, cursorY);
  pdf.text("Qty", margin + 260, cursorY, { align: "right" });
  pdf.text("Rate (₹)", margin + 340, cursorY, { align: "right" });
  pdf.text("Total (₹)", pageWidth - margin, cursorY, { align: "right" });
  
  cursorY += 8;
  pdf.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 16;
  
  pdf.setFont("helvetica", "normal");
  let subtotal = 0;

  purchaseOrder.items.forEach(item => {
    const lineTotal = item.quantity * item.purchasePrice;
    subtotal += lineTotal;
    
    // Description text
    const desc = item.sku ? `${item.productName} (${item.sku})` : item.productName;
    pdf.text(desc, margin, cursorY, { maxWidth: 220 });
    pdf.text(`${item.quantity} ${item.unit || 'units'}`, margin + 260, cursorY, { align: "right" });
    pdf.text(item.purchasePrice.toFixed(2), margin + 340, cursorY, { align: "right" });
    pdf.text(lineTotal.toFixed(2), pageWidth - margin, cursorY, { align: "right" });
    
    cursorY += 20;
  });

  pdf.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 20;

  // Calculation details (Subtotal, CGST SGST 9%, Grand Total)
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  const totalWithTax = subtotal + cgst + sgst;

  pdf.setFont("helvetica", "bold");
  pdf.text("Subtotal:", pageWidth - margin - 150, cursorY, { align: "left" });
  pdf.setFont("helvetica", "normal");
  pdf.text(subtotal.toFixed(2), pageWidth - margin, cursorY, { align: "right" });
  cursorY += 16;

  pdf.setFont("helvetica", "bold");
  pdf.text("CGST (9%):", pageWidth - margin - 150, cursorY, { align: "left" });
  pdf.setFont("helvetica", "normal");
  pdf.text(cgst.toFixed(2), pageWidth - margin, cursorY, { align: "right" });
  cursorY += 16;

  pdf.setFont("helvetica", "bold");
  pdf.text("SGST (9%):", pageWidth - margin - 150, cursorY, { align: "left" });
  pdf.setFont("helvetica", "normal");
  pdf.text(sgst.toFixed(2), pageWidth - margin, cursorY, { align: "right" });
  cursorY += 18;

  pdf.line(pageWidth - margin - 160, cursorY, pageWidth - margin, cursorY);
  cursorY += 16;

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("Grand Total (₹):", pageWidth - margin - 150, cursorY, { align: "left" });
  pdf.text(totalWithTax.toFixed(2), pageWidth - margin, cursorY, { align: "right" });
  
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");

  // Signature Area
  cursorY += 70;
  pdf.line(margin, cursorY, margin + 150, cursorY);
  pdf.text("Authorized Signature", margin, cursorY + 14);

  // Notes
  if (purchaseOrder.notes) {
    cursorY += 40;
    pdf.setFont("helvetica", "bold");
    pdf.text("Notes / Remarks:", margin, cursorY);
    pdf.setFont("helvetica", "normal");
    pdf.text(purchaseOrder.notes, margin, cursorY + 16, { maxWidth: pageWidth - 2 * margin });
  }

  return pdf;
}

export async function downloadPurchaseOrderPDF(options: PurchaseOrderPdfOptions) {
  const pdf = await generatePurchaseOrderPDF(options);
  pdf.save(`PO-${options.purchaseOrder.purchaseOrderNumber}.pdf`);
}
