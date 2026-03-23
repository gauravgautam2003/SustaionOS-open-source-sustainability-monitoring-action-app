const mongoose = require("mongoose");
const Data = require("../models/Data");
const Alert = require("../models/Alert");

exports.calculateScore = async (userId) => {
  try {
    if (!userId) {
      return {
        score: 0,
        status: "No User",
        risk: "UNKNOWN",
        alerts: 0,
        usage: { water: 0, energy: 0 },
        message: "User not found",
      };
    }

    const objectUserId = new mongoose.Types.ObjectId(userId);

    // ✅ Latest data (correct sorting)
    const latest = await Data.findOne({ userId: objectUserId })
      .sort({ timestamp: -1 });

    // ✅ User-specific stats
    const stats = await Data.aggregate([
      { $match: { userId: objectUserId } },
      {
        $group: {
          _id: null,
          avgWater: { $avg: "$water" },
          avgEnergy: { $avg: "$energy" },
          maxWater: { $max: "$water" },
          maxEnergy: { $max: "$energy" },
        },
      },
    ]);

    // ✅ User-specific alerts
    const alertCount = await Alert.countDocuments({ userId: objectUserId });

    if (!latest || !stats.length) {
      return {
        score: 0,
        status: "No Data",
        risk: "LOW",
        alerts: 0,
        usage: { water: 0, energy: 0 },
        message: "No sufficient data available",
      };
    }

    const avgWater = stats[0].avgWater || 1;
    const avgEnergy = stats[0].avgEnergy || 1;
    const maxWater = stats[0].maxWater || latest.water;
    const maxEnergy = stats[0].maxEnergy || latest.energy;

    let penalty = 0;

    // 🔥 WATER
    const waterRatio = latest.water / avgWater;
    if (waterRatio > 1) {
      penalty += Math.min((waterRatio - 1) * 30, 30);
    }

    // 🔥 ENERGY
    const energyRatio = latest.energy / avgEnergy;
    if (energyRatio > 1) {
      penalty += Math.min((energyRatio - 1) * 30, 30);
    }

    // 🔥 ALERTS
    penalty += Math.min(alertCount * 4, 20);

    // 🔥 SPIKE DETECTION
    if (latest.water >= maxWater * 0.95) penalty += 10;
    if (latest.energy >= maxEnergy * 0.95) penalty += 10;

    // ✅ FINAL SCORE
    let score = Math.max(0, Math.round(100 - penalty));

    // ✅ STATUS ENGINE
    let status = "Excellent";
    let riskLevel = "LOW";

    if (score < 85) {
      status = "Good";
      riskLevel = "MEDIUM";
    }
    if (score < 65) {
      status = "Moderate";
      riskLevel = "HIGH";
    }
    if (score < 45) {
      status = "Critical";
      riskLevel = "SEVERE";
    }

    // ✅ MESSAGE
    let message = "All systems optimal.";
    if (riskLevel === "MEDIUM") message = "Minor inefficiencies detected.";
    if (riskLevel === "HIGH") message = "Resource usage above optimal range.";
    if (riskLevel === "SEVERE") message = "Immediate optimization required.";

    return {
      score,
      status,
      risk: riskLevel,
      alerts: alertCount,
      usage: {
        water: latest.water,
        energy: latest.energy,
      },
      message,
    };

  } catch (err) {
    console.error("Score Engine Error:", err);

    return {
      score: 0,
      status: "Error",
      risk: "UNKNOWN",
      alerts: 0,
      usage: { water: 0, energy: 0 },
      message: "Score calculation failed",
    };
  }
};