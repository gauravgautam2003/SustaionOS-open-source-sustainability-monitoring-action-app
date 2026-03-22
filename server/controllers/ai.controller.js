const decision = require("../ai/decision.engine");

exports.ask = async (req, res, next) => {
  try {
    const { question, water, energy } = req.body;

    if (!question) {
      return res.status(400).json({ msg: "Question required" });
    }

    // detect intent
    const intentEngine = require("../ai/intent.engine");
    const intent = intentEngine.detectIntent(question);

    // ✅ PASS DATA TO AI
    const answer = await decision.generateDecision(intent, {
      water,
      energy,
    });

    res.json({
      status: "success",
      intent,
      answer,
    });

  } catch (err) {
    next(err);
  }
};