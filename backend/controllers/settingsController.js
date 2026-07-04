const Setting = require("../models/Setting");
const Shop = require("../models/Shop");
const asyncHandler = require("../middlewares/asyncHandler");
const env = require("../config/env");

const SETTINGS_KEY = "default";
const IMAGE_DATA_URL_REGEX = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

function getShopSettingsFilter(req) {
  return { shopId: req.shopId, key: SETTINGS_KEY };
}

async function getSettingsDocument(req) {
  return Setting.findOneAndUpdate(
    getShopSettingsFilter(req),
    { $setOnInsert: { key: SETTINGS_KEY, shopId: req.shopId } },
    { new: true, upsert: true, runValidators: true },
  ).lean();
}

function normalizeSettings(settings, shop) {
  return {
    profile: {
      fullName: settings.profile?.fullName || "",
      email: settings.profile?.email || "",
      phone: settings.profile?.phone || "",
      timezone: settings.profile?.timezone || "Asia/Kolkata",
      imageDataUrl: settings.profile?.imageDataUrl || "",
    },
    business: {
      storeName: settings.business?.storeName || "",
      ownerName: settings.business?.ownerName || "",
      gstNumber: settings.business?.gstNumber || "",
      phone: settings.business?.phone || "",
      email: settings.business?.email || "",
      address: settings.business?.address || "",
      category: settings.business?.category || "",
      logoDataUrl: settings.business?.logoDataUrl || "",
      upiId: settings.business?.upiId || "",
    },
    notifications: {
      invoiceNotifications: settings.notifications?.invoiceNotifications ?? true,
      stockAlerts: settings.notifications?.stockAlerts ?? true,
      paymentReminders: settings.notifications?.paymentReminders ?? true,
      aiInsightsAlerts: settings.notifications?.aiInsightsAlerts ?? false,
    },
    taxEnabled: settings.taxEnabled ?? true,
    taxMode: settings.taxMode || "cgst-sgst",
    taxRate: settings.taxRate ?? env.taxRate,
    lowStockThreshold: settings.lowStockThreshold ?? env.lowStockThreshold,
    demoSeeded: shop?.demoSeeded === true,
  };
}

function sanitizeBusiness(business = {}) {
  const payload = {
    storeName: typeof business.storeName === "string" ? business.storeName.trim() : "",
    ownerName: typeof business.ownerName === "string" ? business.ownerName.trim() : "",
    gstNumber: typeof business.gstNumber === "string" ? business.gstNumber.trim().toUpperCase() : "",
    phone: typeof business.phone === "string" ? business.phone.trim() : "",
    email: typeof business.email === "string" ? business.email.trim().toLowerCase() : "",
    address: typeof business.address === "string" ? business.address.trim() : "",
    category: typeof business.category === "string" ? business.category.trim() : "",
    upiId: typeof business.upiId === "string" ? business.upiId.trim() : "",
  };

  for (const [key, value] of Object.entries(payload)) {
    if (key === "upiId") continue;
    if (!value) {
      const error = new Error(`${key} is required`);
      error.statusCode = 400;
      throw error;
    }
  }

  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(payload.gstNumber)) {
    const error = new Error("Enter a valid GST number");
    error.statusCode = 400;
    throw error;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    const error = new Error("A valid business email is required");
    error.statusCode = 400;
    throw error;
  }

  return payload;
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

function sanitizeTaxSettings(taxSettings = {}) {
  const validTaxModes = ["cgst-sgst", "igst", "custom", "standard", "none"];
  
  const taxMode = taxSettings.taxMode && validTaxModes.includes(taxSettings.taxMode) ? taxSettings.taxMode : "cgst-sgst";
  const taxEnabled = taxMode !== "none";
  const taxRate = typeof taxSettings.taxRate === "number" ? Math.max(0, taxSettings.taxRate) : undefined;
  const lowStockThreshold = typeof taxSettings.lowStockThreshold === "number" ? Math.max(1, taxSettings.lowStockThreshold) : undefined;

  return { taxEnabled, taxMode, taxRate, lowStockThreshold };
}

