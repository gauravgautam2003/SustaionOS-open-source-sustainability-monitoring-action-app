const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  building: String,
  water: Number,
  energy: Number,
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Data", schema);