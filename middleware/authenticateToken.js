const jwt = require("jsonwebtoken");

// In-memory blacklist to store invalidated tokens (for production, use Redis or a database)
const blacklistedTokens = new Set();

// Middleware to authenticate token
function authenticateToken(req, res, next) {
  const authHeader = req.header("Authorization");
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access Denied: No token provided" });
  }

  // Check if the token is blacklisted
  if (blacklistedTokens.has(token)) {
    return res.status(403).json({ message: "Token has been invalidated" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid Token" });
    }
    req.user = user;
    req.token = token; // Pass token to the request object for later use
    next();
  });
}

// Export both authenticateToken and blacklistedTokens
module.exports = { authenticateToken, blacklistedTokens };
