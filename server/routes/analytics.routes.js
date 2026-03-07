const router=require("express").Router();
const ctrl=require("../controllers/analytics.controller");

router.get("/",ctrl.stats);

module.exports=router;