const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in environment variables");
}

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, msg: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded._id).select("-password");
    if (!user) return res.status(401).json({ success: false, msg: "Invalid token user" });

    req.user = user; // attach to request
    next();

  } catch (err) {
    console.error(`[AuthMiddleware] Path: ${req.path} - Error:`, err.message);
    return res.status(401).json({ success: false, msg: "Token invalid or expired" });
  }
};