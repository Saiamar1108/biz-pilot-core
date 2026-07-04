const Customer = require("../models/Customer");
const asyncHandler = require("../middlewares/asyncHandler");
const { recalculateAllCustomerMetrics } = require("../services/customerMetrics");
const {
  buildShopReadFilter,
  getShopIdForCreate,
  mergeWithShopFilter,
} = require("../utils/tenantScope");

const PHONE_REGEX = /^[6-9]\d{9}$/;

function sanitizeCustomerPayload(body) {
  const payload = {
    name: typeof body.name === "string" ? body.name.trim() : "",
    phone: typeof body.phone === "string" ? body.phone.trim() : "",
    email: typeof body.email === "string" ? body.email.trim().toLowerCase() : "",
    address: typeof body.address === "string" ? body.address.trim() : "",
    gstNumber: typeof body.gstNumber === "string" ? body.gstNumber.trim().toUpperCase() : "",
    notes: typeof body.notes === "string" ? body.notes.trim() : "",
  };

  if (!payload.name) {
    const error = new Error("Full name is required");
    error.statusCode = 400;
    throw error;
  }

  if (!payload.email) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    throw error;
  }

  if (!PHONE_REGEX.test(payload.phone)) {
    const error = new Error("Phone number must be a valid 10-digit Indian mobile number");
    error.statusCode = 400;
    throw error;
  }

  return payload;
}

function normalizeCustomer(customer) {
  const totalSpent = customer.totalSpent ?? customer.spent ?? 0;
  const pendingAmount = customer.pendingAmount ?? customer.pendingPayments ?? customer.due ?? 0;
  const totalPurchases = customer.totalPurchases ?? customer.orders ?? 0;
  const customerType =
    customer.customerType ||
    (customer.status === "vip" ? "VIP" : customer.status === "new" ? "New" : "Regular");
  const lastPurchaseDate =
    customer.lastPurchaseDate || customer.lastOrder || customer.createdAt || new Date();
  const lastPaymentDate =
    customer.lastPaymentDate || null;

  return {
    ...customer,
    totalPurchases,
    totalSpent,
    lastPurchaseDate,
    lastPaymentDate,
    favoriteProduct: customer.favoriteProduct || "N/A",
    pendingAmount,
    address: customer.address || "",
    gstNumber: customer.gstNumber || "",
    notes: customer.notes || "",
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

  await recalculateAllCustomerMetrics({ shopId: req.shopId });

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

  const shopFilter = await buildShopReadFilter(req);
  const extraFilter = filters.length ? { $and: filters } : {};
  const filter = mergeWithShopFilter(shopFilter, extraFilter);
  const customers = await Customer.find(filter).sort({ createdAt: -1 }).lean();
  const normalizedCustomers = customers.map(normalizeCustomer);
  res.json({ success: true, count: normalizedCustomers.length, data: normalizedCustomers });
});

exports.createCustomer = asyncHandler(async (req, res) => {
  const payload = sanitizeCustomerPayload(req.body);
  const customer = await Customer.create({
    ...payload,
    shopId: getShopIdForCreate(req),
  });
  res.status(201).json({ success: true, data: normalizeCustomer(customer.toObject()) });
});

exports.updateCustomer = asyncHandler(async (req, res) => {
  const payload = sanitizeCustomerPayload(req.body);
  const shopFilter = await buildShopReadFilter(req);
  const customer = await Customer.findOneAndUpdate(
    mergeWithShopFilter(shopFilter, { _id: req.params.id }),
    payload,
    {
      new: true,
      runValidators: true,
    },
  ).lean();

  if (!customer) {
    res.status(404);
    throw new Error("Customer not found");
  }

  res.json({ success: true, data: normalizeCustomer(customer) });
});
