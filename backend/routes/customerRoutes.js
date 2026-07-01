const express = require("express");
const { getCustomers, createCustomer } = require("../controllers/customerController");

const router = express.Router();

router.route("/").get(getCustomers).post(createCustomer);

module.exports = router;
