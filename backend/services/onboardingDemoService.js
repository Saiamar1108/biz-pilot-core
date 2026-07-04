const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Shop = require("../models/Shop");
const { calculateInvoiceTotals } = require("../utils/calculateInvoice");
const { recalculateCustomerMetrics } = require("./customerMetrics");

const demoProducts = [
  ["RICE-10KG", "Sona Masoori Rice 10kg", "Grocery", 28, 780],
  ["ATTA-5KG", "Whole Wheat Atta 5kg", "Grocery", 4, 265],
  ["OIL-1L", "Sunflower Oil 1L", "Grocery", 18, 155],
  ["MILK-1L", "Toned Milk 1L", "Dairy", 7, 62],
  ["BISCUIT-FAM", "Family Cream Biscuits", "Snacks", 34, 45],
  ["TEA-500G", "Premium Tea 500g", "Beverages", 12, 220],
  ["SOAP-PACK", "Bath Soap 4 Pack", "Personal Care", 16, 138],
  ["CLEAN-1L", "Floor Cleaner 1L", "Cleaning", 5, 185],
  ["NOTE-A4", "A4 Notebook Pack", "Stationery", 22, 120],
];

const demoCustomers = [
  ["Bhuvana Sri", "7569681350", "Benz Circle, Vijayawada"],
  ["Sneha Patel", "9001122334", "Governorpet, Vijayawada"],
  ["Rahul Kumar", "9876543210", "Patamata, Vijayawada"],
  ["Priya Sharma", "9123456780", "Moghalrajpuram, Vijayawada"],
  ["Arjun Reddy", "9988776655", "Auto Nagar, Vijayawada"],
];

function shopSuffix(shopId) {
  return String(shopId).slice(-6).toLowerCase();
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(10, 30, 0, 0);
  return date;
}

function buildLineItem(product, quantity) {
  const lineTotal = Number((quantity * product.price).toFixed(2));
  return {
    product: product._id,
    productName: product.name,
    sku: product.sku,
    quantity,
    unitPrice: product.price,
    costPrice: product.costPrice,
    lineTotal,
  };
}

function resolvePayment(status, total) {
  if (status === "paid") {
    return {
      paidAmount: total,
      pendingAmount: 0,
      paidAt: new Date(),
      paymentMethod: "UPI",
      paymentHistory: [{ amount: total, method: "UPI", paidAt: new Date(), note: "Demo payment" }],
    };
  }

  if (status === "partial") {
    const paidAmount = Number((total * 0.45).toFixed(2));
    return {
      paidAmount,
      pendingAmount: Number((total - paidAmount).toFixed(2)),
      paidAt: new Date(),
      paymentMethod: "Cash",
      paymentHistory: [{ amount: paidAmount, method: "Cash", paidAt: new Date(), note: "Demo partial payment" }],
    };
  }

  return {
    paidAmount: 0,
    pendingAmount: total,
    paymentMethod: "",
    paymentHistory: [],
  };
}

async function seedDemoDataForShop(shopId) {
  const shop = await Shop.findById(shopId);
  if (!shop) {
    const error = new Error("Shop not found");
    error.statusCode = 404;
    throw error;
  }

  if (shop.demoSeeded) {
    return { seeded: false, message: "Demo data has already been seeded for this shop." };
  }

  const suffix = shopSuffix(shop._id);
  const products = await Product.insertMany(
    demoProducts.map(([sku, name, category, stock, price]) => ({
      sku: `${sku}-${suffix}`,
      name,
      category,
      stock,
      price,
      costPrice: Number((price * 0.68).toFixed(2)),
      sold: 0,
      shopId: shop._id,
      isDemoData: true,
      stockMovements: [
        {
          type: "added",
          quantity: stock,
          note: "Demo opening stock",
          createdAt: new Date(),
        },
      ],
    })),
  );

  const customers = await Customer.insertMany(
    demoCustomers.map(([name, phone, address], index) => ({
      name,
      phone,
      email: `demo.customer.${index + 1}.${suffix}@shoppilot.local`,
      address,
      shopId: shop._id,
      isDemoData: true,
    })),
  );

  const invoicePlan = [
    { customer: 0, status: "paid", days: 18, items: [[0, 1], [2, 2], [4, 4]] },
    { customer: 1, status: "pending", days: 10, items: [[1, 2], [5, 1]] },
    { customer: 2, status: "partial", days: 7, items: [[0, 1], [6, 2]] },
    { customer: 3, status: "overdue", days: 24, items: [[3, 4], [7, 1]] },
    { customer: 4, status: "paid", days: 5, items: [[8, 3], [4, 2]] },
    { customer: 0, status: "pending", days: 2, items: [[2, 3], [5, 1]] },
    { customer: 1, status: "paid", days: 1, items: [[1, 1], [3, 2], [6, 1]] },
  ];

  const invoices = [];

  for (const [index, plan] of invoicePlan.entries()) {
    const customer = customers[plan.customer];
    const lineItems = plan.items.map(([productIndex, quantity]) =>
      buildLineItem(products[productIndex], quantity),
    );
    const totals = calculateInvoiceTotals(lineItems, 0.08, 0, "flat", "cgst-sgst", true);
    const createdAt = daysAgo(plan.days);
    const dueDate = new Date(createdAt);
    dueDate.setDate(dueDate.getDate() + 7);
    const payment = resolvePayment(plan.status, totals.total);

    invoices.push({
      invoiceNumber: `DEMO-${suffix}-${String(index + 1).padStart(3, "0")}`,
      customer: customer._id,
      customerName: customer.name,
      lineItems,
      ...totals,
      ...payment,
      status: plan.status,
      dueDate,
      shopId: shop._id,
      isDemoData: true,
      createdAt,
      updatedAt: createdAt,
    });
  }

  const createdInvoices = await Invoice.insertMany(invoices);

  for (const invoice of createdInvoices) {
    await Customer.findByIdAndUpdate(invoice.customer, { $push: { orderHistory: invoice._id } });
    for (const item of invoice.lineItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity, sold: item.quantity },
        $push: {
          stockMovements: {
            type: "sold",
            quantity: -item.quantity,
            note: `Demo sale on invoice ${invoice.invoiceNumber}`,
            createdAt: invoice.createdAt,
          },
        },
      });
    }
  }

  await Promise.all(customers.map((customer) => recalculateCustomerMetrics(customer._id)));

  shop.demoSeeded = true;
  await shop.save();

  return {
    seeded: true,
    counts: {
      products: products.length,
      customers: customers.length,
      invoices: createdInvoices.length,
    },
  };
}

async function resetDemoDataForShop(shopId) {
  const [invoiceResult, productResult, customerResult] = await Promise.all([
    Invoice.deleteMany({ shopId, isDemoData: true }),
    Product.deleteMany({ shopId, isDemoData: true }),
    Customer.deleteMany({ shopId, isDemoData: true }),
  ]);

  await Shop.findByIdAndUpdate(shopId, { $set: { demoSeeded: false } });

  return {
    invoices: invoiceResult.deletedCount || 0,
    products: productResult.deletedCount || 0,
    customers: customerResult.deletedCount || 0,
  };
}

module.exports = {
  resetDemoDataForShop,
  seedDemoDataForShop,
};
