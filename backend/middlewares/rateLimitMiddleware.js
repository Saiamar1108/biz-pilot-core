const rateLimit = require("express-rate-limit");

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Try again in 15 minutes.",
  },
});

const authActionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please wait and try again.",
  },
});

module.exports = {
  loginRateLimiter,
  authActionRateLimiter,
};
