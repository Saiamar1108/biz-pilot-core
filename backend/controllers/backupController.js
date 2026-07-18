const archiver = require("archiver");
const { jsPDF } = require("jspdf");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Supplier = require("../models/Supplier");
const PurchaseOrder = require("../models/PurchaseOrder");
const Invoice = require("../models/Invoice");
const Setting = require("../models/Setting");
const Shop = require("../models/Shop");
const asyncHandler = require("../middlewares/asyncHandler");

// CSV Helper
function convertToCSV(data, headers, mapper) {
  const csvLines = [headers.join(",")];
  for (const item of data) {
    const row = mapper(item).map(val => {
      if (val === undefined || val === null) return '""';
      // Escape double quotes
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    });
    csvLines.push(row.join(","));
  }
  return csvLines.join("\n");
}

// PDF Helper
function generateReportPdfBuffer(shop, products, customers, suppliers, purchaseOrders, invoices) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  let cursorY = 50;
  
  const addHeader = (title) => {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(31, 41, 55); // gray-800
    doc.text(title, margin, cursorY);
    cursorY += 15;
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, margin, cursorY);
    cursorY += 15;
    
    doc.setDrawColor(209, 213, 219); // gray-300
    doc.line(margin, cursorY, 555, cursorY);
    cursorY += 30;
  };
  
  const addFooter = (pageNum) => {
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175); // gray-400
    doc.text("ShopPilot AI — Business Summary Report", margin, 800);
    doc.text(`Page ${pageNum}`, 530, 800);
  };

  // --- PAGE 1: Dashboard Summary & Profile ---
  addHeader("ShopPilot Executive Business Report");
  addFooter(1);

  // Business Profile
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text("Business Profile", margin, cursorY);
  cursorY += 20;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  doc.text(`Store Name: ${shop?.name || shop?.shopName || "ShopPilot Store"}`, margin + 10, cursorY);
  doc.text(`Category: ${shop?.businessType || "Retail"}`, margin + 250, cursorY);
  cursorY += 18;
  doc.text(`Email: ${shop?.email || "—"}`, margin + 10, cursorY);
  doc.text(`Phone: ${shop?.phone || "—"}`, margin + 250, cursorY);
  cursorY += 18;
  doc.text(`Address: ${shop?.address || "—"}`, margin + 10, cursorY);
  doc.text(`GSTIN: ${shop?.gstNumber || "—"}`, margin + 250, cursorY);
  cursorY += 35;

  // Financial summary
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text("Financial Summary", margin, cursorY);
  cursorY += 20;

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const pendingPayments = invoices.reduce((sum, inv) => sum + inv.pendingAmount, 0);
  
  let totalProfit = 0;
  invoices.forEach(inv => {
    inv.lineItems.forEach(line => {
      totalProfit += (line.lineTotal - ((line.costPrice || 0) * line.quantity));
    });
  });

  const currency = shop?.currency || "INR";

  doc.setFont("Helvetica", "normal");
  doc.text(`Total Revenue (Collected): ${currency} ${totalRevenue.toLocaleString("en-IN")}`, margin + 10, cursorY);
  cursorY += 18;
  doc.text(`Total Profit Billed: ${currency} ${totalProfit.toLocaleString("en-IN")}`, margin + 10, cursorY);
  cursorY += 18;
  doc.text(`Total Billed Amount: ${currency} ${totalBilled.toLocaleString("en-IN")}`, margin + 10, cursorY);
  cursorY += 18;
  doc.text(`Pending Receivables: ${currency} ${pendingPayments.toLocaleString("en-IN")}`, margin + 10, cursorY);
  cursorY += 40;

  // Inventory summary
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Inventory Intelligence Summary", margin, cursorY);
  cursorY += 20;

  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.stock <= (p.minStock ?? 10)).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Total Products in Catalog: ${totalProducts}`, margin + 10, cursorY);
  cursorY += 18;
  doc.text(`Low Stock Warnings: ${lowStockCount}`, margin + 10, cursorY);
  cursorY += 18;
  doc.text(`Out of Stock Items: ${outOfStockCount}`, margin + 10, cursorY);
  
  // --- PAGE 2: Catalog Insights & Invoices ---
  doc.addPage();
  cursorY = 50;
  addHeader("Catalog Performance & Transaction logs");
  addFooter(2);

  // Top Selling Products
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Top Selling Products", margin, cursorY);
  cursorY += 20;

  const topSelling = [...products].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 5);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  topSelling.forEach((p, idx) => {
    doc.text(`${idx + 1}. ${p.name} (SKU: ${p.sku}) — Sold: ${p.sold || 0} units | Stock: ${p.stock}`, margin + 10, cursorY);
    cursorY += 16;
  });
  cursorY += 20;

  // Low Stock list
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Low Stock Products list", margin, cursorY);
  cursorY += 20;

  const lowStockItems = products.filter(p => p.stock <= (p.minStock ?? 10)).slice(0, 5);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  if (lowStockItems.length === 0) {
    doc.text("No products are currently low on stock.", margin + 10, cursorY);
    cursorY += 16;
  } else {
    lowStockItems.forEach((p, idx) => {
      doc.text(`${idx + 1}. ${p.name} — Current Stock: ${p.stock} (Min threshold: ${p.minStock ?? 10})`, margin + 10, cursorY);
      cursorY += 16;
    });
  }
  cursorY += 25;

  // Recent Invoices
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Recent Invoices", margin, cursorY);
  cursorY += 20;

  const recentInvoices = [...invoices].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  recentInvoices.forEach((inv, idx) => {
    doc.text(
      `${idx + 1}. ${inv.invoiceNumber} — Customer: ${inv.customerName} | Total: ${currency} ${inv.total} | Status: ${inv.status.toUpperCase()} | Date: ${new Date(inv.createdAt).toLocaleDateString("en-IN")}`,
      margin + 10,
      cursorY
    );
    cursorY += 16;
  });

  // --- PAGE 3: Partners & Supply chain ---
  doc.addPage();
  cursorY = 50;
  addHeader("Supplier & Customer Directory Summary");
  addFooter(3);

  // Customer Summary
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Customers Summary", margin, cursorY);
  cursorY += 20;

  const topCustomers = [...customers].sort((a, b) => (b.spent || 0) - (a.spent || 0)).slice(0, 5);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Total Active Customers: ${customers.length}`, margin + 10, cursorY);
  cursorY += 18;
  doc.text("Top Customers by LTV (Spent):", margin + 10, cursorY);
  cursorY += 16;
  topCustomers.forEach((c, idx) => {
    doc.text(`  • ${c.name} (${c.phone}) — Billed spent: ${currency} ${c.spent || 0} | Due: ${currency} ${c.pendingPayments || 0}`, margin + 20, cursorY);
    cursorY += 16;
  });
  cursorY += 25;

  // Supplier Summary
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Suppliers Summary", margin, cursorY);
  cursorY += 20;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Total Active Suppliers: ${suppliers.length}`, margin + 10, cursorY);
  cursorY += 18;
  const preferredSuppliers = suppliers.filter(s => s.preferredSupplier).slice(0, 5);
  doc.text("Preferred Suppliers List Preview:", margin + 10, cursorY);
  cursorY += 16;
  if (preferredSuppliers.length === 0) {
    doc.text("  No preferred suppliers defined.", margin + 20, cursorY);
    cursorY += 16;
  } else {
    preferredSuppliers.forEach((s) => {
      doc.text(`  • ${s.supplierName} (${s.mobileNumber}) — Contact: ${s.contactPerson || "—"}`, margin + 20, cursorY);
      cursorY += 16;
    });
  }
  cursorY += 25;

  // Purchase Orders Summary
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Purchase Orders (Supply chain activities)", margin, cursorY);
  cursorY += 20;

  const totalPoCount = purchaseOrders.length;
  const receivedPos = purchaseOrders.filter(po => po.status === "Received").length;
  const cancelledPos = purchaseOrders.filter(po => po.status === "Cancelled").length;
  const pendingPos = totalPoCount - receivedPos - cancelledPos;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Total POs Generated: ${totalPoCount}`, margin + 10, cursorY);
  cursorY += 16;
  doc.text(`Status breakdown: Received: ${receivedPos} | Pending delivery: ${pendingPos} | Cancelled: ${cancelledPos}`, margin + 10, cursorY);
  cursorY += 16;
  doc.text(`Total PO Value: ${currency} ${purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0).toLocaleString("en-IN")}`, margin + 10, cursorY);

  return doc.output("arraybuffer");
}

