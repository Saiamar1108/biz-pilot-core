const Product = require("../models/Product");
const Customer = require("../models/Customer");

async function seedDemoData(shopId) {
  const existingProducts = await Product.countDocuments({ shopId });
  const existingCustomers = await Customer.countDocuments({ shopId });

  if (existingProducts > 0 || existingCustomers > 0) {
    return;
  }

  const suffix = String(shopId).slice(-6).toUpperCase();
  const products = [
    ["GROCERY-RICE-5KG", "Sona Masoori Rice 5kg", 420, 34, "Groceries"],
    ["GROCERY-DAL-1KG", "Toor Dal 1kg", 165, 28, "Groceries"],
    ["GROCERY-SUGAR-1KG", "Refined Sugar 1kg", 48, 42, "Groceries"],
    ["OIL-GROUNDNUT-1L", "Groundnut Oil 1L", 190, 24, "Groceries"],
    ["DAIRY-MILK-1L", "Toned Milk 1L", 62, 36, "Dairy"],
    ["BAKERY-BREAD", "Whole Wheat Bread", 45, 22, "Bakery"],
    ["SNACKS-BISCUITS", "Family Biscuits Pack", 35, 50, "Snacks"],
    ["BEV-TEA-500G", "Premium Tea 500g", 220, 18, "Beverages"],
    ["CARE-SOAP-4PK", "Bath Soap 4 Pack", 135, 30, "Personal Care"],
    ["CLEAN-FLOOR-1L", "Floor Cleaner 1L", 175, 16, "Cleaning"],
  ].map(([sku, name, price, stock, category]) => ({
    sku: `${sku}-${suffix}`,
    name,
    price,
    stock,
    category,
    costPrice: Number((price * 0.7).toFixed(2)),
    sold: 0,
    shopId,
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
    ["Ravi Kumar", "9876543210", "ravi.kumar", "MG Road"],
    ["Priya Sharma", "9876543211", "priya.sharma", "Market Street"],
    ["Arjun Reddy", "9876543212", "arjun.reddy", "Station Road"],
    ["Sneha Patel", "9876543213", "sneha.patel", "Main Bazaar"],
    ["Vikram Singh", "9876543214", "vikram.singh", "Temple Road"],
    ["Meera Joshi", "9876543215", "meera.joshi", "Lake View Colony"],
    ["Kiran Rao", "9876543216", "kiran.rao", "Gandhi Nagar"],
    ["Anjali Devi", "9876543217", "anjali.devi", "Krishna Layout"],
    ["Suresh Babu", "9876543218", "suresh.babu", "Ring Road"],
    ["Pooja Nair", "9876543219", "pooja.nair", "Green Park"],
  ].map(([name, phone, emailName, address]) => ({
    name,
    phone,
    email: `${emailName}.${suffix.toLowerCase()}@example.com`,
    address,
    shopId,
  }));

  await Product.insertMany(products);
  await Customer.insertMany(customers);

  console.log("Demo data seeded successfully");
}

module.exports = {
  seedDemoData,
};
