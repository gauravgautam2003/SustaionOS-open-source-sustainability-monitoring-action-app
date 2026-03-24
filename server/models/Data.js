const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    building: String,
    location: { type: String, default: "" },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    sensorId: { type: String, default: "" },
    sensorName: { type: String, default: "" },
    sensorType: { type: String, default: "manual" },
    protocol: { type: String, default: "manual" },
    batteryLevel: { type: Number, default: null },
    signalQuality: { type: Number, default: null },
    water: Number,
    energy: Number,
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Data", schema);
