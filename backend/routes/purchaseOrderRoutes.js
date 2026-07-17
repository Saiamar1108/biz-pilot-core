const express = require("express");
const { protect } = require("../middlewares/protectApi");
const {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  receiveGoods,
  getLowStockAssistant,
  markPurchaseOrderSent,
  emailPurchaseOrder
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
router.post("/:id/mark-sent", markPurchaseOrderSent);
router.post("/:id/email", emailPurchaseOrder);

module.exports = router;
