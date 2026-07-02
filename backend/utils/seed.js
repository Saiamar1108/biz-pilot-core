const mongoose = require("mongoose");
const connectDB = require("../config/db");
const env = require("../config/env");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const { calculateInvoiceTotals } = require("./calculateInvoice");
const { recalculateAllCustomerMetrics } = require("../services/customerMetrics");

const products = [
  {
    sku: "GRO-001",
    name: "India Gate Basmati Rice 5kg",
    category: "Grocery",
    stock: 320,
    price: 760,
  },
  { sku: "GRO-002", name: "Aashirvaad Atta 5kg", category: "Grocery", stock: 280, price: 315 },
  { sku: "GRO-003", name: "Fortune Sunflower Oil 1L", category: "Grocery", stock: 260, price: 165 },
  { sku: "DAI-014", name: "Amul Taaza Milk 1L", category: "Dairy", stock: 420, price: 68 },
  { sku: "DAI-022", name: "Amul Butter 500g", category: "Dairy", stock: 180, price: 285 },
  { sku: "SNK-091", name: "Haldiram's Namkeen 400g", category: "Snacks", stock: 220, price: 145 },
  { sku: "SNK-102", name: "Britannia Good Day 600g", category: "Snacks", stock: 240, price: 130 },
  { sku: "BEV-030", name: "Tata Tea Premium 1kg", category: "Beverages", stock: 150, price: 520 },
  { sku: "BEV-041", name: "Nescafe Classic 200g", category: "Beverages", stock: 120, price: 610 },
  {
    sku: "HH-118",
    name: "Surf Excel Detergent 2kg",
    category: "Household",
    stock: 170,
    price: 430,
  },
  { sku: "HH-224", name: "Vim Dishwash Gel 750ml", category: "Household", stock: 210, price: 185 },
  { sku: "PC-301", name: "Dove Soap Pack of 4", category: "Personal Care", stock: 190, price: 220 },
];

const customers = [
  {
    name: "Bhuvana Sri",
    phone: "7569681350",
    email: "bhuvana.sri@example.com",
    address: "12-4-91, Madhapur, Hyderabad, Telangana",
  },
  {
    name: "Rahul Kumar",
    phone: "9876543210",
    email: "rahul.kumar@example.com",
    address: "44 MG Road, Bengaluru, Karnataka",
  },
  {
    name: "Priya Sharma",
    phone: "9123456780",
    email: "priya.sharma@example.com",
    address: "B-18 Lajpat Nagar, New Delhi",
  },
  {
    name: "Arjun Reddy",
    phone: "9988776655",
    email: "arjun.reddy@example.com",
    address: "Plot 27, Jubilee Hills, Hyderabad, Telangana",
  },
  {
    name: "Sneha Patel",
    phone: "9001122334",
    email: "sneha.patel@example.com",
    address: "6 Navrangpura Road, Ahmedabad, Gujarat",
  },
  {
    name: "Kiran Verma",
    phone: "9812345678",
    email: "kiran.verma@example.com",
    address: "88 Gomti Nagar, Lucknow, Uttar Pradesh",
  },
  {
    name: "Meera Joshi",
    phone: "9345678901",
    email: "meera.joshi@example.com",
    address: "21 FC Road, Pune, Maharashtra",
  },
  {
    name: "Rohit Naik",
    phone: "9765432109",
    email: "rohit.naik@example.com",
    address: "9 Panaji Market Road, Panaji, Goa",
  },
  {
    name: "Aditi Rao",
    phone: "9870011223",
    email: "aditi.rao@example.com",
    address: "302 Anna Nagar, Chennai, Tamil Nadu",
  },
  {
    name: "Vikram Singh",
    phone: "9012345678",
    email: "vikram.singh@example.com",
    address: "55 Civil Lines, Jaipur, Rajasthan",
  },
  {
    name: "Nisha Gupta",
    phone: "9393939393",
    email: "nisha.gupta@example.com",
    address: "14 Salt Lake Sector II, Kolkata, West Bengal",
  },
  {
    name: "Sanjay Yadav",
    phone: "8899776655",
    email: "sanjay.yadav@example.com",
    address: "117 Aliganj, Lucknow, Uttar Pradesh",
  },
  {
    name: "Pooja Nair",
    phone: "9445566778",
    email: "pooja.nair@example.com",
    address: "73 Marine Drive, Kochi, Kerala",
  },
  {
    name: "Harsha Vardhan",
    phone: "9988112233",
    email: "harsha.vardhan@example.com",
    address: "8 Benz Circle, Vijayawada, Andhra Pradesh",
  },
  {
    name: "Kavya Rani",
    phone: "9556677889",
    email: "kavya.rani@example.com",
    address: "19 Kankarbagh Main Road, Patna, Bihar",
  },
  {
    name: "Deepak Sharma",
    phone: "9009988776",
    email: "deepak.sharma@example.com",
    address: "A-42 Malviya Nagar, Bhopal, Madhya Pradesh",
  },
  {
    name: "Anjali Das",
    phone: "9776655443",
    email: "anjali.das@example.com",
    address: "31 Saheed Nagar, Bhubaneswar, Odisha",
  },
  {
    name: "Naveen Kumar",
    phone: "9887766554",
    email: "naveen.kumar@example.com",
    address: "5 Banjara Colony, Mysuru, Karnataka",
  },
  {
    name: "Divya Patel",
    phone: "9123987654",
    email: "divya.patel@example.com",
    address: "24 Ring Road, Surat, Gujarat",
  },
  {
    name: "Suresh Reddy",
    phone: "9344556677",
    email: "suresh.reddy@example.com",
    address: "16 Dwaraka Nagar, Visakhapatnam, Andhra Pradesh",
  },
];

