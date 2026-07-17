const mongoose = require("mongoose");
const connectDB = require("../config/db");
const env = require("../config/env");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Shop = require("../models/Shop");
const Supplier = require("../models/Supplier");
const PurchaseOrder = require("../models/PurchaseOrder");
const { calculateInvoiceTotals } = require("./calculateInvoice");
const { recalculateAllCustomerMetrics } = require("../services/customerMetrics");

const products = [
  {
    sku: "GRO-001",
    name: "India Gate Basmati Rice 5kg",
    category: "Grocery",
    stock: 320,
    price: 760,
    costPrice: 530,
  },
  { sku: "GRO-002", name: "Aashirvaad Atta 5kg", category: "Grocery", stock: 280, price: 315, costPrice: 220 },
  { sku: "GRO-003", name: "Fortune Sunflower Oil 1L", category: "Grocery", stock: 260, price: 165, costPrice: 115 },
  { sku: "DAI-014", name: "Amul Taaza Milk 1L", category: "Dairy", stock: 420, price: 68, costPrice: 48 },
  { sku: "DAI-022", name: "Amul Butter 500g", category: "Dairy", stock: 180, price: 285, costPrice: 200 },
  { sku: "SNK-091", name: "Haldiram's Namkeen 400g", category: "Snacks", stock: 220, price: 145, costPrice: 100 },
  { sku: "SNK-102", name: "Britannia Good Day 600g", category: "Snacks", stock: 240, price: 130, costPrice: 90 },
  { sku: "BEV-030", name: "Tata Tea Premium 1kg", category: "Beverages", stock: 150, price: 520, costPrice: 360 },
  { sku: "BEV-041", name: "Nescafe Classic 200g", category: "Beverages", stock: 120, price: 610, costPrice: 420 },
  {
    sku: "HH-118",
    name: "Surf Excel Detergent 2kg",
    category: "Household",
    stock: 170,
    price: 430,
    costPrice: 300,
  },
  { sku: "HH-224", name: "Vim Dishwash Gel 750ml", category: "Household", stock: 210, price: 185, costPrice: 130 },
  { sku: "PC-301", name: "Dove Soap Pack of 4", category: "Personal Care", stock: 190, price: 220, costPrice: 150 },
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
    costPrice: product.costPrice,
    sellingPrice: product.price,
    lineTotal: parseFloat((quantity * product.price).toFixed(2)),
  };
}

