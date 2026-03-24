const SensorDevice = require("../models/SensorDevice");
const Data = require("../models/Data");
const notificationService = require("../services/notification.service");

const normalizeStatus = (sensor) => {
  if (!sensor) return "UNKNOWN";
  if (sensor.batteryLevel != null && Number(sensor.batteryLevel) < 20) return "DEGRADED";
  if (sensor.lastSeen) {
    const ageMinutes = (Date.now() - new Date(sensor.lastSeen).getTime()) / 60000;
    if (ageMinutes <= 15) return "ONLINE";
    if (ageMinutes <= 60) return "DEGRADED";
    return "OFFLINE";
  }
  return sensor.status || "UNKNOWN";
};

const calculateHealthScore = (sensors = []) => {
  if (!sensors.length) return 100;
  const total = sensors.length;
  const online = sensors.filter((sensor) => normalizeStatus(sensor) === "ONLINE").length;
  const degraded = sensors.filter((sensor) => normalizeStatus(sensor) === "DEGRADED").length;
  const offline = sensors.filter((sensor) => normalizeStatus(sensor) === "OFFLINE").length;
  const lowBattery = sensors.filter((sensor) => sensor.batteryLevel != null && Number(sensor.batteryLevel) < 20).length;
  const overdueCalibration = sensors.filter(
    (sensor) => sensor.calibrationDueAt && new Date(sensor.calibrationDueAt).getTime() < Date.now()
  ).length;

  const score = 100 - offline * 20 - degraded * 10 - lowBattery * 8 - overdueCalibration * 5;
  return Math.max(0, Math.min(100, Math.round(score + (online / total) * 10)));
};

const maybeNotifySensorHealth = async (userId, sensor) => {
  if (!sensor) return;

  const notifications = [];
  if (sensor.batteryLevel != null && Number(sensor.batteryLevel) < 20) {
    notifications.push({
      type: "SYSTEM",
      title: `Low battery on ${sensor.name || sensor.sensorId}`,
      message: `Battery is at ${sensor.batteryLevel}%. Replace or recharge before the device drops offline.`,
      link: "/sensors",
      priority: "MEDIUM",
      dedupeKey: `sensor-battery:${sensor.sensorId}`,
      metadata: { sensorId: sensor.sensorId, batteryLevel: sensor.batteryLevel },
    });
  }

  if (sensor.calibrationDueAt && new Date(sensor.calibrationDueAt).getTime() < Date.now()) {
    notifications.push({
      type: "SYSTEM",
      title: `Calibration overdue: ${sensor.name || sensor.sensorId}`,
      message: "Calibration is overdue. Recalibrate before trusting future readings.",
      link: "/sensors",
      priority: "MEDIUM",
      dedupeKey: `sensor-calibration:${sensor.sensorId}`,
      metadata: { sensorId: sensor.sensorId, calibrationDueAt: sensor.calibrationDueAt },
    });
  }

  for (const payload of notifications) {
    await notificationService.createNotification({ userId, ...payload });
  }
};

