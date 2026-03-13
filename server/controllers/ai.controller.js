const decision = require("../ai/decision.engine");

exports.ask = async (req, res, next) => {
  try {

    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ msg: "Question required" });
    }

    // detect intent
    const intentEngine = require("../ai/intent.engine");
    const intent = intentEngine.detectIntent(question);

    // get AI decision
    const answer = await decision.generateDecision(intent);

    res.json({
      status: "success",
      intent,
      answer
    });

  } catch (err) {
    next(err);
  }
};