/**
 * SustainOS Decision Intelligence Engine
 * Performs data analysis + anomaly reasoning + recommendations
 */

const Data = require("../models/Data");
const Alert = require("../models/Alert");
const root=require("./rootCause.engine");
const suggest=require("./suggestion.engine");

exports.generateDecision = async (intent) => {

 try {

  // latest reading
  const latest = await Data.findOne().sort({ createdAt: -1 });

  if (!latest)
   return "No telemetry data available yet.";

  // averages
  const avgData = await Data.aggregate([
   {
    $group: {
     _id: null,
     avgWater: { $avg: "$water" },
     avgEnergy: { $avg: "$energy" },
     totalWater: { $sum: "$water" },
     totalEnergy: { $sum: "$energy" },
     count: { $sum: 1 }
    }
   }
  ]);

  const avgWater = avgData[0]?.avgWater || 0;
  const avgEnergy = avgData[0]?.avgEnergy || 0;
  const totalWater = avgData[0]?.totalWater || 0;
  const totalEnergy = avgData[0]?.totalEnergy || 0;
  const count = avgData[0]?.count || 1;

  // last alert
  const lastAlert = await Alert.findOne().sort({ createdAt: -1 });

  // percentage diff calculator
  const percentDiff = (current, avg) =>
   avg === 0 ? 0 : (((current - avg) / avg) * 100).toFixed(1);

  // sustainability score
  let score = 100;
  if (latest.water > avgWater) score -= 15;
  if (latest.energy > avgEnergy) score -= 15;
  if (latest.water > avgWater * 1.2) score -= 15;
  if (latest.energy > avgEnergy * 1.2) score -= 15;
  if (score < 0) score = 0;

  // ---------- INTENT SWITCH ----------
  switch (intent) {

   // WATER ANALYSIS
   case "water":
    if (latest.water > avgWater)
     return `Water usage is HIGH (${latest.water}L). 
Increase of ${percentDiff(latest.water, avgWater)}% above average.
Possible causes: leakage or abnormal usage.
Recommendation: Inspect valves and pipelines.`;

    return `Water usage normal (${latest.water}L).
System operating within optimal range.`;


   // ENERGY ANALYSIS
   case "energy":
    if (latest.energy > avgEnergy)
     return `Energy usage HIGH (${latest.energy} kWh).
Increase of ${percentDiff(latest.energy, avgEnergy)}%.
Recommendation: Reduce heavy appliance load or shift to off-peak hours.`;

    return `Energy usage efficient (${latest.energy} kWh).`;


   // ALERT STATUS
   case "alert":
    if (lastAlert)
     return `Latest Alert: ${lastAlert.message}`;
    return "No active alerts. System stable.";


   // COST ESTIMATION
   case "cost":
    const estimatedCost = (totalEnergy * 8).toFixed(2); // ₹8 per unit example
    return `Estimated electricity cost so far: ₹${estimatedCost}.
Based on ${totalEnergy} kWh total usage.`;


   // CARBON FOOTPRINT
   case "carbon":
    const carbon = (totalEnergy * 0.82).toFixed(2); // emission factor
    return `Estimated carbon footprint: ${carbon} kg CO₂.
Suggestion: reduce peak-hour consumption.`;


   // PREDICTION
   case "prediction":
    return `Predicted next reading:
Water ≈ ${Math.round(avgWater)}L
Energy ≈ ${Math.round(avgEnergy)} kWh
Based on ${count} historical samples.`;


   // SCORE
   case "score":
    let grade = "Excellent";
    if (score < 80) grade = "Good";
    if (score < 60) grade = "Moderate";
    if (score < 40) grade = "Poor";

    return `Sustainability Score: ${score}/100
Rating: ${grade}
Tip: Reduce resource spikes to improve score.`;


   // HISTORY SUMMARY
   case "history":
    return `Total records: ${count}
Total Water Used: ${totalWater}L
Total Energy Used: ${totalEnergy} kWh`;

case "cause":
 return await root.findCause();




 case "suggestion":
 return (await suggest.getSuggestions()).join("\n");





   // UNKNOWN QUESTION
   default:
    return `I can help with:
• water usage
• energy analysis
• alerts
• prediction
• carbon
• cost
• score
• history

Please ask a related question.`;
  }

 } catch (err) {
  console.log("Decision Engine Error:", err);
  return "AI system error while analyzing data.";
 }
};