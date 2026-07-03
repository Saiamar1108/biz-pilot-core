const express = require("express");
const router = express.Router();
const {
  getInventoryInsights,
  getPurchaseOrder,
  getProductByBarcode
} = require("../controllers/inventoryIntelligenceController");

router.get("/insights", getInventoryInsights);
router.get("/purchase-order", getPurchaseOrder);
router.get("/barcode/:barcode", getProductByBarcode);

module.exports = router;