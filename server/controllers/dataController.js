const Data = require("../models/Data");
const detect = require("../detectionEngine/anomalyChecker");

exports.receiveData = async (req,res)=>{
 try{
  const saved = await Data.create(req.body);

  const anomaly = detect(req.body);

  res.json({
   saved,
   anomaly
  });

 }catch(err){
  res.status(500).json(err);
 }
};