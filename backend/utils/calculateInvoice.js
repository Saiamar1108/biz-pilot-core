const env = require("../config/env");

function calculateInvoiceTotals(lineItems, taxRate = env.taxRate) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = parseFloat((subtotal * taxRate).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));

  return { subtotal, taxRate, tax, total };
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
    const lineTotal = parseFloat((quantity * unitPrice).toFixed(2));

    lineItems.push({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      quantity,
      unitPrice,
      costPrice: Number(product.costPrice ?? unitPrice * 0.7),
      lineTotal,
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
