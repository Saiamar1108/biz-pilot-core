const User = require("../models/User");
const asyncHandler = require("../middlewares/asyncHandler");
const bcrypt = require("bcryptjs");

// Helper to hash PIN
async function hashPin(pin) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
}

// Helper to compare PIN
async function comparePin(candidatePin, hash) {
  return bcrypt.compare(candidatePin, hash);
}

// 🔒 POST /auth/lock/setup -> Enable lock and set/change PIN
exports.setupPin = asyncHandler(async (req, res) => {
  const { pin, confirmPin, oldPin } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // If PIN already exists, they must provide oldPin to change it
  if (user.pinHash) {
    if (!oldPin) {
      res.status(400);
      throw new Error("Old PIN is required to change PIN");
    }
    const isOldValid = await comparePin(oldPin, user.pinHash);
    if (!isOldValid) {
      res.status(401);
      throw new Error("Incorrect old PIN");
    }
  }

  // Validate PIN rules
  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    res.status(400);
    throw new Error("PIN must be exactly 4 digits");
  }

  if (pin !== confirmPin) {
    res.status(400);
    throw new Error("PINs do not match");
  }

  // Save new pin
  user.pinHash = await hashPin(pin);
  user.dashboardLockEnabled = true;
  user.failedPinAttempts = 0;
  user.pinLockUntil = null;
  await user.save();

  res.json({
    success: true,
    message: "PIN setup successful",
    data: {
      dashboardLockEnabled: user.dashboardLockEnabled,
      autoLockTimeout: user.autoLockTimeout,
    }
  });
});

// 🔒 POST /auth/lock/remove -> Disable lock and remove PIN
exports.removePin = asyncHandler(async (req, res) => {
  const { pin } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!user.pinHash) {
    res.status(400);
    throw new Error("No PIN is currently configured");
  }

  if (!pin) {
    res.status(400);
    throw new Error("PIN is required to remove lock");
  }

  const isValid = await comparePin(pin, user.pinHash);
  if (!isValid) {
    res.status(401);
    throw new Error("Incorrect PIN");
  }

  // Remove PIN config
  user.pinHash = null;
  user.dashboardLockEnabled = false;
  user.failedPinAttempts = 0;
  user.pinLockUntil = null;
  await user.save();

  res.json({
    success: true,
    message: "PIN removed successfully",
    data: {
      dashboardLockEnabled: user.dashboardLockEnabled,
      autoLockTimeout: user.autoLockTimeout,
    }
  });
});

// 🔒 POST /auth/lock/verify -> Verify PIN to unlock dashboard
exports.verifyPin = asyncHandler(async (req, res) => {
  const { pin } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!user.dashboardLockEnabled || !user.pinHash) {
    res.status(400);
    throw new Error("ShopPilot Lock is not enabled");
  }

  // Brute-force check
  if (user.pinLockUntil && user.pinLockUntil > Date.now()) {
    const secondsLeft = Math.ceil((user.pinLockUntil - Date.now()) / 1000);
    res.status(429);
    throw new Error(`Too many incorrect attempts. Try again in ${secondsLeft} seconds.`);
  }

  if (!pin) {
    res.status(400);
    throw new Error("PIN is required");
  }

  const isValid = await comparePin(pin, user.pinHash);

  if (!isValid) {
    user.failedPinAttempts = (user.failedPinAttempts || 0) + 1;
    if (user.failedPinAttempts >= 5) {
      user.pinLockUntil = new Date(Date.now() + 30 * 1000); // Lock for 30s
      user.failedPinAttempts = 0; // reset counter after locking
    }
    await user.save();
    
    if (user.pinLockUntil) {
      res.status(429);
      throw new Error("Too many incorrect attempts. PIN entry disabled for 30 seconds.");
    } else {
      const remaining = 5 - user.failedPinAttempts;
      res.status(401);
      throw new Error(`Incorrect PIN. ${remaining} attempts remaining.`);
    }
  }

  // Clear attempts on success
  user.failedPinAttempts = 0;
  user.pinLockUntil = null;
  await user.save();

  res.json({
    success: true,
    message: "Dashboard unlocked successfully"
  });
});