// Gather all data helper
async function gatherBusinessData(shopId) {
  const [products, customers, suppliers, purchaseOrders, invoices, setting, shop] = await Promise.all([
    Product.find({ shopId }).lean(),
    Customer.find({ shopId }).lean(),
    Supplier.find({ shopId }).lean(),
    PurchaseOrder.find({ shopId }).lean(),
    Invoice.find({ shopId }).lean(),
    Setting.findOne({ key: "default", shopId }).lean(),
    Shop.findById(shopId).lean(),
  ]);

  return { products, customers, suppliers, purchaseOrders, invoices, setting, shop };
}

// Compile CSVs helper
function generateAllCSVs(data) {
  const { products, customers, suppliers, purchaseOrders, invoices, shop } = data;

  const csvProducts = convertToCSV(
    products,
    ["id", "sku", "name", "category", "stock", "price", "costPrice", "sold", "barcode", "expiryDate", "minStock", "targetStock", "createdAt", "updatedAt"],
    (p) => [
      p._id || p.id,
      p.sku || "",
      p.name || "",
      p.category || "",
      p.stock ?? 0,
      p.price ?? 0,
      p.costPrice ?? 0,
      p.sold ?? 0,
      p.barcode || "",
      p.expiryDate ? new Date(p.expiryDate).toISOString() : "",
      p.minStock ?? 10,
      p.targetStock ?? 50,
      p.createdAt ? new Date(p.createdAt).toISOString() : "",
      p.updatedAt ? new Date(p.updatedAt).toISOString() : ""
    ]
  );

  const csvCustomers = convertToCSV(
    customers,
    ["id", "name", "phone", "email", "address", "gstNumber", "spent", "pendingPayments", "createdAt", "updatedAt"],
    (c) => [
      c._id || c.id,
      c.name || "",
      c.phone || "",
      c.email || "",
      c.address || "",
      c.gstNumber || "",
      c.spent ?? 0,
      c.pendingPayments ?? 0,
      c.createdAt ? new Date(c.createdAt).toISOString() : "",
      c.updatedAt ? new Date(c.updatedAt).toISOString() : ""
    ]
  );

  const csvSuppliers = convertToCSV(
    suppliers,
    ["id", "supplierName", "contactPerson", "mobileNumber", "whatsAppNumber", "email", "address", "isActive", "preferredSupplier", "createdAt", "updatedAt"],
    (s) => [
      s._id || s.id,
      s.supplierName || "",
      s.contactPerson || "",
      s.mobileNumber || "",
      s.whatsAppNumber || "",
      s.email || "",
      s.address || "",
      s.isActive ?? true,
      s.preferredSupplier ?? false,
      s.createdAt ? new Date(s.createdAt).toISOString() : "",
      s.updatedAt ? new Date(s.updatedAt).toISOString() : ""
    ]
  );

  const csvPurchaseOrders = convertToCSV(
    purchaseOrders,
    ["id", "purchaseOrderNumber", "supplier", "supplierName", "status", "totalAmount", "notes", "expectedDeliveryDate", "receivedDate", "invoiceNumber", "createdAt", "updatedAt"],
    (po) => [
      po._id || po.id,
      po.purchaseOrderNumber || "",
      po.supplier || "",
      po.supplierName || "",
      po.status || "",
      po.totalAmount ?? 0,
      po.notes || "",
      po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toISOString() : "",
      po.receivedDate ? new Date(po.receivedDate).toISOString() : "",
      po.invoiceNumber || "",
      po.createdAt ? new Date(po.createdAt).toISOString() : "",
      po.updatedAt ? new Date(po.updatedAt).toISOString() : ""
    ]
  );

  // Flatten Purchase Order items
  const poItems = [];
  for (const po of purchaseOrders) {
    for (const item of po.items || []) {
      poItems.push({
        poId: po._id || po.id,
        poNumber: po.purchaseOrderNumber,
        productId: item.product,
        productName: item.productName,
        sku: item.sku || "",
        quantity: item.quantity,
        unit: item.unit || "units",
        purchasePrice: item.purchasePrice,
        receivedQuantity: item.receivedQuantity || 0,
        expectedDeliveryDate: item.expectedDeliveryDate ? new Date(item.expectedDeliveryDate).toISOString() : "",
        remarks: item.remarks || "",
        batchNumber: item.batchNumber || "",
        expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : ""
      });
    }
  }
  const csvPoItems = convertToCSV(
    poItems,
    ["purchaseOrderId", "purchaseOrderNumber", "productId", "productName", "sku", "quantity", "unit", "purchasePrice", "receivedQuantity", "expectedDeliveryDate", "remarks", "batchNumber", "expiryDate"],
    (i) => [
      i.poId,
      i.poNumber,
      i.productId,
      i.productName,
      i.sku,
      i.quantity,
      i.unit,
      i.purchasePrice,
      i.receivedQuantity,
      i.expectedDeliveryDate,
      i.remarks,
      i.batchNumber,
      i.expiryDate
    ]
  );

  const csvInvoices = convertToCSV(
    invoices,
    ["id", "invoiceNumber", "customer", "customerName", "subtotal", "taxRate", "tax", "discount", "total", "pendingAmount", "status", "paidAmount", "paidAt", "paymentMethod", "dueDate", "createdAt", "updatedAt"],
    (inv) => [
      inv._id || inv.id,
      inv.invoiceNumber || "",
      inv.customer || "",
      inv.customerName || "",
      inv.subtotal ?? 0,
      inv.taxRate ?? 0,
      inv.tax ?? 0,
      inv.discount ?? 0,
      inv.total ?? 0,
      inv.pendingAmount ?? 0,
      inv.status || "",
      inv.paidAmount ?? 0,
      inv.paidAt ? new Date(inv.paidAt).toISOString() : "",
      inv.paymentMethod || "",
      inv.dueDate ? new Date(inv.dueDate).toISOString() : "",
      inv.createdAt ? new Date(inv.createdAt).toISOString() : "",
      inv.updatedAt ? new Date(inv.updatedAt).toISOString() : ""
    ]
  );

  // Flatten Invoice items
  const invItems = [];
  for (const inv of invoices) {
    for (const item of inv.lineItems || []) {
      invItems.push({
        invoiceId: inv._id || inv.id,
        invoiceNumber: inv.invoiceNumber,
        productId: item.product,
        productName: item.productName,
        sku: item.sku || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: item.costPrice || 0,
        sellingPrice: item.sellingPrice || item.unitPrice,
        lineTotal: item.lineTotal
      });
    }
  }
  const csvInvoiceItems = convertToCSV(
    invItems,
    ["invoiceId", "invoiceNumber", "productId", "productName", "sku", "quantity", "unitPrice", "costPrice", "sellingPrice", "lineTotal"],
    (i) => [
      i.invoiceId,
      i.invoiceNumber,
      i.productId,
      i.productName,
      i.sku,
      i.quantity,
      i.unitPrice,
      i.costPrice,
      i.sellingPrice,
      i.lineTotal
    ]
  );

  // Flatten Inventory Purchase History
  const invHistory = [];
  for (const p of products) {
    for (const item of p.purchaseHistory || []) {
      invHistory.push({
        productId: p._id || p.id,
        productName: p.name,
        supplier: item.supplier || "",
        supplierName: item.supplierName || "",
        price: item.price,
        quantity: item.quantity,
        purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString() : ""
      });
    }
  }
  const csvInventoryHistory = convertToCSV(
    invHistory,
    ["productId", "productName", "supplier", "supplierName", "price", "quantity", "purchaseDate"],
    (i) => [
      i.productId,
      i.productName,
      i.supplier,
      i.supplierName,
      i.price,
      i.quantity,
      i.purchaseDate
    ]
  );

  // Flatten Stock Movements
  const stockMovements = [];
  for (const p of products) {
    for (const mov of p.stockMovements || []) {
      stockMovements.push({
        productId: p._id || p.id,
        productName: p.name,
        type: mov.type,
        quantity: mov.quantity,
        note: mov.note || "",
        createdAt: mov.createdAt ? new Date(mov.createdAt).toISOString() : ""
      });
    }
  }
  const csvStockMovements = convertToCSV(
    stockMovements,
    ["productId", "productName", "type", "quantity", "note", "createdAt"],
    (m) => [
      m.productId,
      m.productName,
      m.type,
      m.quantity,
      m.note,
      m.createdAt
    ]
  );

  // Analytics Metrics Summary
  const totalRev = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  let totalProfit = 0;
  invoices.forEach(inv => {
    inv.lineItems.forEach(line => {
      totalProfit += (line.lineTotal - ((line.costPrice || 0) * line.quantity));
    });
  });
  const lowStockCount = products.filter(p => p.stock <= (p.minStock ?? 10)).length;
  const pendingAmount = invoices.reduce((sum, inv) => sum + inv.pendingAmount, 0);
  const totalPoValue = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
  
  const summaryList = [
    { metric: "Total Revenue", value: totalRev },
    { metric: "Total Profit", value: totalProfit },
    { metric: "Total Invoices", value: invoices.length },
    { metric: "Total Products", value: products.length },
    { metric: "Total Customers", value: customers.length },
    { metric: "Total Suppliers", value: suppliers.length },
    { metric: "Low Stock Products Count", value: lowStockCount },
    { metric: "Pending Payments Billed", value: pendingAmount },
    { metric: "Total Purchase Order Cost", value: totalPoValue }
  ];
  const csvAnalyticsSummary = convertToCSV(
    summaryList,
    ["metric", "value"],
    (s) => [s.metric, s.value]
  );

  // Business settings
  const csvBusinessSettings = convertToCSV(
    shop ? [shop] : [],
    ["storeName", "businessType", "gstNumber", "pan", "upiId", "phone", "email", "address", "currency", "timezone", "taxRate", "lowStockThreshold"],
    (s) => [
      s.name || s.shopName || "",
      s.businessType || "",
      s.gstNumber || "",
      s.pan || "",
      s.upiId || "",
      s.phone || "",
      s.email || "",
      s.address || "",
      s.currency || "INR",
      s.timezone || "Asia/Kolkata",
      s.settings?.taxRate ?? 0.08,
      s.settings?.lowStockThreshold ?? 10
    ]
  );

  return {
    csvProducts,
    csvCustomers,
    csvSuppliers,
    csvPurchaseOrders,
    csvPoItems,
    csvInvoices,
    csvInvoiceItems,
    csvInventoryHistory,
    csvStockMovements,
    csvAnalyticsSummary,
    csvBusinessSettings
  };
}

