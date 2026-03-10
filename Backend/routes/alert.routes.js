const router=require("express").Router();
const ctrl=require("../controllers/alert.controller");

router.get("/",ctrl.getAlerts);

module.exports=router;