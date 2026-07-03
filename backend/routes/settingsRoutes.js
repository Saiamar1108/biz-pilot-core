const express = require("express");
const {
  getSettings,
  updateBusiness,
  updateBusinessLogo,
  updateNotifications,
  updateProfile,
  updateProfileImage,
} = require("../controllers/settingsController");

const router = express.Router();

router.get("/", getSettings);
router.put("/profile", updateProfile);
router.put("/profile-image", updateProfileImage);
router.put("/business", updateBusiness);
router.put("/business-logo", updateBusinessLogo);
router.put("/notifications", updateNotifications);

module.exports = router;
