const asyncHandler = require("express-async-handler");
const PurchaseOrder = require("../models/PurchaseOrder");
const Product = require("../models/Product");
const Supplier = require("../models/Supplier");
const mongoose = require("mongoose");

// Helper to generate unique PO number
async function generatePurchaseOrderNumber(shopId) {
  const count = await PurchaseOrder.countDocuments({ shopId });
  const year = new Date().getFullYear();
  return `PO-${year}-${String(count + 1).padStart(4, "0")}`;
}

// @desc    Get all purchase orders with filters
// @route   GET /api/purchase-orders
// @access  Private
const getPurchaseOrders = asyncHandler(async (req, res) => {
  const { supplier, status, startDate, endDate, product, minAmount, maxAmount } = req.query;
  const filter = { shopId: req.shopId };

  if (supplier) {
    filter.supplier = supplier;
  }
  if (status) {
    filter.status = status;
  }
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  if (product) {
    if (mongoose.Types.ObjectId.isValid(product)) {
      filter["items.product"] = product;
    } else {
      filter["items.productName"] = { $regex: product, $options: "i" };
    }
  }
  if (minAmount || maxAmount) {
    filter.totalAmount = {};
    if (minAmount) filter.totalAmount.$gte = Number(minAmount);
    if (maxAmount) filter.totalAmount.$lte = Number(maxAmount);
  }

  const purchaseOrders = await PurchaseOrder.find(filter)
    .populate("supplier", "supplierName mobileNumber email")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: purchaseOrders });
});

// @desc    Get a single purchase order
// @route   GET /api/purchase-orders/:id
// @access  Private
const getPurchaseOrderById = asyncHandler(async (req, res) => {
  const purchaseOrder = await PurchaseOrder.findOne({
    _id: req.params.id,
    shopId: req.shopId
  }).populate("supplier", "supplierName mobileNumber email address city state pincode gstNumber");

  if (!purchaseOrder) {
    res.status(404);
    throw new Error("Purchase Order not found.");
  }

  res.json({ success: true, data: purchaseOrder });
});

// @desc    Create Purchase Order(s) (supports auto-splitting by supplier)
// @route   POST /api/purchase-orders
// @access  Private
const createPurchaseOrder = asyncHandler(async (req, res) => {
  const { items, notes, expectedDeliveryDate } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error("Line items are required.");
  }

  // Validate items
  for (const item of items) {
    if (!item.product) {
      res.status(400);
      throw new Error("Product ID is required for each line item.");
    }
    if (!item.quantity || Number(item.quantity) <= 0) {
      res.status(400);
      throw new Error("Quantity must be greater than 0.");
    }
    if (!item.purchasePrice || Number(item.purchasePrice) <= 0) {
      res.status(400);
      throw new Error("Purchase price must be greater than 0.");
    }
    if (!item.supplier) {
      res.status(400);
      throw new Error("Supplier is required for each line item.");
    }
  }

  // Group line items by supplier
  const groups = {};
  for (const item of items) {
    const supplierId = String(item.supplier);
    if (!groups[supplierId]) {
      groups[supplierId] = [];
    }
    groups[supplierId].push(item);
  }

  const createdOrders = [];

  for (const [supplierId, groupItems] of Object.entries(groups)) {
    const supplier = await Supplier.findOne({ _id: supplierId, shopId: req.shopId });
    if (!supplier) {
      res.status(400);
      throw new Error(`Supplier with ID ${supplierId} not found.`);
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of groupItems) {
      const product = await Product.findOne({ _id: item.product, shopId: req.shopId });
      if (!product) {
        res.status(400);
        throw new Error(`Product with ID ${item.product} not found.`);
      }

      const qty = Number(item.quantity);
      const price = Number(item.purchasePrice);
      const lineTotal = parseFloat((qty * price).toFixed(2));

      orderItems.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: qty,
        unit: item.unit || "units",
        purchasePrice: price,
        receivedQuantity: 0,
        expectedDeliveryDate: item.expectedDeliveryDate || expectedDeliveryDate || null,
        remarks: item.remarks || "",
        batchNumber: "",
        expiryDate: null
      });

      totalAmount += lineTotal;
    }

    const poNumber = await generatePurchaseOrderNumber(req.shopId);

    const newPO = await PurchaseOrder.create({
      shopId: req.shopId,
      purchaseOrderNumber: poNumber,
      supplier: supplier._id,
      supplierName: supplier.supplierName,
      items: orderItems,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      notes: notes || "",
      expectedDeliveryDate: expectedDeliveryDate || null,
      status: "Draft"
    });

    createdOrders.push(newPO);
  }

  res.status(201).json({ success: true, data: createdOrders });
});