function createRng(seed = 42626) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function lineItem(product, quantity) {
  return {
    product: product._id,
    productName: product.name,
    sku: product.sku,
    quantity,
    unitPrice: product.price,
    lineTotal: parseFloat((quantity * product.price).toFixed(2)),
  };
}

function buildInvoice({ invoiceNumber, customer, lineItems, status, createdAt }) {
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
    updatedAt: createdAt,
  };
}

function pickInvoiceDate(index, rng) {
  const windows = [
    { start: new Date("2026-04-01T10:00:00+05:30"), days: 30 },
    { start: new Date("2026-05-01T10:00:00+05:30"), days: 31 },
    { start: new Date("2026-06-01T10:00:00+05:30"), days: 30 },
    { start: new Date("2026-07-01T10:00:00+05:30"), days: 2 },
  ];
  const window = windows[Math.min(Math.floor(index / 25), windows.length - 1)];
  const date = new Date(window.start);

  date.setDate(date.getDate() + Math.floor(rng() * window.days));
  date.setHours(10 + Math.floor(rng() * 10), Math.floor(rng() * 60), 0, 0);
  return date;
}

function buildLineItemsForTarget(createdProducts, targetTotal, rng) {
  const maxSubtotal = targetTotal / (1 + env.taxRate);
  const affordableProducts = createdProducts.filter((product) => product.price <= maxSubtotal);
  const first = affordableProducts[Math.floor(rng() * affordableProducts.length)];
  const firstQuantity = Math.max(
    1,
    Math.min(6, Math.floor((maxSubtotal * (0.45 + rng() * 0.35)) / first.price)),
  );
  const items = [lineItem(first, firstQuantity)];
  const subtotal = () => items.reduce((sum, item) => sum + item.lineTotal, 0);

  for (let attempt = 0; attempt < 4 && subtotal() < maxSubtotal * 0.82; attempt += 1) {
    const remaining = maxSubtotal - subtotal();
    const options = createdProducts.filter((product) => product.price <= remaining);
    if (!options.length) break;

    const product = options[Math.floor(rng() * options.length)];
    const quantity = Math.max(1, Math.min(5, Math.floor(remaining / product.price)));
    items.push(lineItem(product, quantity));
  }

  return items;
}

async function seed() {
  await connectDB();

  console.log("Clearing existing data...");
  await Promise.all([Product.deleteMany(), Customer.deleteMany(), Invoice.deleteMany()]);

  const createdProducts = await Product.insertMany(products);
  const createdCustomers = await Customer.insertMany(customers);
  const rng = createRng();
  const weightedCustomers = [
    ...createdCustomers,
    ...createdCustomers.slice(0, 8),
    ...createdCustomers.slice(0, 4),
  ];
  const invoices = [];

  for (let index = 0; index < 100; index += 1) {
    const customer = weightedCustomers[Math.floor(rng() * weightedCustomers.length)];
    const targetTotal = 300 + Math.floor(rng() * 4600);
    const createdAt = pickInvoiceDate(index, rng);
    const statusRoll = rng();
    const status = statusRoll < 0.68 ? "paid" : statusRoll < 0.9 ? "pending" : "overdue";

    invoices.push(
      buildInvoice({
        invoiceNumber: `INV-2026-${String(index + 1).padStart(4, "0")}`,
        customer,
        lineItems: buildLineItemsForTarget(createdProducts, targetTotal, rng),
        status,
        createdAt,
      }),
    );
  }

  invoices.sort((a, b) => a.createdAt - b.createdAt);
  invoices.forEach((invoice, index) => {
    invoice.invoiceNumber = `INV-2026-${String(index + 1).padStart(4, "0")}`;
  });

  const createdInvoices = await Invoice.insertMany(invoices);

  for (const invoice of createdInvoices) {
    await Customer.findByIdAndUpdate(invoice.customer, { $push: { orderHistory: invoice._id } });

    for (const item of invoice.lineItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity, sold: item.quantity },
      });
    }
  }

  await recalculateAllCustomerMetrics();

  console.log(`Seeded ${createdProducts.length} products`);
  console.log(`Seeded ${createdCustomers.length} customers`);
  console.log(`Seeded ${createdInvoices.length} invoices`);
  console.log("Done.");

  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
