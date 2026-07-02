const Customer = require("../models/Customer");
const asyncHandler = require("../middlewares/asyncHandler");
const { recalculateAllCustomerMetrics } = require("../services/customerMetrics");

function normalizeCustomer(customer) {
  const totalSpent = customer.totalSpent ?? customer.spent ?? 0;
  const pendingAmount = customer.pendingAmount ?? customer.pendingPayments ?? customer.due ?? 0;
  const totalPurchases = customer.totalPurchases ?? customer.orders ?? 0;
  const customerType =
    customer.customerType ||
    (customer.status === "vip" ? "VIP" : customer.status === "new" ? "New" : "Regular");
  const lastPurchaseDate =
    customer.lastPurchaseDate || customer.lastOrder || customer.createdAt || new Date();

  return {
    ...customer,
    totalPurchases,
    totalSpent,
    lastPurchaseDate,
    favoriteProduct: customer.favoriteProduct || "N/A",
    pendingAmount,
    customerType,
    orders: customer.orders ?? totalPurchases,
    spent: customer.spent ?? totalSpent,
    due: customer.due ?? pendingAmount,
    pendingPayments: customer.pendingPayments ?? pendingAmount,
    status: customer.status || customerType.toLowerCase(),
    lastOrder: customer.lastOrder || lastPurchaseDate,
    orderHistory: Array.isArray(customer.orderHistory) ? customer.orderHistory : [],
  };
}

exports.getCustomers = asyncHandler(async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search : "";
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const filters = [];

  await recalculateAllCustomerMetrics();

  if (status) {
    filters.push({
      $or: [
        { status },
        { customerType: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() },
      ],
    });
  }
  if (search) {
    filters.push({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    });
  }

  const filter = filters.length ? { $and: filters } : {};
  const customers = await Customer.find(filter).sort({ createdAt: -1 }).lean();
  const normalizedCustomers = customers.map(normalizeCustomer);
  res.json({ success: true, count: normalizedCustomers.length, data: normalizedCustomers });
});

exports.createCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.create(req.body);
  res.status(201).json({ success: true, data: normalizeCustomer(customer.toObject()) });
});
