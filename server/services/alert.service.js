const Alert=require("../models/Alert");

exports.createAlert=async(data)=>{
 return await Alert.create(data);
}