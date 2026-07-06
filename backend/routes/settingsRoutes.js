const express = require("express");
const { protect } = require("../middlewares/protectApi");
const { getSettings, updateBusinessSettings } = require("../controllers/settingsController");

const router = express.Router();

router.use(protect);

router.get("/", getSettings);
router.put("/business", updateBusinessSettings);

module.exports = router;