// @desc    Update Purchase Order status/details
// @route   PUT /api/purchase-orders/:id
// @access  Private
const updatePurchaseOrder = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findOne({ _id: req.params.id, shopId: req.shopId });
  if (!po) {
    res.status(404);
    throw new Error("Purchase Order not found.");
  }

  const { status, notes, expectedDeliveryDate } = req.body;

  if (status) {
    const validStatuses = ["Draft", "Sent", "Confirmed", "Partially Received", "Received", "Cancelled"];
    if (!validStatuses.includes(status)) {
      res.status(400);
      throw new Error("Invalid purchase order status.");
    }
    po.status = status;
  }

  if (notes !== undefined) po.notes = notes;
  if (expectedDeliveryDate !== undefined) po.expectedDeliveryDate = expectedDeliveryDate;

  await po.save();
  res.json({ success: true, data: po });
});

// @desc    Receive Goods against a Purchase Order
// @route   POST /api/purchase-orders/:id/receive
// @access  Private
const receiveGoods = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findOne({ _id: req.params.id, shopId: req.shopId });
  if (!po) {
    res.status(404);
    throw new Error("Purchase Order not found.");
  }

  if (["Received", "Cancelled"].includes(po.status)) {
    res.status(400);
    throw new Error(`Cannot receive goods for an order that is already ${po.status}.`);
  }

  const { receivedItems, receivedDate, invoiceNumber } = req.body;

  if (!receivedItems || !Array.isArray(receivedItems) || receivedItems.length === 0) {
    res.status(400);
    throw new Error("Received items details are required.");
  }

  const receiptDate = receivedDate ? new Date(receivedDate) : new Date();

  // Validate quantities
  for (const rItem of receivedItems) {
    const orderLine = po.items.find(item => String(item.product) === String(rItem.product));
    if (!orderLine) {
      res.status(400);
      throw new Error(`Product ${rItem.product} is not part of this Purchase Order.`);
    }

    const rQty = Number(rItem.receivedQuantity || 0);
    if (rQty < 0) {
      res.status(400);
      throw new Error("Received quantity cannot be negative.");
    }

    const maxReceivable = orderLine.quantity - orderLine.receivedQuantity;
    if (rQty > maxReceivable) {
      res.status(400);
      throw new Error(
        `Cannot receive ${rQty} units of ${orderLine.productName}. Maximum remaining receivable is ${maxReceivable}.`
      );
    }

    if (rItem.purchasePrice && Number(rItem.purchasePrice) <= 0) {
      res.status(400);
      throw new Error("Purchase price must be greater than 0.");
    }
  }

  // Process items & update stock
  for (const rItem of receivedItems) {
    const orderLine = po.items.find(item => String(item.product) === String(rItem.product));
    const rQty = Number(rItem.receivedQuantity || 0);
    const purchasePrice = Number(rItem.purchasePrice || orderLine.purchasePrice);

    if (rQty > 0) {
      const product = await Product.findOne({ _id: rItem.product, shopId: req.shopId });
      if (product) {
        // 1. Increase stock
        product.stock += rQty;

        // 2. Update product costPrice
        product.costPrice = purchasePrice;

        // 3. Record stock movement
        product.stockMovements.push({
          type: "added",
          quantity: rQty,
          note: `PO Goods Receipt: ${po.purchaseOrderNumber}${invoiceNumber ? ` (Inv: ${invoiceNumber})` : ""}`
        });

        // 4. Update purchase history
        product.purchaseHistory.push({
          supplier: po.supplier,
          supplierName: po.supplierName,
          price: purchasePrice,
          quantity: rQty,
          purchaseDate: receiptDate
        });

        await product.save();
      }

      // Update PO line item details
      orderLine.receivedQuantity += rQty;
      if (rItem.batchNumber) orderLine.batchNumber = rItem.batchNumber;
      if (rItem.expiryDate) orderLine.expiryDate = rItem.expiryDate;
      if (rItem.purchasePrice) orderLine.purchasePrice = purchasePrice;
    }
  }

  // Re-calculate status
  let allFullyReceived = true;
  let anyReceived = false;

  for (const item of po.items) {
    if (item.receivedQuantity < item.quantity) {
      allFullyReceived = false;
    }
    if (item.receivedQuantity > 0) {
      anyReceived = true;
    }
  }

  if (allFullyReceived) {
    po.status = "Received";
  } else if (anyReceived) {
    po.status = "Partially Received";
  }

  po.receivedDate = receiptDate;
  if (invoiceNumber) po.invoiceNumber = invoiceNumber;

  await po.save();
  res.json({ success: true, data: po });
});

