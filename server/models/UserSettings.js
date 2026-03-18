const mongoose = require("mongoose");

const userSettingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },

  // ✅ ADD THESE (VERY IMPORTANT)
  name: String,
  email: String,

  darkMode: { type: Boolean, default: true },

  aiSuggestions: { type: Boolean, default: true },
  predictiveInsights: { type: Boolean, default: true },

  energyLimit: { type: Number, default: 500 },
  waterLimit: { type: Number, default: 200 },

  energyAlerts: { type: Boolean, default: true },
  waterAlerts: { type: Boolean, default: true },
  weeklyReports: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model("UserSettings", userSettingsSchema);