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