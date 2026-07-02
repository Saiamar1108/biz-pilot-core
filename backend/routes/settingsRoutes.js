const express = require("express");
const {
  getSettings,
  updateNotifications,
  updateProfile,
  updateProfileImage,
} = require("../controllers/settingsController");

const router = express.Router();

router.get("/", getSettings);
router.put("/profile", updateProfile);
router.put("/profile-image", updateProfileImage);
router.put("/notifications", updateNotifications);

module.exports = router;
