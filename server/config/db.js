const mongoose = require("mongoose");
const { MONGO_URI } = require("./env");

module.exports = async ()=>{
 try{
  await mongoose.connect(MONGO_URI);
  console.log("✅ MongoDB Connected");
 }catch(err){
  console.error("DB Error:",err.message);
  process.exit(1);
 }
}