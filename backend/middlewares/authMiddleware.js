const User = require("../models/User");
const { verifyAccessToken } = require("../utils/tokens");
const { resolveShopObjectId } = require("../utils/tenantScope");

function extractBearerToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return null;
}

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("[authMiddleware] Authorization header:", authHeader);
    
    const token = extractBearerToken(req);
    console.log("[authMiddleware] Extracted token:", token ? `${token.substring(0, 20)}...` : null);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
      console.log("[authMiddleware] Decoded payload:", payload);
    } catch (err) {
      console.log("[authMiddleware] Token verification error:", err.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired access token",
      });
    }

    const user = await User.findById(payload.sub).select(
      "name email role shopId isVerified onboardingCompleted lastLogin lockUntil phone timezone language imageDataUrl",
    );
    console.log("[authMiddleware] User found:", user ? user.email : null);

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
    console.log("[authMiddleware] Setting req.shopId:", req.shopId);
    return next();
  } catch (error) {
    console.log("[authMiddleware] Unexpected error:", error);
    return next(error);
  }
};

const optionalAuthMiddleware = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select(
      "name email role shopId isVerified onboardingCompleted phone timezone language imageDataUrl",
    );
    if (user) {
      req.user = user;
      req.shopId = resolveShopObjectId(user.shopId);
    }
  } catch {
    // ignore invalid optional token
  }

  next();
};

const roleMiddleware =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    return next();
  };

const shopScopeMiddleware = (req, res, next) => {
  console.log("[shopScopeMiddleware] req.shopId:", req.shopId);
  console.log("[shopScopeMiddleware] req.user?.shopId:", req.user?.shopId);
  
  if (!req.shopId && req.user?.shopId) {
    req.shopId = resolveShopObjectId(req.user.shopId);
    console.log("[shopScopeMiddleware] Resolved shopId:", req.shopId);
  }

  if (!req.shopId) {
    return res.status(403).json({
      success: false,
      message: "Shop context missing",
    });
  }

  return next();
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  roleMiddleware,
  shopScopeMiddleware,
  extractBearerToken,
};
