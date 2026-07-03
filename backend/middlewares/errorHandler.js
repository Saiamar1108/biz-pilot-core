const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(", ") });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ success: false, message: `Duplicate value for ${field}` });
  }

  const statusCode =
    err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  res.status(statusCode).json({
    success: false,
    ...(err.code ? { code: err.code } : {}),
    ...(err.details && typeof err.details === "object" ? err.details : {}),
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
