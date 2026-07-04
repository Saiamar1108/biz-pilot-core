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
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired access token",
      });
    }

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
    return next();
  } catch (error) {
    return next(error);
  }
};

const optionalAuthMiddleware = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select(
      "name email role shopId isVerified onboardingCompleted",
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
  if (!req.shopId && req.user?.shopId) {
    req.shopId = resolveShopObjectId(req.user.shopId);
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
