const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Setting = require("../models/Setting");
const env = require("../config/env");
const { calculateInvoiceTotals } = require("./calculateInvoice");
const { recalculateAllCustomerMetrics } = require("../services/customerMetrics");
const { productCatalog, productCreatedAt } = require("./productCatalog");

let seedPromise;

async function normalizeInvoiceFinancials() {
  const legacyTotal = { $ifNull: ["$total", "$amount", 0] };

  await Invoice.updateMany(
    { $or: [{ total: { $exists: false } }, { total: null }, { total: { $lte: 0 } }] },
    [{ $set: { total: legacyTotal } }],
  );

  await Invoice.updateMany(
    {
      status: "paid",
      $or: [
        { paidAmount: { $exists: false } },
        { paidAmount: { $lte: 0 } },
        { pendingAmount: { $exists: false } },
        { pendingAmount: { $gt: 0 } },
      ],
    },
    [
      {
        $set: {
          paidAmount: legacyTotal,
          pendingAmount: 0,
          paidAt: { $ifNull: ["$paidAt", "$createdAt"] },
        },
      },
    ],
  );

  await Invoice.updateMany(
    { status: "partial" },
    [
      {
        $set: {
          paidAmount: { $max: [0, { $min: ["$paidAmount", legacyTotal] }] },
        },
      },
      {
        $set: {
          pendingAmount: { $max: [0, { $subtract: [legacyTotal, "$paidAmount"] }] },
          paidAt: { $ifNull: ["$paidAt", "$updatedAt"] },
        },
      },
    ],
  );

  await Invoice.updateMany(
    { status: { $in: ["pending", "sent", "overdue"] } },
    [
      {
        $set: {
          paidAmount: { $max: [0, { $min: ["$paidAmount", legacyTotal] }] },
          pendingAmount: { $max: [0, { $subtract: [legacyTotal, "$paidAmount"] }] },
        },
      },
    ],
  );
}

const customerNames = [
  ["Bhuvana Sri", "7569681350", "bhuvana.sri@example.com", "Benz Circle, Vijayawada"],
  ["Sneha Patel", "9001122334", "sneha.patel@example.com", "Governorpet, Vijayawada"],
  ["Rahul Kumar", "9876543210", "rahul.kumar@example.com", "Patamata, Vijayawada"],
  ["Priya Sharma", "9123456780", "priya.sharma@example.com", "Moghalrajpuram, Vijayawada"],
  ["Arjun Reddy", "9988776655", "arjun.reddy@example.com", "Auto Nagar, Vijayawada"],
  ["Kiran Verma", "9812345678", "kiran.verma@example.com", "Labbipet, Vijayawada"],
  ["Meera Joshi", "9345678901", "meera.joshi@example.com", "Tadepalli, Andhra Pradesh"],
  ["Rohit Naik", "9765432109", "rohit.naik@example.com", "Guntur, Andhra Pradesh"],
  ["Aditi Rao", "9870011223", "aditi.rao@example.com", "Kanuru, Vijayawada"],
  ["Vikram Singh", "9012345678", "vikram.singh@example.com", "Poranki, Vijayawada"],
  ["Nisha Gupta", "9393939393", "nisha.gupta@example.com", "Ramavarappadu, Vijayawada"],
  ["Sanjay Yadav", "8899776655", "sanjay.yadav@example.com", "Eluru Road, Vijayawada"],
  ["Pooja Nair", "9445566778", "pooja.nair@example.com", "Krishna Lanka, Vijayawada"],
  ["Harsha Vardhan", "9988112233", "harsha.vardhan@example.com", "Bhavanipuram, Vijayawada"],
  ["Kavya Rani", "9556677889", "kavya.rani@example.com", "Ibrahimpatnam, Andhra Pradesh"],
  ["Deepak Sharma", "9009988776", "deepak.sharma@example.com", "Nunna, Vijayawada"],
  ["Anjali Das", "9776655443", "anjali.das@example.com", "One Town, Vijayawada"],
  ["Naveen Kumar", "9887766554", "naveen.kumar@example.com", "Enikepadu, Vijayawada"],
  ["Divya Patel", "9123987654", "divya.patel@example.com", "Gunadala, Vijayawada"],
  ["Suresh Reddy", "9344556677", "suresh.reddy@example.com", "Satyanarayanapuram, Vijayawada"],
  ["Lakshmi Devi", "9382716450", "lakshmi.devi@example.com", "Machavaram, Vijayawada"],
  ["Harish Babu", "9701234567", "harish.babu@example.com", "Gollapudi, Vijayawada"],
  ["Swapna K", "9109876543", "swapna.k@example.com", "Penamaluru, Vijayawada"],
  ["Venkat Rao", "9823456710", "venkat.rao@example.com", "NTR Circle, Vijayawada"],
  ["Lalitha Kumari", "9605432187", "lalitha.kumari@example.com", "Ajith Singh Nagar, Vijayawada"],
  ["Gopal Krishna", "9912345678", "gopal.krishna@example.com", "Tadepalli, Andhra Pradesh"],
  ["Revathi N", "9245678901", "revathi.n@example.com", "Poranki, Vijayawada"],
  ["Mahesh Babu", "9398765432", "mahesh.babu@example.com", "Gannavaram, Andhra Pradesh"],
  ["Chitra Reddy", "9567123890", "chitra.reddy@example.com", "Ramavarappadu, Vijayawada"],
  ["Rajesh Iyer", "9032145678", "rajesh.iyer@example.com", "Benz Circle, Vijayawada"],
];

