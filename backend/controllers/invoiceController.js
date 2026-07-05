const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const mongoose = require("mongoose");
const env = require("../config/env");
const asyncHandler = require("../middlewares/asyncHandler");

const {
  calculateInvoiceTotals,
  buildLineItems,
  generateInvoiceNumber,
} = require("../utils/calculateInvoice");

const { recalculateCustomerMetrics } = require("../services/customerMetrics");
const { ensureDemoData } = require("../utils/demoData");
const { createNotification } = require("../services/notificationService");
const { calculateFinancialSummary } = require("../services/financialSummary");

async function refreshOverdueInvoices(shopId) {
  await Invoice.updateMany(
    {
      status: { $in: ["pending", "sent"] },
      dueDate: { $lt: new Date() },
      shopId,
    },
    {
      $set: { status: "overdue" },
    },
  );
}

exports.getInvoices = asyncHandler(async (req, res) => {
  await refreshOverdueInvoices(req.shopId);

  const { status, customer } = req.query;
  const filter = { shopId: req.shopId };

  if (status) filter.status = status;
  if (customer) filter.customer = customer;

  const invoices = await Invoice.find(filter)
    .populate("customer", "name email phone address gstNumber")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: invoices.length,
    data: invoices,
  });
});

exports.getInvoiceSummary = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status, shopId: req.shopId } : { shopId: req.shopId };

  const summary = await calculateFinancialSummary(filter);

  res.json({
    success: true,
    data: summary,
  });
});

exports.createInvoice = asyncHandler(async (req, res) => {
  const { customer: customerId, lineItems: rawItems, status, taxRate } = req.body;

  if (!customerId || !rawItems?.length) {
    res.status(400);
    throw new Error("Customer and at least one line item are required");
  }

  const customer = await Customer.findOne({ _id: customerId, shopId: req.shopId });

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
    paidAmount: status === "paid" ? total : 0,
    pendingAmount: status === "paid" ? 0 : total,
    paidAt: status === "paid" ? new Date() : null,
    status: status || "pending",
    dueDate: req.body.dueDate
      ? new Date(req.body.dueDate)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    shopId: req.shopId,
  });

  for (const item of lineItems) {
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: item.product, shopId: req.shopId },
      {
        $inc: {
          stock: -item.quantity,
          sold: item.quantity,
        },
        $push: {
          stockMovements: {
            type: "sold",
            quantity: -item.quantity,
            note: `Sold on invoice ${invoice.invoiceNumber}`,
            createdAt: new Date(),
          },
        },
      },
      { new: true },
    );

    if (updatedProduct && Number(updatedProduct.stock) <= env.lowStockThreshold) {
      await createNotification({
        type: "low_stock",
        message: `Low stock: ${updatedProduct.name} only ${updatedProduct.stock} left`,
        relatedId: String(updatedProduct._id),
        key: `low-stock-${String(updatedProduct._id)}`,
        shopId: req.shopId,
      });
    }
  }

  customer.orderHistory = Array.isArray(customer.orderHistory) ? customer.orderHistory : [];

  customer.orderHistory.push(invoice._id);

  await customer.save();
  await recalculateCustomerMetrics(customer._id);

  const populated = await Invoice.findById(invoice._id).populate(
    "customer",
    "name email phone address gstNumber",
  );

  await createNotification({
    type: "invoice_created",
    message: `Invoice ${invoice.invoiceNumber} created`,
    relatedId: invoice.invoiceNumber,
    key: `invoice-${invoice.invoiceNumber}`,
    shopId: req.shopId,
  });

  res.status(201).json({
    success: true,
    data: populated,
  });
});

exports.updateInvoicePayment = asyncHandler(async (req, res) => {
  const { status, paidAmount, paymentMethod } = req.body;

  const identifier = String(req.params.id || "").trim();

  const lookup = [{ invoiceNumber: identifier }];

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    lookup.unshift({ _id: identifier });
  }

  let invoice = await Invoice.findOne({
    $or: lookup,
  });

  if (!invoice) {
    const legacy = await Invoice.collection.findOne({
      id: identifier,
    });

    if (legacy?._id) {
      invoice = await Invoice.findById(legacy._id);
    }
  }

  if (!invoice) {
    res.status(404);
    throw new Error("Invoice not found");
  }

  const total = Number(invoice.total ?? invoice.amount ?? 0);

  if (!Number(invoice.total)) {
    invoice.total = total;
  }

  const method = typeof paymentMethod === "string" ? paymentMethod.trim() : "";

  if (status === "paid") {
    const previousPaid = Number(invoice.paidAmount || 0);
    const paymentDelta = Math.max(0, total - previousPaid);

    invoice.status = "paid";
    invoice.paidAmount = total;
    invoice.pendingAmount = 0;
    invoice.paidAt = new Date();

    if (method) {
      invoice.paymentMethod = method;
    }

    if (paymentDelta > 0) {
      invoice.paymentHistory = invoice.paymentHistory || [];
      invoice.paymentHistory.push({
        amount: paymentDelta,
        method: method || invoice.paymentMethod || "Cash",
        paidAt: new Date(),
        note: "Full payment received",
      });
    }
  } else if (status === "partial") {
    const amount = Number(paidAmount ?? 0);

    if (!Number.isFinite(amount) || amount <= 0 || amount >= total) {
      res.status(400);
      throw new Error("Partial payment must be greater than 0 and less than invoice total");
    }

    invoice.status = "partial";
    invoice.paidAmount = amount;
    invoice.pendingAmount = Math.max(0, total - amount);
    invoice.paidAt = new Date();

    if (method) {
      invoice.paymentMethod = method;
    }

    invoice.paymentHistory = invoice.paymentHistory || [];
    invoice.paymentHistory.push({
      amount,
      method: method || "Partial",
      paidAt: new Date(),
      note: "Partial payment received",
    });
  } else if (status === "pending") {
    invoice.status = "pending";
    invoice.paidAmount = 0;
    invoice.pendingAmount = total;
    invoice.paidAt = null;

    if (method) {
      invoice.paymentMethod = method;
    }
  } else {
    res.status(400);
    throw new Error("Invalid payment status");
  }

  await invoice.save();

  await recalculateCustomerMetrics(invoice.customer);

  if (invoice.status === "paid") {
    await createNotification({
      type: "payment_received",
      message: `Payment received ₹${Math.round(total).toLocaleString(
        "en-IN",
      )} from ${invoice.customerName}`,
      relatedId: invoice.invoiceNumber,
      key: `payment-${invoice.invoiceNumber}`,
      shopId: req.shopId,
    });
  }

  const populated = await Invoice.findById(invoice._id).populate(
    "customer",
    "name email phone address gstNumber",
  );

  res.json({
    success: true,
    data: populated,
  });
});
