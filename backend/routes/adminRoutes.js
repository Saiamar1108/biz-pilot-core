const express = require("express");
const { resetDemoData } = require("../controllers/adminController");

const router = express.Router();

router.post("/reset", resetDemoData);

module.exports = router;
