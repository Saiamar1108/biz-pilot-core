const mongoose = require("mongoose");
const connectDB = require("../config/db");
const env = require("../config/env");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const { calculateInvoiceTotals } = require("./calculateInvoice");

const products = [
  { sku: "GRO-001", name: "Basmati Rice 5kg", category: "Grocery", stock: 48, price: 12.5, sold: 128 },
  { sku: "DAI-014", name: "Almond Milk 1L", category: "Dairy", stock: 42, price: 4.2, sold: 84 },
  { sku: "SNK-091", name: "Dark Chocolate 100g", category: "Snacks", stock: 8, price: 3.8, sold: 210 },
  { sku: "BEV-030", name: "Cold Brew Bottle", category: "Drinks", stock: 65, price: 5.5, sold: 320 },
  { sku: "GRO-018", name: "Organic Eggs (12)", category: "Grocery", stock: 22, price: 6.9, sold: 190 },
  { sku: "HH-224", name: "Dish Soap 500ml", category: "Household", stock: 27, price: 2.9, sold: 62 },
  { sku: "SNK-102", name: "Trail Mix 250g", category: "Snacks", stock: 15, price: 7.4, sold: 55 },
  { sku: "BEV-041", name: "Sparkling Water 6pk", category: "Drinks", stock: 5, price: 8.99, sold: 145 },
  { sku: "GRO-032", name: "Whole Wheat Bread", category: "Grocery", stock: 18, price: 3.25, sold: 240 },
  { sku: "HH-118", name: "Olive Oil 500ml", category: "Household", stock: 31, price: 9.75, sold: 98 },
];

const customers = [
  { name: "Priya Sharma", email: "priya@mail.com", phone: "+1 555 0101", orders: 24, spent: 1840, due: 0, pendingPayments: 0, status: "vip", lastOrder: new Date("2026-06-28") },
  { name: "Marcus Chen", email: "marcus@brew.co", phone: "+1 555 0102", orders: 18, spent: 1210, due: 90, pendingPayments: 90, status: "regular", lastOrder: new Date("2026-06-27") },
  { name: "Aisha Okoye", email: "aisha@lagos.co", phone: "+1 555 0103", orders: 32, spent: 2890, due: 0, pendingPayments: 0, status: "vip", lastOrder: new Date("2026-06-29") },
  { name: "James Patel", email: "jamesp@mail.com", phone: "+1 555 0104", orders: 6, spent: 420, due: 65, pendingPayments: 65, status: "new", lastOrder: new Date("2026-06-25") },
  { name: "Sofia Rossi", email: "sofia@rossi.it", phone: "+1 555 0105", orders: 14, spent: 940, due: 0, pendingPayments: 0, status: "regular", lastOrder: new Date("2026-06-26") },
  { name: "Bhuvana Sri", email: "bhuvana@example.com", phone: "7569681350", orders: 0, spent: 0, due: 0, pendingPayments: 0, status: "new", lastOrder: new Date() },
];

function lineItem(product, quantity) {
  const lineTotal = parseFloat((quantity * product.price).toFixed(2));
  return {
    product: product._id,
    productName: product.name,
    sku: product.sku,
    quantity,
    unitPrice: product.price,
    lineTotal,
  };
}

function buildInvoice({ invoiceNumber, customer, items, status, createdAt }) {
  const lineItems = items.map(({ product, quantity }) => lineItem(product, quantity));
  const { subtotal, taxRate, tax, total } = calculateInvoiceTotals(lineItems, env.taxRate);

  return {
    invoiceNumber,
    customer: customer._id,
    customerName: customer.name,
    lineItems,
    subtotal,
    taxRate,
    tax,
    total,
    status,
    createdAt,
  };
}

async function seed() {
  await connectDB();

  console.log("Clearing existing data...");
  await Promise.all([Product.deleteMany(), Customer.deleteMany(), Invoice.deleteMany()]);

  const createdProducts = await Product.insertMany(products);
  const createdCustomers = await Customer.insertMany(customers);

  const bySku = Object.fromEntries(createdProducts.map((p) => [p.sku, p]));
  const byEmail = Object.fromEntries(createdCustomers.map((c) => [c.email, c]));

  const invoices = [
    buildInvoice({
      invoiceNumber: "INV-10277",
      customer: byEmail["priya@mail.com"],
      items: [
        { product: bySku["GRO-001"], quantity: 3 },
        { product: bySku["DAI-014"], quantity: 6 },
        { product: bySku["GRO-032"], quantity: 4 },
      ],
      status: "paid",
      createdAt: new Date("2026-06-22"),
    }),
    buildInvoice({
      invoiceNumber: "INV-10278",
      customer: byEmail["marcus@brew.co"],
      items: [
        { product: bySku["BEV-030"], quantity: 12 },
        { product: bySku["SNK-091"], quantity: 8 },
      ],
      status: "paid",
      createdAt: new Date("2026-06-23"),
    }),
    buildInvoice({
      invoiceNumber: "INV-10279",
      customer: byEmail["sofia@rossi.it"],
      items: [
        { product: bySku["HH-118"], quantity: 2 },
        { product: bySku["HH-224"], quantity: 3 },
        { product: bySku["GRO-018"], quantity: 2 },
      ],
      status: "paid",
      createdAt: new Date("2026-06-24"),
    }),
    buildInvoice({
      invoiceNumber: "INV-10280",
      customer: byEmail["jamesp@mail.com"],
      items: [
        { product: bySku["GRO-001"], quantity: 1 },
        { product: bySku["SNK-102"], quantity: 2 },
      ],
      status: "pending",
      createdAt: new Date("2026-06-25"),
    }),
    buildInvoice({
      invoiceNumber: "INV-10281",
      customer: byEmail["aisha@lagos.co"],
      items: [
        { product: bySku["BEV-041"], quantity: 6 },
        { product: bySku["BEV-030"], quantity: 10 },
        { product: bySku["SNK-091"], quantity: 15 },
      ],
      status: "paid",
      createdAt: new Date("2026-06-26"),
    }),
    buildInvoice({
      invoiceNumber: "INV-10282",
      customer: byEmail["aisha@lagos.co"],
      items: [
        { product: bySku["GRO-018"], quantity: 5 },
        { product: bySku["GRO-032"], quantity: 8 },
        { product: bySku["DAI-014"], quantity: 10 },
      ],
      status: "paid",
      createdAt: new Date("2026-06-27"),
    }),
    buildInvoice({
      invoiceNumber: "INV-10283",
      customer: byEmail["marcus@brew.co"],
      items: [
        { product: bySku["BEV-030"], quantity: 6 },
        { product: bySku["BEV-041"], quantity: 4 },
      ],
      status: "pending",
      createdAt: new Date("2026-06-28"),
    }),
    buildInvoice({
      invoiceNumber: "INV-10284",
      customer: byEmail["priya@mail.com"],
      items: [
        { product: bySku["GRO-001"], quantity: 2 },
        { product: bySku["HH-118"], quantity: 1 },
        { product: bySku["SNK-102"], quantity: 3 },
      ],
      status: "overdue",
      createdAt: new Date("2026-06-15"),
    }),
  ];

  const createdInvoices = await Invoice.insertMany(invoices);

  // Link invoices to customer orderHistory
  for (const inv of createdInvoices) {
    await Customer.findByIdAndUpdate(inv.customer, {
      $push: { orderHistory: inv._id }
    });
  }

  console.log(`Seeded ${createdProducts.length} products`);
  console.log(`Seeded ${createdCustomers.length} customers`);
  console.log(`Seeded ${invoices.length} invoices`);
  console.log("Done.");

  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
