const express = require("express");
const { protect } = require("../middlewares/protectApi");
const {
  getCustomers,
  createCustomer,
  updateCustomer,
} = require("../controllers/customerController");

const router = express.Router();

router.use(protect);

router.route("/").get(getCustomers).post(createCustomer);
router.route("/:id").put(updateCustomer);

module.exports = router;
