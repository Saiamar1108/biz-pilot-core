const RefreshToken = require("../models/RefreshToken");
const {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../utils/tokens");
const env = require("../config/env");

function getRefreshCookieOptions(rememberMe = false) {
  const maxAge = rememberMe ? env.refreshRememberCookieMaxAgeMs : env.refreshCookieMaxAgeMs;

  return {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "strict" : "lax",
    maxAge,
    path: "/",
  };
}

async function issueAuthTokens(user, { rememberMe = false, req } = {}) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, rememberMe);
  const tokenHash = hashToken(refreshToken);

  const expiresAt = new Date(
    Date.now() + (rememberMe ? env.refreshRememberCookieMaxAgeMs : env.refreshCookieMaxAgeMs),
  );

  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    rememberMe,
    expiresAt,
    ip: req?.ip || "",
    userAgent: req?.headers?.["user-agent"] || "",
  });

  return { accessToken, refreshToken };
}

async function rotateRefreshToken(oldToken, user, req) {
  const tokenHash = hashToken(oldToken);
  const stored = await RefreshToken.findOne({ tokenHash, revokedAt: null });

  if (!stored || stored.expiresAt.getTime() < Date.now()) {
    const error = new Error("Invalid refresh token");
    error.statusCode = 401;
    throw error;
  }

  stored.revokedAt = new Date();
  await stored.save();

  return issueAuthTokens(user, {
    rememberMe: stored.rememberMe,
    req,
  });
}

async function revokeRefreshToken(token) {
  if (!token) return;
  const tokenHash = hashToken(token);
  await RefreshToken.updateOne({ tokenHash, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

async function revokeAllUserTokens(userId) {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

async function refreshSession(refreshToken, req) {
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
