const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
const env = require("./config/env");
const Setting = require("./models/Setting");
const { notFound, errorHandler } = require("./middlewares/errorHandler");
const { runTenancyMigration } = require("./utils/migrateTenancy");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const aiRoutes = require("./routes/aiRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const inventoryIntelligenceRoutes = require("./routes/inventoryIntelligenceRoutes");

const app = express();

app.set("trust proxy", 1);
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended: true }));

if (env.nodeEnv === "development") {
  app.use(morgan("dev"));
}

app.get("/health", (req, res) => {
  res.json({ success: true, message: "ShopPilot AI API is running" });
});

app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/customers", customerRoutes);
app.use("/invoices", invoiceRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/ai", aiRoutes);
app.use("/settings", settingsRoutes);
app.use("/notifications", notificationRoutes);
app.use("/inventory-intelligence", inventoryIntelligenceRoutes);

app.use(notFound);
app.use(errorHandler);

async function startServer() {
  await connectDB();
  await Setting.dropLegacyKeyIndex();
  await Setting.syncIndexes();
  await runTenancyMigration();

  app.listen(env.port, () => {
    console.log(`ShopPilot AI API running on http://localhost:${env.port} [${env.nodeEnv}]`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
