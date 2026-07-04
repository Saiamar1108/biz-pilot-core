const env = require("../config/env");

function calculateInvoiceTotals(lineItems, taxRate = env.taxRate, invoiceDiscount = 0, invoiceDiscountType = "flat", taxMode = "standard", taxEnabled = true) {
  let subtotal = 0;
  let totalItemDiscount = 0;

  // Calculate subtotal and total item discounts
  for (const item of lineItems) {
    const itemSubtotal = item.quantity * item.unitPrice;
    subtotal += itemSubtotal;

    let itemDiscountAmount = 0;
    if (item.discountType === "percentage") {
      itemDiscountAmount = itemSubtotal * (item.discount / 100);
    } else {
      itemDiscountAmount = item.discount;
    }
    totalItemDiscount += parseFloat(itemDiscountAmount.toFixed(2));
  }

  const afterItemDiscounts = subtotal - totalItemDiscount;

  // Calculate invoice discount
  let invoiceDiscountAmount = 0;
  if (invoiceDiscountType === "percentage") {
    invoiceDiscountAmount = afterItemDiscounts * (invoiceDiscount / 100);
  } else {
    invoiceDiscountAmount = invoiceDiscount;
  }
  const totalDiscount = parseFloat((totalItemDiscount + invoiceDiscountAmount).toFixed(2));

  const afterAllDiscounts = Math.max(0, subtotal - totalDiscount);

  // Calculate GST components
  let cgst = 0, sgst = 0, igst = 0;
  let tax = 0;
  
  // Adjust taxEnabled based on taxMode
  const effectiveTaxEnabled = taxMode !== "none" && taxEnabled;
  
  if (effectiveTaxEnabled) {
    if (taxMode === "cgst-sgst") {
      // CGST and SGST are each half the total tax rate
      const halfRate = taxRate / 2;
      cgst = parseFloat((afterAllDiscounts * halfRate).toFixed(2));
      sgst = cgst;
      tax = parseFloat((cgst + sgst).toFixed(2));
    } else if (taxMode === "igst") {
      // IGST is full tax rate
      igst = parseFloat((afterAllDiscounts * taxRate).toFixed(2));
      tax = igst;
    } else {
      // Standard or Custom mode
      tax = parseFloat((afterAllDiscounts * taxRate).toFixed(2));
    }
  }

  const total = parseFloat((afterAllDiscounts + tax).toFixed(2));

  return { subtotal, taxRate, tax, total, totalItemDiscount, totalDiscount, taxMode, cgst, sgst, igst, taxEnabled: effectiveTaxEnabled };
}

async function buildLineItems(rawItems) {
  const Product = require("../models/Product");
  const lineItems = [];
  const requestedByProduct = new Map();

  for (const item of rawItems) {
    const product = await Product.findById(item.product);
    if (!product) {
      const error = new Error(`Product not found: ${item.product}`);
      error.statusCode = 404;
      throw error;
    }

    const quantity = item.quantity || 1;
    const alreadyRequested = requestedByProduct.get(String(product._id)) || 0;
    const cumulativeRequested = alreadyRequested + quantity;
    if (product.stock < cumulativeRequested) {
      const error = new Error(`Only ${product.stock} units available for ${product.name}`);
      error.statusCode = 400;
      error.code = "INSUFFICIENT_STOCK";
      error.details = {
        requested: Number(cumulativeRequested),
        available: Number(product.stock),
        productId: String(product._id),
        productName: product.name,
      };
      throw error;
    }
    requestedByProduct.set(String(product._id), cumulativeRequested);

    const unitPrice = item.unitPrice ?? product.price;
    const itemSubtotal = quantity * unitPrice;
    const itemDiscount = item.discount ?? 0;
    const itemDiscountType = item.discountType ?? "flat";
    let itemDiscountAmount = 0;
    if (itemDiscountType === "percentage") {
      itemDiscountAmount = itemSubtotal * (itemDiscount / 100);
    } else {
      itemDiscountAmount = itemDiscount;
    }
    const lineTotal = parseFloat((itemSubtotal - itemDiscountAmount).toFixed(2));

    lineItems.push({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      quantity,
      unitPrice,
      costPrice: Number(product.costPrice ?? unitPrice * 0.7),
      lineTotal,
      discount: itemDiscount,
      discountType: itemDiscountType,
    });
  }

  return lineItems;
}

async function generateInvoiceNumber() {
  const Invoice = require("../models/Invoice");
  const year = new Date().getFullYear();
  const latest = await Invoice.findOne({ invoiceNumber: new RegExp(`^SP-${year}-`) })
    .sort({ invoiceNumber: -1 })
    .select("invoiceNumber")
    .lean();
  const latestSequence = latest?.invoiceNumber
    ? Number(latest.invoiceNumber.split("-").at(-1))
    : 0;
  return `SP-${year}-${String(latestSequence + 1).padStart(4, "0")}`;
}

module.exports = { calculateInvoiceTotals, buildLineItems, generateInvoiceNumber };
