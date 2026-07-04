const Product = require("../models/Product");
const asyncHandler = require("../middlewares/asyncHandler");
const env = require("../config/env");
const { createNotification } = require("../services/notificationService");
const {
  buildShopReadFilter,
  getShopIdForCreate,
  mergeWithShopFilter,
} = require("../utils/tenantScope");

exports.getProducts = asyncHandler(async (req, res) => {
  const { category, search, lowStock, barcode } = req.query;
  const extraFilter = {};

  if (category) extraFilter.category = category;
  if (search) {
    extraFilter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { barcode: { $regex: search, $options: "i" } },
    ];
  }
  if (barcode) {
    const shopFilter = await buildShopReadFilter(req);
    const product = await Product.findOne(mergeWithShopFilter(shopFilter, { barcode: String(barcode) }));
    if (!product) {
      res.status(404);
      throw new Error("Product not found for this barcode");
    }
    return res.json({ success: true, count: 1, data: product });
  }
  if (lowStock === "true") {
    extraFilter.stock = { $lte: env.lowStockThreshold };
  }

  const shopFilter = await buildShopReadFilter(req);
  const filter = mergeWithShopFilter(shopFilter, extraFilter);
  const products = await Product.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, count: products.length, data: products });
});

exports.createProduct = asyncHandler(async (req, res) => {
  const price = Number(req.body.price || 0);
  const costPrice =
    req.body.costPrice == null ? Number((price * 0.7).toFixed(2)) : Number(req.body.costPrice);
  const barcode = req.body.barcode ? String(req.body.barcode).trim() : "";
  const expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : undefined;

  if (barcode) {
    const existing = await Product.findOne({ shopId: getShopIdForCreate(req), barcode });
    if (existing) {
      res.status(409);
      throw new Error("A product with this barcode already exists in your shop");
    }
  }

  const product = await Product.create({
    ...req.body,
    barcode,
    expiryDate,
    shopId: getShopIdForCreate(req),
    costPrice,
    stockMovements: [
      {
        type: "added",
        quantity: Number(req.body.stock || 0),
        note: "Opening stock",
        createdAt: new Date(),
      },
    ],
  });
  res.status(201).json({ success: true, data: product });
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const shopFilter = await buildShopReadFilter(req);
  const existing = await Product.findOne(
    mergeWithShopFilter(shopFilter, { _id: req.params.id }),
  );

  if (!existing) {
    res.status(404);
    throw new Error("Product not found");
  }

  const nextStock = req.body.stock == null ? existing.stock : Number(req.body.stock);
  const nextPrice = req.body.price == null ? Number(existing.price || 0) : Number(req.body.price);
  const nextCostPrice =
    req.body.costPrice == null
      ? Number(existing.costPrice || Number((nextPrice * 0.7).toFixed(2)))
      : Number(req.body.costPrice);
  const stockDelta = nextStock - existing.stock;
  const barcode = req.body.barcode !== undefined ? String(req.body.barcode).trim() : existing.barcode;
  const expiryDate = req.body.expiryDate !== undefined ? (req.body.expiryDate ? new Date(req.body.expiryDate) : undefined) : existing.expiryDate;
  const update = { ...req.body, barcode, expiryDate, costPrice: nextCostPrice };
  if (stockDelta !== 0) {
    update.$push = {
      stockMovements: {
        type: stockDelta > 0 ? "added" : "adjusted",
        quantity: stockDelta,
        note: stockDelta > 0 ? "Stock added" : "Stock adjusted",
        createdAt: new Date(),
      },
    };
  }

  if (barcode && barcode !== existing.barcode) {
    const duplicate = await Product.findOne({ shopId: existing.shopId, barcode, _id: { $ne: existing._id } });
    if (duplicate) {
      res.status(409);
      throw new Error("Another product with this barcode already exists");
    }
  }

  const product = await Product.findByIdAndUpdate(existing._id, update, {
    new: true,
    runValidators: true,
  });

  if (product && Number(product.stock) <= env.lowStockThreshold) {
    await createNotification({
      type: "low_stock",
      message: `Low stock: ${product.name} only ${product.stock} left`,
      relatedId: String(product._id),
      key: `low-stock-${String(product._id)}`,
      shopId: product.shopId,
    });
  }

  res.json({ success: true, data: product });
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const shopFilter = await buildShopReadFilter(req);
  const product = await Product.findOneAndDelete(
    mergeWithShopFilter(shopFilter, { _id: req.params.id }),
  );

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.json({ success: true, message: "Product deleted", data: product });
});
