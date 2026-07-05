const User = require("../models/User");
const { verifyAccessToken } = require("../utils/tokens");
const { resolveShopObjectId } = require("../utils/tenantScope");

const asyncHandler = require("./asyncHandler");

// Protect routes - verify JWT token
exports.protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("[auth.js] Authorization header:", authHeader);
  
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;
  console.log("[auth.js] Extracted token:", token ? `${token.substring(0, 20)}...` : null);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const payload = verifyAccessToken(token);
    console.log("[auth.js] Decoded payload:", payload);
    
    const user = await User.findById(payload.sub).select(
      "name email role shopId isVerified onboardingCompleted lastLogin lockUntil",
    );
    console.log("[auth.js] User found:", user ? user.email : null);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if account is locked (defensive: check method exists)
    if (typeof user.isLocked === "function" && user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: "Account temporarily locked",
      });
    }

    req.user = user;
    req.shopId = resolveShopObjectId(user.shopId);
    console.log("[auth.js] Setting req.shopId:", req.shopId);
    next();
  } catch (error) {
    console.log("[auth.js] Token verification error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }

    next();
  };
};
