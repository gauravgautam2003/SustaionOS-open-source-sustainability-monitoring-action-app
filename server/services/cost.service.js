exports.calculateCost = (records)=>{

 let totalWater=0;
 let totalEnergy=0;

 records.forEach(r=>{
  totalWater+=r.water;
  totalEnergy+=r.energy;
 });

 const waterRate=0.02;
 const energyRate=8;

 const costWater=totalWater*waterRate;
 const costEnergy=totalEnergy*energyRate;

 return {
  waterCost:costWater.toFixed(2),
  energyCost:costEnergy.toFixed(2),
  totalCost:(costWater+costEnergy).toFixed(2),
  monthlyEstimate:((costWater+costEnergy)*30).toFixed(2)
 };
};