exports.getSensors = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ success: false, msg: "Unauthorized" });

    const sensors = await SensorDevice.find({ userId: req.user._id }).sort({ lastSeen: -1, createdAt: -1 });
    const normalized = sensors.map((sensor) => ({
      ...sensor.toObject(),
      status: normalizeStatus(sensor.toObject()),
    }));

    return res.json({ success: true, sensors: normalized });
  } catch (err) {
    console.error("Get Sensors Error:", err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};

exports.getSensorSummary = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ success: false, msg: "Unauthorized" });

    const sensors = await SensorDevice.find({ userId: req.user._id });
    const telemetryCount = await Data.countDocuments({ userId: req.user._id, sensorId: { $ne: "" } });
    const online = sensors.filter((sensor) => normalizeStatus(sensor) === "ONLINE").length;
    const degraded = sensors.filter((sensor) => normalizeStatus(sensor) === "DEGRADED").length;
    const offline = sensors.filter((sensor) => normalizeStatus(sensor) === "OFFLINE").length;
    const lowBattery = sensors.filter(
      (sensor) => sensor.batteryLevel != null && Number(sensor.batteryLevel) < 20
    ).length;
    const overdueCalibration = sensors.filter(
      (sensor) => sensor.calibrationDueAt && new Date(sensor.calibrationDueAt).getTime() < Date.now()
    ).length;
    const healthScore = calculateHealthScore(sensors);

    return res.json({
      success: true,
      total: sensors.length,
      online,
      degraded,
      offline,
      lowBattery,
      overdueCalibration,
      healthScore,
      telemetryCount,
    });
  } catch (err) {
    console.error("Sensor Summary Error:", err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};

exports.registerSensor = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ success: false, msg: "Unauthorized" });

    const {
      sensorId,
      name = "",
      building = "",
      location = "",
      latitude = null,
      longitude = null,
      sensorType = "multisensor",
      protocol = "HTTP",
      batteryLevel = null,
      firmwareVersion = "",
      notes = "",
      calibrationDueAt = null,
    } = req.body || {};

    if (!sensorId || !String(sensorId).trim()) {
      return res.status(400).json({ success: false, msg: "sensorId required" });
    }

    const sensor = await SensorDevice.findOneAndUpdate(
      { userId: req.user._id, sensorId: String(sensorId).trim() },
      {
        $set: {
          name: String(name).trim(),
          building: String(building).trim(),
          location: String(location).trim(),
          latitude: latitude == null || latitude === "" ? null : Number(latitude),
          longitude: longitude == null || longitude === "" ? null : Number(longitude),
          sensorType: String(sensorType).trim() || "multisensor",
          protocol: String(protocol).trim() || "HTTP",
          batteryLevel: batteryLevel === "" || batteryLevel == null ? null : Number(batteryLevel),
          firmwareVersion: String(firmwareVersion).trim(),
          notes: String(notes).trim(),
          calibrationDueAt: calibrationDueAt ? new Date(calibrationDueAt) : null,
          status:
            batteryLevel != null && Number(batteryLevel) < 20
              ? "DEGRADED"
              : "ONLINE",
          lastSeen: new Date(),
        },
        $setOnInsert: {
          userId: req.user._id,
          sensorId: String(sensorId).trim(),
        },
      },
      { new: true, upsert: true }
    );

    await maybeNotifySensorHealth(req.user._id, sensor);

    return res.status(201).json({ success: true, sensor });
  } catch (err) {
    console.error("Register Sensor Error:", err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};

exports.pingSensor = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ success: false, msg: "Unauthorized" });

    const { id } = req.params;
    const { batteryLevel = null, signalQuality = null, status = "ONLINE" } = req.body || {};

    const sensor = await SensorDevice.findOne({ _id: id, userId: req.user._id });
    if (!sensor) return res.status(404).json({ success: false, msg: "Sensor not found" });

    sensor.lastSeen = new Date();
    sensor.status = String(status || "ONLINE").toUpperCase();
    if (batteryLevel !== null && batteryLevel !== "") sensor.batteryLevel = Number(batteryLevel);
    if (signalQuality !== null && signalQuality !== "") sensor.signalQuality = Number(signalQuality);
    if (sensor.batteryLevel != null && sensor.batteryLevel < 20) sensor.status = "DEGRADED";
    await sensor.save();

    await maybeNotifySensorHealth(req.user._id, sensor);

    return res.json({ success: true, sensor });
  } catch (err) {
    console.error("Sensor Ping Error:", err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};

exports.ingestSensorTelemetry = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ success: false, msg: "Unauthorized" });

    const {
      sensorId = "",
      sensorName = "",
      sensorType = "multisensor",
      protocol = "MQTT",
      building,
      location = "",
      latitude = null,
      longitude = null,
      water,
      energy,
      batteryLevel = null,
      signalQuality = null,
    } = req.body || {};

    if (!sensorId || !building || water == null || energy == null) {
      return res.status(400).json({ success: false, msg: "sensorId, building, water, energy are required" });
    }

    const data = await Data.create({
      userId: req.user._id,
      building,
      location,
      latitude,
      longitude,
      sensorId: String(sensorId).trim(),
      sensorName: String(sensorName).trim(),
      sensorType: String(sensorType).trim() || "multisensor",
      protocol: String(protocol).trim() || "MQTT",
      batteryLevel: batteryLevel === "" || batteryLevel == null ? null : Number(batteryLevel),
      signalQuality: signalQuality === "" || signalQuality == null ? null : Number(signalQuality),
      water: Number(water),
      energy: Number(energy),
      timestamp: new Date(),
    });

    const sensor = await SensorDevice.findOneAndUpdate(
      { userId: req.user._id, sensorId: String(sensorId).trim() },
      {
        $set: {
          name: String(sensorName).trim(),
          building: String(building).trim(),
          location: String(location).trim(),
          latitude: latitude == null || latitude === "" ? null : Number(latitude),
          longitude: longitude == null || longitude === "" ? null : Number(longitude),
          sensorType: String(sensorType).trim() || "multisensor",
          protocol: String(protocol).trim() || "MQTT",
          batteryLevel: batteryLevel === "" || batteryLevel == null ? null : Number(batteryLevel),
          signalQuality: signalQuality === "" || signalQuality == null ? null : Number(signalQuality),
          status:
            batteryLevel != null && Number(batteryLevel) < 20
              ? "DEGRADED"
              : "ONLINE",
          lastSeen: new Date(),
        },
        $setOnInsert: {
          userId: req.user._id,
          sensorId: String(sensorId).trim(),
        },
      },
      { new: true, upsert: true }
    );

    await maybeNotifySensorHealth(req.user._id, sensor);

    if (global.io) {
      global.io.emit("newData", data);
      global.io.emit("sensorHeartbeat", sensor);
    }

    return res.status(201).json({ success: true, data, sensor });
  } catch (err) {
    console.error("Sensor Ingest Error:", err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};
