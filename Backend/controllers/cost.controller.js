const Data=require("../models/Data");
const calc=require("../services/cost.service").calculateCost;

exports.getCost=async(req,res)=>{
 const records=await Data.find();
 const result=calc(records);

 res.json(result);
};