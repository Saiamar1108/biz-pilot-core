const Setting = require("../models/Setting");
const asyncHandler = require("../middlewares/asyncHandler");

const SETTINGS_KEY = "default";
const IMAGE_DATA_URL_REGEX = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

async function getSettingsDocument() {
  return Setting.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: { key: SETTINGS_KEY } },
    { new: true, upsert: true, runValidators: true },
  ).lean();
}

function normalizeSettings(settings) {
  return {
    profile: {
      fullName: settings.profile?.fullName || "A. Sai Amar Chaitanya",
      email: settings.profile?.email || "asaiamar@shoppilot.ai",
      phone: settings.profile?.phone || "+91 75696 81350",
      timezone: settings.profile?.timezone || "Asia/Kolkata",
      imageDataUrl: settings.profile?.imageDataUrl || "",
    },
    notifications: {
      invoiceNotifications: settings.notifications?.invoiceNotifications ?? true,
      stockAlerts: settings.notifications?.stockAlerts ?? true,
      paymentReminders: settings.notifications?.paymentReminders ?? true,
      aiInsightsAlerts: settings.notifications?.aiInsightsAlerts ?? false,
    },
  };
}

function sanitizeProfile(profile = {}) {
  const payload = {
    fullName: typeof profile.fullName === "string" ? profile.fullName.trim() : "",
    email: typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "",
    phone: typeof profile.phone === "string" ? profile.phone.trim() : "",
    timezone: typeof profile.timezone === "string" ? profile.timezone.trim() : "",
  };

  if (!payload.fullName) {
    const error = new Error("Full name is required");
    error.statusCode = 400;
    throw error;
  }

  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    const error = new Error("A valid email is required");
    error.statusCode = 400;
    throw error;
  }

  if (!payload.phone) {
    const error = new Error("Phone is required");
    error.statusCode = 400;
    throw error;
  }

  if (!payload.timezone) {
    const error = new Error("Timezone is required");
    error.statusCode = 400;
    throw error;
  }

  return payload;
}

function sanitizeNotifications(notifications = {}) {
  return {
    invoiceNotifications: Boolean(notifications.invoiceNotifications),
    stockAlerts: Boolean(notifications.stockAlerts),
    paymentReminders: Boolean(notifications.paymentReminders),
    aiInsightsAlerts: Boolean(notifications.aiInsightsAlerts),
  };
}

exports.getSettings = asyncHandler(async (req, res) => {
  const settings = await getSettingsDocument();
  res.json({ success: true, data: normalizeSettings(settings) });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const profile = sanitizeProfile(req.body.profile || req.body);
  const settings = await Setting.findOneAndUpdate(
    { key: SETTINGS_KEY },
    {
      $set: {
        "profile.fullName": profile.fullName,
        "profile.email": profile.email,
        "profile.phone": profile.phone,
        "profile.timezone": profile.timezone,
      },
    },
    { new: true, upsert: true, runValidators: true },
  ).lean();

  res.json({ success: true, data: normalizeSettings(settings) });
});

exports.updateProfileImage = asyncHandler(async (req, res) => {
  const imageDataUrl = typeof req.body.imageDataUrl === "string" ? req.body.imageDataUrl : "";

  if (imageDataUrl && !IMAGE_DATA_URL_REGEX.test(imageDataUrl)) {
    const error = new Error("Upload a valid image file");
    error.statusCode = 400;
    throw error;
  }

  if (imageDataUrl.length > 2_500_000) {
    const error = new Error("Image must be smaller than 2MB");
    error.statusCode = 400;
    throw error;
  }

  const settings = await Setting.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: { "profile.imageDataUrl": imageDataUrl } },
    { new: true, upsert: true, runValidators: true },
  ).lean();

  res.json({ success: true, data: normalizeSettings(settings) });
});

exports.updateNotifications = asyncHandler(async (req, res) => {
  const notifications = sanitizeNotifications(req.body.notifications || req.body);
  const settings = await Setting.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: { notifications } },
    { new: true, upsert: true, runValidators: true },
  ).lean();

  res.json({ success: true, data: normalizeSettings(settings) });
});
