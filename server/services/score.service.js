const Data = require("../models/Data");
const Alert = require("../models/Alert");

exports.getScore = async (building) => {

 const data = await Data.find({building});

 if(!data.length) return {score:0, grade:"N/A"};

 const avgWater = data.reduce((a,b)=>a+b.water,0)/data.length;
 const avgEnergy = data.reduce((a,b)=>a+b.energy,0)/data.length;

 const anomalies = await Alert.countDocuments({building});

 let score = 100 - ((avgWater+avgEnergy)/10 + anomalies*5);

 if(score<0) score=0;

 let grade="D";
 if(score>90) grade="A+";
 else if(score>75) grade="A";
 else if(score>60) grade="B";
 else if(score>40) grade="C";

 return {
  score:Math.round(score),
  grade,
  avgWater,
  avgEnergy,
  anomalies
 };
};