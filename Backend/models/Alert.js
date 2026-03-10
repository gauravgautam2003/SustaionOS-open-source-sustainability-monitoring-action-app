const mongoose=require("mongoose");

const schema=new mongoose.Schema({
 building:String,
 message:String,
 severity:String,
 time:{type:Date,default:Date.now}
});

module.exports=mongoose.model("Alert",schema);