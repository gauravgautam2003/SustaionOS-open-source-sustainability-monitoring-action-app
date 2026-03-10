exports.predictNext = (records) => {
 if(!records.length) return null;

 const totalWater = records.reduce((sum,r)=>sum+r.water,0);
 const totalEnergy = records.reduce((sum,r)=>sum+r.energy,0);

 return {
  predictedWater: Math.round(totalWater/records.length),
  predictedEnergy: Math.round(totalEnergy/records.length)
 };
};