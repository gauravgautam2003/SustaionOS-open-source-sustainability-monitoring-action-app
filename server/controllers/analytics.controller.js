const Data=require("../models/Data");

exports.stats=async(req,res)=>{
 const data=await Data.find();

 const totalWater=data.reduce((a,b)=>a+b.water,0);
 const totalEnergy=data.reduce((a,b)=>a+b.energy,0);

 res.json({
  readings:data.length,
  totalWater,
  totalEnergy
 });
}