const Data = require("../models/Data");
const SensorDevice = require("../models/SensorDevice");
const alertService = require("../services/alert.service");
const notificationService = require("../services/notification.service");
const scoreService = require("../services/sustainabilityScore.engine");
const { detect } = require("../services/detection.service");
const { getUserSettings } = require("../services/userSettings.service");
const { buildResourceAlertContext } = require("../services/alertPolicy.service");
const { enrichAlertPayload } = require("../services/incidentWorkflow.service");

const normalizeNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const syncSensor = async (userId, payload) => {
  const sensorId = String(payload.sensorId || "").trim();
  if (!sensorId) return null;

  const sensor = await SensorDevice.findOneAndUpdate(
    { userId, sensorId },
    {
      $set: {
        name: String(payload.sensorName || "").trim(),
        building: String(payload.building || "").trim(),
        location: String(payload.location || "").trim(),
        latitude: payload.latitude == null || payload.latitude === "" ? null : Number(payload.latitude),
        longitude: payload.longitude == null || payload.longitude === "" ? null : Number(payload.longitude),
        sensorType: String(payload.sensorType || "multisensor").trim(),
        protocol: String(payload.protocol || "MQTT").trim(),
        batteryLevel: payload.batteryLevel == null || payload.batteryLevel === "" ? null : Number(payload.batteryLevel),
        signalQuality: payload.signalQuality == null || payload.signalQuality === "" ? null : Number(payload.signalQuality),
        status:
          payload.batteryLevel != null && Number(payload.batteryLevel) < 20 ? "DEGRADED" : "ONLINE",
        lastSeen: new Date(),
      },
      $setOnInsert: { userId, sensorId },
    },
    { upsert: true, returnDocument: "after" }
  );

  return sensor;
};

exports.getBridgeStatus = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ success: false, msg: "Unauthorized" });

    return res.json({
      success: true,
      mode: "gateway-ready",
      supportedProtocols: ["MQTT", "HTTP", "Webhook"],
      endpoints: ["/api/iot/mqtt/ingest", "/api/iot/webhook/ingest", "/api/sensors/ingest"],
    });
  } catch (err) {
    console.error("IoT Bridge Status Error:", err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};

exports.ingestMqtt = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ success: false, msg: "Unauthorized" });

    const payload = req.body || {};
    const sensorId = String(payload.sensorId || "").trim();
    const building = String(payload.building || "").trim();
    const water = payload.water;
    const energy = payload.energy;

    if (!sensorId || !building || water == null || energy == null) {
      return res.status(400).json({
        success: false,
        msg: "sensorId, building, water, energy are required",
      });
    }

    const data = await Data.create({
      userId: req.user._id,
      building,
      location: String(payload.location || "").trim(),
      latitude: payload.latitude == null || payload.latitude === "" ? null : Number(payload.latitude),
      longitude: payload.longitude == null || payload.longitude === "" ? null : Number(payload.longitude),
      sensorId,
      sensorName: String(payload.sensorName || "").trim(),
      sensorType: String(payload.sensorType || "multisensor").trim(),
      protocol: "MQTT",
      batteryLevel: payload.batteryLevel == null || payload.batteryLevel === "" ? null : Number(payload.batteryLevel),
      signalQuality: payload.signalQuality == null || payload.signalQuality === "" ? null : Number(payload.signalQuality),
      water: normalizeNumber(water),
      energy: normalizeNumber(energy),
      timestamp: new Date(payload.timestamp || Date.now()),
    });

    const sensor = await syncSensor(req.user._id, { ...payload, protocol: "MQTT" });

    const userSettings = await getUserSettings(req.user._id);
    const recent = await Data.find({ userId: req.user._id }).sort({ timestamp: -1 }).limit(20);
    const detection = await detect(data.water, data.energy, recent);
    const alertContext = buildResourceAlertContext({
      detection,
      reading: data,
      history: recent,
      settings: userSettings,
    });

    if (alertContext) {
      const alert = await alertService.createAlert({
        userId: req.user._id,
        building,
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
          message: alertContext.notification.message,
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

    const score = await scoreService.calculateScore(req.user._id);
    if (Number(score?.score) > 0 && Number(score.score) < 65) {
      await notificationService.createNotification({
        userId: req.user._id,
        type: "SYSTEM",
        title: `Gateway telemetry saved for ${sensorId}`,
        message: `Score is ${score.score}%. Review the live gateway stream.`,
        link: "/sensors",
        priority: score.score < 45 ? "HIGH" : "MEDIUM",
        dedupeKey: `gateway:${sensorId}:${Math.floor(Number(score.score) / 10)}`,
      });
    }

    if (global.io) {
      global.io.emit("newData", data);
      if (sensor) global.io.emit("sensorHeartbeat", sensor);
    }

    return res.status(201).json({
      success: true,
      mode: "MQTT",
      data,
      sensor,
      score: score?.score ?? 0,
    });
  } catch (err) {
    console.error("IoT MQTT Ingest Error:", err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};

exports.ingestWebhook = async (req, res) => {
  return exports.ingestMqtt(req, res);
};
