const mongoose = require("mongoose");
const Shop = require("../models/Shop");

let cachedDefaultShopId = null;

async function getDefaultShopId() {
  if (cachedDefaultShopId) return cachedDefaultShopId;

  const shop =
    (await Shop.findOne({ isDefault: true }).select("_id").lean()) ||
    (await Shop.findOne({ slug: "default" }).select("_id").lean());

  if (shop?._id) {
    cachedDefaultShopId = shop._id;
    return cachedDefaultShopId;
  }

  return null;
}

function resolveShopObjectId(shopId) {
  if (!shopId) return null;
  if (shopId instanceof mongoose.Types.ObjectId) return shopId;
  if (mongoose.Types.ObjectId.isValid(String(shopId))) {
    return new mongoose.Types.ObjectId(String(shopId));
  }
  return null;
}

async function buildShopReadFilter(req) {
  const shopId = resolveShopObjectId(req.shopId) || (await getDefaultShopId());

  if (!shopId) return {};

  return {
    $or: [{ shopId }, { shopId: { $exists: false } }, { shopId: null }],
  };
}

async function buildShopWriteFilter(req) {
  const shopId = resolveShopObjectId(req.shopId) || (await getDefaultShopId());
  if (!shopId) return {};
  return { shopId };
}

function getShopIdForCreate(req) {
  return resolveShopObjectId(req.shopId);
}

function clearDefaultShopCache() {
  cachedDefaultShopId = null;
}

function mergeWithShopFilter(shopFilter, extraFilter = {}) {
  const hasShop = shopFilter && Object.keys(shopFilter).length > 0;
  const hasExtra = extraFilter && Object.keys(extraFilter).length > 0;

  if (hasShop && hasExtra) return { $and: [shopFilter, extraFilter] };
  if (hasShop) return shopFilter;
  return extraFilter;
}

module.exports = {
  buildShopReadFilter,
  buildShopWriteFilter,
  getDefaultShopId,
  getShopIdForCreate,
  mergeWithShopFilter,
  resolveShopObjectId,
  clearDefaultShopCache,
};
