const router = require("express").Router();
const Data = require("../models/Data"); // ✅ MISSING
const { sendData, getHistory } = require("../controllers/data.controller");
const authMiddleware = require("../middleware/authMiddleware");
const validate = require("../middleware/validate.middleware");

// 🔒 Protect all routes
router.use(authMiddleware);

// 🔥 REAL DATA FOR DASHBOARD (user-specific)
router.get("/", async (req, res) => {
  try {
    const latest = await Data.findOne({ userId: req.user._id }).sort({ createdAt: -1 }); // ✅ createdAt

    if (!latest) {
      return res.json({
        energy: 0,
        water: 0,
        building: "No Data Available",
      });
    }

    res.json({
      energy: latest.energy,
      water: latest.water,
      building: latest.building,
      timestamp: latest.createdAt, // ✅ updated
    });
  } catch (err) {
    console.error("❌ Dashboard Error:", err);
    res.status(500).json({ msg: "Server Error" });
  }
});

// 📊 HISTORY
router.get("/history", getHistory);

// 📥 ADD DATA
router.post("/", validate, sendData);

module.exports = router;