// 📦 GET /settings/backup/zip -> Full system backup (CSV, PDF, JSON, backup-info.json)
exports.exportCompleteBackup = asyncHandler(async (req, res) => {
  const data = await gatherBusinessData(req.shopId);
  const csvs = generateAllCSVs(data);

  // Generate PDF report
  const pdfArrayBuffer = generateReportPdfBuffer(
    data.shop,
    data.products,
    data.customers,
    data.suppliers,
    data.purchaseOrders,
    data.invoices
  );
  const pdfBuffer = Buffer.from(pdfArrayBuffer);

  // Generate machine-readable JSON backup
  const backupJson = JSON.stringify({
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    shopId: req.shopId,
    shop: data.shop,
    setting: data.setting,
    products: data.products,
    customers: data.customers,
    suppliers: data.suppliers,
    purchaseOrders: data.purchaseOrders,
    invoices: data.invoices
  }, null, 2);

  // Generate metadata info
  const backupInfoJson = JSON.stringify({
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    businessName: data.shop?.name || data.shop?.shopName || "ShopPilot Store",
    recordCounts: {
      products: data.products.length,
      customers: data.customers.length,
      suppliers: data.suppliers.length,
      purchaseOrders: data.purchaseOrders.length,
      invoices: data.invoices.length
    }
  }, null, 2);

  const archive = archiver("zip", { zlib: { level: 9 } });
  
  const dateStr = new Date().toISOString().split('T')[0];
  res.attachment(`ShopPilot_Backup_${dateStr}.zip`);
  archive.pipe(res);

  // Add CSVs
  archive.append(csvs.csvProducts, { name: "products.csv" });
  archive.append(csvs.csvCustomers, { name: "customers.csv" });
  archive.append(csvs.csvSuppliers, { name: "suppliers.csv" });
  archive.append(csvs.csvPurchaseOrders, { name: "purchase-orders.csv" });
  archive.append(csvs.csvPoItems, { name: "purchase-order-items.csv" });
  archive.append(csvs.csvInvoices, { name: "invoices.csv" });
  archive.append(csvs.csvInvoiceItems, { name: "invoice-items.csv" });
  archive.append(csvs.csvInventoryHistory, { name: "inventory-history.csv" });
  archive.append(csvs.csvStockMovements, { name: "stock-movements.csv" });
  archive.append(csvs.csvAnalyticsSummary, { name: "analytics-summary.csv" });
  archive.append(csvs.csvBusinessSettings, { name: "business-settings.csv" });

  // Add PDF Report
  archive.append(pdfBuffer, { name: "business-report.pdf" });

  // Add machine JSONs
  archive.append(backupJson, { name: "backup.json" });
  archive.append(backupInfoJson, { name: "backup-info.json" });

  await archive.finalize();
});

