const express = require("express");
const { protect } = require("../middlewares/protectApi");
const { getSettings } = require("../controllers/settingsController");

const router = express.Router();

router.use(protect);

router.get("/", getSettings);

module.exports = router;
