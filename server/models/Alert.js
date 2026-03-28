const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  building: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH"],
    default: "LOW"
  },
  status: {
    type: String,
    enum: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"],
    default: "OPEN"
  },
  rootCause: {
    type: String,
    default: ""
  },
  estimatedLoss: {
    type: Number,
    default: 0
  },
  recommendedAction: {
    type: String,
    default: ""
  },
  acknowledgedAt: {
    type: Date,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  time: {
    type: Date,
    default: Date.now
  }
});

schema.index({ userId: 1, time: -1 });
schema.index({ userId: 1, status: 1, time: -1 });
schema.index({ userId: 1, severity: 1, status: 1, time: -1 });

module.exports = mongoose.model("Alert", schema);
