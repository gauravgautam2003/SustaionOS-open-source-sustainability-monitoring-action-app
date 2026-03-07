const router=require("express").Router();
const ctrl=require("../controllers/data.controller");
const validate=require("../middleware/validate.middleware");

router.post("/",validate,ctrl.sendData);

module.exports=router;