function createRng(seed = 7242026) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function invoiceDate(index, rng, totalInvoices = 100) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 90);
  const rangeMs = end.getTime() - start.getTime();
  const slotMs = rangeMs / totalInvoices;
  const date = new Date(start.getTime() + index * slotMs + rng() * slotMs);
  date.setHours(9 + Math.floor(rng() * 10), Math.floor(rng() * 60), 0, 0);
  return date;
}

function lineItem(product, quantity) {
  return {
    product: product._id,
    productName: product.name,
    sku: product.sku,
    quantity,
    unitPrice: product.price,
    costPrice: Number(product.costPrice ?? product.price * 0.7),
    lineTotal: Number((quantity * product.price).toFixed(2)),
  };
}

async function seedDemoData() {
  await Promise.all([Invoice.deleteMany(), Product.deleteMany(), Customer.deleteMany()]);

  await Setting.findOneAndUpdate(
    { key: "default" },
    {
      $setOnInsert: { key: "default" },
      $set: {
        business: {
          storeName: "SaiMart Retail",
          ownerName: "A. Sai Amar Chaitanya",
          gstNumber: "37ABCDE1234F1Z5",
          phone: "+91 7569681350",
          email: "support@saimart.in",
          address: "Vijayawada, Andhra Pradesh",
          category: "Grocery & Retail",
        },
      },
    },
    { upsert: true, runValidators: true },
  );

  const products = await Product.insertMany(
    productCatalog.map(([sku, name, category, stock, price], index) => {
      const createdAt = productCreatedAt(index, productCatalog.length);
      return {
        sku,
        name,
        category,
        stock,
        price,
        costPrice: Number((price * (0.62 + (index % 5) * 0.04)).toFixed(2)),
        sold: 0,
        createdAt,
        updatedAt: createdAt,
        stockMovements: [
          {
            type: "added",
            quantity: stock + 80,
            note: "Opening stock",
            createdAt,
          },
        ],
      };
    }),
  );
  const customers = await Customer.insertMany(
    customerNames.map(([name, phone, email, address]) => ({ name, phone, email, address })),
  );

  const rng = createRng();
  const weightedCustomers = [...customers, ...customers.slice(0, 10), ...customers.slice(0, 5)];
  const invoices = [];

  for (let index = 0; index < 100; index += 1) {
    const customer = weightedCustomers[Math.floor(rng() * weightedCustomers.length)];
    const createdAt = invoiceDate(index, rng);
    const itemCount = 1 + Math.floor(rng() * 4);
    const selected = [];
    for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
      const product = products[Math.floor(rng() * products.length)];
      selected.push(lineItem(product, 1 + Math.floor(rng() * 4)));
    }
    const totals = calculateInvoiceTotals(selected, env.taxRate);
    const statusRoll = rng();
    let status = statusRoll < 0.6 ? "paid" : statusRoll < 0.82 ? "pending" : statusRoll < 0.92 ? "overdue" : "partial";
    const dueDate = new Date(createdAt);
    dueDate.setDate(dueDate.getDate() + 7);
    const paidAmount = status === "partial" ? Number((totals.total * (0.3 + rng() * 0.5)).toFixed(2)) : 0;

    invoices.push({
      invoiceNumber: `SP-${createdAt.getFullYear()}-${String(index + 1).padStart(4, "0")}`,
      customer: customer._id,
      customerName: customer.name,
      lineItems: selected,
      ...totals,
      status,
      paidAmount: status === "paid" ? totals.total : paidAmount,
      paidAt: status === "paid" || status === "partial" ? createdAt : undefined,
      paymentMethod: status === "paid" ? (rng() > 0.5 ? "UPI" : "Cash") : "",
      dueDate,
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
            note: `Sold on invoice ${invoice.invoiceNumber}`,
            createdAt: invoice.createdAt,
          },
        },
      });
    }
  }

  await recalculateAllCustomerMetrics();
}

async function ensureDemoData(shopId) {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    const scope = shopId ? { shopId } : {};
    const [productCount, customerCount, invoiceCount] = await Promise.all([
      Product.countDocuments(scope),
      Customer.countDocuments(scope),
      Invoice.countDocuments(scope),
    ]);

    if (productCount === 0 || customerCount === 0 || invoiceCount === 0) {
      if (!shopId) {
        await seedDemoData();
      }
    }
    await normalizeInvoiceFinancials();
    await recalculateAllCustomerMetrics();
  })().finally(() => {
    seedPromise = undefined;
  });

  return seedPromise;
}

module.exports = { ensureDemoData };
