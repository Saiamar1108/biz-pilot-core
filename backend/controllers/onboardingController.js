const asyncHandler = require("../middlewares/asyncHandler");
const { resetDemoDataForShop, seedDemoDataForShop } = require("../services/onboardingDemoService");

exports.seedDemo = asyncHandler(async (req, res) => {
  const result = await seedDemoDataForShop(req.shopId);
  res.status(result.seeded ? 201 : 200).json({ success: true, data: result });
});

exports.resetDemo = asyncHandler(async (req, res) => {
  const deleted = await resetDemoDataForShop(req.shopId);
  res.json({ success: true, data: { deleted } });
});
