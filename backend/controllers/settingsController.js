const Setting = require("../models/Setting");
const Shop = require("../models/Shop");
const asyncHandler = require("../middlewares/asyncHandler");

function buildBusiness(setting, shop, req) {
  const business = {
    ...(setting?.business || {}),
  };

  if (shop) {
    business.storeName = business.storeName || shop.shopName || shop.name || "ShopPilot Store";
    business.ownerName = business.ownerName || req.user?.name || "";
    business.phone = business.phone || shop.phone || "";
    business.address = business.address || shop.address || "";
    business.category = business.category || shop.businessType || "Retail";
  }

  return business;
}

exports.getSettings = asyncHandler(async (req, res) => {
  const [setting, shop] = await Promise.all([
    Setting.findOneAndUpdate(
      { key: "default", shopId: req.shopId },
      { $setOnInsert: { key: "default", shopId: req.shopId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean(),
    Shop.findById(req.shopId).lean(),
  ]);

  res.json({
    success: true,
    data: {
      profile: setting?.profile || {},
      business: buildBusiness(setting, shop, req),
      notifications: setting?.notifications || {},
      message: "Use /auth/change-password to update your password.",
    },
  });
});

exports.updateBusinessSettings = asyncHandler(async (req, res) => {
  const business = req.body?.business || {};
  const upiId = String(business.upiId || "").trim();

  if (upiId && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/.test(upiId)) {
    res.status(400);
    throw new Error("Enter a valid UPI ID, for example store@okaxis.");
  }

  const [setting, shop] = await Promise.all([
    Setting.findOneAndUpdate(
      { key: "default", shopId: req.shopId },
      { $set: { "business.upiId": upiId }, $setOnInsert: { key: "default", shopId: req.shopId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean(),
    Shop.findById(req.shopId).lean(),
  ]);

  res.json({
    success: true,
    data: { business: buildBusiness(setting, shop, req) },
    message: "Business settings updated.",
  });
});
