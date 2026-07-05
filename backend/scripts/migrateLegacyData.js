const mongoose = require("mongoose");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Notification = require("../models/Notification");
const Setting = require("../models/Setting");
const Shop = require("../models/Shop");
const User = require("../models/User");
const connectDB = require("../config/db");

const DEFAULT_SHOP_SLUG = "default";

async function migrateShopSchema() {
  // Migrate shops from shopName to name field
  const shopsWithOldName = await Shop.find({ shopName: { $exists: true } });
  
  for (const shop of shopsWithOldName) {
    if (!shop.name && shop.shopName) {
      shop.name = shop.shopName;
      delete shop.shopName;
      await shop.save();
      console.log("✓ Migrated shop schema:", shop._id);
    }
  }
  
  console.log(`✓ Migrated ${shopsWithOldName.length} shops to new schema`);
}

async function createDefaultShop() {
  await migrateShopSchema();
  
  let shop = await Shop.findOne({ isDefault: true });

  if (!shop) {
    shop = await Shop.findOne({ slug: DEFAULT_SHOP_SLUG });
  }

  if (!shop) {
    shop = await Shop.create({
      shopName: "SaiMart Retail",
      slug: DEFAULT_SHOP_SLUG,
      businessType: "Grocery & Retail",
      phone: "+91 7569681350",
      address: "Vijayawada, Andhra Pradesh",
      isDefault: true,
      settings: {
        taxRate: 0.08,
        lowStockThreshold: 10,
      },
    });
    console.log("✓ Created default shop:", shop._id);
  } else if (!shop.isDefault) {
    shop.isDefault = true;
    await shop.save();
    console.log("✓ Marked existing shop as default:", shop._id);
  } else {
    console.log("✓ Default shop already exists:", shop._id);
  }

  return shop;
}

async function backfillShopIdForModel(model, modelName, shopId) {
  const result = await model.updateMany(
    {
      $or: [{ shopId: { $exists: false } }, { shopId: null }],
    },
    { $set: { shopId } },
  );

  const count = result.modifiedCount || 0;
  console.log(`✓ Backfilled ${count} ${modelName} to default shop`);
  return count;
}

async function migrateAllLegacyData() {
  await connectDB();
  console.log("Connected to MongoDB");

  const shop = await createDefaultShop();
  const shopId = shop._id;

  // Backfill all existing data to default shop
  const counts = {
    products: await backfillShopIdForModel(Product, "products", shopId),
    customers: await backfillShopIdForModel(Customer, "customers", shopId),
    invoices: await backfillShopIdForModel(Invoice, "invoices", shopId),
    notifications: await backfillShopIdForModel(Notification, "notifications", shopId),
    settings: await backfillShopIdForModel(Setting, "settings", shopId),
  };

  // Link first user to default shop if exists
  const firstUser = await User.findOne().sort({ createdAt: 1 });
  if (firstUser && !shop.ownerId) {
    shop.ownerId = firstUser._id;
    await shop.save();
    console.log("✓ Linked first user to default shop:", firstUser.email);
  } else if (firstUser && shop.ownerId) {
    console.log("✓ Default shop already has owner");
  } else {
    console.log("ℹ No users found yet");
  }

  console.log("\nMigration complete!");
  console.log("Total documents migrated:", Object.values(counts).reduce((a, b) => a + b, 0));
  console.log("Default shop ID:", shopId);

  await mongoose.connection.close();
  process.exit(0);
}

migrateAllLegacyData().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
