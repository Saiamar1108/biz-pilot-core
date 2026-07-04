const User = require("../models/User");
const { verifyAccessToken } = require("../utils/tokens");
const { resolveShopObjectId } = require("../utils/tenantScope");

const asyncHandler = require("./asyncHandler");

// Protect routes - verify JWT token
exports.protect = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const payload = verifyAccessToken(token);
    
    const user = await User.findById(payload.sub).select(
      "name email role shopId isVerified onboardingCompleted lastLogin lockUntil",
    );
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isLocked && user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: "Account temporarily locked",
      });
    }

    req.user = user;
    req.shopId = resolveShopObjectId(user.shopId);
    next();
  } catch (error) {
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
