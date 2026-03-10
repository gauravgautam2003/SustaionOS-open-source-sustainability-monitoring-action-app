const express=require("express");
const router=express.Router();
const controller=require("../controllers/report.controller");

router.get("/data",controller.getReportData); 
router.get("/pdf",controller.downloadReport);

module.exports=router;