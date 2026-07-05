const Product = require("../models/Product");
const Customer = require("../models/Customer");

async function seedDemoData(shopId) {
  const existingProducts = await Product.countDocuments({ shopId });
  const existingCustomers = await Customer.countDocuments({ shopId });

  if (existingProducts > 0 || existingCustomers > 0) {
    return;
  }

  const products = [
    { name: "Rice Bag", price: 1200, stock: 20, category: "Groceries", shopId },
    { name: "Cooking Oil", price: 180, stock: 35, category: "Groceries", shopId },
    { name: "Sugar", price: 45, stock: 40, category: "Groceries", shopId },
    { name: "Milk Pack", price: 30, stock: 50, category: "Dairy", shopId },
    { name: "Bread", price: 40, stock: 25, category: "Bakery", shopId },
    { name: "Egg Tray", price: 90, stock: 15, category: "Dairy", shopId },
    { name: "Soap", price: 25, stock: 60, category: "Personal Care", shopId },
    { name: "Shampoo", price: 120, stock: 30, category: "Personal Care", shopId },
    { name: "Biscuits", price: 20, stock: 80, category: "Snacks", shopId },
    { name: "Soft Drink", price: 50, stock: 45, category: "Beverages", shopId },
  ];

  const customers = [
    { name: "Ravi Kumar", phone: "9876543210", email: "ravi@test.com", shopId },
    { name: "Priya Sharma", phone: "9876543211", email: "priya@test.com", shopId },
    { name: "Arjun Reddy", phone: "9876543212", email: "arjun@test.com", shopId },
    { name: "Sneha Patel", phone: "9876543213", email: "sneha@test.com", shopId },
    { name: "Vikram Singh", phone: "9876543214", email: "vikram@test.com", shopId },
    { name: "Meera Joshi", phone: "9876543215", email: "meera@test.com", shopId },
    { name: "Kiran Rao", phone: "9876543216", email: "kiran@test.com", shopId },
    { name: "Anjali Devi", phone: "9876543217", email: "anjali@test.com", shopId },
    { name: "Suresh Babu", phone: "9876543218", email: "suresh@test.com", shopId },
    { name: "Pooja Nair", phone: "9876543219", email: "pooja@test.com", shopId },
  ];

  await Product.insertMany(products);
  await Customer.insertMany(customers);

  console.log("Demo data seeded successfully");
}

module.exports = {
  seedDemoData,
};