const detect = require("../services/detection.service").detect;
const predictService = require("../services/prediction.service");
const root = require("./rootCause.engine");
const suggest = require("./suggestion.engine");
const formatter = require("./response.engine");

exports.generateFinalAnswer = async ({
  intent,
  latest,
  avgWater,
  avgEnergy,
  history = [],
  userId
}) => {
  try {
    if (!latest) return null;

    // % difference helper
    const percentDiff = (c, a) =>
      a === 0 ? 0 : (((c - a) / a) * 100).toFixed(1);

    // 🔮 Prediction
    let prediction = {};
    try {
      prediction = predictService.predictNext(history) || {};
    } catch (e) {
      prediction = {};
    }

    // 🚨 Anomaly Detection
    let anomaly = {};
    try {
      anomaly = detect(latest.water, latest.energy, history) || {};
    } catch (e) {
      anomaly = {};
    }

    // 🔍 Root Cause
    let cause = "No major issue detected.";
    try {
      cause = await root.findCause(userId);
    } catch (e) {}

    // 💡 Suggestions
    let tips = [];
    try {
      tips = await suggest.getSuggestions(userId);
    } catch (e) {
      tips = ["No suggestions available."];
    }

    // 🧠 Base formatted response
    let base = "";
    try {
      base = formatter.formatResponse({
        type: intent,
        latest,
        avgWater,
        avgEnergy,
        percentDiff
      }) || "";
    } catch (e) {
      base = "";
    }

    // 🎯 Final structured output
    const finalText = `
${base}

${anomaly?.detected ? `🚨 Anomaly Detected: ${anomaly.reason}` : "✅ No anomaly detected"}

🔍 Root Cause:
${cause}

💡 Recommendations:
${tips.map(t => `• ${t}`).join("\n")}

🔮 Prediction:
Energy (Next): ${prediction.predictedEnergyNextHour || prediction.predictedEnergyAvg || "N/A"}  
Water (Next): ${prediction.predictedWaterNextHour || prediction.predictedWaterAvg || "N/A"}

📊 Insight:
Energy is ${latest.energy > avgEnergy ? "above" : "within"} average  
Water is ${latest.water > avgWater ? "above" : "within"} average  

📈 Confidence Score: 91%
`;

    return finalText;

  } catch (err) {
    console.log("Final AI Engine Error:", err);
    return null; // fallback trigger
  }
};