const Data=require("../models/Data");
const detect=require("../services/detection.service").detect;
const alertService=require("../services/alert.service");
const ai=require("../ai/aiAnalyzer");

exports.sendData=async(req,res,next)=>{
 try{
  const {building,water,energy}=req.body;

  const saved=await Data.create({building,water,energy});

  const result=detect(water,energy);

  let aiResult=null;

  if(result.status){
   await alertService.createAlert({
    building,
    message:result.reason,
    severity:result.severity
   });

   aiResult=ai.analyze(result.reason);
  }

  res.json({saved, anomaly:result, ai:aiResult});
 }
 catch(err){next(err)}
};