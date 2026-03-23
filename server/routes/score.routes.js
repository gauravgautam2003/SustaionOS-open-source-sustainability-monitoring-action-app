const express = require("express");
const router = express.Router();
const { getScore } = require("../controllers/data.controller");
const auth = require("../middleware/authMiddleware"); // ✅ important

router.get("/", auth, getScore); // ✅ ONLY THIS

module.exports = router;