exports.updateTaxSettings = asyncHandler(async (req, res) => {
  const taxSettings = sanitizeTaxSettings(req.body.taxSettings || req.body);
  const updatePayload = {};

  if (taxSettings.taxEnabled !== undefined) updatePayload.taxEnabled = taxSettings.taxEnabled;
  if (taxSettings.taxMode) updatePayload.taxMode = taxSettings.taxMode;
  if (taxSettings.taxRate !== undefined) updatePayload.taxRate = taxSettings.taxRate;
  if (taxSettings.lowStockThreshold !== undefined) updatePayload.lowStockThreshold = taxSettings.lowStockThreshold;

  const settings = await Setting.findOneAndUpdate(
    getShopSettingsFilter(req),
    {
      $set: updatePayload,
      $setOnInsert: { key: SETTINGS_KEY, shopId: req.shopId },
    },
    { new: true, upsert: true, runValidators: true },
  ).lean();

  const shop = await Shop.findById(req.shopId).select("demoSeeded").lean();
  res.json({ success: true, data: normalizeSettings(settings, shop) });
});

exports.getSettings = asyncHandler(async (req, res) => {
  const [settings, shop] = await Promise.all([
    getSettingsDocument(req),
    Shop.findById(req.shopId).select("demoSeeded").lean(),
  ]);
  res.json({ success: true, data: normalizeSettings(settings, shop) });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const profile = sanitizeProfile(req.body.profile || req.body);
  const settings = await Setting.findOneAndUpdate(
    getShopSettingsFilter(req),
    {
      $set: {
        "profile.fullName": profile.fullName,
        "profile.email": profile.email,
        "profile.phone": profile.phone,
        "profile.timezone": profile.timezone,
      },
      $setOnInsert: { key: SETTINGS_KEY, shopId: req.shopId },
    },
    { new: true, upsert: true, runValidators: true },
  ).lean();

  const shop = await Shop.findById(req.shopId).select("demoSeeded").lean();
  res.json({ success: true, data: normalizeSettings(settings, shop) });
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
    getShopSettingsFilter(req),
    {
      $set: { "profile.imageDataUrl": imageDataUrl },
      $setOnInsert: { key: SETTINGS_KEY, shopId: req.shopId },
    },
    { new: true, upsert: true, runValidators: true },
  ).lean();

  const shop = await Shop.findById(req.shopId).select("demoSeeded").lean();
  res.json({ success: true, data: normalizeSettings(settings, shop) });
});

exports.updateBusiness = asyncHandler(async (req, res) => {
  const business = sanitizeBusiness(req.body.business || req.body);
  const settings = await Setting.findOneAndUpdate(
    getShopSettingsFilter(req),
    {
      $set: Object.fromEntries(Object.entries(business).map(([key, value]) => [`business.${key}`, value])),
      $setOnInsert: { key: SETTINGS_KEY, shopId: req.shopId },
    },
    { new: true, upsert: true, runValidators: true },
  ).lean();

  const shop = await Shop.findById(req.shopId).select("demoSeeded").lean();
  res.json({ success: true, data: normalizeSettings(settings, shop) });
});

exports.updateBusinessLogo = asyncHandler(async (req, res) => {
  const logoDataUrl = typeof req.body.logoDataUrl === "string" ? req.body.logoDataUrl : "";

  if (logoDataUrl && !IMAGE_DATA_URL_REGEX.test(logoDataUrl)) {
    const error = new Error("Upload a valid logo image file");
    error.statusCode = 400;
    throw error;
  }

  if (logoDataUrl.length > 2_500_000) {
    const error = new Error("Logo must be smaller than 2MB");
    error.statusCode = 400;
    throw error;
  }

  const settings = await Setting.findOneAndUpdate(
    getShopSettingsFilter(req),
    {
      $set: { "business.logoDataUrl": logoDataUrl },
      $setOnInsert: { key: SETTINGS_KEY, shopId: req.shopId },
    },
    { new: true, upsert: true, runValidators: true },
  ).lean();

  const shop = await Shop.findById(req.shopId).select("demoSeeded").lean();
  res.json({ success: true, data: normalizeSettings(settings, shop) });
});

exports.getSettingsDocument = getSettingsDocument;

exports.updateNotifications = asyncHandler(async (req, res) => {
  const notifications = sanitizeNotifications(req.body.notifications || req.body);
  const settings = await Setting.findOneAndUpdate(
    getShopSettingsFilter(req),
    {
      $set: { notifications },
      $setOnInsert: { key: SETTINGS_KEY, shopId: req.shopId },
    },
    { new: true, upsert: true, runValidators: true },
  ).lean();

  const shop = await Shop.findById(req.shopId).select("demoSeeded").lean();
  res.json({ success: true, data: normalizeSettings(settings, shop) });
});
