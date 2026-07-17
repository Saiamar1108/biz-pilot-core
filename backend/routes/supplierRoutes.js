const express = require("express");
const { protect } = require("../middlewares/protectApi");
const {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierHistory
} = require("../controllers/supplierController");

const router = express.Router();

router.use(protect);

router.route("/")
  .get(getSuppliers)
  .post(createSupplier);

router.route("/:id")
  .put(updateSupplier)
  .delete(deleteSupplier);

router.get("/:id/history", getSupplierHistory);

module.exports = router;
