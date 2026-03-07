const Alert=require("../models/Alert");

exports.getAlerts=async(req,res)=>{
 const alerts=await Alert.find().sort({time:-1});
 res.json(alerts);
}