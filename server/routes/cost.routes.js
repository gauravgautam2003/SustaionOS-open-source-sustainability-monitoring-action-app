const router=require("express").Router();
const ctrl=require("../controllers/cost.controller");

router.get("/",ctrl.getCost);

module.exports=router;