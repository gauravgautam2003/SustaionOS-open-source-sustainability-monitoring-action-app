const Data = require("../models/Data");
const predict = require("../services/prediction.service").predictNext;

exports.getPrediction = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, msg: "Unauthorized" });
    }

    const limit = Math.min(96, Math.max(10, Number(req.query.limit) || 24));
    const records = await Data.find({ userId: req.user._id })
      .sort({ timestamp: -1, createdAt: -1 })
      .limit(limit);

    const result = await predict(records);

    return res.json({
      success: true,
      basedOn: records.length,
      prediction: result,
    });
  } catch (err) {
    console.error("Prediction Error:", err);
    return res.status(500).json({ success: false, msg: "Prediction failed" });
  }
};
