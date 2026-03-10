const Data=require("../models/Data");
const Alert=require("../models/Alert");
const detectIntent=require("./intent.engine").detectIntent;

exports.askAI=async(question)=>{

 const intent=detectIntent(question);

 const latest=await Data.findOne().sort({createdAt:-1});
 const alerts=await Alert.find().sort({createdAt:-1}).limit(1);

 if(!latest) return "No data available.";

 switch(intent){

  case "water":
   return latest.water>1200
    ? "Water usage is high. Possible leak or heavy usage."
    : "Water usage is normal.";

  case "energy":
   return latest.energy>320
    ? "Energy consumption is high. Check heavy devices."
    : "Energy usage is efficient.";

  case "alert":
   return alerts.length>0
    ? alerts[0].message
    : "No active alerts.";

  case "cost":
   const cost=(latest.energy*8)+(latest.water*0.02);
   return `Estimated cost is ₹${cost.toFixed(2)}`;

  case "carbon":
   const carbon=latest.energy*0.82;
   return `Estimated carbon footprint is ${carbon.toFixed(2)} kg CO₂`;

  case "score":
   const score=100-(latest.energy/10+latest.water/50);
   return `Sustainability score is ${score.toFixed(1)} / 100`;

  case "prediction":
   return "Based on trend, tomorrow usage may increase by 5–8%.";

  case "history":
   const count=await Data.countDocuments();
   return `You have ${count} total records stored.`;

  default:
   return "I can answer about water, energy, alerts, cost, carbon, score, prediction, and history.";
 }
};