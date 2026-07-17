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
  const price = Number(req.body.price);
  const costPrice = Number(req.body.costPrice);

  if (req.body.price == null || isNaN(price) || price <= 0) {
    res.status(400);
    throw new Error("Selling Price is required and must be greater than 0");
  }
  if (req.body.costPrice == null || isNaN(costPrice) || costPrice <= 0) {
    res.status(400);
    throw new Error("Cost Price is required and must be greater than 0");
  }

  const product = await Product.create({
    ...req.body,
    shopId: req.shopId,
    price,
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

  if (req.body.price !== undefined) {
    const price = Number(req.body.price);
    if (isNaN(price) || price <= 0) {
      res.status(400);
      throw new Error("Selling Price must be greater than 0");
    }
  }

  if (req.body.costPrice !== undefined) {
    const costPrice = Number(req.body.costPrice);
    if (isNaN(costPrice) || costPrice <= 0) {
      res.status(400);
      throw new Error("Cost Price must be greater than 0");
    }
  }

  const nextStock = req.body.stock == null ? existing.stock : Number(req.body.stock);
  const stockDelta = nextStock - existing.stock;
  const update = { ...req.body };
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
