const express=require("express");
const router=express.Router();
const controller=require("../controllers/report.controller");

router.get("/pdf",controller.downloadReport);

module.exports=router;