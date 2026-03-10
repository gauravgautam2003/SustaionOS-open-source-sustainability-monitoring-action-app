const Data=require("../models/Data");
const predict=require("../services/prediction.service").predictNext;

exports.getPrediction=async(req,res)=>{
 const records=await Data.find().sort({timestamp:-1}).limit(10);

 const result=predict(records);

 res.json({
  basedOn:records.length,
  prediction:result
 });
};