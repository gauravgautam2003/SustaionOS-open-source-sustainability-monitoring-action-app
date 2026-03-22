const Alert = require("../models/Alert");

exports.checkAndCreateAlert = async (latest, avgWater, avgEnergy, userId) => {

 let alerts = [];

 // 💧 WATER ALERT
 if (latest.water > avgWater * 1.3) {
  alerts.push({
   message: "🚨 Water spike detected! Possible leakage.",
   type: "water",
   severity: latest.water > avgWater * 1.6 ? "HIGH" : "MEDIUM"
  });
 }

 // ⚡ ENERGY ALERT
 if (latest.energy > avgEnergy * 1.3) {
  alerts.push({
   message: "⚡ Energy spike detected! High load usage.",
   type: "energy",
   severity: latest.energy > avgEnergy * 1.6 ? "HIGH" : "MEDIUM"
  });
 }

 // ✅ SAVE ALL ALERTS
 for (const alert of alerts) {
  await Alert.create({
   user: userId,
   message: alert.message,
   type: alert.type,
   severity: alert.severity
  });
 }

 return alerts; // return array (important for frontend)
};