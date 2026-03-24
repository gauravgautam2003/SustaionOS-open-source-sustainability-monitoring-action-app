const aiService = require("../services/aiLLM.service");
const Data = require("../models/Data");
const predictService = require("../services/prediction.service");
const decision = require("../ai/decision.engine");

// POST /api/ai/query
exports.ask = async (req, res, next) => {
  try {
    const userId = req.user && req.user._id;
    const { question, water, energy, skipLLM } = req.body || {};

    if (!question || !question.toString().trim()) {
      return res.status(400).json({ msg: "Question required" });
    }

    // If the client passes telemetry, use the decision engine for more structured answers.
    if (water != null || energy != null) {
      const intentEngine = require("../ai/intent.engine");
      const intent = intentEngine.detectIntent ? intentEngine.detectIntent(question) : "general";
      const answer = await decision.generateDecision(
        intent,
        { water, energy, question },
        userId
      );
      return res.json({ status: "success", intent, answer, aiMode: "local" });
    }

    const [latest, history, alerts] = await Promise.all([
      Data.findOne({ userId }).sort({ timestamp: -1, createdAt: -1 }),
      Data.find({ userId }).sort({ timestamp: -1 }).limit(48),
      require("../models/Alert").find({ userId }).sort({ time: -1 }).limit(5),
    ]);

    const answer = await aiService.generateAnswer({
      question: question.toString(),
      userId,
      context: { latest, history, alerts, skipLLM: Boolean(skipLLM) },
    });

    return res.json(answer);
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

    const history = await Data.find({ userId }).sort({ timestamp: -1 }).limit(48);
    const prediction = await predictService.predictNext(history);

    return res.json({ status: "success", prediction });
  } catch (err) {
    console.error("Forecast Error:", err);
    return res.status(500).json({ msg: "Forecast failed" });
  }
};
