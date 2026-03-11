const router = require("express").Router();
const ctrl = require("../controllers/data.Controller");
const validate = require("../middleware/validate.middleware");

// GET data for dashboard
router.get("/", (req, res) => {
  res.json({
    energy: 410,
    water: 2460,
    temperature: 22
  });
});

// POST sensor data
router.post("/", validate, ctrl.sendData);

module.exports = router;