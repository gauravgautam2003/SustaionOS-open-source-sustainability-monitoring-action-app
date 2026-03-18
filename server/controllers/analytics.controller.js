// src/controllers/analytics.controller.js
const Data = require("../models/Data");
const scoreService = require("../services/sustainabilityScore.engine");
const historyService = require("../services/history.service");

// 🟢 Summary with optional period filter
exports.getAnalytics = async (req,res,next)=>{
  try{
    const { period } = req.query; // 'week', 'month', 'year' etc.
    let startDate;

    if(period==='week'){
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
    } else if(period==='month'){
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const filter = startDate ? { timestamp: { $gte: startDate } } : {};
    const records = await Data.find(filter);

    if(records.length===0) return res.json({msg:"No data available"});

    const totalWater = records.reduce((a,b)=>a+b.water,0);
    const totalEnergy = records.reduce((a,b)=>a+b.energy,0);
    const avgWater = Math.round(totalWater/records.length);
    const avgEnergy = Math.round(totalEnergy/records.length);

    res.json({ totalRecords: records.length, totalWater, totalEnergy, avgWater, avgEnergy });

  } catch(err){ next(err) }
};

// 🟢 Sustainability Score
exports.getScore = async(req,res,next)=>{
  try{
    const result = await scoreService.calculateScore();
    res.json(result);
  } catch(err){ next(err) }
};

// 🟢 History Analytics with limit & sorting
exports.getHistory = async(req,res,next)=>{
  try{
    const limit = parseInt(req.query.limit) || 30; // last 30 records default
    const records = await Data.find().sort({ timestamp: -1 }).limit(limit);
    res.json(records.reverse()); // oldest first
  } catch(err){ next(err) }
};

// 🟢 Trend for charts (daily)
exports.getTrend = async(req,res,next)=>{
  try{
    const records = await Data.find();
    if(records.length===0) return res.json([]);

    const trendMap = {};

    records.forEach(r=>{
      const day = r.timestamp.toISOString().split("T")[0]; // YYYY-MM-DD
      if(!trendMap[day]) trendMap[day]={energy:0, water:0};
      trendMap[day].energy += r.energy;
      trendMap[day].water += r.water;
    });

    const trend = Object.keys(trendMap).sort().map(day => ({ date: day, ...trendMap[day] }));
    res.json(trend);

  } catch(err){ next(err) }
};