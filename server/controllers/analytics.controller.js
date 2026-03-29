const Data = require("../models/Data");
const scoreService = require("../services/sustainabilityScore.engine");
const executiveInsights = require("../services/executiveInsights.service");
const mlBridge = require("../services/mlBridge.service");
const commandCenterService = require("../services/commandCenter.service");

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

const simplifyTelemetry = (records = []) =>
  records.map((record) => ({
    timestamp: record.timestamp || record.createdAt || null,
    building: record.building || "Unknown",
    location: record.location || "",
    sensorId: record.sensorId || "",
    batteryLevel: Number(record.batteryLevel) || 0,
    signalQuality: Number(record.signalQuality) || 0,
    water: Number(record.water) || 0,
    energy: Number(record.energy) || 0,
  }));

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

// Get executive insights and action plan (user-specific)
exports.getInsights = async (req, res, next) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });

    const { period } = req.query;
    const insights = await executiveInsights.getExecutiveInsights(userId, period || "week");
    res.json(insights);
  } catch (err) {
    next(err);
  }
};

exports.getCommandCenter = async (req, res, next) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });

    const { period } = req.query;
    const commandCenter = await commandCenterService.getCommandCenter(userId, period || "week");
    res.json(commandCenter);
  } catch (err) {
    next(err);
  }
};

exports.getModelStatus = async (req, res, next) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });

    const records = await Data.find({ userId }).sort({ timestamp: -1, createdAt: -1 }).limit(240);
    const latest = records[0] || null;
    const earliest = records[records.length - 1] || null;
    const model = await mlBridge.getModelStatus();

    res.json({
      model,
      telemetryWindow: {
        sampleCount: records.length,
        latestTimestamp: latest?.timestamp || latest?.createdAt || null,
        earliestTimestamp: earliest?.timestamp || earliest?.createdAt || null,
      },
      readyToTrain: records.length >= 12,
      trainingRecommended:
        records.length >= 12 &&
        (!model?.active || records.length > Number(model?.trainedSamples || 0) + 12),
    });
  } catch (err) {
    next(err);
  }
};

exports.trainModel = async (req, res, next) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });

    const limit = Math.min(720, Math.max(24, Number(req.body?.limit) || 240));
    const records = await Data.find({ userId }).sort({ timestamp: -1, createdAt: -1 }).limit(limit);
    const ordered = [...records].reverse();

    if (ordered.length < 12) {
      return res.status(400).json({
        success: false,
        msg: "Need at least 12 telemetry readings to train the advanced model.",
      });
    }

    const result = await mlBridge.trainModel(simplifyTelemetry(ordered));
    if (!result) {
      return res.status(503).json({
        success: false,
        msg: "Python ML service unavailable for training.",
      });
    }

    res.json({
      success: true,
      trainedOn: ordered.length,
      model: result.model || result,
      trainingHistory: result.trainingHistory || result.model?.trainingHistory || [],
    });
  } catch (err) {
    next(err);
  }
};