function buildInvoice({ invoiceNumber, customer, lineItems, status, createdAt, shopId }) {
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
    shopId,
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
  await Promise.all([
    Product.deleteMany(),
    Customer.deleteMany(),
    Invoice.deleteMany(),
    Supplier.deleteMany(),
    PurchaseOrder.deleteMany()
  ]);

  let shop = await Shop.findOne();
  if (!shop) {
    shop = await Shop.create({
      shopName: "Demo Store",
      name: "Demo Store",
      email: "demo@shoppilot.ai",
      currency: "INR",
    });
  }
  const shopId = shop._id;

  // 1. Seed suppliers
  const suppliersList = [
    {
      supplierName: "Reliance Agro Wholesalers",
      contactPerson: "Rajesh Patil",
      mobileNumber: "+91 9876543201",
      whatsAppNumber: "+91 9876543201",
      email: "wholesale@relianceagro.com",
      gstNumber: "27AAACR1209B1Z2",
      address: "Gala 12, APMC Market, Vashi",
      city: "Navi Mumbai",
      state: "Maharashtra",
      pincode: "400703",
      isActive: true,
      preferredSupplier: true
    },
    {
      supplierName: "Amul Dairy Distributing",
      contactPerson: "Vikram Shah",
      mobileNumber: "+91 9123456701",
      whatsAppNumber: "+91 9123456701",
      email: "supply@amuldairy.com",
      gstNumber: "24AAACA1290A1Z5",
      address: "Amul Dairy Road, Anand",
      city: "Anand",
      state: "Gujarat",
      pincode: "388001",
      isActive: true,
      preferredSupplier: true
    },
    {
      supplierName: "Universal Foods & Beverages",
      contactPerson: "Sunil Nair",
      mobileNumber: "+91 9988776601",
      whatsAppNumber: "+91 9988776601",
      email: "orders@universalbev.in",
      gstNumber: "32AAACU1829C1Z0",
      address: "18/402, Kinfra Techno Industrial Park",
      city: "Kozhikode",
      state: "Kerala",
      pincode: "673635",
      isActive: true,
      preferredSupplier: false
    },
    {
      supplierName: "Hindustan Unilever Supply",
      contactPerson: "Nisha Sen",
      mobileNumber: "+91 9001122301",
      whatsAppNumber: "+91 9001122301",
      email: "distributor@hul.com",
      gstNumber: "27AAACH1289A2Z4",
      address: "HUL House, B.D. Sawant Marg, Chakala",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400099",
      isActive: true,
      preferredSupplier: false
    }
  ].map(s => ({ ...s, shopId }));

  const createdSuppliers = await Supplier.insertMany(suppliersList);
  const supplierMap = {
    "Reliance Agro Wholesalers": createdSuppliers[0],
    "Amul Dairy Distributing": createdSuppliers[1],
    "Universal Foods & Beverages": createdSuppliers[2],
    "Hindustan Unilever Supply": createdSuppliers[3]
  };

  // 2. Map defaultSupplier on each product and mark some low stock
  const productsWithShop = products.map((p) => {
    let supplierName = "Reliance Agro Wholesalers";
    if (p.category === "Dairy") {
      supplierName = "Amul Dairy Distributing";
    } else if (p.category === "Snacks" || p.category === "Beverages") {
      supplierName = "Universal Foods & Beverages";
    } else if (p.category === "Household" || p.category === "Personal Care") {
      supplierName = "Hindustan Unilever Supply";
    }

    const supplier = supplierMap[supplierName];

    let stockVal = p.stock;
    if (p.sku === "GRO-001") stockVal = 2; // Low Stock India Gate Rice
    if (p.sku === "DAI-022") stockVal = 3; // Low Stock Amul Butter

    return {
      ...p,
      shopId,
      stock: stockVal,
      defaultSupplier: supplier ? supplier._id : null,
      minStock: 10,
      targetStock: 50,
      purchaseHistory: []
    };
  });

  const createdProducts = await Product.insertMany(productsWithShop);
  const createdCustomers = await Customer.insertMany(customersWithShop = customers.map((c) => ({ ...c, shopId })));
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
        shopId,
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

  // 3. Seed Purchase Orders and record initial purchase history logs
  const po1 = await PurchaseOrder.create({
    shopId,
    purchaseOrderNumber: "PO-2026-0001",
    supplier: createdSuppliers[0]._id,
    supplierName: createdSuppliers[0].supplierName,
    items: [
      {
        product: createdProducts[0]._id,
        productName: createdProducts[0].name,
        sku: createdProducts[0].sku,
        quantity: 100,
        unit: "units",
        purchasePrice: 530,
        receivedQuantity: 100,
        expectedDeliveryDate: new Date(Date.now() - 5 * 86400000),
        remarks: "Urgent restocking",
        batchNumber: "BATCH-GATE-01",
        expiryDate: new Date(Date.now() + 180 * 86400000)
      }
    ],
    totalAmount: 53000,
    status: "Received",
    receivedDate: new Date(Date.now() - 3 * 86400000),
    invoiceNumber: "INV-REL-9981"
  });

  const po2 = await PurchaseOrder.create({
    shopId,
    purchaseOrderNumber: "PO-2026-0002",
    supplier: createdSuppliers[1]._id,
    supplierName: createdSuppliers[1].supplierName,
    items: [
      {
        product: createdProducts[4]._id,
        productName: createdProducts[4].name,
        sku: createdProducts[4].sku,
        quantity: 50,
        unit: "units",
        purchasePrice: 200,
        receivedQuantity: 0,
        expectedDeliveryDate: new Date(Date.now() + 4 * 86400000),
        remarks: "Weekly dairy delivery"
      }
    ],
    totalAmount: 10000,
    status: "Sent"
  });

  // Record initial purchase history logs on the products
  await Product.findByIdAndUpdate(createdProducts[0]._id, {
    $push: {
      purchaseHistory: {
        supplier: createdSuppliers[0]._id,
        supplierName: createdSuppliers[0].supplierName,
        price: 530,
        quantity: 100,
        purchaseDate: new Date(Date.now() - 3 * 86400000)
      }
    }
  });

  await recalculateAllCustomerMetrics();

  console.log(`Seeded ${createdProducts.length} products`);
  console.log(`Seeded ${createdCustomers.length} customers`);
  console.log(`Seeded ${createdInvoices.length} invoices`);
  console.log(`Seeded ${createdSuppliers.length} suppliers`);
  console.log(`Seeded 2 purchase orders`);
  console.log("Done.");

  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
