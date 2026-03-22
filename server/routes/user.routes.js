const express = require("express");
const router = express.Router();
const { getUserStats, updateProfile, getProfile } = require("../controllers/user.Controller.js");
const authMiddleware = require("../middleware/authMiddleware");

// 🔒 All routes protected
router.use(authMiddleware);

// ✅ ADD THIS ROUTE (MAIN FIX)
router.get("/profile", getProfile);

// existing routes
router.get("/stats", getUserStats);
router.patch("/update", updateProfile);

module.exports = router;