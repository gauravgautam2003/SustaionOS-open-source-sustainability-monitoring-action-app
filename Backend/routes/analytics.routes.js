const express=require("express");
const router=express.Router();
const controller=require("../controllers/analytics.controller");

router.get("/",controller.getAnalytics);
router.get("/score",controller.getScore);
router.get("/history",controller.getHistory);

module.exports=router;