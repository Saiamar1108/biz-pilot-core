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

module.exports = router;