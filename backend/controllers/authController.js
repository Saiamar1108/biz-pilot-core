const User = require("../models/User");
const Shop = require("../models/Shop");
const asyncHandler = require("../middlewares/asyncHandler");
const { logAuthEvent } = require("../services/authAuditService");
const {
  getRefreshCookieOptions,
  issueAuthTokens,
  refreshSession,
  revokeRefreshToken,
  revokeAllUserTokens,
} = require("../services/authTokenService");
const { generateResetToken } = require("../utils/tokens");
const {
  claimDefaultShopForFirstUser,
  createShopForUser,
  runTenancyMigration,
} = require("../utils/migrateTenancy");
const env = require("../config/env");

const LOCK_TIME_MS = 30 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

function sanitizeUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    shopId: String(user.shopId),
    isVerified: user.isVerified,
    lastLogin: user.lastLogin,
  };
}

function setRefreshCookie(res, token, rememberMe) {
  res.cookie(
    env.refreshCookieName,
    token,
    getRefreshCookieOptions(rememberMe),
  );
}

function clearRefreshCookie(res) {
  res.clearCookie(env.refreshCookieName, getRefreshCookieOptions(false));
}

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, shopName, businessType, phone, address } =
    req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email, and password are required");
  }

  if (String(password).length < 8) {
    res.status(400);
    throw new Error("Password must be at least 8 characters");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    res.status(409);
    throw new Error("Email already registered");
  }

  // Run migration to ensure existing data has shopId
  await runTenancyMigration();

  const userCount = await User.countDocuments();
  let shop;

  if (userCount === 0) {
    shop = await claimDefaultShopForFirstUser(null);
    if (shopName && shop.name !== shopName) {
      shop.name = shopName;
      if (phone) shop.phone = phone;
      if (address) shop.address = address;
      if (businessType) shop.businessType = businessType;
      await shop.save();
    }
  } else {
    shop = await createShopForUser({
      name: shopName || `${name}'s Store`,
      businessType,
      phone,
      address,
    });
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash,
    role: "owner",
    shopId: shop._id,
    isVerified: true,
  });

  if (!shop.ownerId) {
    shop.ownerId = user._id;
    await shop.save();
  }

  const { accessToken, refreshToken } = await issueAuthTokens(user, {
    rememberMe: req.body.rememberMe === true,
    req,
  });

  user.lastLogin = new Date();
  await user.save();

  setRefreshCookie(res, refreshToken, req.body.rememberMe === true);

  await logAuthEvent({
    userId: user._id,
    shopId: shop._id,
    email: user.email,
    action: "register",
    req,
    success: true,
  });

  res.status(201).json({
    success: true,
    data: {
      user: sanitizeUser(user),
      shop: {
        id: String(shop._id),
        shopName: shop.name,
        slug: shop.slug,
      },
      accessToken,
    },
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select(
    "+passwordHash",
  );

  if (!user) {
    await logAuthEvent({
      email: normalizedEmail,
      action: "login_failed",
      req,
      success: false,
      metadata: { reason: "user_not_found" },
    });
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (user.isLocked()) {
    await logAuthEvent({
      userId: user._id,
      shopId: user.shopId,
      email: user.email,
      action: "login_locked",
      req,
      success: false,
    });
    res.status(423);
    throw new Error("Account locked due to failed attempts. Try again later.");
  }

  const valid = await user.comparePassword(password);

  if (!valid) {
    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
      user.failedLoginAttempts = 0;
    }

    await user.save();

    await logAuthEvent({
      userId: user._id,
      shopId: user.shopId,
      email: user.email,
      action: "login_failed",
      req,
      success: false,
    });

    res.status(401);
    throw new Error("Invalid email or password");
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLogin = new Date();
  await user.save();

  const { accessToken, refreshToken } = await issueAuthTokens(user, {
    rememberMe: rememberMe === true,
    req,
  });

  setRefreshCookie(res, refreshToken, rememberMe === true);

  await logAuthEvent({
    userId: user._id,
    shopId: user.shopId,
    email: user.email,
    action: "login",
    req,
    success: true,
  });

  const shop = await Shop.findById(user.shopId).lean();

  res.json({
    success: true,
    data: {
      user: sanitizeUser(user),
      shop: shop
        ? { id: String(shop._id), shopName: shop.name, slug: shop.slug }
        : null,
      accessToken,
    },
  });
});

exports.refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[env.refreshCookieName];

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "No active session. Please login again.",
    });
  }

  try {
    const { accessToken, refreshToken: newRefreshToken } =
      await refreshSession(refreshToken, req);

    const payload = require("../utils/tokens").verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.sub);
    setRefreshCookie(
      res,
      newRefreshToken,
      payload.remember === true,
    );

    res.json({
      success: true,
      data: {
        accessToken,
        user: user ? sanitizeUser(user) : null,
      },
    });
  } catch (error) {
    clearRefreshCookie(res);
    return res.status(401).json({
      success: false,
      message: "Session expired. Please login again.",
    });
  }
});

exports.logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[env.refreshCookieName];

  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  if (req.user?._id) {
    await logAuthEvent({
      userId: req.user._id,
      shopId: req.user.shopId,
      email: req.user.email,
      action: "logout",
      req,
      success: true,
    });
  }

  clearRefreshCookie(res);

  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

exports.me = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.user.shopId).lean();

  res.json({
    success: true,
    data: {
      user: sanitizeUser(req.user),
      shop: shop
        ? { id: String(shop._id), shopName: shop.name, slug: shop.slug }
        : null,
    },
  });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  let devToken;

  const user = await User.findOne({ email: normalizedEmail }).select(
    "+passwordResetToken +passwordResetExpires",
  );

  if (user) {
    const { raw, hash } = generateResetToken();
    user.passwordResetToken = hash;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    devToken = raw;

    await logAuthEvent({
      userId: user._id,
      shopId: user.shopId,
      email: user.email,
      action: "password_reset_requested",
      req,
      success: true,
    });
  }

  res.json({
    success: true,
    message:
      "If an account exists for that email, password reset instructions were sent.",
    ...(env.nodeEnv === "development" && devToken ? { devResetToken: devToken } : {}),
  });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    res.status(400);
    throw new Error("Token and new password are required");
  }

  if (String(password).length < 8) {
    res.status(400);
    throw new Error("Password must be at least 8 characters");
  }

  const tokenHash = require("../utils/tokens").hashToken(token);
  const user = await User.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetToken +passwordResetExpires");

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired reset token");
  }

  user.passwordHash = await User.hashPassword(password);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  await revokeAllUserTokens(user._id);

  await logAuthEvent({
    userId: user._id,
    shopId: user.shopId,
    email: user.email,
    action: "password_reset_completed",
    req,
    success: true,
  });

  res.json({
    success: true,
    message: "Password reset successful. Please log in.",
  });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error("Current password and new password are required");
  }

  if (String(newPassword).length < 8) {
    res.status(400);
    throw new Error("Password must be at least 8 characters");
  }

  const user = await User.findById(req.user._id).select("+passwordHash");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const valid = await user.comparePassword(currentPassword);

  if (!valid) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();

  await revokeAllUserTokens(user._id);

  await logAuthEvent({
    userId: user._id,
    shopId: user.shopId,
    email: user.email,
    action: "password_changed",
    req,
    success: true,
  });

  res.json({
    success: true,
    message: "Password changed successfully. Please log in again.",
  });
});
