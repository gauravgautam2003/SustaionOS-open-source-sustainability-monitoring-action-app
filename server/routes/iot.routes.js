const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/iot.controller");

router.use(auth);

router.get("/bridge", ctrl.getBridgeStatus);
router.post("/mqtt/ingest", ctrl.ingestMqtt);
router.post("/webhook/ingest", ctrl.ingestWebhook);

module.exports = router;
