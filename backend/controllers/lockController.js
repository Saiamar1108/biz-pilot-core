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
