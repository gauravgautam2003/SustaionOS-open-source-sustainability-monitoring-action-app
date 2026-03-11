const Data=require("../models/Data");

exports.getSuggestions=async()=>{

 const latest=await Data.findOne().sort({createdAt:-1});
 const avg=await Data.aggregate([
  {
   $group:{
    _id:null,
    avgWater:{$avg:"$water"},
    avgEnergy:{$avg:"$energy"}
   }
  }
 ]);

 if(!latest || avg.length===0)
  return ["Not enough data for suggestions"];

 const avgWater=avg[0].avgWater;
 const avgEnergy=avg[0].avgEnergy;

 const tips=[];

 // WATER RULES
 if(latest.water > avgWater*1.2)
  tips.push("Check pipelines for leakage or valve faults.");

 if(latest.water > avgWater)
  tips.push("Reduce water usage during peak hours.");

 if(latest.water < avgWater*0.7)
  tips.push("Water usage optimized. Maintain current efficiency.");

 // ENERGY RULES
 if(latest.energy > avgEnergy*1.2)
  tips.push("Turn off heavy appliances during peak load.");

 if(latest.energy > avgEnergy)
  tips.push("Shift high-energy tasks to off-peak hours.");

 if(latest.energy < avgEnergy*0.7)
  tips.push("Energy consumption is highly efficient.");

 // BOTH HIGH
 if(latest.water>avgWater && latest.energy>avgEnergy)
  tips.push("Overall resource usage high. Inspect building operations.");

 // DEFAULT
 if(tips.length===0)
  tips.push("System operating optimally. No action required.");

 return tips;
};