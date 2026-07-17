const Product = require("../models/Product");

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(11, 0, 0, 0);
  return date;
}

async function seedInventoryDemoProducts(shopId) {
  const existingProducts = await Product.countDocuments({ shopId });

  if (existingProducts > 0) {
    return { seeded: false, count: existingProducts };
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

  const createdProducts = await Product.insertMany(products);

  return {
    seeded: true,
    count: createdProducts.length,
  };
}

async function seedDemoData(shopId) {
  return seedInventoryDemoProducts(shopId);
}

module.exports = {
  seedDemoData,
  seedInventoryDemoProducts,
};
