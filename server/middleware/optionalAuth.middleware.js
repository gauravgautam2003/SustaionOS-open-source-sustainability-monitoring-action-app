const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!JWT_SECRET || !authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    if (global.dbReady === false) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded._id).select("-password");

    if (user) {
      req.user = user;
    }
  } catch (err) {
    console.warn(`[OptionalAuth] Continuing without user context: ${err.message || err}`);
  }

  next();
};
