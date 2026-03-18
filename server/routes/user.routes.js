// routes/user.routes.js
const express = require("express");
const router = express.Router();
const { getUserStats, updateProfile } = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware"); // JWT check

// 🔒 All routes require user to be authenticated
router.use(authMiddleware);

// GET user stats
router.get("/stats", getUserStats);

// PATCH update profile
router.patch("/update", updateProfile);

module.exports = router;