const Data = require("../models/Data");
const calc = require("../services/sustainabilityScore").calculateScore;

exports.getScore = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ score: 0, msg: "Unauthorized" });
    }

    // ✅ Fetch last 7 records of this user
    const records = await Data.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(7);

    if (!records.length) {
      return res.json({ score: 0 });
    }

    // ✅ Calculate dynamic score using avg or latest weighted
    const avgEnergy =
      records.reduce((sum, r) => sum + r.energy, 0) / records.length;
    const avgWater =
      records.reduce((sum, r) => sum + r.water, 0) / records.length;

    const score = calc({
      water: avgWater,
      energy: avgEnergy,
      carbon: avgEnergy * 0.82,
    });

    res.json({ score });

  } catch (err) {
    console.error("Score Error:", err);
    res.status(500).json({ msg: "Score calculation error" });
  }
};