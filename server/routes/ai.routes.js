const express=require("express");
const router=express.Router();
const controller=require("../controllers/ai.controller");

router.post("/query",controller.ask);

module.exports=router;