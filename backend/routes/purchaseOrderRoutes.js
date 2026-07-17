const express = require("express");
const { protect } = require("../middlewares/protectApi");
const {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  receiveGoods,
  getLowStockAssistant
} = require("../controllers/purchaseOrderController");

const router = express.Router();

router.use(protect);

router.get("/low-stock-assistant", getLowStockAssistant);

router.route("/")
  .get(getPurchaseOrders)
  .post(createPurchaseOrder);

router.route("/:id")
  .get(getPurchaseOrderById)
  .put(updatePurchaseOrder);

router.post("/:id/receive", receiveGoods);

module.exports = router;
