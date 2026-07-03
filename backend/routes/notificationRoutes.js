const express = require("express");
const { protect } = require("../middlewares/protectApi");
const {
  getNotifications,
  markNotificationRead,
  clearNotifications,
} = require("../controllers/notificationController");

const router = express.Router();

router.use(protect);

router.get("/", getNotifications);
router.put("/:id/read", markNotificationRead);
router.put("/read-all", clearNotifications);

module.exports = router;
