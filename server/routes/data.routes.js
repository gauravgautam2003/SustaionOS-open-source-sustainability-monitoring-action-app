const router = require("express").Router();
const Data = require("../models/Data");
const { sendData, getHistory } = require("../controllers/data.Controller");
const authMiddleware = require("../middleware/authMiddleware");
const validate = require("../middleware/validate.middleware");

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const latest = await Data.findOne({ userId: req.user._id }).sort({ createdAt: -1 });

    if (!latest) {
      return res.json({
        energy: 0,
        water: 0,
        building: "No Data Available",
        location: "",
        latitude: null,
        longitude: null,
      });
    }

    res.json({
      energy: latest.energy,
      water: latest.water,
      building: latest.building,
      location: latest.location || "",
      latitude: latest.latitude ?? null,
      longitude: latest.longitude ?? null,
      timestamp: latest.createdAt,
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.get("/history", getHistory);
router.post("/", validate, sendData);

module.exports = router;
