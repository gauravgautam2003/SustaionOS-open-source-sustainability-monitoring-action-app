const Data = require("../models/Data");
const scoreService = require("../services/sustainabilityScore.engine");

// helper to compute startDate from period
const computeStartDate = (period) => {
  if (!period) return null;
  const now = new Date();
  if (period === "week") { const d = new Date(); d.setDate(now.getDate() - 6); return d; }
  if (period === "month") { const d = new Date(); d.setMonth(now.getMonth() - 1); return d; }
  if (period === "year") { const d = new Date(); d.setFullYear(now.getFullYear() - 1); return d; }
  if (!isNaN(parseInt(period))) { const d = new Date(); d.setMonth(now.getMonth() - parseInt(period)); return d; }
  return null;
};

// Get analytics summary (user-specific)
exports.getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });

    const { period } = req.query;
    const startDate = computeStartDate(period);

    const filter = { userId, ...(startDate ? { timestamp: { $gte: startDate } } : {}) };
    const records = await Data.find(filter);

    if (!records.length) {
      return res.json({ totalRecords: 0, totalWater: 0, totalEnergy: 0, avgWater: 0, avgEnergy: 0 });
    }

    const totalWater = records.reduce((a, b) => a + (b.water || 0), 0);
    const totalEnergy = records.reduce((a, b) => a + (b.energy || 0), 0);
    const avgWater = Math.round(totalWater / records.length);
    const avgEnergy = Math.round(totalEnergy / records.length);

    res.json({ totalRecords: records.length, totalWater, totalEnergy, avgWater, avgEnergy });
  } catch (err) {
    next(err);
  }
};

// Get sustainability score (user-specific)
exports.getScore = async (req, res, next) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ score: 0 });

    const result = await scoreService.calculateScore(userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Get history (user-specific)
exports.getHistory = async (req, res, next) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({});

    const limit = parseInt(req.query.limit) || 30;
    const records = await Data.find({ userId }).sort({ timestamp: -1 }).limit(limit);
    res.json(records.reverse()); // oldest first
  } catch (err) {
    next(err);
  }
};

// Get trend for charts (user-specific, supports period)
exports.getTrend = async (req, res, next) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json([]);

    const { period } = req.query;
    const startDate = computeStartDate(period);
    const filter = { userId, ...(startDate ? { timestamp: { $gte: startDate } } : {}) };

    const records = await Data.find(filter).sort({ timestamp: 1 });
    if (!records.length) return res.json([]);

    const trendMap = {};
    records.forEach((r) => {
      const ts = r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp);
      const day = ts.toISOString().split("T")[0];
      if (!trendMap[day]) trendMap[day] = { energy: 0, water: 0 };
      trendMap[day].energy += Number(r.energy || 0);
      trendMap[day].water += Number(r.water || 0);
    });

    const trend = Object.keys(trendMap)
      .sort()
      .map((day) => {
        const dt = new Date(day);
        return {
          date: day, // YYYY-MM-DD
          label: dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
          time: dt.getTime(),
          energy: trendMap[day].energy,
          water: trendMap[day].water,
        };
      });
    res.json(trend);
  } catch (err) {
    next(err);
  }
};