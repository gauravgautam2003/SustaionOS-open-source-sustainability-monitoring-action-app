exports.calculateCarbon=(records)=>{

 let totalEnergy=0;

 records.forEach(r=>{
  totalEnergy+=r.energy;
 });

 const emissionFactor=0.82; // kg CO₂ per kWh

 const totalCarbon=totalEnergy*emissionFactor;
 const avgCarbon=totalCarbon/records.length || 0;

 return{
  totalCarbon:totalCarbon.toFixed(2),
  avgCarbon:avgCarbon.toFixed(2),
  monthlyEstimate:(totalCarbon*30).toFixed(2)
 };
}