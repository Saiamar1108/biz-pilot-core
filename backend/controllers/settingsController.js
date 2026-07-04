const asyncHandler = require("../middlewares/asyncHandler");

exports.getSettings = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      message: "Password management only. Use /auth/change-password to update your password."
    }
  });
});
