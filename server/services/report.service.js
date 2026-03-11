const Data = require("../models/Data");
const Alert = require("../models/Alert");

exports.generateReportData = async () => {
 const data = await Data.find();
 const alerts = await Alert.find();

 const totalWater = data.reduce((a,b)=>a+b.water,0);
 const totalEnergy = data.reduce((a,b)=>a+b.energy,0);

 const cost = (totalEnergy * 8) + (totalWater * 0.02);
 const carbon = totalEnergy * 0.82;

 return {
  totalWater,
  totalEnergy,
  alerts: alerts.length,
  cost,
  carbon
 };
};