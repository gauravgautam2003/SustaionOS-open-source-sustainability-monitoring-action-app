const Data=require("../models/Data");
const calc=require("../services/carbon.service").calculateCarbon;

exports.getCarbon=async(req,res)=>{
 const records=await Data.find();
 const result=calc(records);

 res.json(result);
};