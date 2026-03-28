const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["ALERT", "SCORE", "INSIGHT", "REPORT", "SYSTEM"],
      default: "SYSTEM",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: "/",
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "LOW",
    },
    read: {
      type: Boolean,
      default: false,
    },
    dedupeKey: {
      type: String,
      default: "",
      index: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
    time: {
      type: Date,
      default: Date.now,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, read: 1, createdAt: -1 });
schema.index({ userId: 1, dedupeKey: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", schema);
