const asyncHandler = require("express-async-handler");
const Supplier = require("../models/Supplier");
const PurchaseOrder = require("../models/PurchaseOrder");
const Product = require("../models/Product");

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
const getSuppliers = asyncHandler(async (req, res) => {
  const q = req.query.q || "";
  const filter = { shopId: req.shopId };
  
  if (q) {
    filter.$or = [
      { supplierName: { $regex: q, $options: "i" } },
      { contactPerson: { $regex: q, $options: "i" } },
      { mobileNumber: { $regex: q, $options: "i" } }
    ];
  }

  const suppliers = await Supplier.find(filter).sort({ preferredSupplier: -1, supplierName: 1 });
  res.json({ success: true, data: suppliers });
});

// @desc    Create supplier
// @route   POST /api/suppliers
// @access  Private
const createSupplier = asyncHandler(async (req, res) => {
  const {
    supplierName,
    contactPerson,
    mobileNumber,
    alternateNumber,
    email,
    gstNumber,
    address,
    city,
    state,
    pincode,
    notes,
    isActive,
    preferredSupplier
  } = req.body;

  if (!supplierName) {
    res.status(400);
    throw new Error("Supplier Name is required.");
  }
  if (!mobileNumber) {
    res.status(400);
    throw new Error("Mobile Number is required.");
  }

  // Validate mobile number format
  const mobileRegex = /^\+?[0-9\s\-]{7,15}$/;
  if (!mobileRegex.test(mobileNumber)) {
    res.status(400);
    throw new Error("Invalid mobile number format.");
  }

  // Duplicate supplier entry check per shop
  const existing = await Supplier.findOne({
    shopId: req.shopId,
    supplierName: { $regex: `^${supplierName.trim()}$`, $options: "i" }
  });
  if (existing) {
    res.status(400);
    throw new Error("A supplier with this name already exists.");
  }

  const supplier = await Supplier.create({
    shopId: req.shopId,
    supplierName: supplierName.trim(),
    contactPerson,
    mobileNumber,
    alternateNumber,
    email,
    gstNumber,
    address,
    city,
    state,
    pincode,
    notes,
    isActive: isActive !== undefined ? isActive : true,
    preferredSupplier: preferredSupplier !== undefined ? preferredSupplier : false
  });

  res.status(201).json({ success: true, data: supplier });
});

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private
const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOne({ _id: req.params.id, shopId: req.shopId });
  if (!supplier) {
    res.status(404);
    throw new Error("Supplier not found.");
  }

  const {
    supplierName,
    contactPerson,
    mobileNumber,
    alternateNumber,
    email,
    gstNumber,
    address,
    city,
    state,
    pincode,
    notes,
    isActive,
    preferredSupplier
  } = req.body;

  if (supplierName) {
    // Duplicate supplier check per shop
    const existing = await Supplier.findOne({
      shopId: req.shopId,
      _id: { $ne: req.params.id },
      supplierName: { $regex: `^${supplierName.trim()}$`, $options: "i" }
    });
    if (existing) {
      res.status(400);
      throw new Error("A supplier with this name already exists.");
    }
    supplier.supplierName = supplierName.trim();
  }

  if (mobileNumber) {
    const mobileRegex = /^\+?[0-9\s\-]{7,15}$/;
    if (!mobileRegex.test(mobileNumber)) {
      res.status(400);
      throw new Error("Invalid mobile number format.");
    }
    supplier.mobileNumber = mobileNumber;
  }

  if (contactPerson !== undefined) supplier.contactPerson = contactPerson;
  if (alternateNumber !== undefined) supplier.alternateNumber = alternateNumber;
  if (email !== undefined) supplier.email = email;
  if (gstNumber !== undefined) supplier.gstNumber = gstNumber;
  if (address !== undefined) supplier.address = address;
  if (city !== undefined) supplier.city = city;
  if (state !== undefined) supplier.state = state;
  if (pincode !== undefined) supplier.pincode = pincode;
  if (notes !== undefined) supplier.notes = notes;
  if (isActive !== undefined) supplier.isActive = isActive;
  if (preferredSupplier !== undefined) supplier.preferredSupplier = preferredSupplier;

  await supplier.save();
  res.json({ success: true, data: supplier });
});

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private
const deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOne({ _id: req.params.id, shopId: req.shopId });
  if (!supplier) {
    res.status(404);
    throw new Error("Supplier not found.");
  }

  // Remove default supplier reference from products
  await Product.updateMany(
    { shopId: req.shopId, defaultSupplier: req.params.id },
    { $set: { defaultSupplier: null } }
  );

  await supplier.deleteOne();
  res.json({ success: true, message: "Supplier deleted successfully." });
});

// @desc    Get supplier purchase details & statistics
// @route   GET /api/suppliers/:id/history
// @access  Private
const getSupplierHistory = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOne({ _id: req.params.id, shopId: req.shopId });
  if (!supplier) {
    res.status(404);
    throw new Error("Supplier not found.");
  }

  const purchaseOrders = await PurchaseOrder.find({
    shopId: req.shopId,
    supplier: req.params.id
  }).sort({ createdAt: -1 });

  const totalOrders = purchaseOrders.length;
  const totalAmountPurchased = purchaseOrders
    .filter(po => ["Received", "Partially Received", "Confirmed", "Sent"].includes(po.status))
    .reduce((sum, po) => sum + po.totalAmount, 0);

  const outstandingOrders = purchaseOrders.filter(po => 
    ["Sent", "Confirmed", "Partially Received"].includes(po.status)
  ).length;

  const lastOrderDate = purchaseOrders[0]?.createdAt || null;

  // Retrieve unique products supplied by checking line items of POs
  const suppliedProductIds = new Set();
  const suppliedProductsInfo = [];
  purchaseOrders.forEach(po => {
    po.items.forEach(item => {
      if (item.product && !suppliedProductIds.has(item.product.toString())) {
        suppliedProductIds.add(item.product.toString());
        suppliedProductsInfo.push({
          productId: item.product,
          productName: item.productName,
          sku: item.sku,
          lastPurchasePrice: item.purchasePrice
        });
      }
    });
  });

  // Calculate Average Delivery Time (in days)
  let receivedCount = 0;
  let totalDeliveryDays = 0;
  purchaseOrders.forEach(po => {
    if (po.status === "Received" && po.receivedDate && po.createdAt) {
      const deliveryTime = new Date(po.receivedDate).getTime() - new Date(po.createdAt).getTime();
      const deliveryDays = Math.ceil(deliveryTime / (1000 * 60 * 60 * 24));
      if (deliveryDays >= 0) {
        totalDeliveryDays += deliveryDays;
        receivedCount += 1;
      }
    }
  });
  const averageDeliveryTime = receivedCount > 0 ? Math.round(totalDeliveryDays / receivedCount) : null;

  res.json({
    success: true,
    data: {
      supplier,
      stats: {
        totalOrders,
        totalAmountPurchased,
        outstandingOrders,
        lastOrderDate,
        productsSupplied: suppliedProductsInfo,
        averageDeliveryTime
      },
      orders: purchaseOrders
    }
  });
});

module.exports = {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierHistory
};
