const jwt = require("jsonwebtoken");
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
      res.status(401);
      throw new Error("Authentication required");
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      res.status(401);
      throw new Error("Invalid or expired access token");
    }

    const user = await User.findById(payload.sub).select(
      "name email role shopId isVerified lastLogin lockUntil",
    );

    if (!user) {
      res.status(401);
      throw new Error("User not found");
    }

    if (user.isLocked && user.isLocked()) {
      res.status(423);
      throw new Error("Account temporarily locked");
    }

    req.user = user;
    req.shopId = resolveShopObjectId(user.shopId);
    next();
  } catch (error) {
    next(error);
  }
};

const optionalAuthMiddleware = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select(
      "name email role shopId isVerified",
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
      res.status(401);
      return next(new Error("Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error("Insufficient permissions"));
    }

    return next();
  };

const shopScopeMiddleware = (req, res, next) => {
  if (!req.shopId && req.user?.shopId) {
    req.shopId = resolveShopObjectId(req.user.shopId);
  }

  if (!req.shopId) {
    res.status(403);
    return next(new Error("Shop context missing"));
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
