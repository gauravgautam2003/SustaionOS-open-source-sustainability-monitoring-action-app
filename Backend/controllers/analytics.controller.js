const Data = require("../models/Data");

const scoreService = require("../services/score.service");
const historyService = require("../services/history.service");


// =============================
// 📊 BASIC ANALYTICS SUMMARY
// =============================
exports.getAnalytics = async (req,res,next)=>{
 try{

  const records = await Data.find();

  if(records.length===0)
   return res.json({msg:"No data available"});

  const totalWater = records.reduce((a,b)=>a+b.water,0);
  const totalEnergy = records.reduce((a,b)=>a+b.energy,0);

  const avgWater = Math.round(totalWater/records.length);
  const avgEnergy = Math.round(totalEnergy/records.length);

  res.json({
   totalRecords: records.length,
   totalWater,
   totalEnergy,
   avgWater,
   avgEnergy
  });

 }
 catch(err){next(err)}
};


// =============================
// 🌍 SUSTAINABILITY SCORE
// =============================
exports.getScore = async(req,res,next)=>{
 try{

  const result = await scoreService.calculateScore();

  res.json(result);

 }
 catch(err){next(err)}
};


// =============================
// 📈 HISTORY ANALYTICS
// =============================
exports.getHistory = async(req,res,next)=>{
 try{

  const result = await historyService.getHistoryAnalytics();

  res.json(result);

 }
 catch(err){next(err)}
};