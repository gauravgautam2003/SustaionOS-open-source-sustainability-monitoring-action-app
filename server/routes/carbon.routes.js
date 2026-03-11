const router=require("express").Router();
const ctrl=require("../controllers/carbon.controller");

router.get("/",ctrl.getCarbon);

module.exports=router;