// @desc    Get low stock products for Purchase Assistant suggestions
// @route   GET /api/purchase-orders/low-stock-assistant
// @access  Private
const getLowStockAssistant = asyncHandler(async (req, res) => {
  const products = await Product.find({ shopId: req.shopId }).populate("defaultSupplier", "supplierName");
  
  // Detect low stock: stock <= minStock
  const lowStockProducts = products.filter(p => p.stock <= (p.minStock ?? 10));

  const recommendations = [];

  for (const product of lowStockProducts) {
    // 1. Suggest Default Supplier
    let suggestedSupplier = product.defaultSupplier;
    let suggestionSource = "default";

    // 2. Suggest Previously Used Supplier
    if (!suggestedSupplier && product.purchaseHistory && product.purchaseHistory.length > 0) {
      const sortedHistory = [...product.purchaseHistory].sort(
        (a, b) => b.purchaseDate - a.purchaseDate
      );
      const lastSuppId = sortedHistory[0].supplier;
      if (lastSuppId) {
        const lastSupplier = await Supplier.findOne({ _id: lastSuppId, shopId: req.shopId });
        if (lastSupplier) {
          suggestedSupplier = lastSupplier;
          suggestionSource = "previous";
        }
      }
    }

    // 3. Recommended quantity: targetStock - currentStock
    const minVal = product.minStock ?? 10;
    const targetVal = product.targetStock ?? 50;
    const currentVal = product.stock;
    const recommendedQty = Math.max(1, targetVal - currentVal);

    const lastPrice = product.purchaseHistory && product.purchaseHistory.length > 0
      ? product.purchaseHistory[product.purchaseHistory.length - 1].price
      : null;

    recommendations.push({
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        stock: product.stock,
        minStock: minVal,
        targetStock: targetVal,
        costPrice: product.costPrice,
        price: product.price
      },
      suggestedSupplier: suggestedSupplier ? {
        id: suggestedSupplier._id,
        supplierName: suggestedSupplier.supplierName
      } : null,
      suggestionSource,
      recommendedQuantity: recommendedQty,
      lastPurchasePrice: lastPrice,
      purchasePrice: lastPrice || product.costPrice || parseFloat((product.price * 0.7).toFixed(2))
    });
  }

  res.json({ success: true, data: recommendations });
});

// @desc    Mark a Purchase Order as sent (either by WhatsApp or Email)
// @route   POST /api/purchase-orders/:id/mark-sent
// @access  Private
const markPurchaseOrderSent = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findOne({ _id: req.params.id, shopId: req.shopId });
  if (!po) {
    res.status(404);
    throw new Error("Purchase Order not found.");
  }

  const { channel, sentBy } = req.body;
  if (!channel || !["whatsapp", "email"].includes(channel)) {
    res.status(400);
    throw new Error("Valid channel (whatsapp or email) is required.");
  }

  // Auto transition status Draft -> Sent
  if (po.status === "Draft") {
    po.status = "Sent";
  }

  po.sentAt = new Date();
  po.lastContactedAt = new Date();
  if (sentBy) {
    po.sentBy = sentBy;
  }

  if (channel === "whatsapp") {
    po.whatsAppSentCount = (po.whatsAppSentCount || 0) + 1;
  } else {
    po.emailSentCount = (po.emailSentCount || 0) + 1;
  }

  await po.save();
  res.json({ success: true, data: po });
});

