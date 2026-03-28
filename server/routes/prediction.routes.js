const router=require("express").Router();
const ctrl=require("../controllers/prediction.controller");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);
router.get("/",ctrl.getPrediction);

module.exports=router;