// 📄 GET /settings/backup/pdf -> Download Business Report PDF directly
exports.exportBusinessReportPdf = asyncHandler(async (req, res) => {
  const data = await gatherBusinessData(req.shopId);
  const pdfArrayBuffer = generateReportPdfBuffer(
    data.shop,
    data.products,
    data.customers,
    data.suppliers,
    data.purchaseOrders,
    data.invoices
  );
  const pdfBuffer = Buffer.from(pdfArrayBuffer);

  const dateStr = new Date().toISOString().split('T')[0];
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=ShopPilot_BusinessReport_${dateStr}.pdf`);
  res.send(pdfBuffer);
});

// 📊 GET /settings/backup/csvs -> Download ZIP containing only CSV files
exports.exportAllCSVsZip = asyncHandler(async (req, res) => {
  const data = await gatherBusinessData(req.shopId);
  const csvs = generateAllCSVs(data);

  const archive = archiver("zip", { zlib: { level: 9 } });
  
  const dateStr = new Date().toISOString().split('T')[0];
  res.attachment(`ShopPilot_CSVs_${dateStr}.zip`);
  archive.pipe(res);

  archive.append(csvs.csvProducts, { name: "products.csv" });
  archive.append(csvs.csvCustomers, { name: "customers.csv" });
  archive.append(csvs.csvSuppliers, { name: "suppliers.csv" });
  archive.append(csvs.csvPurchaseOrders, { name: "purchase-orders.csv" });
  archive.append(csvs.csvPoItems, { name: "purchase-order-items.csv" });
  archive.append(csvs.csvInvoices, { name: "invoices.csv" });
  archive.append(csvs.csvInvoiceItems, { name: "invoice-items.csv" });
  archive.append(csvs.csvInventoryHistory, { name: "inventory-history.csv" });
  archive.append(csvs.csvStockMovements, { name: "stock-movements.csv" });
  archive.append(csvs.csvAnalyticsSummary, { name: "analytics-summary.csv" });
  archive.append(csvs.csvBusinessSettings, { name: "business-settings.csv" });

  await archive.finalize();
});
