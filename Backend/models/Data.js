const mongoose=require("mongoose");

const schema=new mongoose.Schema({
 building:String,
 water:Number,
 energy:Number,
 timestamp:{type:Date,default:Date.now}
});

module.exports=mongoose.model("Data",schema);