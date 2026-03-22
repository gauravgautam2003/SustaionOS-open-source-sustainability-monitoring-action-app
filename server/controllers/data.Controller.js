const Data = require("../models/Data");
const detect = require("../services/detection.service").detect;
const alertService = require("../services/alert.service");
const ai = require("../ai/aiAnalyzer");
const scoreEngine = require("../ai/sustainabilityScore");

// SEND DATA
const sendData = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ success: false, msg: "Unauthorized" });

    const { building, water, energy } = req.body;
    if (!building || water == null || energy == null)
      return res.status(400).json({ success: false, msg: "All fields required" });

    const numericWater = Number(water);
    const numericEnergy = Number(energy);
    if (isNaN(numericWater) || isNaN(numericEnergy))
      return res.status(400).json({ success: false, msg: "Water & Energy must be numbers" });

    const saved = await Data.create({
      userId: req.user._id,
      building,
      water: numericWater,
      energy: numericEnergy,
    });

    if (global.io) global.io.emit("newData", saved);

    // Detection + AI + Score
    let anomaly = null, aiResult = null, score = null;
    try {
      const avg = await Data.aggregate([
        { $match: { userId: req.user._id } },
        { $group: { _id: null, avgWater: { $avg: "$water" }, avgEnergy: { $avg: "$energy" } } },
      ]);
      const avgWater = avg[0]?.avgWater || 0;
      const avgEnergy = avg[0]?.avgEnergy || 0;

      anomaly = detect(numericWater, numericEnergy, avgWater, avgEnergy);
      if (anomaly?.status) {
        await alertService.createAlert({
          userId: req.user._id,
          building,
          message: anomaly.reason,
          severity: (anomaly.severity || "LOW").toUpperCase(),
        });
        if (global.io) global.io.emit("newAlert", anomaly);
      }

      aiResult = typeof ai.askAI === "function" ? await ai.askAI("analyze current usage") : null;

      score = scoreEngine({
        water: numericWater,
        energy: numericEnergy,
        carbon: numericEnergy * 0.82,
      });

    } catch (err) {
      console.error("AI/Detection Error:", err.message);
    }

    return res.status(201).json({ success: true, data: saved, anomaly, ai: aiResult, score });

  } catch (err) {
    console.error("Data Controller Error:", err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};

// GET HISTORY
const getHistory = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ success: false, msg: "Unauthorized" });

    const history = await Data.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(Array.isArray(history) ? history : []);
  } catch (err) {
    console.error("History Error:", err);
    res.status(500).json({ success: false, msg: "Failed to fetch history" });
  }
};

// GET SCORE
const getScore = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ score: 0, msg: "Unauthorized" });

    const records = await Data.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(7);
    if (!records.length) return res.json({ score: 0 });

    const avgEnergy = records.reduce((sum, r) => sum + r.energy, 0) / records.length;
    const avgWater = records.reduce((sum, r) => sum + r.water, 0) / records.length;

    const score = scoreEngine({ water: avgWater, energy: avgEnergy, carbon: avgEnergy * 0.82 });

    res.json({ score });

  } catch (err) {
    console.error("Score Error:", err);
    res.status(500).json({ score: 0, msg: "Score calculation error" });
  }
};

module.exports = { sendData, getHistory, getScore };