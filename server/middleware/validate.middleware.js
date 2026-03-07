module.exports=(req,res,next)=>{
 const {building,water,energy}=req.body;
 if(!building || water==null || energy==null)
   return res.status(400).json({error:"Missing fields"});
 next();
}