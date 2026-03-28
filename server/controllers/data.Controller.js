const Data = require("../models/Data");
const detect = require("../services/detection.service").detect;
const alertService = require("../services/alert.service");
const notificationService = require("../services/notification.service");
const scoreService = require("../services/sustainabilityScore.engine");
const SensorDevice = require("../models/SensorDevice");
const { getUserSettings } = require("../services/userSettings.service");
const { buildResourceAlertContext } = require("../services/alertPolicy.service");
const { enrichAlertPayload } = require("../services/incidentWorkflow.service");

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
      { upsert: true, returnDocument: "after" }
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
      const userSettings = await getUserSettings(req.user._id);
      const recent = await Data.find({ userId: req.user._id }).sort({ timestamp: -1 }).limit(20);
      const detection = await detect(saved.water, saved.energy, recent);
      const alertContext = buildResourceAlertContext({
        detection,
        reading: saved,
        history: recent,
        settings: userSettings,
      });

      if (alertContext) {
        const alert = await alertService.createAlert({
          userId: req.user._id,
          building: saved.building || "Unknown",
          message: alertContext.message,
          severity: alertContext.severity,
          rootCause: alertContext.rootCause,
          estimatedLoss: alertContext.estimatedLoss,
          recommendedAction: alertContext.recommendedAction,
        });

        if (alert && global.io) global.io.emit("newAlert", enrichAlertPayload(alert));
        if (alert) {
          await notificationService.createNotification({
            userId: req.user._id,
            type: "ALERT",
            title: alertContext.notification.title,
            message:
              alertContext.notification.message ||
              `${saved.building || "System"} needs attention. ${alert.recommendedAction || "Open the alert center for details."}`,
            link: "/alerts",
            priority: alertContext.notification.priority,
            dedupeKey: alertContext.notification.dedupeKey,
            metadata: {
              ...alertContext.notification.metadata,
              alertId: alert._id,
              building: alert.building,
              severity: alert.severity,
            },
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
