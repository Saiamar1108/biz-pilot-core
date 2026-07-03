const crypto = require("crypto");
const User = require("../models/User");
const Shop = require("../models/Shop");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Notification = require("../models/Notification");
const Setting = require("../models/Setting");
const { clearDefaultShopCache } = require("./tenantScope");

const DEFAULT_SHOP_SLUG = "default";

function slugify(value) {
  return String(value || "shop")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function ensureUniqueShopSlug(baseName) {
  const base = slugify(baseName) || DEFAULT_SHOP_SLUG;
  let slug = base;
  let counter = 1;

  while (await Shop.exists({ slug })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
}

async function ensureDefaultShop() {
  let shop = await Shop.findOne({ isDefault: true });

  if (!shop) {
    shop = await Shop.findOne({ slug: DEFAULT_SHOP_SLUG });
  }

  if (!shop) {
    shop = await Shop.create({
      name: "SaiMart Retail",
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
  } else if (!shop.isDefault) {
    shop.isDefault = true;
    await shop.save();
  }

  clearDefaultShopCache();
  return shop;
}

async function backfillShopId(model, shopId) {
  const result = await model.updateMany(
    {
      $or: [{ shopId: { $exists: false } }, { shopId: null }],
    },
    { $set: { shopId } },
  );

  return result.modifiedCount || 0;
}

async function migrateExistingDataToDefaultShop() {
  const shop = await ensureDefaultShop();
  const shopId = shop._id;

  const counts = {
    products: await backfillShopId(Product, shopId),
    customers: await backfillShopId(Customer, shopId),
    invoices: await backfillShopId(Invoice, shopId),
    notifications: await backfillShopId(Notification, shopId),
    settings: await backfillShopId(Setting, shopId),
  };

  return { shopId, counts };
}

async function claimDefaultShopForFirstUser(userId) {
  const shop = await ensureDefaultShop();
  if (!shop.ownerId) {
    shop.ownerId = userId;
    await shop.save();
  }
  return shop;
}

async function createShopForUser({ name, businessType, phone, address, ownerId }) {
  const slug = await ensureUniqueShopSlug(name);
  return Shop.create({
    name,
    slug,
    ownerId,
    businessType: businessType || "Retail",
    phone: phone || "",
    address: address || "",
    settings: {
      taxRate: 0.08,
      lowStockThreshold: 10,
    },
  });
}

let migrationPromise;

async function runTenancyMigration() {
  if (migrationPromise) return migrationPromise;

  migrationPromise = migrateExistingDataToDefaultShop().finally(() => {
    migrationPromise = undefined;
  });

  return migrationPromise;
}

module.exports = {
  claimDefaultShopForFirstUser,
  createShopForUser,
  ensureDefaultShop,
  migrateExistingDataToDefaultShop,
  runTenancyMigration,
  slugify,
};
