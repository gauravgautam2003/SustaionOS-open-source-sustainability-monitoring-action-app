const ai = require("../ai/ai.service");

exports.ask = async (req, res, next) => {
  try {

    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ msg: "Question required" });
    }

    // AI prompt for sustainability insights
    const prompt = `
You are an AI sustainability expert.

Analyze energy usage, water consumption, carbon emissions and environmental impact.

Give 3 actionable sustainability improvement suggestions.

Return response strictly in JSON format like:

{
 "suggestions":[
  {
   "title":"Suggestion title",
   "message":"Detailed explanation"
  }
 ]
}
`;

    const aiResponse = await ai.askAI(prompt);

    let suggestions = [];

    try {
      const parsed = JSON.parse(aiResponse);
      suggestions = parsed.suggestions || [];
    } catch (err) {

      // fallback suggestions if AI response not JSON
      suggestions = [
        {
          title: "Reduce Peak Energy Usage",
          message: "Shift high-power operations to off-peak hours to reduce energy load and operational costs."
        },
        {
          title: "Optimize Water Consumption",
          message: "Install smart water monitoring systems to detect leaks and reduce unnecessary water usage."
        },
        {
          title: "Lower Carbon Footprint",
          message: "Adopt renewable energy sources and improve equipment efficiency to reduce carbon emissions."
        }
      ];
    }

    res.json({
      status: "success",
      suggestions
    });

  } catch (err) {
    next(err);
  }
};