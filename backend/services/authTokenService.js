const RefreshToken = require("../models/RefreshToken");
const {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../utils/tokens");
const env = require("../config/env");

function getRefreshCookieOptions(rememberMe = false) {
  const isProduction = env.nodeEnv === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: rememberMe
      ? 1000 * 60 * 60 * 24 * 30
      : 1000 * 60 * 60 * 24 * 7,
  };
}

async function issueAuthTokens(user, { rememberMe = false, req } = {}) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, rememberMe);
  const tokenHash = hashToken(refreshToken);

  const expiresAt = new Date(
    Date.now() +
      (rememberMe
        ? env.refreshRememberCookieMaxAgeMs
        : env.refreshCookieMaxAgeMs),
  );

  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    rememberMe,
    expiresAt,
    ip: req?.ip || "",
    userAgent: req?.headers?.["user-agent"] || "",
    revokedAt: null,
  });

  return {
    accessToken,
    refreshToken,
  };
}

async function rotateRefreshToken(oldToken, user, req) {
  const oldTokenHash = hashToken(oldToken);

  const storedToken = await RefreshToken.findOne({
    tokenHash: oldTokenHash,
    revokedAt: null,
  });

  if (!storedToken) {
    const error = new Error("Refresh token not found");
    error.statusCode = 401;
    throw error;
  }

  if (storedToken.expiresAt.getTime() < Date.now()) {
    storedToken.revokedAt = new Date();
    await storedToken.save();

    const error = new Error("Refresh token expired");
    error.statusCode = 401;
    throw error;
  }

  storedToken.revokedAt = new Date();
  await storedToken.save();

  return issueAuthTokens(user, {
    rememberMe: storedToken.rememberMe,
    req,
  });
}

async function revokeRefreshToken(token) {
  if (!token) return;

  const tokenHash = hashToken(token);

  await RefreshToken.updateOne(
    {
      tokenHash,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );
}

async function revokeAllUserTokens(userId) {
  await RefreshToken.updateMany(
    {
      userId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );
}

async function refreshSession(refreshToken, req) {
  if (!refreshToken) {
    const error = new Error("No refresh token");
    error.statusCode = 401;
    throw error;
  }

  const payload = verifyRefreshToken(refreshToken);

  const User = require("../models/User");
  const user = await User.findById(payload.sub);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 401;
    throw error;
  }

  if (user.isLocked()) {
    const error = new Error("Account locked");
    error.statusCode = 423;
    throw error;
  }

  return rotateRefreshToken(refreshToken, user, req);
}

module.exports = {
  getRefreshCookieOptions,
  issueAuthTokens,
  refreshSession,
  revokeRefreshToken,
  revokeAllUserTokens,
};