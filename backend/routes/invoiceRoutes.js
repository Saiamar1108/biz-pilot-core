const express = require("express");
const { getInvoices, createInvoice, updateInvoicePayment, getInvoiceSummary } = require("../controllers/invoiceController");

const router = express.Router();

router.route("/").get(getInvoices).post(createInvoice);
router.route("/summary").get(getInvoiceSummary);
router.route("/:id/payment").put(updateInvoicePayment);

module.exports = router;
