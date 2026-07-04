const asyncHandler = require("../middlewares/asyncHandler");
const Notification = require("../models/Notification");
const { syncSystemNotifications } = require("../services/notificationService");

exports.getNotifications = asyncHandler(async (req, res) => {
  await syncSystemNotifications();
  const notifications = await Notification.find({ shopId: req.shopId }).sort({ createdAt: -1 }).limit(30).lean();
  const unreadCount = await Notification.countDocuments({ read: false, shopId: req.shopId });
  res.json({ success: true, data: { notifications, unreadCount } });
});

exports.markNotificationRead = asyncHandler(async (req, res) => {
  const updated = await Notification.findOneAndUpdate(
    { _id: req.params.id, shopId: req.shopId },
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
  await Notification.updateMany({ shopId: req.shopId }, { $set: { read: true } });
  res.json({ success: true, data: { cleared: true } });
});
