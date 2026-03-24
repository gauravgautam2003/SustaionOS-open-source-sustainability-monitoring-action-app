const formatResponse = ({ type, latest, avgWater, avgEnergy, percentDiff }) => {

  const waterDiff = percentDiff(latest.water, avgWater);
  const energyDiff = percentDiff(latest.energy, avgEnergy);

  switch(type){

    case "water":
      return `
🔍 Analysis:
Current water usage is ${latest.water}L (${waterDiff}% vs average).

⚠️ Insight:
${latest.water > avgWater ? "Usage is higher than normal, possible leakage or overconsumption." : "Usage is within safe limits."}

💡 Recommendation:
Inspect pipelines, reduce peak usage, and monitor trends.

📊 Confidence: 92%
`;

    case "energy":
      return `
🔍 Analysis:
Energy consumption is ${latest.energy} kWh (${energyDiff}% vs average).

⚠️ Insight:
${latest.energy > avgEnergy ? "High consumption detected. Possibly due to heavy appliances or HVAC load." : "Energy usage is efficient."}

💡 Recommendation:
Shift loads to off-peak hours and optimize device usage.

📊 Confidence: 90%
`;

    case "prediction":
      return `
🔮 Forecast:
Based on recent trends, expected usage:

• Water ≈ ${Math.round(avgWater)}L  
• Energy ≈ ${Math.round(avgEnergy)} kWh  

📈 Insight:
System is predicting stable behavior with minor fluctuations.

📊 Confidence: 85%
`;

    default:
      return null;
  }
};

module.exports = { formatResponse };