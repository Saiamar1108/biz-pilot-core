const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const asyncHandler = require("../middlewares/asyncHandler");
const env = require("../config/env");
const {
  calculateInvoiceTotals,
  buildLineItems,
  generateInvoiceNumber,
} = require("../utils/calculateInvoice");
const { recalculateCustomerMetrics } = require("../services/customerMetrics");

exports.getInvoices = asyncHandler(async (req, res) => {
  const { status, customer } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (customer) filter.customer = customer;

  const invoices = await Invoice.find(filter)
    .populate("customer", "name email")
    .sort({ createdAt: -1 });

  res.json({ success: true, count: invoices.length, data: invoices });
});

exports.createInvoice = asyncHandler(async (req, res) => {
  const { customer: customerId, lineItems: rawItems, status, taxRate } = req.body;

  if (!customerId || !rawItems?.length) {
    res.status(400);
    throw new Error("Customer and at least one line item are required");
  }

  const customer = await Customer.findById(customerId);
  if (!customer) {
    res.status(404);
    throw new Error("Customer not found");
  }

  const lineItems = await buildLineItems(rawItems);
  const rate = taxRate ?? env.taxRate;
  const { subtotal, tax, total } = calculateInvoiceTotals(lineItems, rate);
  const invoiceNumber = await generateInvoiceNumber();

  const invoice = await Invoice.create({
    invoiceNumber,
    customer: customer._id,
    customerName: customer.name,
    lineItems,
    subtotal,
    taxRate: rate,
    tax,
    total,
    status: status || "pending",
  });

  for (const item of lineItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity, sold: item.quantity },
    });
  }

  customer.orderHistory = Array.isArray(customer.orderHistory) ? customer.orderHistory : [];
  customer.orderHistory.push(invoice._id);
  await customer.save();
  await recalculateCustomerMetrics(customer._id);

  const populated = await Invoice.findById(invoice._id).populate("customer", "name email");
  res.status(201).json({ success: true, data: populated });
});
