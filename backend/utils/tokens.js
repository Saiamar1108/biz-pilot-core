const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      email: user.email,
      role: user.role,
      shopId: String(user.shopId),
    },
    env.jwtAccessSecret,
    { expiresIn: env.jwtAccessExpiresIn },
  );
}

function signRefreshToken(user, rememberMe = false) {
  return jwt.sign(
    {
      sub: String(user._id),
      type: "refresh",
      remember: rememberMe,
    },
    env.jwtRefreshSecret,
    {
      expiresIn: rememberMe ? env.jwtRefreshRememberExpiresIn : env.jwtRefreshExpiresIn,
    },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

function generateResetToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  return {
    raw,
    hash: hashToken(raw),
  };
}

module.exports = {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateResetToken,
};
