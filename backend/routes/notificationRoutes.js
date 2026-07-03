const express = require("express");
const {
  getNotifications,
  markNotificationRead,
  clearNotifications,
} = require("../controllers/notificationController");

const router = express.Router();

router.get("/", getNotifications);
router.put("/:id/read", markNotificationRead);
router.put("/read-all", clearNotifications);

module.exports = router;
