const Setting = require("../models/Setting");
const Shop = require("../models/Shop");
const asyncHandler = require("../middlewares/asyncHandler");

exports.getSettings = asyncHandler(async (req, res) => {
  const [setting, shop] = await Promise.all([
    Setting.findOneAndUpdate(
      { key: "default", shopId: req.shopId },
      { $setOnInsert: { key: "default", shopId: req.shopId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean(),
    Shop.findById(req.shopId).lean(),
  ]);

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

  res.json({
    success: true,
    data: {
      profile: setting?.profile || {},
      business,
      notifications: setting?.notifications || {},
      message: "Use /auth/change-password to update your password.",
    },
  });
});
