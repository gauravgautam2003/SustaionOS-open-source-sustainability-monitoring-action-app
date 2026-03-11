const Data=require("../models/Data");

exports.findCause=async()=>{

 const records=await Data.find().sort({createdAt:-1}).limit(5);

 if(records.length<2)
  return "Not enough data for analysis.";

 const latest=records[0];
 const prevAvg=
  records.slice(1).reduce((s,r)=>s+r.water,0)/(records.length-1);

 const energyAvg=
  records.slice(1).reduce((s,r)=>s+r.energy,0)/(records.length-1);

 // WATER SPIKE
 if(latest.water > prevAvg*1.25)
  return "Sudden water spike detected. Possible leakage or valve fault.";

 // ENERGY SPIKE
 if(latest.energy > energyAvg*1.25)
  return "Energy spike detected. Heavy device usage or system overload.";

 // CONSTANT HIGH
 if(latest.energy>energyAvg && latest.water>prevAvg)
  return "Both water and energy above average. Possible operational inefficiency.";

 return "No abnormal root cause detected.";
};