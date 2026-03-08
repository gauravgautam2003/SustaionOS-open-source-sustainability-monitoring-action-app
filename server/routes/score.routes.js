const router=require("express").Router();
const ctrl=require("../controllers/score.controller");

router.get("/",ctrl.getScore);

module.exports=router;