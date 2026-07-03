const asyncHandler = require("../middlewares/asyncHandler");
const Notification = require("../models/Notification");
const { syncSystemNotifications } = require("../services/notificationService");
const { buildShopReadFilter, mergeWithShopFilter } = require("../utils/tenantScope");

exports.getNotifications = asyncHandler(async (req, res) => {
  await syncSystemNotifications(req.shopId);
  const shopFilter = await buildShopReadFilter(req);
  const notifications = await Notification.find(shopFilter)
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
  const unreadCount = await Notification.countDocuments({
    ...shopFilter,
    read: false,
  });
  res.json({ success: true, data: { notifications, unreadCount } });
});

exports.markNotificationRead = asyncHandler(async (req, res) => {
  const shopFilter = await buildShopReadFilter(req);
  const updated = await Notification.findOneAndUpdate(
    mergeWithShopFilter(shopFilter, { _id: req.params.id }),
    { $set: { read: true } },
    { new: true },
  ).lean();
  if (!updated) {
    res.status(404);
    throw new Error("Notification not found");
  }
  res.json({ success: true, data: updated });
});

exports.clearNotifications = asyncHandler(async (req, res) => {
  const shopFilter = await buildShopReadFilter(req);
  await Notification.updateMany(shopFilter, { $set: { read: true } });
  res.json({ success: true, data: { cleared: true } });
});
