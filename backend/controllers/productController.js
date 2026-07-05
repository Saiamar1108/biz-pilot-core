const Product = require("../models/Product");
const asyncHandler = require("../middlewares/asyncHandler");
const env = require("../config/env");
const { createNotification } = require("../services/notificationService");

exports.getProducts = asyncHandler(async (req, res) => {
  const { category, search, lowStock } = req.query;
  const filter = { shopId: req.shopId };

  if (category) filter.category = category;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
    ];
  }
  if (lowStock === "true") {
    const env = require("../config/env");
    filter.stock = { $lte: env.lowStockThreshold };
  }

  const products = await Product.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, count: products.length, data: products });
});

exports.createProduct = asyncHandler(async (req, res) => {
  const price = Number(req.body.price || 0);
  const costPrice =
    req.body.costPrice == null ? Number((price * 0.7).toFixed(2)) : Number(req.body.costPrice);
  const product = await Product.create({
    ...req.body,
    shopId: req.shopId,
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
  const existing = await Product.findById(req.params.id);
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
  const update = { ...req.body, costPrice: nextCostPrice };
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

  const product = await Product.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });

  if (product && Number(product.stock) <= env.lowStockThreshold) {
    await createNotification({
      type: "low_stock",
      message: `Low stock: ${product.name} only ${product.stock} left`,
      relatedId: String(product._id),
      key: `low-stock:${String(product._id)}`,
      shopId: req.shopId,
    });
  }

  res.json({ success: true, data: product });
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.json({ success: true, message: "Product deleted", data: product });
});
