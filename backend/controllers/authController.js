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
const { OAuth2Client } = require("google-auth-library");

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
    onboardingCompleted: user.onboardingCompleted === true,
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
    authProviders: ["local"],
    authProvider: "local",
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
      metadata: { reason: "invalid_password" },
    });

    res.status(401);
    throw new Error("Invalid email or password");
  }

  const { accessToken, refreshToken } = await issueAuthTokens(user, {
    rememberMe: rememberMe === true,
    req,
  });

  user.lastLogin = new Date();
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  setRefreshCookie(res, refreshToken, rememberMe === true);

  await logAuthEvent({
    userId: user._id,
    shopId: user.shopId,
    email: user.email,
    action: "login",
    req,
    success: true,
  });

  res.json({
    success: true,
    data: {
      user: sanitizeUser(user),
      shop: {
        id: String(user.shopId),
      },
      accessToken,
    },
  });
});

exports.setPin = asyncHandler(async (req, res) => {
  const { pin } = req.body;
  const user = req.user;

  if (!pin || !/^\d{4}$/.test(String(pin))) {
    res.status(400);
    throw new Error("PIN must be exactly 4 digits");
  }

  user.pinHash = await User.hashPin(String(pin));
  user.pinSetAt = new Date();
  await user.save();

  await logAuthEvent({
    userId: user._id,
    shopId: user.shopId,
    email: user.email,
    action: "pin_set",
    req,
    success: true,
  });

  res.json({ success: true, message: "PIN set successfully" });
});

exports.verifyPin = asyncHandler(async (req, res) => {
  const { pin } = req.body;
  const user = await User.findById(req.user._id).select("+pinHash");

  if (!user || !user.pinHash) {
    res.status(400);
    throw new Error("PIN not set for this account");
  }

  const valid = await user.comparePassword(String(pin));
  if (!valid) {
    await logAuthEvent({
      userId: user._id,
      shopId: user.shopId,
      email: user.email,
      action: "pin_verify_failed",
      req,
      success: false,
    });
    res.status(401);
    throw new Error("Incorrect PIN");
  }

  await logAuthEvent({
    userId: user._id,
    shopId: user.shopId,
    email: user.email,
    action: "pin_verified",
    req,
    success: true,
  });

  res.json({ success: true, message: "PIN verified" });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+passwordHash +pinHash");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.authProvider === "google" && !user.hasPassword()) {
    res.status(400);
    throw new Error("Set a password first before changing it");
  }

  if (user.authProvider === "google" && !user.passwordHash) {
    res.status(400);
    throw new Error("Set a password first before changing it");
  }

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error("Current password and new password are required");
  }

  if (String(newPassword).length < 8) {
    res.status(400);
    throw new Error("New password must be at least 8 characters");
  }

  const valid = await user.comparePassword(String(currentPassword));
  if (!valid) {
    await logAuthEvent({
      userId: user._id,
      shopId: user.shopId,
      email: user.email,
      action: "password_change_failed",
      req,
      success: false,
      metadata: { reason: "invalid_current_password" },
    });
    res.status(401);
    throw new Error("Current password is incorrect");
  }

  user.passwordHash = await User.hashPassword(String(newPassword));
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

  res.json({ success: true, message: "Password changed successfully" });
});

exports.setPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const user = await User.findById(req.user._id).select("+passwordHash +pinHash");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.authProvider !== "google") {
    res.status(400);
    throw new Error("This endpoint is only for Google-authenticated users");
  }

  if (!password || String(password).length < 8) {
    res.status(400);
    throw new Error("Password must be at least 8 characters");
  }

  user.passwordHash = await User.hashPassword(String(password));
  user.authProviders = [...new Set([...(user.authProviders || []), "local"])];
  await user.save();

  await logAuthEvent({
    userId: user._id,
    shopId: user.shopId,
    email: user.email,
    action: "password_set",
    req,
    success: true,
  });

  res.json({ success: true, message: "Password set successfully" });
});