const Data=require("../models/Data");

exports.getHistoryAnalytics=async()=>{

 const records=await Data.find().sort({createdAt:1});

 if(records.length===0)
  return {msg:"No data available"};

 const totalWater=records.reduce((a,b)=>a+b.water,0);
 const totalEnergy=records.reduce((a,b)=>a+b.energy,0);

 const avgWater=Math.round(totalWater/records.length);
 const avgEnergy=Math.round(totalEnergy/records.length);

 const first=records[0];
 const last=records[records.length-1];

 let trend="Stable";
 if(last.water>first.water) trend="Increasing";
 if(last.water<first.water) trend="Decreasing";

 let efficiency="Excellent";
 if(avgWater>1200||avgEnergy>320) efficiency="Moderate";
 if(avgWater>1400||avgEnergy>350) efficiency="Poor";

 return{
  records:records.length,
  avgWater,
  avgEnergy,
  trend,
  efficiency
 };
};