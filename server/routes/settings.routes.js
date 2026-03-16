const express=require("express")
const router=express.Router()

const auth=require("../middleware/authMiddleware")
const controller=require("../controllers/settings.controller")

router.get("/",auth,controller.getSettings)

router.put("/",auth,controller.updateSettings)

module.exports=router