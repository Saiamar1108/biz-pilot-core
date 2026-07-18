const express = require("express");
const {
  register,
  login,
  me,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  changePassword,
} = require("../controllers/authController");
const {
  setupPin,
  removePin,
  verifyPin,
  updateLockSettings,
  verifyPasswordForRecovery,
  resetPinWithRecoveryToken,
} = require("../controllers/lockController");
const { protect } = require("../middlewares/auth");
const { loginRateLimiter, authActionRateLimiter, passwordUpdateLimiter } = require("../middlewares/rateLimitMiddleware");

const router = express.Router();

// Public routes with rate limiting
router.post("/register", loginRateLimiter, register);
router.post("/login", loginRateLimiter, login);
router.post("/forgot-password", authActionRateLimiter, forgotPassword);
router.post("/reset-password", authActionRateLimiter, resetPassword);
router.post("/refresh", refresh);

// Protected routes
router.get("/me", protect, me);
router.post("/logout", protect, logout);
router.post("/change-password", protect, passwordUpdateLimiter, changePassword);

// ShopPilot Lock routes
router.post("/lock/setup", protect, setupPin);
router.post("/lock/remove", protect, removePin);
router.post("/lock/verify", protect, verifyPin);
router.put("/lock/settings", protect, updateLockSettings);
router.post("/lock/recover/verify", protect, verifyPasswordForRecovery);
router.post("/lock/recover/reset", protect, resetPinWithRecoveryToken);

module.exports = router;