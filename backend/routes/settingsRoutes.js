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
const {
  exportCompleteBackup,
  exportBusinessReportPdf,
  exportAllCSVsZip,
} = require("../controllers/backupController");

const router = express.Router();

router.use(protect);

router.get("/", getSettings);
router.put("/profile", updateProfileSettings);
router.put("/business", updateBusinessSettings);
router.put("/branding", updateBrandingSettings);
router.put("/notifications", updateNotificationSettings);
router.put("/preferences", updatePreferenceSettings);
router.put("/ai", updateAiSettings);

// Backup & Export endpoints
router.get("/backup/complete", exportCompleteBackup);
router.get("/backup/report", exportBusinessReportPdf);
router.get("/backup/csvs", exportAllCSVsZip);

module.exports = router;
