const Data=require("../models/Data");
const Alert=require("../models/Alert");

exports.calculateScore=async()=>{

 const latest=await Data.findOne().sort({createdAt:-1});

 const stats=await Data.aggregate([
  {
   $group:{
    _id:null,
    avgWater:{$avg:"$water"},
    avgEnergy:{$avg:"$energy"},
    maxWater:{$max:"$water"},
    maxEnergy:{$max:"$energy"}
   }
  }
 ]);

 const alertCount=await Alert.countDocuments();

 if(!latest || stats.length===0)
  return {score:0,status:"No Data"};

 const avgWater=stats[0].avgWater;
 const avgEnergy=stats[0].avgEnergy;
 const maxWater=stats[0].maxWater;
 const maxEnergy=stats[0].maxEnergy;

 let penalty=0;

 /* ---------- WATER SCORE ---------- */
 const waterRatio=latest.water/avgWater;

 if(waterRatio>1)
  penalty+=Math.min((waterRatio-1)*50,40);

 /* ---------- ENERGY SCORE ---------- */
 const energyRatio=latest.energy/avgEnergy;

 if(energyRatio>1)
  penalty+=Math.min((energyRatio-1)*50,40);

 /* ---------- ALERT SCORE ---------- */
 penalty+=Math.min(alertCount*4,20);

 /* ---------- SPIKE DETECTION BONUS PENALTY ---------- */
 if(latest.water>maxWater*0.95) penalty+=10;
 if(latest.energy>maxEnergy*0.95) penalty+=10;

 /* ---------- FINAL SCORE ---------- */
 let score=Math.max(0,Math.round(100-penalty));

 /* ---------- STATUS ENGINE ---------- */
 let status="Excellent";
 let level="LOW";

 if(score<85){status="Good"; level="MEDIUM";}
 if(score<65){status="Moderate"; level="HIGH";}
 if(score<45){status="Critical"; level="SEVERE";}

 /* ---------- INTELLIGENT MESSAGE ---------- */
 let message="All systems optimal.";

 if(level==="MEDIUM")
  message="Minor inefficiencies detected.";

 if(level==="HIGH")
  message="Resource usage above optimal range.";

 if(level==="SEVERE")
  message="Immediate optimization required.";

 return{
  score,
  status,
  risk:level,
  alerts:alertCount,
  usage:{
   water:latest.water,
   energy:latest.energy
  },
  message
 };
};