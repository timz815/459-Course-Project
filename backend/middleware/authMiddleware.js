const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  // 1. get token from header
  const token = req.header("Authorization");

  // 2. check if token exists
  if (!token) return res.status(401).json({ error: "Access denied" });

  try {
    // 3. verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallbackSecret",
    );
    req.userId = decoded.id; // add user ID to request
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = verifyToken;
