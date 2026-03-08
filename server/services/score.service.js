const Data = require("../models/Data");
const Alert = require("../models/Alert");

exports.calculateScore = async () => {
  const data = await Data.find().sort({ createdAt: -1 }).limit(10);
  const alerts = await Alert.find().sort({ createdAt: -1 }).limit(5);

  let score = 100;

  const avgWater = data.reduce((a,b)=>a+b.water,0)/data.length || 0;
  const avgEnergy = data.reduce((a,b)=>a+b.energy,0)/data.length || 0;

  if(avgWater > 1200) score -= 15;
  if(avgEnergy > 320) score -= 15;
  if(alerts.length > 0) score -= 20;

  let status="Excellent";
  let message="Optimal sustainability performance";

  if(score<90) {status="Good"; message="Usage is efficient";}
  if(score<70) {status="Moderate"; message="Optimization recommended";}
  if(score<50) {status="Poor"; message="High resource wastage detected";}

  return {score,status,message};
};