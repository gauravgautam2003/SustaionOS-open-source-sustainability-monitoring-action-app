const express=require("express");
const router=express.Router();
const engine=require("../services/sustainabilityScore.engine");

router.get("/",async(req,res)=>{
 const data=await engine.calculateScore();
 res.json(data);
});

module.exports=router;