const router=require("express").Router();
const ctrl=require("../controllers/prediction.controller");

router.get("/",ctrl.getPrediction);

module.exports=router;