const express = require("express");
const { protect } = require("../middlewares/protectApi");
const {
  getInvoices,
  createInvoice,
  updateInvoicePayment,
  getInvoiceSummary,
} = require("../controllers/invoiceController");

const router = express.Router();

router.use(protect);

router.route("/").get(getInvoices).post(createInvoice);
router.route("/summary").get(getInvoiceSummary);
router.route("/:id/payment").put(updateInvoicePayment);

module.exports = router;
