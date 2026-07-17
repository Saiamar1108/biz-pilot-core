const env = require("../config/env");

const numberOrZero = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

function calculateInvoiceTotals(
  lineItems,
  taxRate = env.taxRate,
  invoiceDiscount = 0,
  invoiceDiscountType = "flat",
  taxMode = "standard",
  taxEnabled = true,
) {
  let subtotal = 0;
  const rate = numberOrZero(taxRate);

  for (const item of lineItems) {
    const itemSubtotal = numberOrZero(item.quantity) * numberOrZero(item.unitPrice);
    subtotal += itemSubtotal;
  }

  subtotal = parseFloat(subtotal.toFixed(2));
  const totalItemDiscount = 0;
  const totalDiscount = 0;

  // Calculate GST components
  let cgst = 0,
    sgst = 0,
    igst = 0;
  let tax = 0;

  // Adjust taxEnabled based on taxMode
  const effectiveTaxEnabled = taxMode !== "none" && taxEnabled;

  if (effectiveTaxEnabled) {
    if (taxMode === "cgst-sgst") {
      // CGST and SGST are each half the total tax rate
      const halfRate = rate / 2;
      cgst = parseFloat((subtotal * halfRate).toFixed(2));
      sgst = cgst;
      tax = parseFloat((cgst + sgst).toFixed(2));
    } else if (taxMode === "igst") {
      // IGST is full tax rate
      igst = parseFloat((subtotal * rate).toFixed(2));
      tax = igst;
    } else {
      // Standard or Custom mode
      tax = parseFloat((subtotal * rate).toFixed(2));
    }
  }

  const total = parseFloat((subtotal + tax).toFixed(2));

  return {
    subtotal,
    taxRate: rate,
    tax,
    total,
    totalItemDiscount,
    totalDiscount,
    taxMode,
    cgst,
    sgst,
    igst,
    taxEnabled: effectiveTaxEnabled,
  };
}

async function buildLineItems(rawItems, shopId) {
  const Product = require("../models/Product");
  const lineItems = [];
  const requestedByProduct = new Map();

  for (const item of rawItems) {
    const product = await Product.findOne(
      shopId ? { _id: item.product, shopId } : { _id: item.product },
    );
    if (!product) {
      const error = new Error(`Product not found: ${item.product}`);
      error.statusCode = 404;
      throw error;
    }

    const quantity = Math.max(1, numberOrZero(item.quantity) || 1);
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

    const unitPrice = numberOrZero(item.unitPrice ?? product.price);
    const itemSubtotal = quantity * unitPrice;
    const itemDiscount = item.discount ?? 0;
    const itemDiscountType = item.discountType ?? "flat";
    const lineTotal = parseFloat(itemSubtotal.toFixed(2));

    lineItems.push({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      quantity,
      unitPrice,
      costPrice: Number(product.costPrice ?? 0),
      sellingPrice: Number(unitPrice),
      lineTotal,
      discount: itemDiscount,
      discountType: itemDiscountType,
    });
  }

  return lineItems;
}

async function generateInvoiceNumber(shopId) {
  const Invoice = require("../models/Invoice");
  const Shop = require("../models/Shop");
  
  let prefix = "SP";
  if (shopId) {
    try {
      const shop = await Shop.findById(shopId).lean();
      if (shop?.invoicePrefix) {
        prefix = shop.invoicePrefix.trim().replace(/[^a-zA-Z0-9-]/g, ""); // sanitize
        if (prefix.endsWith("-")) {
          prefix = prefix.slice(0, -1);
        }
      }
    } catch (err) {
      console.error("[calculateInvoice] Failed to fetch invoicePrefix for sequence generator:", err);
    }
  }

  const year = new Date().getFullYear();
  const pattern = new RegExp(`^${prefix}-${year}-`);
  const latest = await Invoice.findOne({ invoiceNumber: pattern, shopId })
    .sort({ invoiceNumber: -1 })
    .select("invoiceNumber")
    .lean();
  const latestSequence = latest?.invoiceNumber ? Number(latest.invoiceNumber.split("-").at(-1)) : 0;
  return `${prefix}-${year}-${String(latestSequence + 1).padStart(4, "0")}`;
}

module.exports = { calculateInvoiceTotals, buildLineItems, generateInvoiceNumber };
