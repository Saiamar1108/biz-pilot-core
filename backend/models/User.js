const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: false, select: false },
    role: {
      type: String,
      enum: ["owner", "staff", "admin"],
      default: "owner",
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    isVerified: { type: Boolean, default: true },
    onboardingCompleted: { type: Boolean, default: false },
    lastLogin: { type: Date },
    failedLoginAttempts: { type: Number, default: 0, min: 0 },
    lockUntil: { type: Date },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    googleId: { type: String, unique: true, sparse: true },
    authProviders: [{ type: String, enum: ["local", "google"] }],
    authProvider: { type: String, enum: ["local", "google"], default: "local" },
    profilePicture: { type: String },
    pinHash: { type: String, required: false, select: false },
    pinSetAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ shopId: 1, email: 1 });

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.isLocked = function isLocked() {
  return this.lockUntil && this.lockUntil.getTime() > Date.now();
};

userSchema.methods.hasPassword = function hasPassword() {
  return Boolean(this.passwordHash);
};

userSchema.statics.hashPassword = async function hashPassword(password) {
  return bcrypt.hash(password, 12);
};

userSchema.statics.hashPin = async function hashPin(pin) {
  return bcrypt.hash(pin, 10);
};

module.exports = mongoose.model("User", userSchema);