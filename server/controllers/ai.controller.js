const aiService = require("../services/aiLLM.service");
const Data = require("../models/Data");
const predictService = require("../services/prediction.service");

// POST /api/ai/query
exports.ask = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { question } = req.body || {};

    if (!question || !question.toString().trim()) {
      return res.status(400).json({ msg: "Question required" });
    }

    // basic context: we can pass userId so service may fetch recent readings later
    const answer = await aiService.generateAnswer({ question: question.toString(), userId });

    return res.json(answer);
  } catch (err) {
    console.error("AI Controller Error:", err);
    res.status(500).json({ msg: "AI server error" });
  }
};
const decision = require("../ai/decision.engine");

exports.ask = async (req, res, next) => {
  try {
    const { question, water, energy } = req.body;
    if (!question) return res.status(400).json({ msg: "Question required" });

    const intentEngine = require("../ai/intent.engine");
    const intent = intentEngine.detectIntent ? intentEngine.detectIntent(question) : "general";

    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });

    const answer = await decision.generateDecision(intent, { water, energy, question }, userId);

    return res.json({ status: "success", intent, answer });
  } catch (err) {
    console.error("AI Controller Error:", err);
    next(err);
  }
};

// POST /api/ai/forecast
exports.forecast = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });

    // fetch recent history for user
    const history = await Data.find({ userId }).sort({ timestamp: -1 }).limit(48);

    const prediction = predictService.predictNext(history);

    return res.json({ status: "success", prediction });
  } catch (err) {
    console.error("Forecast Error:", err);
    return res.status(500).json({ msg: "Forecast failed" });
  }
};