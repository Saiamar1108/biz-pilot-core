const express = require("express");
const { getInvoices, createInvoice } = require("../controllers/invoiceController");

const router = express.Router();

router.route("/").get(getInvoices).post(createInvoice);

module.exports = router;
