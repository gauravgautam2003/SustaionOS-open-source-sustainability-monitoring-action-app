exports.costCalc=(water,energy)=>{
 const waterCost=water*0.02;
 const energyCost=energy*8;
 return waterCost+energyCost;
}