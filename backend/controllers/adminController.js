const asyncHandler = require("../middlewares/asyncHandler");
const { seedDemoData } = require("../utils/seed");

exports.resetDemoData = asyncHandler(async (req, res) => {
  await seedDemoData();
  res.json({ success: true, message: "Demo data reset successfully" });
});
