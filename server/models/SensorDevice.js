const mongoose = require("mongoose");

const sensorDeviceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sensorId: { type: String, required: true },
    name: { type: String, default: "" },
    building: { type: String, default: "" },
    location: { type: String, default: "" },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    sensorType: { type: String, default: "multisensor" },
    protocol: { type: String, default: "HTTP" },
    status: { type: String, enum: ["ONLINE", "OFFLINE", "DEGRADED", "UNKNOWN"], default: "UNKNOWN" },
    batteryLevel: { type: Number, default: null },
    firmwareVersion: { type: String, default: "" },
    calibrationDueAt: { type: Date, default: null },
    notes: { type: String, default: "" },
    lastSeen: { type: Date, default: null },
  },
  { timestamps: true }
);

sensorDeviceSchema.index({ userId: 1, sensorId: 1 }, { unique: true });

module.exports = mongoose.model("SensorDevice", sensorDeviceSchema);
