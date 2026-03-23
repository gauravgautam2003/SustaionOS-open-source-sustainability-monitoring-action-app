const express = require("express");
const router = express.Router();
const controller = require("../controllers/ai.controller");
const authMiddleware = require("../middleware/authMiddleware");

// protect AI route so req.user is available
router.post("/query", authMiddleware, controller.ask);

module.exports = router;