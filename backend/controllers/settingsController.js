const Setting = require("../models/Setting");
const Shop = require("../models/Shop");
const User = require("../models/User");
const asyncHandler = require("../middlewares/asyncHandler");

// GET /settings
exports.getSettings = asyncHandler(async (req, res) => {
  const [user, shop, setting] = await Promise.all([
    User.findById(req.user._id).lean(),
    Shop.findById(req.shopId).lean(),
    Setting.findOneAndUpdate(
      { key: "default", shopId: req.shopId },
      { $setOnInsert: { key: "default", shopId: req.shopId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean(),
  ]);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!shop) {
    res.status(404);
    throw new Error("Shop not found");
  }

  res.json({
    success: true,
    data: {
      profile: {
        fullName: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "owner",
        timezone: user.timezone || "Asia/Kolkata",
        language: user.language || "en",
        imageDataUrl: user.imageDataUrl || "",
      },
      business: {
        logoDataUrl: shop.logoDataUrl || "",
        storeName: shop.name || shop.shopName || "ShopPilot Store",
        category: shop.businessType || "Retail",
        gstNumber: shop.gstNumber || "",
        pan: shop.pan || "",
        upiId: shop.upiId || "",
        phone: shop.phone || "",
        email: shop.email || "",
        website: shop.website || "",
        address: shop.address || "",
        state: shop.addressState || "",
        city: shop.addressCity || "",
        pincode: shop.pincode || "",
        currency: shop.currency || "INR",
        timezone: shop.timezone || "Asia/Kolkata",
      },
      branding: {
        logo: shop.logoDataUrl || "",
        invoiceLogo: shop.invoiceLogoDataUrl || "",
        primaryColor: shop.primaryColor || "#6366f1",
        accentColor: shop.accentColor || "#10b981",
        invoiceFooter: shop.invoiceFooter || "Thank you for your business.",
        invoicePrefix: shop.invoicePrefix || "INV-",
      },
      notifications: setting?.notifications || {
        invoiceNotifications: true,
        stockAlerts: true,
        paymentReminders: true,
        aiInsightsAlerts: false,
      },
      preferences: setting?.preferences || {
        theme: "system",
        language: "en",
        currency: "INR",
        dateFormat: "DD/MM/YYYY",
        numberFormat: "en-IN",
        startPage: "/dashboard",
      },
      aiSettings: setting?.aiSettings || {
        personality: "professional",
        responseLength: "medium",
        businessContext: "",
        enableVoice: false,
      },
      taxRate: shop.settings?.taxRate ?? 0.08,
      lowStockThreshold: shop.settings?.lowStockThreshold ?? 10,
      message: "Use /auth/change-password to update your password.",
    },
  });
});

// PUT /settings/profile
exports.updateProfileSettings = asyncHandler(async (req, res) => {
  const { fullName, email, phone, timezone, language, imageDataUrl } = req.body?.profile || {};

  if (!fullName || !fullName.trim()) {
    res.status(400);
    throw new Error("Full Name is required");
  }

  if (!email || !email.trim()) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Check unique email if changing
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== user.email) {
    const emailExists = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
    if (emailExists) {
      res.status(400);
      throw new Error("Email is already in use by another account");
    }
    user.email = normalizedEmail;
  }

  user.name = fullName.trim();
  user.phone = (phone || "").trim();
  user.timezone = timezone || "Asia/Kolkata";
  user.language = language || "en";
  if (imageDataUrl !== undefined) {
    user.imageDataUrl = imageDataUrl;
  }

  await user.save();

  res.json({
    success: true,
    data: {
      profile: {
        fullName: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        timezone: user.timezone,
        language: user.language,
        imageDataUrl: user.imageDataUrl,
      },
    },
    message: "Profile settings saved.",
  });
});

// PUT /settings/business
exports.updateBusinessSettings = asyncHandler(async (req, res) => {
  const business = req.body?.business || {};
  const upiId = String(business.upiId || "").trim();

  if (upiId && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/.test(upiId)) {
    res.status(400);
    throw new Error("Enter a valid UPI ID, for example store@okaxis.");
  }

  const shop = await Shop.findById(req.shopId);
  if (!shop) {
    res.status(404);
    throw new Error("Shop not found");
  }

  shop.name = (business.storeName || shop.name || "ShopPilot Store").trim();
  shop.shopName = shop.name;
  shop.businessType = business.category || shop.businessType || "Retail";
  shop.gstNumber = (business.gstNumber || "").trim();
  shop.pan = (business.pan || "").trim();
  shop.upiId = upiId;
  shop.phone = (business.phone || "").trim();
  shop.email = (business.email || "").trim().toLowerCase();
  shop.website = (business.website || "").trim();
  shop.address = (business.address || "").trim();
  shop.addressState = (business.state || "").trim();
  shop.addressCity = (business.city || "").trim();
  shop.pincode = (business.pincode || "").trim();
  shop.currency = business.currency || shop.currency || "INR";
  shop.timezone = business.timezone || shop.timezone || "Asia/Kolkata";
  if (business.logoDataUrl !== undefined) {
    shop.logoDataUrl = business.logoDataUrl;
  }

  await shop.save();

  res.json({
    success: true,
    data: {
      business: {
        logoDataUrl: shop.logoDataUrl,
        storeName: shop.name,
        category: shop.businessType,
        gstNumber: shop.gstNumber,
        pan: shop.pan,
        upiId: shop.upiId,
        phone: shop.phone,
        email: shop.email,
        website: shop.website,
        address: shop.address,
        state: shop.addressState,
        city: shop.addressCity,
        pincode: shop.pincode,
        currency: shop.currency,
        timezone: shop.timezone,
      },
    },
    message: "Business settings saved.",
  });
});

// PUT /settings/branding
exports.updateBrandingSettings = asyncHandler(async (req, res) => {
  const branding = req.body?.branding || {};

  const shop = await Shop.findById(req.shopId);
  if (!shop) {
    res.status(404);
    throw new Error("Shop not found");
  }

  if (branding.logo !== undefined) {
    shop.logoDataUrl = branding.logo;
  }
  if (branding.invoiceLogo !== undefined) {
    shop.invoiceLogoDataUrl = branding.invoiceLogo;
  }
  shop.primaryColor = branding.primaryColor || shop.primaryColor || "#6366f1";
  shop.accentColor = branding.accentColor || shop.accentColor || "#10b981";
  shop.invoiceFooter = branding.invoiceFooter !== undefined ? branding.invoiceFooter : shop.invoiceFooter;
  shop.invoicePrefix = branding.invoicePrefix !== undefined ? branding.invoicePrefix : shop.invoicePrefix;

  await shop.save();

  res.json({
    success: true,
    data: {
      branding: {
        logo: shop.logoDataUrl,
        invoiceLogo: shop.invoiceLogoDataUrl,
        primaryColor: shop.primaryColor,
        accentColor: shop.accentColor,
        invoiceFooter: shop.invoiceFooter,
        invoicePrefix: shop.invoicePrefix,
      },
    },
    message: "Branding settings saved.",
  });
});

// PUT /settings/notifications
exports.updateNotificationSettings = asyncHandler(async (req, res) => {
  const notifications = req.body?.notifications || {};

  const setting = await Setting.findOneAndUpdate(
    { key: "default", shopId: req.shopId },
    { $set: { notifications }, $setOnInsert: { key: "default", shopId: req.shopId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.json({
    success: true,
    data: { notifications: setting.notifications },
    message: "Notification settings saved.",
  });
});

// PUT /settings/preferences
exports.updatePreferenceSettings = asyncHandler(async (req, res) => {
  const preferences = req.body?.preferences || {};

  const setting = await Setting.findOneAndUpdate(
    { key: "default", shopId: req.shopId },
    { $set: { preferences }, $setOnInsert: { key: "default", shopId: req.shopId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.json({
    success: true,
    data: { preferences: setting.preferences },
    message: "Preferences saved.",
  });
});

// PUT /settings/ai
exports.updateAiSettings = asyncHandler(async (req, res) => {
  const aiSettings = req.body?.aiSettings || {};

  const setting = await Setting.findOneAndUpdate(
    { key: "default", shopId: req.shopId },
    { $set: { aiSettings }, $setOnInsert: { key: "default", shopId: req.shopId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.json({
    success: true,
    data: { aiSettings: setting.aiSettings },
    message: "AI settings saved.",
  });
});
