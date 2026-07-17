const express = require("express");
const { protect } = require("../middlewares/protectApi");
const {
  getSettings,
  updateProfileSettings,
  updateBusinessSettings,
  updateBrandingSettings,
  updateNotificationSettings,
  updatePreferenceSettings,
  updateAiSettings,
} = require("../controllers/settingsController");

const router = express.Router();

router.use(protect);

router.get("/", getSettings);
router.put("/profile", updateProfileSettings);
router.put("/business", updateBusinessSettings);
router.put("/branding", updateBrandingSettings);
router.put("/notifications", updateNotificationSettings);
router.put("/preferences", updatePreferenceSettings);
router.put("/ai", updateAiSettings);

module.exports = router;
