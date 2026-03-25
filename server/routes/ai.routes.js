const express = require("express");
const router = express.Router();
const controller = require("../controllers/ai.controller");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuth = require("../middleware/optionalAuth.middleware");

router.post("/query", optionalAuth, controller.ask);
router.post("/forecast", authMiddleware, controller.forecast);
router.post("/profile-parse", authMiddleware, controller.profileParse);

module.exports = router;
