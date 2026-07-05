const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(11, 0, 0, 0);
  return date;
}

function buildLineItem(product, quantity) {
  return {
    product: product._id,
    productName: product.name,
    sku: product.sku,
    quantity,
    unitPrice: product.price,
    costPrice: product.costPrice,
    lineTotal: Number((quantity * product.price).toFixed(2)),
  };
}

function paymentFor(status, total, createdAt) {
  if (status === "paid") {
    return {
      paidAmount: total,
      pendingAmount: 0,
      paidAt: createdAt,
      paymentMethod: "UPI",
      paymentHistory: [{ amount: total, method: "UPI", paidAt: createdAt, note: "Demo payment" }],
    };
  }

  if (status === "partial") {
    const paidAmount = Number((total * 0.55).toFixed(2));
    return {
      paidAmount,
      pendingAmount: Number((total - paidAmount).toFixed(2)),
      paidAt: createdAt,
      paymentMethod: "Cash",
      paymentHistory: [
        { amount: paidAmount, method: "Cash", paidAt: createdAt, note: "Demo partial payment" },
      ],
    };
  }

  return {
    paidAmount: 0,
    pendingAmount: total,
    paymentMethod: "",
    paymentHistory: [],
  };
}

async function seedDemoData(shopId) {
  const existingProducts = await Product.countDocuments({ shopId });
  const existingCustomers = await Customer.countDocuments({ shopId });
  const existingInvoices = await Invoice.countDocuments({ shopId });

  if (existingProducts > 0 || existingCustomers > 0 || existingInvoices > 0) {
    return;
  }

  const suffix = String(shopId).slice(-6).toUpperCase();
  const products = [
    ["ATTA-5KG", "Aashirvaad Atta 5kg", 310, 36, "Groceries", 90],
    ["SALT-1KG", "Tata Salt 1kg", 28, 48, "Groceries", 365],
    ["OIL-1L", "Fortune Sunflower Oil 1L", 165, 30, "Groceries", 180],
    ["PARLEG-800G", "Parle-G Family Pack 800g", 95, 42, "Snacks", 240],
    ["MAGGI-560G", "Maggi Noodles 560g", 120, 28, "Snacks", 210],
    ["SURF-1KG", "Surf Excel Detergent 1kg", 235, 24, "Home Care", 540],
    ["COLGATE-200G", "Colgate Toothpaste 200g", 115, 22, "Personal Care", 540],
    ["DAIRYMILK-150G", "Dairy Milk Chocolate 150g", 120, 11, "Confectionery", 120],
    ["RICE-10KG", "Sona Masoori Rice Bag 10kg", 780, 8, "Groceries", 365],
    ["DAL-1KG", "Toor Dal 1kg", 165, 26, "Groceries", 180],
  ].map(([sku, name, price, stock, category, expiryDays]) => ({
    sku: `${sku}-${suffix}`,
    name,
    price,
    stock,
    category,
    costPrice: Number((price * 0.7).toFixed(2)),
    sold: 0,
    shopId,
    expiryDate: daysAgo(-expiryDays),
    stockMovements: [
      {
        type: "added",
        quantity: stock,
        note: "Opening stock",
        createdAt: new Date(),
      },
    ],
  }));

  const customers = [
    ["Ravi Kumar", "9876543210", "ravi.kumar", "MG Road", "Regular"],
    ["Priya Sharma", "9876543211", "priya.sharma", "Market Street", "VIP"],
    ["Arjun Reddy", "9876543212", "arjun.reddy", "Station Road", "Regular"],
    ["Sneha Patel", "9876543213", "sneha.patel", "Main Bazaar", "VIP"],
    ["Vikram Singh", "9876543214", "vikram.singh", "Temple Road", "Regular"],
    ["Meera Joshi", "9876543215", "meera.joshi", "Lake View Colony", "Regular"],
    ["Kiran Rao", "9876543216", "kiran.rao", "Gandhi Nagar", "New"],
    ["Anjali Devi", "9876543217", "anjali.devi", "Krishna Layout", "Regular"],
    ["Suresh Babu", "9876543218", "suresh.babu", "Ring Road", "Regular"],
    ["Pooja Nair", "9876543219", "pooja.nair", "Green Park", "New"],
  ].map(([name, phone, emailName, address, customerType]) => ({
    name,
    phone,
    email: `${emailName}.${suffix.toLowerCase()}@example.com`,
    address,
    customerType,
    status: customerType === "VIP" ? "vip" : customerType === "Regular" ? "regular" : "new",
    shopId,
  }));

  const createdProducts = await Product.insertMany(products);
  const createdCustomers = await Customer.insertMany(customers);

  const invoicePlans = [
    {
      customer: 0,
      status: "paid",
      days: 29,
      items: [
        [0, 2],
        [1, 4],
        [3, 3],
      ],
    },
    {
      customer: 1,
      status: "paid",
      days: 27,
      items: [
        [8, 1],
        [2, 2],
      ],
    },
    {
      customer: 2,
      status: "partial",
      days: 25,
      items: [
        [4, 3],
        [7, 4],
        [9, 2],
      ],
    },
    {
      customer: 3,
      status: "pending",
      days: 23,
      items: [
        [0, 1],
        [5, 2],
      ],
    },
    {
      customer: 4,
      status: "paid",
      days: 21,
      items: [
        [6, 2],
        [3, 2],
        [1, 3],
      ],
    },
    {
      customer: 5,
      status: "partial",
      days: 19,
      items: [
        [2, 3],
        [9, 1],
      ],
    },
    {
      customer: 6,
      status: "paid",
      days: 17,
      items: [
        [4, 4],
        [7, 2],
      ],
    },
    {
      customer: 7,
      status: "pending",
      days: 15,
      items: [
        [8, 1],
        [0, 2],
      ],
    },
    {
      customer: 8,
      status: "paid",
      days: 13,
      items: [
        [5, 1],
        [6, 1],
        [3, 4],
      ],
    },
    {
      customer: 9,
      status: "partial",
      days: 11,
      items: [
        [9, 3],
        [1, 6],
      ],
    },
    {
      customer: 0,
      status: "paid",
      days: 9,
      items: [
        [0, 4],
        [2, 2],
        [4, 2],
      ],
    },
    {
      customer: 1,
      status: "pending",
      days: 8,
      items: [
        [8, 2],
        [5, 1],
      ],
    },
    {
      customer: 2,
      status: "paid",
      days: 6,
      items: [
        [3, 6],
        [7, 3],
      ],
    },
    {
      customer: 3,
      status: "partial",
      days: 5,
      items: [
        [2, 4],
        [9, 2],
      ],
    },
    {
      customer: 4,
      status: "paid",
      days: 4,
      items: [
        [0, 5],
        [1, 5],
      ],
    },
    {
      customer: 5,
      status: "pending",
      days: 3,
      items: [
        [6, 3],
        [4, 2],
      ],
    },
    {
      customer: 6,
      status: "paid",
      days: 1,
      items: [
        [8, 3],
        [3, 5],
      ],
    },
    {
      customer: 7,
      status: "partial",
      days: 0,
      items: [
        [0, 4],
        [2, 2],
        [7, 2],
      ],
    },
  ];

  const invoices = invoicePlans.map((plan, index) => {
    const customer = createdCustomers[plan.customer];
    const lineItems = plan.items.map(([productIndex, quantity]) =>
      buildLineItem(createdProducts[productIndex], quantity),
    );
    const subtotal = Number(lineItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
    const taxRate = 0.05;
    const tax = Number((subtotal * taxRate).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));
    const createdAt = daysAgo(plan.days);
    const dueDate = new Date(createdAt);
    dueDate.setDate(dueDate.getDate() + 7);

    return {
      invoiceNumber: `DEMO-${suffix}-${String(index + 1).padStart(3, "0")}`,
      customer: customer._id,
      customerName: customer.name,
      lineItems,
      subtotal,
      taxRate,
      tax,
      discount: 0,
      total,
      ...paymentFor(plan.status, total, createdAt),
      status: plan.status,
      dueDate,
      shopId,
      createdAt,
      updatedAt: createdAt,
    };
  });

  const createdInvoices = await Invoice.insertMany(invoices);

  const productSales = new Map();
  const customerTotals = new Map();

  for (const invoice of createdInvoices) {
    const customerId = String(invoice.customer);
    const totals = customerTotals.get(customerId) || {
      orders: 0,
      totalBilled: 0,
      totalSpent: 0,
      pendingAmount: 0,
      orderHistory: [],
      lastOrder: invoice.createdAt,
      favoriteProduct: "",
    };

    totals.orders += 1;
    totals.totalBilled += invoice.total;
    totals.totalSpent += invoice.paidAmount;
    totals.pendingAmount += invoice.pendingAmount;
    totals.orderHistory.push(invoice._id);
    if (new Date(invoice.createdAt) >= new Date(totals.lastOrder)) {
      totals.lastOrder = invoice.createdAt;
      totals.favoriteProduct = invoice.lineItems[0]?.productName || "";
    }
    customerTotals.set(customerId, totals);

    for (const item of invoice.lineItems) {
      const productId = String(item.product);
      const current = productSales.get(productId) || { sold: 0, movements: [] };
      current.sold += item.quantity;
      current.movements.push({
        type: "sold",
        quantity: -item.quantity,
        note: `Demo sale on invoice ${invoice.invoiceNumber}`,
        createdAt: invoice.createdAt,
      });
      productSales.set(productId, current);
    }
  }

  await Promise.all(
    [...productSales.entries()].map(([productId, sale]) =>
      Product.findByIdAndUpdate(productId, {
        $inc: { stock: -sale.sold, sold: sale.sold },
        $push: { stockMovements: { $each: sale.movements } },
      }),
    ),
  );

  await Promise.all(
    [...customerTotals.entries()].map(([customerId, totals]) =>
      Customer.findByIdAndUpdate(customerId, {
        $set: {
          totalPurchases: totals.orders,
          totalBilled: Number(totals.totalBilled.toFixed(2)),
          totalSpent: Number(totals.totalSpent.toFixed(2)),
          spent: Number(totals.totalSpent.toFixed(2)),
          pendingAmount: Number(totals.pendingAmount.toFixed(2)),
          due: Number(totals.pendingAmount.toFixed(2)),
          pendingPayments: Number(totals.pendingAmount.toFixed(2)),
          orders: totals.orders,
          favoriteProduct: totals.favoriteProduct,
          lastOrder: totals.lastOrder,
          lastPurchaseDate: totals.lastOrder,
          lastPaymentDate: totals.totalSpent > 0 ? totals.lastOrder : undefined,
        },
        $push: { orderHistory: { $each: totals.orderHistory } },
      }),
    ),
  );

  console.log("Demo data seeded successfully");
}

module.exports = {
  seedDemoData,
};
