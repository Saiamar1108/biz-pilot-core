const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Customer = require("../models/Customer");

function getCustomerType(totalSpent) {
  if (totalSpent >= 2000) return "VIP";
  if (totalSpent < 500) return "New";
  return "Regular";
}

function getLegacyStatus(customerType) {
  if (customerType === "VIP") return "vip";
  if (customerType === "Regular") return "regular";
  return "new";
}

function numberOrZero(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function migrateCustomers() {
  await connectDB();

  const customers = await Customer.find();
  let patched = 0;

  for (const customer of customers) {
    const totalPurchases = numberOrZero(customer.totalPurchases ?? customer.orders);
    const totalSpent = numberOrZero(customer.totalSpent ?? customer.spent);
    const pendingAmount = numberOrZero(
      customer.pendingAmount ?? customer.pendingPayments ?? customer.due,
    );
    const customerType = customer.customerType || getCustomerType(totalSpent);
    const lastPurchaseDate =
      customer.lastPurchaseDate || customer.lastOrder || customer.createdAt || new Date();

    customer.totalPurchases = totalPurchases;
    customer.totalSpent = totalSpent;
    customer.lastPurchaseDate = lastPurchaseDate;
    customer.favoriteProduct = customer.favoriteProduct || "";
    customer.pendingAmount = pendingAmount;
    customer.customerType = customerType;
    customer.orders = numberOrZero(customer.orders ?? totalPurchases);
    customer.spent = numberOrZero(customer.spent ?? totalSpent);
    customer.due = numberOrZero(customer.due ?? pendingAmount);
    customer.pendingPayments = numberOrZero(customer.pendingPayments ?? pendingAmount);
    customer.status = customer.status || getLegacyStatus(customerType);
    customer.lastOrder = customer.lastOrder || lastPurchaseDate;
    customer.orderHistory = Array.isArray(customer.orderHistory) ? customer.orderHistory : [];

    await customer.save();
    patched += 1;
  }

  console.log(`Patched ${patched} customer document(s).`);
  await mongoose.connection.close();
}

migrateCustomers().catch(async (error) => {
  console.error("Customer migration failed:", error);
  await mongoose.connection.close();
  process.exit(1);
});
