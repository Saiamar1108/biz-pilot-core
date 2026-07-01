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

  for (const item of rawItems) {
    const product = await Product.findById(item.product);
    if (!product) {
      const error = new Error(`Product not found: ${item.product}`);
      error.statusCode = 404;
      throw error;
    }

    const quantity = item.quantity || 1;
    if (product.stock < quantity) {
      const error = new Error(`Insufficient stock for ${product.name} (${product.stock} available)`);
      error.statusCode = 400;
      throw error;
    }

    const unitPrice = item.unitPrice ?? product.price;
    const lineTotal = parseFloat((quantity * unitPrice).toFixed(2));

    lineItems.push({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      quantity,
      unitPrice,
      lineTotal,
    });
  }

  return lineItems;
}

async function generateInvoiceNumber() {
  const Invoice = require("../models/Invoice");
  const count = await Invoice.countDocuments();
  return `INV-${String(10000 + count + 1)}`;
}

module.exports = { calculateInvoiceTotals, buildLineItems, generateInvoiceNumber };
