const Settings=require("../models/UserSettings")

exports.getSettings=async(req,res)=>{

 try{

  let settings = await Settings.findOne({user:req.user.id})

  if(!settings){

   settings = await Settings.create({
    user:req.user.id
   })

  }

  res.json(settings)

 }
 catch(err){

  res.status(500).json({msg:"Server error"})

 }

}


exports.updateSettings=async(req,res)=>{

 try{

  const settings = await Settings.findOneAndUpdate(

   {user:req.user.id},
   req.body,
   {new:true,upsert:true}

  )

  res.json(settings)

 }
 catch(err){

  res.status(500).json({msg:"Server error"})

 }

}