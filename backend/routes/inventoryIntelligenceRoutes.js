const express = require("express");
const { protect } = require("../middlewares/protectApi");
const {
  getInventoryInsights,
  getPurchaseOrder,
  getProductByBarcode
} = require("../controllers/inventoryIntelligenceController");

const router = express.Router();

router.use(protect);

router.get("/insights", getInventoryInsights);
router.get("/purchase-order", getPurchaseOrder);
router.get("/barcode/:barcode", getProductByBarcode);

module.exports = router;