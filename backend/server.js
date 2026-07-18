const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const compression = require("compression");

const connectDB = require("./config/db");
const env = require("./config/env");
const Setting = require("./models/Setting");
const { notFound, errorHandler } = require("./middlewares/errorHandler");
const { runTenancyMigration } = require("./utils/migrateTenancy");
const { seedDemoAccount } = require("./utils/demoAccountSeeder");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const aiRoutes = require("./routes/aiRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const inventoryIntelligenceRoutes = require("./routes/inventoryIntelligenceRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");

const app = express();

// trust proxy (needed for Render / HTTPS)
app.set("trust proxy", 1);

// security
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// compression
app.use(compression());

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return env.corsOrigin.includes(origin);
}

// CORS
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// cookie parser
app.use(cookieParser());

// body parsers
app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended: true }));

// logger
if (env.nodeEnv === "development") {
  app.use(morgan("dev"));
}

// health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "ShopPilot AI API is running",
  });
});

// routes
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/customers", customerRoutes);
app.use("/invoices", invoiceRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/ai", aiRoutes);
app.use("/settings", settingsRoutes);
app.use("/notifications", notificationRoutes);
app.use("/inventory-intelligence", inventoryIntelligenceRoutes);
app.use("/suppliers", supplierRoutes);
app.use("/purchase-orders", purchaseOrderRoutes);

// error handlers
app.use(notFound);
app.use(errorHandler);

// start server
async function startServer() {
  try {
    await connectDB();
    await Setting.syncIndexes();
    await runTenancyMigration();
    await seedDemoAccount();

    // Verify SMTP config exists
    if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
      console.warn("\n⚠️ WARNING: SMTP email provider is not configured! Password resets will fail to deliver emails. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in backend/.env.\n");
    }

    app.listen(env.port, () => {
      console.log(`ShopPilot AI API running on http://localhost:${env.port} [${env.nodeEnv}]`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