// 🔒 PUT /auth/lock/settings -> Update auto lock options
exports.updateLockSettings = asyncHandler(async (req, res) => {
  const { dashboardLockEnabled, autoLockTimeout } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (dashboardLockEnabled !== undefined) {
    if (dashboardLockEnabled && !user.pinHash) {
      res.status(400);
      throw new Error("Must set up a PIN before enabling ShopPilot Lock");
    }
    user.dashboardLockEnabled = dashboardLockEnabled;
  }

  if (autoLockTimeout !== undefined) {
    user.autoLockTimeout = autoLockTimeout;
  }

  await user.save();

  res.json({
    success: true,
    message: "Lock settings updated successfully",
    data: {
      dashboardLockEnabled: user.dashboardLockEnabled,
      autoLockTimeout: user.autoLockTimeout,
    }
  });
});

const jwt = require("jsonwebtoken");
const env = require("../config/env");

// 🔒 POST /auth/lock/recover/verify -> Verify account password for PIN recovery
exports.verifyPasswordForRecovery = asyncHandler(async (req, res) => {
  const { password } = req.body;

  const user = await User.findById(req.user._id).select("+passwordHash");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Check lockout
  if (user.passwordRecoveryLockUntil && user.passwordRecoveryLockUntil > Date.now()) {
    const secondsLeft = Math.ceil((user.passwordRecoveryLockUntil - Date.now()) / 1000);
    res.status(429);
    throw new Error(`Too many incorrect attempts. Try again in ${secondsLeft} seconds.`);
  }

  if (!password) {
    res.status(400);
    throw new Error("Account password is required");
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    user.failedPasswordRecoveryAttempts = (user.failedPasswordRecoveryAttempts || 0) + 1;
    if (user.failedPasswordRecoveryAttempts >= 5) {
      user.passwordRecoveryLockUntil = new Date(Date.now() + 30 * 1000); // 30s lockout
      user.failedPasswordRecoveryAttempts = 0;
    }
    await user.save();

    if (user.passwordRecoveryLockUntil) {
      res.status(429);
      throw new Error("Too many incorrect attempts. PIN verification disabled for 30 seconds.");
    } else {
      res.status(401);
      throw new Error("Incorrect password. Please try again.");
    }
  }

  // Success: reset attempts
  user.failedPasswordRecoveryAttempts = 0;
  user.passwordRecoveryLockUntil = null;
  await user.save();

  // Generate recovery token (signed JWT token expiring in 5 minutes)
  const recoveryToken = jwt.sign(
    { sub: user._id, type: "pin_recovery" },
    env.jwtAccessSecret,
    { expiresIn: "5m" }
  );

  res.json({
    success: true,
    message: "Identity verified. You can reset your PIN now.",
    recoveryToken
  });
});

// 🔒 POST /auth/lock/recover/reset -> Reset PIN with recovery token
exports.resetPinWithRecoveryToken = asyncHandler(async (req, res) => {
  const { pin, confirmPin, recoveryToken } = req.body;

  if (!recoveryToken) {
    res.status(400);
    throw new Error("Recovery token is required");
  }

  let decoded;
  try {
    decoded = jwt.verify(recoveryToken, env.jwtAccessSecret);
  } catch (err) {
    res.status(401);
    throw new Error("Invalid or expired recovery token");
  }

  if (decoded.type !== "pin_recovery" || String(decoded.sub) !== String(req.user._id)) {
    res.status(401);
    throw new Error("Unauthorized PIN recovery session");
  }

  // Validate new PIN
  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    res.status(400);
    throw new Error("PIN must be exactly 4 digits");
  }

  if (pin !== confirmPin) {
    res.status(400);
    throw new Error("PINs do not match");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Prevent using the same PIN again (if feasible)
  if (user.pinHash) {
    const isSamePin = await bcrypt.compare(pin, user.pinHash);
    if (isSamePin) {
      res.status(400);
      throw new Error("New PIN cannot be the same as your current PIN");
    }
  }

  user.pinHash = await hashPin(pin);
  user.dashboardLockEnabled = true; // Make sure lock is enabled!
  user.failedPinAttempts = 0;
  user.pinLockUntil = null;
  await user.save();

  res.json({
    success: true,
    message: "PIN reset successfully",
    data: {
      dashboardLockEnabled: user.dashboardLockEnabled,
      autoLockTimeout: user.autoLockTimeout,
    }
  });
});
