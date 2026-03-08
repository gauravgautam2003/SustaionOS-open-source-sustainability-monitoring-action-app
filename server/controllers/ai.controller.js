const ai=require("../ai/ai.service");

exports.ask=async(req,res,next)=>{
 try{

  const {question}=req.body;

  if(!question)
   return res.status(400).json({msg:"Question required"});

  const answer=await ai.askAI(question);

  res.json({answer});

 }
 catch(err){next(err)}
};