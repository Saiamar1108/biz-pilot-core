const express = require("express");
const { protect } = require("../middlewares/protectApi");
const { chat } = require("../controllers/aiController");

const router = express.Router();

router.use(protect);

router.post("/chat", chat);

module.exports = router;
