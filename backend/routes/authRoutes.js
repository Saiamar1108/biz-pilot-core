const express = require("express");
const {
  register,
  login,
  logout,
  refresh,
  me,
  completeOnboarding,
  forgotPassword,
  resetPassword,
  googleAuth,
} = require("../controllers/authController");
const {
  authMiddleware,
  shopScopeMiddleware,
} = require("../middlewares/authMiddleware");
const {
  loginRateLimiter,
  authActionRateLimiter,
} = require("../middlewares/rateLimitMiddleware");

const router = express.Router();

router.post("/register", authActionRateLimiter, register);
router.post("/login", loginRateLimiter, login);
router.post("/google", authActionRateLimiter, googleAuth);
router.post("/refresh", authActionRateLimiter, refresh);
router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, shopScopeMiddleware, me);
router.patch("/onboarding-complete", authMiddleware, completeOnboarding);
router.post("/forgot-password", authActionRateLimiter, forgotPassword);
router.post("/reset-password", authActionRateLimiter, resetPassword);

module.exports = router;