// @desc    Send Purchase Order email using mock backend email service
// @route   POST /api/purchase-orders/:id/email
// @access  Private
const emailPurchaseOrder = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findOne({ _id: req.params.id, shopId: req.shopId }).populate("supplier");
  if (!po) {
    res.status(404);
    throw new Error("Purchase Order not found.");
  }

  const supplier = po.supplier;
  if (!supplier || !supplier.email) {
    res.status(400);
    throw new Error("Supplier does not have a registered email address.");
  }

  // Generate Professional HTML email
  const itemsRows = po.items.map(item => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.productName}</td>
      <td style="padding: 8px; border: 1px solid #ddd;" align="right">${item.quantity} ${item.unit || 'units'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;" align="right">₹${item.purchasePrice.toFixed(2)}</td>
      <td style="padding: 8px; border: 1px solid #ddd;" align="right">₹${(item.quantity * item.purchasePrice).toFixed(2)}</td>
    </tr>
  `).join("");

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Purchase Order - ${po.purchaseOrderNumber}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #6366f1;">PURCHASE ORDER</h2>
        <p><strong>PO Number:</strong> ${po.purchaseOrderNumber}</p>
        <p><strong>Date:</strong> ${po.createdAt ? new Date(po.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        
        <h3>Supplier Details</h3>
        <p>
          <strong>Company:</strong> ${supplier.supplierName}<br>
          <strong>Contact Person:</strong> ${supplier.contactPerson || '—'}<br>
          <strong>Email:</strong> ${supplier.email}<br>
          <strong>Mobile:</strong> ${supplier.mobileNumber}
        </p>

        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">

        <h3>Order Items</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="padding: 8px; border: 1px solid #ddd;" align="left">Item</th>
              <th style="padding: 8px; border: 1px solid #ddd;" align="right">Quantity</th>
              <th style="padding: 8px; border: 1px solid #ddd;" align="right">Unit Price</th>
              <th style="padding: 8px; border: 1px solid #ddd;" align="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
            <tr style="font-weight: bold;">
              <td colspan="3" style="padding: 8px; border: 1px solid #ddd;" align="right">Grand Total</td>
              <td style="padding: 8px; border: 1px solid #ddd;" align="right">₹${po.totalAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        ${po.expectedDeliveryDate ? `<p><strong>Expected Delivery:</strong> ${new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN')}</p>` : ''}
        ${po.notes ? `<p><strong>Notes:</strong> ${po.notes}</p>` : ''}

        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        
        <div style="font-size: 12px; color: #666; text-align: center;">
          <p>This is a professional purchase order generated by <strong>ShopPilot AI</strong>.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Print email mock output to terminal console
  console.log("==================================================");
  console.log(`[Email Service] Sending PO: ${po.purchaseOrderNumber}`);
  console.log(`[Email Service] Recipient: ${supplier.email}`);
  console.log(`[Email Service] Subject: Purchase Order - ${po.purchaseOrderNumber}`);
  console.log("------------------ EMAIL HTML --------------------");
  console.log(emailHtml);
  console.log("==================================================");

  // Status automation Draft -> Sent
  if (po.status === "Draft") {
    po.status = "Sent";
  }

  po.sentAt = new Date();
  po.lastContactedAt = new Date();
  po.sentBy = req.user?.email || "System Assistant";
  po.emailSentCount = (po.emailSentCount || 0) + 1;

  await po.save();
  res.json({ success: true, message: `Purchase Order email sent to ${supplier.email} successfully.` });
});

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  receiveGoods,
  getLowStockAssistant,
  markPurchaseOrderSent,
  emailPurchaseOrder
};
