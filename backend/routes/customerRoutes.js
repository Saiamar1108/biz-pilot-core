const express = require("express");
const {
  getCustomers,
  createCustomer,
  updateCustomer,
} = require("../controllers/customerController");

const router = express.Router();

router.route("/").get(getCustomers).post(createCustomer);
router.route("/:id").put(updateCustomer);

module.exports = router;
