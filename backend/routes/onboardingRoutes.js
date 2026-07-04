const express = require("express");
const { protect } = require("../middlewares/protectApi");
const { resetDemo, seedDemo } = require("../controllers/onboardingController");

const router = express.Router();

router.use(protect);

router.post("/seed-demo", seedDemo);
router.delete("/demo-data", resetDemo);

module.exports = router;
