const asyncHandler = require("../middlewares/asyncHandler");
const Notification = require("../models/Notification");
const { syncSystemNotifications } = require("../services/notificationService");

exports.getNotifications = asyncHandler(async (req, res) => {
  await syncSystemNotifications();
  const notifications = await Notification.find().sort({ createdAt: -1 }).limit(30).lean();
  const unreadCount = await Notification.countDocuments({ read: false });
  res.json({ success: true, data: { notifications, unreadCount } });
});

exports.markNotificationRead = asyncHandler(async (req, res) => {
  const updated = await Notification.findByIdAndUpdate(
    req.params.id,
    { $set: { read: true } },
    { new: true },
  ).lean();
  if (!updated) {
    res.status(404);
    throw new Error("Notification not found");
  }
  res.json({ success: true, data: updated });
});

exports.clearNotifications = asyncHandler(async (_req, res) => {
  await Notification.updateMany({}, { $set: { read: true } });
  res.json({ success: true, data: { cleared: true } });
});
