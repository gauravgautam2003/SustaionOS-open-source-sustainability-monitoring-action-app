const Data = require("../models/Data");
const detect = require("../services/detection.service").detect;
const alertService = require("../services/alert.service");
const notificationService = require("../services/notification.service");
const scoreService = require("../services/sustainabilityScore.engine");
const SensorDevice = require("../models/SensorDevice");

const syncSensorHeartbeat = async (userId, payload) => {
  const sensorId = (payload?.sensorId || "").toString().trim();
  if (!sensorId) return null;

  const update = {
    lastSeen: new Date(),
    status: payload.batteryLevel != null && Number(payload.batteryLevel) < 20 ? "DEGRADED" : "ONLINE",
  };

  if (payload.sensorName) update.name = payload.sensorName;
  if (payload.building) update.building = payload.building;
  if (payload.location) update.location = payload.location;
  if (payload.sensorType) update.sensorType = payload.sensorType;
  if (payload.protocol) update.protocol = payload.protocol;
  if (payload.batteryLevel != null) update.batteryLevel = Number(payload.batteryLevel);
  if (payload.signalQuality != null) update.signalQuality = Number(payload.signalQuality);
  if (payload.latitude != null) update.latitude = Number(payload.latitude);
  if (payload.longitude != null) update.longitude = Number(payload.longitude);

  return SensorDevice.findOneAndUpdate(
    { userId, sensorId },
    { $set: update, $setOnInsert: { userId, sensorId } },
    { new: true, upsert: true }
  );
};

const sendData = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, msg: "Unauthorized" });
    }

    const {
      building,
      location = "",
      water,
      energy,
      sensorId = "",
      sensorName = "",
      sensorType = "manual",
      protocol = "manual",
      batteryLevel = null,
      signalQuality = null,
      latitude = null,
      longitude = null,
    } = req.body;

    if (!building || water == null || energy == null) {
      return res.status(400).json({ success: false, msg: "All fields required" });
    }

    const saved = await Data.create({
      userId: req.user._id,
      building,
      location,
      sensorId,
      sensorName,
      sensorType,
      protocol,
      batteryLevel,
      signalQuality,
      latitude,
      longitude,
      water: Number(water),
      energy: Number(energy),
      timestamp: new Date(),
    });

    await syncSensorHeartbeat(req.user._id, {
      sensorId,
      sensorName,
      building,
      location,
      sensorType,
      protocol,
      batteryLevel,
      signalQuality,
      latitude,
      longitude,
    });

    if (global.io) global.io.emit("newData", saved);

    try {
      const recent = await Data.find({ userId: req.user._id }).sort({ timestamp: -1 }).limit(20);
      const detection = await detect(saved.water, saved.energy, recent);
      if (detection && detection.status) {
        const baseline = recent.slice(1, 11);
        const avg = (field) => {
          if (!baseline.length) return 0;
          return baseline.reduce((sum, item) => sum + Number(item[field] || 0), 0) / baseline.length;
        };

        const energyAvg = avg("energy");
        const waterAvg = avg("water");
        const energyDelta = Math.max(0, Number(saved.energy) - energyAvg);
        const waterDelta = Math.max(0, Number(saved.water) - waterAvg);

        const rootCause =
          detection.reason === "Water Spike"
            ? saved.water > Math.max(waterAvg * 1.2, 0)
              ? "Likely leakage or uncontrolled water draw compared to recent baseline."
              : "Unusual water usage pattern detected against recent history."
            : saved.energy > Math.max(energyAvg * 1.2, 0)
              ? "Likely HVAC, lighting, or equipment load increase beyond normal baseline."
              : "Unusual energy usage pattern detected against recent history.";

        const estimatedLoss = Math.round(energyDelta * 8 + waterDelta * 0.02);
        const recommendedAction =
          detection.reason === "Water Spike"
            ? "Inspect valves, tanks, and pipeline joints. Check for continuous flow after operating hours."
            : "Review heavy appliances, HVAC schedules, and idle loads. Shift usage to off-peak hours.";

        const mapSeverity = (s) => {
          if (!s) return "LOW";
          const up = s.toString().toUpperCase();
          if (up === "HIGH") return "HIGH";
          if (up === "MEDIUM") return "MEDIUM";
          return "LOW";
        };

        const alert = await alertService.createAlert({
          userId: req.user._id,
          building: saved.building || "Unknown",
          message: `${detection.reason}${detection.score ? ` (score:${detection.score})` : ""}`,
          severity: mapSeverity(detection.severity),
          rootCause,
          estimatedLoss,
          recommendedAction,
        });

        if (alert && global.io) global.io.emit("newAlert", alert);
        if (alert) {
          await notificationService.createNotification({
            userId: req.user._id,
            type: "ALERT",
            title: `${detection.reason} detected`,
            message: `${saved.building || "System"} needs attention. ${alert.recommendedAction || "Open the alert center for details."}`,
            link: "/alerts",
            priority: mapSeverity(detection.severity),
            dedupeKey: `alert:${alert.building}:${detection.reason}`,
            metadata: { alertId: alert._id, building: alert.building, severity: alert.severity },
          });
        }
      }
    } catch (err) {
      console.error("Post-save detection error:", err);
    }

    try {
      const scoreSnapshot = await scoreService.calculateScore(req.user._id);
      if (Number(scoreSnapshot?.score) > 0 && Number(scoreSnapshot.score) < 65) {
        await notificationService.createNotification({
          userId: req.user._id,
          type: "SCORE",
          title: `Sustainability score dropped to ${scoreSnapshot.score}%`,
          message: scoreSnapshot.message || "Your current system health needs optimization.",
          link: "/analytics",
          priority: scoreSnapshot.score < 45 ? "HIGH" : "MEDIUM",
          dedupeKey: `score:${req.user._id}:${Math.floor(Number(scoreSnapshot.score) / 10)}`,
          metadata: { score: scoreSnapshot.score, risk: scoreSnapshot.risk, status: scoreSnapshot.status },
        });
      }
    } catch (err) {
      console.error("Post-save score notification error:", err);
    }

    return res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error("Send Data Error:", err);
    res.status(500).json({ success: false, msg: "Server Error" });
  }
};

const getHistory = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, msg: "Unauthorized" });
    }

    const history = await Data.find({ userId: req.user._id }).sort({ timestamp: -1 }).limit(100);
    res.json(history);
  } catch (err) {
    console.error("History Error:", err);
    res.status(500).json({ success: false, msg: "Failed to fetch history" });
  }
};

const getScore = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ score: 0 });
    }

    const result = await scoreService.calculateScore(req.user._id);
    res.json(result);
  } catch (err) {
    console.error("Score Error:", err);
    res.status(500).json({ score: 0 });
  }
};

module.exports = { sendData, getHistory, getScore };
