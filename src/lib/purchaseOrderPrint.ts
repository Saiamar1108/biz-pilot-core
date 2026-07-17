import type { BusinessProfile, PurchaseOrder, Supplier } from "@/lib/api";

export type PurchaseOrderPrintOptions = {
  purchaseOrder: PurchaseOrder;
  business: BusinessProfile;
};

export function printPurchaseOrder({ purchaseOrder, business }: PurchaseOrderPrintOptions) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup blocker prevented opening the print layout. Please allow popups for this site.");
    return;
  }

  const supplier = purchaseOrder.supplier as Supplier;
  const supplierName = typeof purchaseOrder.supplier === "string" ? purchaseOrder.supplierName : (supplier?.supplierName || purchaseOrder.supplierName);
  const supplierPerson = typeof purchaseOrder.supplier === "object" && supplier?.contactPerson ? supplier.contactPerson : "";
  const supplierMobile = typeof purchaseOrder.supplier === "object" && supplier?.mobileNumber ? supplier.mobileNumber : "";
  const supplierGst = typeof purchaseOrder.supplier === "object" && supplier?.gstNumber ? supplier.gstNumber : "";
  const supplierAddr = typeof purchaseOrder.supplier === "object" && supplier?.address ? supplier.address : "";

  const itemsRows = purchaseOrder.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <strong>${item.productName}</strong>
        ${item.sku ? `<br><small style="color: #666; font-family: monospace;">SKU: ${item.sku}</small>` : ""}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.quantity} ${item.unit || "units"}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.purchasePrice.toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">₹${(item.quantity * item.purchasePrice).toFixed(2)}</td>
    </tr>
  `).join("");

  const subtotal = purchaseOrder.items.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0);
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  const grandTotal = subtotal + cgst + sgst;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print PO - ${purchaseOrder.purchaseOrderNumber}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 40px; }
        .invoice-box { max-width: 800px; margin: auto; }
        table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
        .header-table td { vertical-align: top; }
        .header-title { font-size: 28px; font-weight: bold; color: #111; margin: 0; }
        .po-title { font-size: 24px; font-weight: bold; color: #6366f1; text-align: right; margin: 0; }
        .meta-text { font-size: 13px; color: #555; }
        .section-header { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #888; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 10px; margin-top: 30px; }
        .details-box { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-top: 20px; }
        .details-col { font-size: 13px; }
        .items-table { margin-top: 30px; }
        .items-table th { background-color: #f8fafc; font-size: 11px; text-transform: uppercase; font-weight: bold; color: #555; padding: 10px; border-bottom: 2px solid #eee; }
        .total-row td { padding: 8px 10px; font-size: 13px; }
        .grand-total td { font-size: 16px; font-weight: bold; border-top: 2px solid #333; color: #111; }
        .notes-box { background-color: #f8fafc; padding: 15px; border-radius: 6px; font-size: 12px; margin-top: 40px; border: 1px solid #e2e8f0; }
        .signature-box { display: flex; justify-content: flex-end; margin-top: 60px; }
        .sig-line { width: 200px; border-top: 1px solid #333; text-align: center; font-size: 12px; padding-top: 5px; font-weight: 600; }
        @media print {
          body { padding: 0; }
          .invoice-box { max-width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <table class="header-table">
          <tr>
            <td>
              ${business.logoDataUrl ? `<img src="${business.logoDataUrl}" style="max-height: 50px; margin-bottom: 10px;">` : ""}
              <div class="header-title">${business.storeName || "ShopPilot Store"}</div>
              <div class="meta-text" style="margin-top: 5px;">
                ${business.address ? `${business.address}<br>` : ""}
                ${business.phone ? `Phone: ${business.phone}<br>` : ""}
                ${business.gstNumber ? `GSTIN: <strong>${business.gstNumber}</strong>` : ""}
              </div>
            </td>
            <td style="text-align: right;">
              <div class="po-title">PURCHASE ORDER</div>
              <div class="meta-text" style="margin-top: 15px;">
                PO Number: <strong>${purchaseOrder.purchaseOrderNumber}</strong><br>
                Date: <strong>${new Date(purchaseOrder.createdAt || Date.now()).toLocaleDateString("en-IN")}</strong><br>
                Status: <strong>${purchaseOrder.status}</strong><br>
                ${purchaseOrder.expectedDeliveryDate ? `Expected Delivery: <strong>${new Date(purchaseOrder.expectedDeliveryDate).toLocaleDateString("en-IN")}</strong>` : ""}
              </div>
            </td>
          </tr>
        </table>

        <div class="details-box">
          <div class="details-col">
            <div class="section-header">Supplier Details</div>
            <strong>${supplierName}</strong><br>
            ${supplierPerson ? `Contact: ${supplierPerson}<br>` : ""}
            ${supplierMobile ? `Mobile: ${supplierMobile}<br>` : ""}
            ${supplierGst ? `GSTIN: <strong>${supplierGst}</strong><br>` : ""}
            ${supplierAddr ? supplierAddr : ""}
          </div>
          <div class="details-col">
            <div class="section-header">Ship To</div>
            <strong>${business.storeName || "ShopPilot Store"}</strong><br>
            ${business.address || "Store registered location"}<br>
            ${business.phone ? `Phone: ${business.phone}` : ""}
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th style="text-align: left;">Item Description</th>
              <th style="text-align: right; width: 100px;">Quantity</th>
              <th style="text-align: right; width: 120px;">Unit Rate</th>
              <th style="text-align: right; width: 140px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
            <tr class="total-row">
              <td colspan="2" style="border: none;"></td>
              <td style="text-align: right; font-weight: 600;">Subtotal:</td>
              <td style="text-align: right; font-weight: 600;">₹${subtotal.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="2" style="border: none;"></td>
              <td style="text-align: right; font-weight: 600;">CGST (9%):</td>
              <td style="text-align: right;">₹${cgst.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="2" style="border: none;"></td>
              <td style="text-align: right; font-weight: 600;">SGST (9%):</td>
              <td style="text-align: right;">₹${sgst.toFixed(2)}</td>
            </tr>
            <tr class="total-row grand-total">
              <td colspan="2" style="border: none;"></td>
              <td style="text-align: right;">Grand Total:</td>
              <td style="text-align: right;">₹${grandTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        ${purchaseOrder.notes ? `
          <div class="notes-box">
            <strong>Notes / Terms:</strong><br>
            ${purchaseOrder.notes}
          </div>
        ` : ""}

        <div class="signature-box">
          <div>
            <div style="height: 50px;"></div>
            <div class="sig-line">Authorized Signatory</div>
          </div>
        </div>
      </div>
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
