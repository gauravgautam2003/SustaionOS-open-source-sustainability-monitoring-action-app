module.exports = (req, res, next) => {
  let {
    building,
    location,
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

  if (!building || water === undefined || energy === undefined) {
    return res.status(400).json({
      success: false,
      msg: "All fields (building, water, energy) are required",
    });
  }

  building = building.trim();
  location = typeof location === "string" ? location.trim() : "";

  if (building.length < 2) {
    return res.status(400).json({
      success: false,
      msg: "Building name must be at least 2 characters",
    });
  }

  water = Number(water);
  energy = Number(energy);

  if (isNaN(water) || isNaN(energy)) {
    return res.status(400).json({
      success: false,
      msg: "Water and Energy must be valid numbers",
    });
  }

  if (water < 0 || energy < 0) {
    return res.status(400).json({
      success: false,
      msg: "Values cannot be negative",
    });
  }

  if (water > 100000 || energy > 10000) {
    return res.status(400).json({
      success: false,
      msg: "Values exceed realistic limits",
    });
  }

  sensorId = typeof sensorId === "string" ? sensorId.trim() : "";
  sensorName = typeof sensorName === "string" ? sensorName.trim() : "";
  sensorType = typeof sensorType === "string" ? sensorType.trim() || "manual" : "manual";
  protocol = typeof protocol === "string" ? protocol.trim() || "manual" : "manual";

  batteryLevel = batteryLevel === "" || batteryLevel == null ? null : Number(batteryLevel);
  signalQuality = signalQuality === "" || signalQuality == null ? null : Number(signalQuality);

  if (batteryLevel != null && (!Number.isFinite(batteryLevel) || batteryLevel < 0 || batteryLevel > 100)) {
    return res.status(400).json({
      success: false,
      msg: "Battery level must be between 0 and 100",
    });
  }

  if (signalQuality != null && (!Number.isFinite(signalQuality) || signalQuality < 0 || signalQuality > 100)) {
    return res.status(400).json({
      success: false,
      msg: "Signal quality must be between 0 and 100",
    });
  }

  latitude = latitude === "" || latitude == null ? null : Number(latitude);
  longitude = longitude === "" || longitude == null ? null : Number(longitude);

  if (latitude != null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
    return res.status(400).json({
      success: false,
      msg: "Latitude must be between -90 and 90",
    });
  }

  if (longitude != null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
    return res.status(400).json({
      success: false,
      msg: "Longitude must be between -180 and 180",
    });
  }

  req.body = {
    building,
    location,
    water,
    energy,
    sensorId,
    sensorName,
    sensorType,
    protocol,
    batteryLevel,
    signalQuality,
    latitude,
    longitude,
  };

  next();
};
