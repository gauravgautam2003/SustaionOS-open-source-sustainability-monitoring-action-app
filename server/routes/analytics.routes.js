// routes/analytics.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/analytics.controller");

router.get("/summary", controller.getAnalytics);
router.get("/score", controller.getScore);
router.get("/trend", controller.getTrend);
router.get("/history", controller.getHistory);

module.exports = router;