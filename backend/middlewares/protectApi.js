const { authMiddleware, shopScopeMiddleware } = require("./authMiddleware");

const protect = [authMiddleware, shopScopeMiddleware];

module.exports = { protect };
