const router = require("express").Router();
const ctrl = require("../controllers/alert.controller");
const auth = require("../middleware/authMiddleware");

// Require authentication and return user-scoped alerts
router.get("/", auth, ctrl.getAlerts);

module.exports = router;