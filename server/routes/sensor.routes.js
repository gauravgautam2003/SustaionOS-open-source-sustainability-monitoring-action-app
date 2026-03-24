const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/sensor.controller");
const validate = require("../middleware/validate.middleware");
const dataCtrl = require("../controllers/data.Controller");

router.use(auth);

router.get("/", ctrl.getSensors);
router.get("/summary", ctrl.getSensorSummary);
router.post("/", ctrl.registerSensor);
router.patch("/:id/ping", ctrl.pingSensor);
router.post("/ingest", validate, ctrl.ingestSensorTelemetry);
router.post("/telemetry", validate, dataCtrl.sendData);

module.exports = router;
